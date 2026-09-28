import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET is required');
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map(value => value.trim()) || true }));
app.use(express.json());
app.use(morgan('combined'));
const publicUser = user => ({ id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId, candidateId: user.candidateId, active: user.active });
const tokenFor = user => jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '8h' });
const fail = (res, status, message) => res.status(status).json({ message });
const userInclude = { branch: true, candidate: true };

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return fail(res, 401, 'Authentication required');
    const payload = jwt.verify(token, jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: userInclude });
    if (!user || !user.active) return fail(res, 401, 'User account is inactive');
    req.user = user; next();
  } catch { return fail(res, 401, 'Invalid or expired session'); }
}
const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : fail(res, 403, 'Insufficient permissions');
const audit = (req, action, entity, entityId, metadata) => prisma.auditLog.create({ data: { actorId: req.user.id, action, entity, entityId, metadata } }).catch(() => undefined);
const candidateWhere = user => user.role === 'super_admin' || user.role === 'super_finance' || user.role === 'recruiter' ? {} : user.role === 'candidate' ? { id: user.candidateId || '__none__' } : { branchId: user.branchId || '__none__' };

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'roms-api' }));
app.post('/api/auth/login', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: String(req.body.email || '').toLowerCase() }, include: userInclude });
  if (!user || !user.active || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) return fail(res, 401, 'Invalid email or password');
  res.json({ token: tokenFor(user), user: publicUser(user) });
});
app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.post('/api/auth/logout', auth, (_req, res) => res.status(204).end());
app.get('/api/branches', auth, async (req, res) => {
  const branches = await prisma.branch.findMany({ include: { _count: { select: { users: true, candidates: true } } }, orderBy: { name: 'asc' } });
  const summaries = await Promise.all(branches.map(async branch => {
    const [deployed, revenue] = await Promise.all([
      prisma.candidate.count({ where: { branchId: branch.id, status: 'Deployed' } }),
      prisma.transaction.aggregate({ where: { branchId: branch.id, status: 'Paid' }, _sum: { amount: true } })
    ]);
    return { ...branch, staff: branch._count.users, activeCandidates: branch._count.candidates - deployed, deployed, totalRevenue: Number(revenue._sum.amount || 0) };
  }));
  res.json(summaries);
});
app.post('/api/branches', auth, allow('super_admin'), async (req, res) => { const branch = await prisma.branch.create({ data: { name: req.body.name, code: req.body.code, accent: req.body.accent || '#0f766e' } }); await audit(req, 'create', 'branch', branch.id); res.status(201).json(branch); });
app.get('/api/users', auth, allow('super_admin'), async (_req, res) => res.json((await prisma.user.findMany({ include: { branch: true }, orderBy: { name: 'asc' } })).map(publicUser)));
app.post('/api/users', auth, allow('super_admin'), async (req, res) => { const { email, name, role, password, branchId } = req.body; if (!email || !name || !role || !password) return fail(res, 400, 'Complete all user fields'); if (['branch_staff', 'branch_finance'].includes(role) && !branchId) return fail(res, 400, 'A branch is required for branch users'); const user = await prisma.user.create({ data: { email: email.toLowerCase(), name, role, branchId: branchId || null, passwordHash: await bcrypt.hash(password, 12), active: true } }); await audit(req, 'create', 'user', user.id, { role, branchId: branchId || null }); res.status(201).json(publicUser(user)); });
app.patch('/api/users/:id', auth, allow('super_admin'), async (req, res) => { const changes = { name: req.body.name, role: req.body.role, branchId: req.body.branchId || null, active: Boolean(req.body.active) }; if (['branch_staff', 'branch_finance'].includes(changes.role) && !changes.branchId) return fail(res, 400, 'A branch is required for branch users'); if (req.body.password) changes.passwordHash = await bcrypt.hash(req.body.password, 12); const user = await prisma.user.update({ where: { id: req.params.id }, data: changes }); await audit(req, 'update', 'user', user.id, { role: changes.role, branchId: changes.branchId, active: changes.active }); res.json(publicUser(user)); });
app.get('/api/candidates', auth, async (req, res) => res.json(await prisma.candidate.findMany({ where: candidateWhere(req.user), include: { branch: true }, orderBy: { createdAt: 'desc' } })));
app.post('/api/candidates', auth, allow('super_admin', 'branch_staff'), async (req, res) => {
  const body = req.body;
  const branchId = req.user.role === 'super_admin' ? body.branchId : req.user.branchId;
  const required = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'maritalStatus', 'passport', 'email', 'phone', 'registeredBy'];
  if (!branchId) return fail(res, 400, 'An office location is required');
  if (required.some(field => !body[field])) return fail(res, 400, 'Complete all required candidate fields');
  if (body.registeredBy === 'Sub-Agent' && !body.subAgentName) return fail(res, 400, 'Specify the sub-agent name');
  const name = [body.firstName, body.middleName, body.lastName].filter(Boolean).join(' ');
  const candidate = await prisma.$transaction(async transaction => {
    const created = await transaction.candidate.create({ data: {
      name, firstName: body.firstName, middleName: body.middleName || null, lastName: body.lastName,
      dateOfBirth: new Date(body.dateOfBirth), gender: body.gender, maritalStatus: body.maritalStatus,
      weightKg: body.weightKg ? Number(body.weightKg) : null, heightFt: body.heightFt ? Number(body.heightFt) : null,
      passport: body.passport, passportExpiry: body.passportExpiry ? new Date(body.passportExpiry) : null,
      nationalId: body.nationalId || null, nationality: body.nationality || null, email: body.email,
      phone: body.phone, alternatePhone: body.alternatePhone || null, address: body.address || null,
      branchId, registeredBy: body.registeredBy, subAgentName: body.subAgentName || null, status: 'Registered', docs: 0
    } });
    if (body.jobId) await transaction.application.create({ data: { candidateId: created.id, jobId: body.jobId, status: 'Shortlisted' } });
    return created;
  });
  await audit(req, 'create', 'candidate', candidate.id, { jobId: body.jobId || null });
  res.status(201).json(candidate);
});
app.patch('/api/candidates/:id', auth, allow('super_admin', 'branch_staff'), async (req, res) => { const existing = await prisma.candidate.findUnique({ where: { id: req.params.id } }); if (!existing || (req.user.role !== 'super_admin' && existing.branchId !== req.user.branchId)) return fail(res, 404, 'Candidate not found'); const candidate = await prisma.candidate.update({ where: { id: existing.id }, data: { status: req.body.status, docs: req.body.docs } }); await audit(req, 'update', 'candidate', candidate.id, req.body); res.json(candidate); });
app.get('/api/jobs', auth, async (_req, res) => res.json(await prisma.job.findMany({ where: { status: { in: ['Open', 'Filled'] } }, orderBy: { createdAt: 'desc' } })));
app.post('/api/jobs', auth, allow('super_admin', 'recruiter'), async (req, res) => { const body = req.body; const required = ['title', 'headcountRequired', 'contractDurationMonths', 'currency', 'minimumSalary', 'maximumSalary', 'location', 'country', 'requiredSkills']; if (required.some(field => body[field] === undefined || body[field] === '')) return fail(res, 400, 'Complete all required job-order fields'); const prefix = String(body.country).toUpperCase().includes('UNITED ARAB') ? 'UAE' : String(body.country).toUpperCase().slice(0, 3); const count = await prisma.job.count({ where: { country: body.country } }); const reference = `JO-${prefix}-${String(count + 1).padStart(3, '0')}`; const job = await prisma.job.create({ data: { reference, title: body.title, employer: body.employer || 'Unassigned employer', headcountRequired: Number(body.headcountRequired), contractDurationMonths: Number(body.contractDurationMonths), currency: body.currency, minimumSalary: Number(body.minimumSalary), maximumSalary: Number(body.maximumSalary), location: body.location, country: body.country, requiredSkills: body.requiredSkills, comments: body.comments || null, openings: Number(body.headcountRequired), status: 'Open' } }); await audit(req, 'create', 'job', job.id, { reference }); res.status(201).json(job); });
app.get('/api/applications', auth, async (req, res) => { const where = req.user.role === 'candidate' ? { candidateId: req.user.candidateId || '__none__' } : req.user.branchId && !['super_admin', 'super_finance', 'recruiter'].includes(req.user.role) ? { candidate: { branchId: req.user.branchId } } : {}; res.json(await prisma.application.findMany({ where, include: { candidate: true, job: true }, orderBy: { createdAt: 'desc' } })); });
app.post('/api/applications', auth, allow('super_admin', 'recruiter', 'branch_staff'), async (req, res) => { const candidate = await prisma.candidate.findUnique({ where: { id: req.body.candidateId } }); if (!candidate || (req.user.role === 'branch_staff' && candidate.branchId !== req.user.branchId)) return fail(res, 403, 'Candidate is outside your branch'); const application = await prisma.application.create({ data: { candidateId: candidate.id, jobId: req.body.jobId, status: req.body.status || 'Shortlisted' } }); await prisma.job.update({ where: { id: req.body.jobId }, data: { filled: { increment: 1 } } }); await audit(req, 'create', 'application', application.id); res.status(201).json(application); });
app.get('/api/transactions', auth, async (req, res) => { const where = req.user.role === 'branch_finance' ? { branchId: req.user.branchId || '__none__' } : ['super_admin', 'super_finance'].includes(req.user.role) ? {} : { branchId: '__none__' }; res.json(await prisma.transaction.findMany({ where, include: { branch: true }, orderBy: { createdAt: 'desc' } })); });
app.post('/api/transactions', auth, allow('super_admin', 'super_finance', 'branch_finance'), async (req, res) => { const branchId = req.user.role === 'branch_finance' ? req.user.branchId : req.body.branchId; if (!branchId) return fail(res, 400, 'A branch is required'); const transaction = await prisma.transaction.create({ data: { branchId, party: req.body.party, type: req.body.type, amount: Number(req.body.amount), status: req.body.status || 'Pending_approval' } }); await audit(req, 'create', 'transaction', transaction.id); res.status(201).json(transaction); });
app.patch('/api/transactions/:id', auth, allow('super_admin', 'super_finance', 'branch_finance'), async (req, res) => { const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } }); if (!existing || (req.user.role === 'branch_finance' && existing.branchId !== req.user.branchId)) return fail(res, 404, 'Transaction not found'); const transaction = await prisma.transaction.update({ where: { id: existing.id }, data: { status: req.body.status } }); await audit(req, 'update', 'transaction', transaction.id, req.body); res.json(transaction); });
app.use((error, _req, res, _next) => { console.error(error); res.status(error.code === 'P2002' ? 409 : 500).json({ message: 'Request could not be completed' }); });
app.listen(port, () => console.log(`ROMS API listening on ${port}`));
