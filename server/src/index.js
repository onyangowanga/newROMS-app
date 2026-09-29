import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET is required');
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map(value => value.trim()) || true }));
app.use(express.json({ limit: '35mb' }));
app.use(morgan('combined'));
app.set('trust proxy', 1);
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || './uploads');
fs.mkdirSync(uploadRoot, { recursive: true });
app.use('/uploads', express.static(uploadRoot));
const publicUser = user => ({ id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, branchId: user.branchId, candidateId: user.candidateId, active: user.active, passwordResetRequired: user.passwordResetRequired });
const tokenFor = user => jwt.sign({ sub: user.id, ver: user.tokenVersion || 0 }, jwtSecret, { expiresIn: '8h' });
const fail = (res, status, message) => res.status(status).json({ message });
const userInclude = { branch: true, candidate: true };
const normalizedUsername = value => String(value || '').trim().toLowerCase();
const validUsername = value => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value);
const validNewPassword = value => typeof value === 'string' && value.length >= 10 && /[a-z]/i.test(value) && /\d/.test(value);
const temporaryPassword = () => randomBytes(12).toString('base64url');
const publicApplyHits = new Map();
const trackingEmailHits = new Map();
const trackingLookupHits = new Map();
const loginAttemptHits = new Map();
const trackingToken = () => randomBytes(24).toString('hex');
const branchScopedRoles = ['branch_admin', 'branch_staff', 'branch_finance'];
const allowedUserRoles = ['super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance', 'recruiter'];
const publicAppUrl = (process.env.PUBLIC_APP_URL || 'https://new.rabiyaroms.top').replace(/\/$/, '');
const mailTransport = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  ...(process.env.SMTP_USER && process.env.SMTP_PASS ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } : {})
}) : null;
const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER;

async function sendTemporaryPassword(user, password) {
  if (!mailTransport || !mailFrom) return false;
  await mailTransport.sendMail({
    from: mailFrom,
    to: user.email,
    subject: 'Your ROMS sign-in has been set up',
    text: `Hello ${user.name},\n\nYour ROMS username is ${user.username}. Your one-time password is ${password}. Sign in at ${publicAppUrl}/#login and choose a new password when prompted. This temporary password expires in 24 hours and stops working after you set your own password.`,
    html: `<p>Hello ${htmlEscape(user.name)},</p><p>Your ROMS username is <strong>${htmlEscape(user.username)}</strong>.</p><p>Your one-time password is <strong>${htmlEscape(password)}</strong>.</p><p>Sign in at <a href="${htmlEscape(publicAppUrl)}/#login">ROMS</a> and choose a new password when prompted. This temporary password expires in 24 hours and stops working after you set your own password.</p>`
  });
  return true;
}

async function nextTrackingNumber(tx, branchId) {
  const branch = await tx.branch.update({ where: { id: branchId }, data: { trackingSequence: { increment: 1 } }, select: { code: true, trackingSequence: true } });
  const branchCode = branch.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!branchCode) throw new Error('Branch code must contain letters or numbers');
  return `ROMS-${branchCode}-${String(branch.trackingSequence).padStart(3, '0')}`;
}

function trackingLink(token) { return `${publicAppUrl}/#track?token=${encodeURIComponent(token)}`; }
const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
async function sendTrackingEmail(candidate, job) {
  if (!mailTransport || !mailFrom) return false;
  const link = trackingLink(candidate.publicTrackingToken);
  const safeName = htmlEscape(candidate.name);
  const safeJob = htmlEscape(job.title);
  const safeCode = htmlEscape(candidate.trackingNumber);
  await mailTransport.sendMail({
    from: mailFrom,
    to: candidate.email,
    subject: `ROMS application received: ${candidate.trackingNumber}`,
    text: `Hello ${candidate.name},\n\nYour application for ${job.title} has been received.\nTracking number: ${candidate.trackingNumber}\nTrack your application: ${link}\n\nKeep this tracking number and link private.`,
    html: `<p>Hello ${safeName},</p><p>Your application for <strong>${safeJob}</strong> has been received.</p><p>Tracking number: <strong>${safeCode}</strong></p><p><a href="${htmlEscape(link)}">View your application status</a></p><p>Keep this tracking number and link private.</p>`
  });
  return true;
}

function limitPublicApplications(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const record = publicApplyHits.get(key);
  if (!record || now - record.start > 15 * 60 * 1000) publicApplyHits.set(key, { start: now, count: 1 });
  else if (record.count >= 5) return fail(res, 429, 'Too many applications from this connection. Please try again later.');
  else record.count += 1;
  next();
}

function canSendTrackingEmail(req, candidateId) {
  const key = `${req.ip || req.socket.remoteAddress || 'unknown'}:${candidateId}`;
  const now = Date.now();
  const record = trackingEmailHits.get(key);
  if (!record || now - record.start > 60 * 60 * 1000) trackingEmailHits.set(key, { start: now, count: 1 });
  else if (record.count >= 3) return false;
  else record.count += 1;
  return true;
}

function limitTrackingLookups(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = trackingLookupHits.get(key);
  if (!record || now - record.start > 15 * 60 * 1000) trackingLookupHits.set(key, { start: now, count: 1 });
  else if (record.count >= 10) return fail(res, 429, 'Too many lookup attempts. Please try again later.');
  else record.count += 1;
  next();
}

function limitLoginAttempts(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttemptHits.get(key);
  if (!record || now - record.start > 15 * 60 * 1000) loginAttemptHits.set(key, { start: now, count: 1 });
  else if (record.count >= 10) return fail(res, 429, 'Too many sign-in attempts. Please try again in 15 minutes.');
  else record.count += 1;
  req.loginAttemptKey = key;
  next();
}

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return fail(res, 401, 'Authentication required');
    const payload = jwt.verify(token, jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: userInclude });
    if (!user || !user.active || user.role === 'candidate') return fail(res, 401, 'User account is inactive');
    if ((payload.ver ?? 0) !== (user.tokenVersion || 0)) return fail(res, 401, 'Session has been reset. Please sign in again.');
    if (user.passwordResetRequired && !(req.method === 'POST' && req.path === '/api/auth/first-password')) return fail(res, 403, 'Set a new password to continue.');
    req.user = user; next();
  } catch { return fail(res, 401, 'Invalid or expired session'); }
}
const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : fail(res, 403, 'Insufficient permissions');
const audit = (req, action, entity, entityId, metadata) => prisma.auditLog.create({ data: { actorId: req.user.id, actorName: req.user.name, actorEmail: req.user.email, action, entity, entityId, metadata } }).catch(() => undefined);
const candidateWhere = user => user.role === 'super_admin' || user.role === 'super_finance' || user.role === 'recruiter' ? {} : { branchId: user.branchId || '__none__' };

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'roms-api' }));
app.get('/api/public/jobs', async (_req, res) => res.json(await prisma.job.findMany({ where: { status: 'Open' }, orderBy: { country: 'asc' } })));
app.get('/api/public/branches', async (_req, res) => res.json(await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })));
app.post('/api/public/applications', limitPublicApplications, async (req, res) => {
  const body = req.body;
  const required = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'maritalStatus', 'passport', 'email', 'phone', 'branchId', 'jobId'];
  if (required.some(field => !body[field])) return fail(res, 400, 'Complete all required application fields');
  if (body.registeredBy === 'Sub-Agent' && !body.subAgentName) return fail(res, 400, 'Specify the sub-agent name');
  const job = await prisma.job.findFirst({ where: { id: body.jobId, status: 'Open' } });
  if (!job) return fail(res, 404, 'This job order is no longer open');
  const branch = await prisma.branch.findUnique({ where: { id: body.branchId }, select: { id: true } });
  if (!branch) return fail(res, 400, 'Choose a valid branch office');
  const name = [body.firstName, body.middleName, body.lastName].filter(Boolean).join(' ');
  const candidate = await prisma.$transaction(async tx => {
    const number = await nextTrackingNumber(tx, body.branchId);
    const created = await tx.candidate.create({ data: {
      trackingNumber: number, publicTrackingToken: trackingToken(), name, firstName: body.firstName, middleName: body.middleName || null, lastName: body.lastName,
      dateOfBirth: new Date(body.dateOfBirth), gender: body.gender, maritalStatus: body.maritalStatus,
      weightKg: body.weightKg ? Number(body.weightKg) : null, heightFt: body.heightFt ? Number(body.heightFt) : null,
      passport: body.passport, passportExpiry: body.passportExpiry ? new Date(body.passportExpiry) : null,
      nationalId: body.nationalId || null, nationality: body.nationality || null, email: body.email,
      phone: body.phone, alternatePhone: body.alternatePhone || null, address: body.address || null,
      branchId: body.branchId, registeredBy: body.registeredBy || 'Self', subAgentName: body.subAgentName || null,
      status: 'Application', docs: 0
    } });
    await tx.application.create({ data: { candidateId: created.id, jobId: job.id, status: 'Shortlisted' } });
    await tx.job.update({ where: { id: job.id }, data: { filled: { increment: 1 } } });
    return created;
  });
  let emailSent = false;
  try { emailSent = await sendTrackingEmail(candidate, job); }
  catch (error) { console.error('Applicant tracking email failed:', error.code || error.name || 'mail error'); }
  res.status(201).json({ trackingNumber: candidate.trackingNumber, publicTrackingToken: candidate.publicTrackingToken, emailSent, candidate: { name: candidate.name, status: candidate.status } });
});
const trackingInclude = { branch: true, applications: { include: { job: true } } };
function publicTrackingPayload(candidate) {
  const total = Number(candidate.commissionTotal || candidate.agreedFee || 0);
  const paid = Number(candidate.paidAmount || 0);
  return {
    publicTrackingToken: candidate.publicTrackingToken,
    trackingNumber: candidate.trackingNumber,
    name: candidate.name,
    status: candidate.status,
    submitted: candidate.submitted,
    commissionTotal: total,
    paidAmount: paid,
    balanceDue: total - paid,
    receipt: {
      firstName: candidate.firstName,
      middleName: candidate.middleName,
      lastName: candidate.lastName,
      dateOfBirth: candidate.dateOfBirth,
      gender: candidate.gender,
      maritalStatus: candidate.maritalStatus,
      passport: candidate.passport,
      passportExpiry: candidate.passportExpiry,
      nationalId: candidate.nationalId,
      nationality: candidate.nationality,
      email: candidate.email,
      phone: candidate.phone,
      address: candidate.address,
      branchName: candidate.branch.name,
      branchCode: candidate.branch.code,
      registeredBy: candidate.registeredBy,
      subAgentName: candidate.subAgentName,
      applications: candidate.applications.map(application => ({ jobTitle: application.job.title, country: application.job.country, employer: application.job.employer }))
    },
    applications: candidate.applications.map(application => ({ status: application.status, jobTitle: application.job.title, country: application.job.country, employer: application.job.employer }))
  };
}

app.post('/api/public/track', limitTrackingLookups, async (req, res) => {
  const trackingNumberValue = String(req.body.trackingNumber || '').trim().toUpperCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const candidate = await prisma.candidate.findUnique({ where: { trackingNumber: trackingNumberValue }, include: trackingInclude });
  if (!candidate || candidate.email.trim().toLowerCase() !== email) return fail(res, 404, 'Tracking number and email do not match');
  res.json(publicTrackingPayload(candidate));
});

app.post('/api/public/track/link', async (req, res) => {
  const candidate = await prisma.candidate.findUnique({ where: { publicTrackingToken: String(req.body.token || '') }, include: trackingInclude });
  if (!candidate) return fail(res, 404, 'Tracking link not found');
  res.json(publicTrackingPayload(candidate));
});

app.post('/api/public/track/link/receipt.pdf', async (req, res) => {
  const candidate = await prisma.candidate.findUnique({ where: { publicTrackingToken: String(req.body.token || '') }, include: trackingInclude });
  if (!candidate) return fail(res, 404, 'Tracking link not found');
  const details = [
    ['Tracking Number', candidate.trackingNumber], ['Applicant', candidate.name],
    ['Date of Birth', candidate.dateOfBirth.toISOString().slice(0, 10)], ['Gender', candidate.gender],
    ['Marital Status', candidate.maritalStatus], ['Passport', candidate.passport],
    ['Passport Expiry', candidate.passportExpiry?.toISOString().slice(0, 10) || 'Not provided'],
    ['National ID', candidate.nationalId || 'Not provided'], ['Nationality', candidate.nationality || 'Not provided'],
    ['Phone', candidate.phone], ['Email', candidate.email], ['Address', candidate.address || 'Not provided'],
    ['Branch', `${candidate.branch.code} - ${candidate.branch.name}`], ['Registered By', candidate.registeredBy],
    ...(candidate.subAgentName ? [['Sub-Agent', candidate.subAgentName]] : []),
    ...candidate.applications.flatMap(application => [['Job', application.job.title], ['Country', application.job.country], ['Employer', application.job.employer]]),
    ['Submitted', candidate.submitted.toISOString().slice(0, 10)], ['Application Status', candidate.status],
    ['Commission Total', `KES ${Number(candidate.commissionTotal || candidate.agreedFee || 0).toLocaleString('en-KE')}`],
    ['Paid', `KES ${Number(candidate.paidAmount || 0).toLocaleString('en-KE')}`],
    ['Balance Due', `KES ${Number(candidate.commissionTotal || candidate.agreedFee || 0) - Number(candidate.paidAmount || 0)}`]
  ];
  const pageHeight = 110 + details.reduce((height, [label, value]) => height + 26 + Math.ceil(`${label}: ${value}`.length / 29) * 11, 0);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${candidate.trackingNumber}-receipt.pdf"`);
  const pdf = new PDFDocument({ size: [226.77, pageHeight], margin: 14 });
  pdf.pipe(res);
  pdf.font('Helvetica-Bold').fontSize(15).text('ROMS', { align: 'center' });
  pdf.font('Helvetica').fontSize(8).text('APPLICATION RECEIPT', { align: 'center' });
  pdf.moveDown(0.6).moveTo(14, pdf.y).lineTo(212.77, pdf.y).stroke();
  for (const [label, value] of details) {
    pdf.moveDown(0.5).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase());
    pdf.font('Helvetica').fontSize(9).text(String(value), { width: 198, lineGap: 2 });
  }
  pdf.moveDown(0.6).fontSize(7).text(`Printed ${new Date().toLocaleString('en-KE')}`, { align: 'center' });
  pdf.end();
});

app.post('/api/public/track/link/email', async (req, res) => {
  if (!mailTransport || !mailFrom) return fail(res, 503, 'Email delivery is not configured. Please contact the branch office.');
  const candidate = await prisma.candidate.findUnique({ where: { publicTrackingToken: String(req.body.token || '') }, include: trackingInclude });
  if (!candidate) return fail(res, 404, 'Tracking link not found');
  if (!canSendTrackingEmail(req, candidate.id)) return fail(res, 429, 'Email resend limit reached. Please try again later.');
  try {
    await sendTrackingEmail(candidate, candidate.applications[0]?.job || { title: 'your application' });
    res.json({ sent: true, email: candidate.email });
  } catch (error) {
    console.error('Applicant tracking email failed:', error.code || error.name || 'mail error');
    fail(res, 502, 'Email could not be sent. Please try again later.');
  }
});
app.post('/api/auth/login', limitLoginAttempts, async (req, res) => {
  const username = normalizedUsername(req.body.username);
  const user = await prisma.user.findUnique({ where: { username }, include: userInclude });
  if (!user || user.role === 'candidate' || !user.active || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) return fail(res, 401, 'Invalid username or password');
  if (user.passwordResetRequired && user.passwordResetExpiresAt && user.passwordResetExpiresAt <= new Date()) return fail(res, 401, 'One-time password expired. Ask your Super Admin to reset your account.');
  loginAttemptHits.delete(req.loginAttemptKey);
  await prisma.auditLog.create({ data: { actorId: user.id, actorName: user.name, actorEmail: user.email, action: 'login', entity: 'session', metadata: { email: user.email } } }).catch(() => undefined);
  res.json({ token: tokenFor(user), passwordResetRequired: user.passwordResetRequired, user: publicUser(user) });
});
app.post('/api/auth/first-password', auth, async (req, res) => {
  if (!req.user.passwordResetRequired) return fail(res, 409, 'A first-login password change is not required.');
  if (req.user.passwordResetExpiresAt && req.user.passwordResetExpiresAt <= new Date()) return fail(res, 401, 'One-time password expired. Ask your Super Admin to reset your account.');
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (email !== req.user.email.toLowerCase()) return fail(res, 400, 'The email address does not match this account.');
  if (!validNewPassword(password)) return fail(res, 400, 'Use at least 10 characters with both letters and numbers.');
  if (password !== req.body.confirmPassword) return fail(res, 400, 'The new passwords do not match.');
  const updated = await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(password, 12), passwordResetRequired: false, passwordResetExpiresAt: null, tokenVersion: { increment: 1 } } });
  await audit(req, 'set_password', 'user', updated.id, { method: 'one_time_password' });
  res.status(204).end();
});
app.post('/api/auth/password/change', auth, async (req, res) => {
  const username = normalizedUsername(req.body.username);
  const email = String(req.body.email || '').trim().toLowerCase();
  const oldPassword = String(req.body.oldPassword || '');
  const password = String(req.body.password || '');
  if (username !== req.user.username || email !== req.user.email.toLowerCase() || !(await bcrypt.compare(oldPassword, req.user.passwordHash))) return fail(res, 401, 'Username, email, or current password did not match.');
  if (!validNewPassword(password)) return fail(res, 400, 'Use at least 10 characters with both letters and numbers.');
  if (password !== req.body.confirmPassword) return fail(res, 400, 'The new passwords do not match.');
  if (await bcrypt.compare(password, req.user.passwordHash)) return fail(res, 400, 'Choose a password different from the current password.');
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(password, 12), passwordResetRequired: false, passwordResetExpiresAt: null, tokenVersion: { increment: 1 } } });
  await audit(req, 'change_password', 'user', req.user.id, { method: 'username_email_current_password' });
  res.status(204).end();
});
app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.post('/api/auth/logout', auth, async (req, res) => { await audit(req, 'logout', 'session', req.user.id); res.status(204).end(); });
app.get('/api/audit', auth, allow('super_admin'), async (_req, res) => res.json(await prisma.auditLog.findMany({ include: { actor: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 500 })));
app.get('/api/branches', auth, async (req, res) => {
  const where = branchScopedRoles.includes(req.user.role) ? { id: req.user.branchId || '__none__' } : {};
  const branches = await prisma.branch.findMany({ where, include: { _count: { select: { users: true, candidates: true } } }, orderBy: { name: 'asc' } });
  const summaries = await Promise.all(branches.map(async branch => {
    const [deployed, revenue] = await Promise.all([
      prisma.candidate.count({ where: { branchId: branch.id, status: 'Deployed' } }),
      prisma.transaction.aggregate({ where: { branchId: branch.id, status: 'Paid' }, _sum: { amount: true } })
    ]);
    return { ...branch, staff: branch._count.users, activeCandidates: branch._count.candidates - deployed, deployed, totalRevenue: Number(revenue._sum.amount || 0) };
  }));
  res.json(summaries);
});
app.get('/api/passports', auth, allow('super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance'), async (req, res) => {
  const branchScoped = branchScopedRoles.includes(req.user.role);
  const branchId = branchScoped ? req.user.branchId || '__none__' : undefined;
  const legacyReceived = await prisma.candidate.findMany({ where: { physicalPassportReceived: true, passportInventory: null, ...(branchScoped ? { branchId } : {}) }, select: { id: true, branchId: true, physicalPassportReceivedAt: true } });
  if (legacyReceived.length) await prisma.passportInventory.createMany({ data: legacyReceived.map(candidate => ({ candidateId: candidate.id, branchId: candidate.branchId, status: 'In_Storage', receivedAt: candidate.physicalPassportReceivedAt || new Date() })), skipDuplicates: true });
  const where = branchScoped ? { branchId } : {};
  res.json(await prisma.passportInventory.findMany({ where, include: { candidate: true, branch: true, receivedBy: { select: { id: true, name: true } }, releasedBy: { select: { id: true, name: true } } }, orderBy: { receivedAt: 'desc' } }));
});
app.post('/api/passports', auth, allow('super_admin', 'branch_admin', 'branch_staff'), async (req, res) => {
  const candidate = await prisma.candidate.findUnique({ where: { id: req.body.candidateId } });
  if (!candidate || (branchScopedRoles.includes(req.user.role) && candidate.branchId !== req.user.branchId)) return fail(res, 404, 'Candidate not found in your branch');
  const record = await prisma.$transaction(async tx => {
    await tx.candidate.update({ where: { id: candidate.id }, data: { physicalPassportReceived: true, physicalPassportReceivedAt: new Date() } });
    return tx.passportInventory.upsert({
      where: { candidateId: candidate.id },
      create: { candidateId: candidate.id, branchId: candidate.branchId, status: 'In_Storage', storageLocation: req.body.storageLocation || null, notes: req.body.notes || null, receivedById: req.user.id },
      update: { branchId: candidate.branchId, status: 'In_Storage', storageLocation: req.body.storageLocation || null, notes: req.body.notes || null, receivedAt: new Date(), receivedById: req.user.id, releasedAt: null, releasedById: null }
    });
  });
  await audit(req, 'passport_received', 'passport_inventory', record.id, { candidateId: candidate.id, branchId: candidate.branchId });
  res.status(201).json(record);
});
app.patch('/api/passports/:id', auth, allow('super_admin', 'branch_admin', 'branch_staff'), async (req, res) => {
  const existing = await prisma.passportInventory.findUnique({ where: { id: req.params.id } });
  if (!existing || (branchScopedRoles.includes(req.user.role) && existing.branchId !== req.user.branchId)) return fail(res, 404, 'Passport record not found');
  const allowed = ['In_Storage', 'Released_To_Candidate', 'Released_To_Embassy', 'Returned_To_Office'];
  if (!allowed.includes(req.body.status)) return fail(res, 400, 'Invalid passport custody status');
  const isRelease = req.body.status.startsWith('Released_');
  const record = await prisma.passportInventory.update({ where: { id: existing.id }, data: { status: req.body.status, storageLocation: req.body.storageLocation, notes: req.body.notes, releasedAt: isRelease ? new Date() : null, releasedById: isRelease ? req.user.id : null } });
  await audit(req, 'passport_custody_update', 'passport_inventory', record.id, { candidateId: record.candidateId, status: record.status });
  res.json(record);
});
app.post('/api/branches', auth, allow('super_admin'), async (req, res) => { const branch = await prisma.branch.create({ data: { name: req.body.name, code: req.body.code, accent: req.body.accent || '#0f766e' } }); await audit(req, 'create', 'branch', branch.id); res.status(201).json(branch); });
app.get('/api/users', auth, allow('super_admin', 'branch_admin'), async (req, res) => {
  const where = req.user.role === 'branch_admin' ? { branchId: req.user.branchId || '__none__', role: { not: 'candidate' } } : { role: { not: 'candidate' } };
  res.json((await prisma.user.findMany({ where, include: { branch: true }, orderBy: { name: 'asc' } })).map(publicUser));
});
app.post('/api/users', auth, allow('super_admin', 'branch_admin'), async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();
  const username = normalizedUsername(req.body.username);
  const { role } = req.body;
  const branchId = req.user.role === 'branch_admin' ? req.user.branchId : req.body.branchId;
  if (!email || !name || !role || !username) return fail(res, 400, 'Complete all account fields');
  if (!validUsername(username)) return fail(res, 400, 'Username must be 3-32 characters using letters, numbers, dots, underscores, or hyphens.');
  if (!allowedUserRoles.includes(role)) return fail(res, 400, 'Invalid user role.');
  if (req.user.role === 'branch_admin' && !['branch_staff', 'branch_finance'].includes(role)) return fail(res, 403, 'Branch Admins can create only Branch Staff and Branch Finance accounts.');
  if (branchScopedRoles.includes(role) && !branchId) return fail(res, 400, 'A branch is required for branch users');
  const oneTimePassword = temporaryPassword();
  const user = await prisma.user.create({ data: {
    username, email, name, role, branchId: branchId || null, passwordHash: await bcrypt.hash(oneTimePassword, 12),
    passwordResetRequired: true, passwordResetExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), active: true
  } });
  await audit(req, 'create', 'user', user.id, { role, username, branchId: branchId || null });
  let emailSent = false;
  try { emailSent = await sendTemporaryPassword(user, oneTimePassword); }
  catch (error) { console.error('One-time password email failed:', error.code || error.name || 'mail error'); }
  res.status(201).json({ ...publicUser(user), emailSent, temporaryPassword: emailSent ? undefined : oneTimePassword });
});
app.post('/api/users/:id/reset-password', auth, allow('super_admin', 'branch_admin'), async (req, res) => {
  const account = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!account) return fail(res, 404, 'User account not found');
  if (req.user.role === 'branch_admin' && (account.branchId !== req.user.branchId || !['branch_staff', 'branch_finance'].includes(account.role))) return fail(res, 404, 'User account not found in your branch.');
  const oneTimePassword = temporaryPassword();
  const updated = await prisma.user.update({ where: { id: account.id }, data: {
    passwordHash: await bcrypt.hash(oneTimePassword, 12), passwordResetRequired: true,
    passwordResetExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), tokenVersion: { increment: 1 }
  } });
  await audit(req, 'reset_password', 'user', account.id, { username: account.username });
  let emailSent = false;
  try { emailSent = await sendTemporaryPassword(updated, oneTimePassword); }
  catch (error) { console.error('Password reset email failed:', error.code || error.name || 'mail error'); }
  res.json({ username: updated.username, email: updated.email, emailSent, temporaryPassword: emailSent ? undefined : oneTimePassword });
});
app.delete('/api/users/:id', auth, allow('super_admin'), async (req, res) => {
  const recruiter = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!recruiter || recruiter.role !== 'recruiter') return fail(res, 404, 'Recruiter account not found');
  const custodyReferences = await prisma.passportInventory.count({ where: { OR: [{ receivedById: recruiter.id }, { releasedById: recruiter.id }] } });
  if (custodyReferences) return fail(res, 409, 'Reassign this recruiter’s passport custody records before deleting the account.');
  await prisma.$transaction(async tx => {
    await tx.auditLog.updateMany({ where: { actorId: recruiter.id }, data: { actorName: recruiter.name, actorEmail: recruiter.email } });
    await tx.user.delete({ where: { id: recruiter.id } });
  });
  await audit(req, 'delete', 'recruiter', recruiter.id, { name: recruiter.name, email: recruiter.email, branchId: recruiter.branchId });
  res.json({ deleted: true });
});
app.patch('/api/users/:id', auth, allow('super_admin', 'branch_admin'), async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) return fail(res, 404, 'User account not found');
  if (req.user.role === 'branch_admin' && (existing.branchId !== req.user.branchId || !['branch_staff', 'branch_finance'].includes(existing.role) || req.user.id === existing.id)) return fail(res, 404, 'User account not found in your branch.');
  const username = req.body.username === undefined ? existing.username : normalizedUsername(req.body.username);
  const changes = { username, name: req.body.name, role: req.body.role, branchId: req.body.branchId || null, active: Boolean(req.body.active) };
  if (!validUsername(username || '')) return fail(res, 400, 'Username must be 3-32 characters using letters, numbers, dots, underscores, or hyphens.');
  if (!allowedUserRoles.includes(changes.role) || (req.user.role === 'branch_admin' && !['branch_staff', 'branch_finance'].includes(changes.role))) return fail(res, 403, 'You cannot assign this user role.');
  if (req.user.role === 'branch_admin') changes.branchId = req.user.branchId;
  if (branchScopedRoles.includes(changes.role) && !changes.branchId) return fail(res, 400, 'A branch is required for branch users');
  const user = await prisma.user.update({ where: { id: req.params.id }, data: changes });
  await audit(req, 'update', 'user', user.id, { role: changes.role, username, branchId: changes.branchId, active: changes.active });
  res.json(publicUser(user));
});
app.get('/api/candidates', auth, async (req, res) => {
  const candidates = await prisma.candidate.findMany({ where: candidateWhere(req.user), include: { branch: true, applications: { include: { job: true } }, documents: true }, orderBy: { createdAt: 'desc' } });
  const normalized = await Promise.all(candidates.map(async candidate => {
    if (candidate.trackingNumber && candidate.publicTrackingToken) return candidate;
    return prisma.$transaction(async tx => {
      const changes = { publicTrackingToken: candidate.publicTrackingToken || trackingToken() };
      if (!candidate.trackingNumber) changes.trackingNumber = await nextTrackingNumber(tx, candidate.branchId);
      return tx.candidate.update({ where: { id: candidate.id }, data: changes });
    });
  }));
  res.json(normalized);
});
app.post('/api/candidates', auth, allow('super_admin', 'branch_admin', 'branch_staff'), async (req, res) => {
  const body = req.body;
  const branchId = req.user.role === 'super_admin' ? body.branchId : req.user.branchId;
  const required = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'maritalStatus', 'passport', 'email', 'phone', 'registeredBy'];
  if (!branchId) return fail(res, 400, 'An office location is required');
  if (required.some(field => !body[field])) return fail(res, 400, 'Complete all required candidate fields');
  if (body.registeredBy === 'Sub-Agent' && !body.subAgentName) return fail(res, 400, 'Specify the sub-agent name');
  const name = [body.firstName, body.middleName, body.lastName].filter(Boolean).join(' ');
  const candidate = await prisma.$transaction(async transaction => {
    const number = await nextTrackingNumber(transaction, branchId);
    const created = await transaction.candidate.create({ data: {
      trackingNumber: number, publicTrackingToken: trackingToken(), name, firstName: body.firstName, middleName: body.middleName || null, lastName: body.lastName,
      dateOfBirth: new Date(body.dateOfBirth), gender: body.gender, maritalStatus: body.maritalStatus,
      weightKg: body.weightKg ? Number(body.weightKg) : null, heightFt: body.heightFt ? Number(body.heightFt) : null,
      passport: body.passport, passportExpiry: body.passportExpiry ? new Date(body.passportExpiry) : null,
      nationalId: body.nationalId || null, nationality: body.nationality || null, email: body.email,
      phone: body.phone, alternatePhone: body.alternatePhone || null, address: body.address || null,
      branchId, registeredBy: body.registeredBy, subAgentName: body.subAgentName || null, status: 'Application', docs: 0
    } });
    if (body.jobId) await transaction.application.create({ data: { candidateId: created.id, jobId: body.jobId, status: 'Shortlisted' } });
    return created;
  });
  await audit(req, 'create', 'candidate', candidate.id, { jobId: body.jobId || null });
  res.status(201).json(candidate);
});
app.delete('/api/candidates/:id', auth, allow('super_admin'), async (req, res) => {
  const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id }, include: { applications: true, documents: true } });
  if (!candidate) return fail(res, 404, 'Candidate not found');
  if (await prisma.transaction.count({ where: { candidateId: candidate.id } })) return fail(res, 409, 'Delete this candidate’s transaction entries first to preserve the finance ledger.');
  const result = await prisma.$transaction(async tx => {
    if (await tx.transaction.count({ where: { candidateId: candidate.id } })) return { blocked: true };
    const portalUser = await tx.user.findUnique({ where: { candidateId: candidate.id } });
    if (portalUser) {
      await tx.auditLog.updateMany({ where: { actorId: portalUser.id }, data: { actorName: portalUser.name, actorEmail: portalUser.email } });
      await tx.user.delete({ where: { id: portalUser.id } });
    }
    const applicationsByJob = new Map();
    for (const application of candidate.applications) applicationsByJob.set(application.jobId, (applicationsByJob.get(application.jobId) || 0) + 1);
    for (const [jobId, count] of applicationsByJob) {
      const job = await tx.job.findUnique({ where: { id: jobId }, select: { filled: true } });
      if (job) await tx.job.update({ where: { id: jobId }, data: { filled: Math.max(0, job.filled - count) } });
    }
    await tx.application.deleteMany({ where: { candidateId: candidate.id } });
    await tx.candidate.delete({ where: { id: candidate.id } });
    return { blocked: false };
  });
  if (result.blocked) return fail(res, 409, 'Delete this candidate’s transaction entries first to preserve the finance ledger.');
  const files = [...candidate.documents.map(document => document.filePath), candidate.profilePicturePath && path.join(uploadRoot, path.basename(candidate.profilePicturePath))].filter(Boolean);
  for (const file of files) {
    const resolved = path.resolve(file);
    if (resolved.startsWith(`${uploadRoot}${path.sep}`)) fs.rmSync(resolved, { force: true });
  }
  await audit(req, 'delete', 'candidate', candidate.id, { name: candidate.name, trackingNumber: candidate.trackingNumber, applicationsRemoved: candidate.applications.length });
  res.json({ deleted: true });
});
app.patch('/api/candidates/:id', auth, allow('super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance', 'recruiter'), async (req, res) => {
  const existing = await prisma.candidate.findUnique({ where: { id: req.params.id } });
  const branchRestricted = branchScopedRoles.includes(req.user.role);
  if (!existing || (branchRestricted && existing.branchId !== req.user.branchId)) return fail(res, 404, 'Candidate not found');
  const body = req.body;
  const workflow = ['Application', 'Document_Verification', 'Interview', 'Offer_Contract', 'Commission_Processing', 'Visa_Processing', 'Visa_Approved', 'Balance_Payment', 'Ticketing', 'Deployed'];
  const legacyIndex = { Registered: 0, Briefing_Done: 1, Medical_Done: 1, Post_Medical_Follow_up: 1, Interview_scheduled: 2, Job_matched: 3, Awaiting_payment: 7, Embassy_Appointment_Set: 5, Visa_Received: 6, PDOS_Done: 8, Ticket_Purchased: 8 };
  const stageIndex = status => workflow.indexOf(status) >= 0 ? workflow.indexOf(status) : (legacyIndex[status] ?? 0);
  const nextStatus = body.status || existing.status;
  if (body.status && !workflow.includes(body.status)) return fail(res, 400, 'Invalid candidate workflow stage');
  const currentIndex = stageIndex(existing.status);
  const nextIndex = stageIndex(nextStatus);
  if (nextIndex < currentIndex || nextIndex > currentIndex + 1) return fail(res, 400, 'Candidate stages must be completed sequentially. Advance only one stage at a time.');
  const passportReceived = body.physicalPassportReceived ?? existing.physicalPassportReceived;
  const docsVerified = body.documentsVerified ?? existing.documentsVerified;
  const interviewDate = body.interviewDate === undefined ? existing.interviewDate : (body.interviewDate ? new Date(body.interviewDate) : null);
  const interviewOutcome = body.interviewOutcome === undefined ? existing.interviewOutcome : body.interviewOutcome;
  const offerSigned = body.offerSigned ?? existing.offerSigned;
  if (nextIndex > currentIndex && nextStatus === 'Document_Verification' && !passportReceived) return fail(res, 400, 'Record physical passport receipt before document verification');
  if (nextIndex > currentIndex && nextStatus === 'Interview' && !docsVerified) return fail(res, 400, 'Verify required documents before scheduling the interview');
  if (nextIndex > currentIndex && nextStatus === 'Offer_Contract' && (!interviewDate || interviewOutcome !== 'Passed')) return fail(res, 400, 'Record the interview date and mark it passed before issuing an offer');
  if (nextIndex > currentIndex && nextStatus === 'Commission_Processing' && !offerSigned) return fail(res, 400, 'Mark the offer and contract as signed before commission processing');
  if (nextIndex > currentIndex && nextStatus === 'Ticketing' && Number(existing.paidAmount) < Number(existing.agreedFee)) return fail(res, 400, 'Clear the candidate balance before ticketing');
  const commissionTotal = Number(body.commissionTotal ?? (Number(existing.commissionTotal) > 0 ? existing.commissionTotal : existing.agreedFee) ?? 0);
  const feeParts = {
    visaFee: Number(body.visaFee ?? existing.visaFee ?? 0),
    medicalFee: Number(body.medicalFee ?? existing.medicalFee ?? 0),
    foreignAffairsAttestationFee: Number(body.foreignAffairsAttestationFee ?? existing.foreignAffairsAttestationFee ?? 0),
    kmpduMedicalFee: Number(body.kmpduMedicalFee ?? existing.kmpduMedicalFee ?? 0),
    embassyAttestationFee: Number(body.embassyAttestationFee ?? existing.embassyAttestationFee ?? 0),
    airTicketFee: Number(body.airTicketFee ?? existing.airTicketFee ?? 0)
  };
  if (commissionTotal < 0 || Object.values(feeParts).some(amount => !Number.isFinite(amount) || amount < 0)) return fail(res, 400, 'Commission amounts must be valid non-negative values');
  const officeFee = commissionTotal - Object.values(feeParts).reduce((sum, amount) => sum + amount, 0);
  if (officeFee < 0) return fail(res, 400, 'Visa, medical, attestation, and ticket costs cannot exceed Commission Total');
  const candidate = await prisma.$transaction(async transaction => {
    const updated = await transaction.candidate.update({ where: { id: existing.id }, data: {
      name: [body.firstName, body.middleName, body.lastName].filter(Boolean).join(' ') || undefined,
      firstName: body.firstName, middleName: body.middleName, lastName: body.lastName, dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      gender: body.gender, maritalStatus: body.maritalStatus, weightKg: body.weightKg === undefined ? undefined : Number(body.weightKg), heightFt: body.heightFt === undefined ? undefined : Number(body.heightFt),
      passport: body.passport, passportExpiry: body.passportExpiry ? new Date(body.passportExpiry) : undefined, nationalId: body.nationalId, nationality: body.nationality,
      email: body.email, phone: body.phone, alternatePhone: body.alternatePhone, address: body.address, registeredBy: body.registeredBy, subAgentName: body.subAgentName,
      status: body.status, docs: body.docs === undefined ? undefined : Number(body.docs), agreedFee: commissionTotal, commissionTotal, ...feeParts, officeFee, specialComments: body.specialComments,
      physicalPassportReceived: body.physicalPassportReceived, physicalPassportReceivedAt: body.physicalPassportReceived === true && !existing.physicalPassportReceived ? new Date() : undefined,
      documentsVerified: body.documentsVerified, interviewDate, interviewOutcome, offerIssued: body.offerIssued, offerSigned
    } });
    if (body.physicalPassportReceived === true && !existing.physicalPassportReceived) {
      await transaction.passportInventory.upsert({
        where: { candidateId: existing.id },
        create: { candidateId: existing.id, branchId: existing.branchId, status: 'In_Storage', receivedById: req.user.id },
        update: { status: 'In_Storage', receivedAt: new Date(), receivedById: req.user.id, releasedAt: null, releasedById: null }
      });
    }
    if (body.jobId) { await transaction.application.deleteMany({ where: { candidateId: existing.id, jobId: { not: body.jobId } } }); await transaction.application.upsert({ where: { candidateId_jobId: { candidateId: existing.id, jobId: body.jobId } }, create: { candidateId: existing.id, jobId: body.jobId }, update: {} }); }
    return updated;
  });
  await audit(req, 'update', 'candidate', candidate.id, body); res.json(candidate);
});
app.post('/api/candidates/:id/documents', auth, allow('super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance', 'recruiter'), async (req, res) => { const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } }); const branchRestricted = branchScopedRoles.includes(req.user.role); if (!candidate || (branchRestricted && candidate.branchId !== req.user.branchId)) return fail(res, 404, 'Candidate not found'); if (!req.body.content || !req.body.fileName) return fail(res, 400, 'A file is required'); const safeName = `${Date.now()}-${path.basename(req.body.fileName)}`; const filePath = path.join(uploadRoot, safeName); fs.writeFileSync(filePath, Buffer.from(req.body.content, 'base64')); if (req.body.kind === 'profile') { const updated = await prisma.candidate.update({ where: { id: candidate.id }, data: { profilePicturePath: `/uploads/${safeName}` } }); await audit(req, 'upload', 'profile_picture', candidate.id); return res.status(201).json(updated); } const document = await prisma.document.create({ data: { candidateId: candidate.id, name: req.body.name || req.body.fileName, fileName: req.body.fileName, filePath, mimeType: req.body.mimeType || 'application/octet-stream', documentType: req.body.documentType || 'Other' } }); await audit(req, 'upload', 'document', document.id, { candidateId: candidate.id, documentType: document.documentType }); res.status(201).json(document); });
app.post('/api/candidates/:id/documents/scan', auth, allow('super_admin', 'super_finance', 'branch_admin', 'branch_staff', 'branch_finance', 'recruiter'), async (req, res) => {
  const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } });
  const branchRestricted = branchScopedRoles.includes(req.user.role);
  if (!candidate || (branchRestricted && candidate.branchId !== req.user.branchId)) return fail(res, 404, 'Candidate not found');
  if (!Array.isArray(req.body.pages) || req.body.pages.length === 0) return fail(res, 400, 'Capture at least one document page');
  if (req.body.pages.length > 20) return fail(res, 400, 'A scan can contain at most 20 pages');
  if (req.body.pages.some(page => !page.content || !['image/jpeg', 'image/png'].includes(page.mimeType))) return fail(res, 400, 'Scanned pages must be JPEG or PNG images');
  const pdf = new PDFDocument({ autoFirstPage: false, margin: 0, size: 'A4' });
  const chunks = [];
  const completed = new Promise((resolve, reject) => { pdf.on('data', chunk => chunks.push(chunk)); pdf.on('end', resolve); pdf.on('error', reject); });
  try {
    for (const page of req.body.pages) {
      const bytes = Buffer.from(String(page.content || ''), 'base64');
      if (!bytes.length) throw new Error('Empty scan page');
      pdf.addPage({ size: 'A4', margin: 0 });
      pdf.image(bytes, 0, 0, { fit: [595.28, 841.89], align: 'center', valign: 'center' });
    }
    pdf.end();
    await completed;
  } catch { return fail(res, 400, 'Could not convert the captured images to PDF'); }
  const fileName = `candidate-${candidate.id}-${Date.now()}.pdf`;
  const filePath = path.join(uploadRoot, fileName);
  fs.writeFileSync(filePath, Buffer.concat(chunks));
  const document = await prisma.document.create({ data: { candidateId: candidate.id, name: req.body.name || 'Camera scan', fileName, filePath, mimeType: 'application/pdf', documentType: req.body.documentType || 'Other' } });
  await audit(req, 'scan_upload', 'document', document.id, { candidateId: candidate.id, documentType: document.documentType, pages: req.body.pages.length });
  res.status(201).json(document);
});
app.get('/api/jobs', auth, async (req, res) => res.json(await prisma.job.findMany({ where: req.user.role === 'super_admin' ? {} : { status: { in: ['Open', 'Filled'] } }, orderBy: { createdAt: 'desc' } })));
app.post('/api/jobs', auth, allow('super_admin', 'recruiter'), async (req, res) => { const body = req.body; const required = ['title', 'jobType', 'headcountRequired', 'contractDurationMonths', 'currency', 'minimumSalary', 'maximumSalary', 'location', 'country', 'requiredSkills']; if (required.some(field => body[field] === undefined || body[field] === '')) return fail(res, 400, 'Complete all required job-order fields'); const countryPrefixes = { Qatar: 'QAT', Kuwait: 'KWT', UAE: 'UAE', Saudi: 'SAU', Oman: 'OMN', Bahrain: 'BHR', Europe: 'EUR', 'USA/ Canada/ UK': 'USA' }; const prefix = countryPrefixes[body.country] || String(body.country).toUpperCase().slice(0, 3); const count = await prisma.job.count({ where: { country: body.country } }); const reference = `JO-${prefix}-${String(count + 1).padStart(3, '0')}`; const job = await prisma.job.create({ data: { reference, title: body.title, jobType: body.jobType, employer: body.employer || 'Unassigned employer', headcountRequired: Number(body.headcountRequired), contractDurationMonths: Number(body.contractDurationMonths), currency: body.currency, minimumSalary: Number(body.minimumSalary), maximumSalary: Number(body.maximumSalary), location: body.location, country: body.country, requiredSkills: body.requiredSkills, comments: body.comments || null, openings: Number(body.headcountRequired), status: 'Open' } }); await audit(req, 'create', 'job', job.id, { reference }); res.status(201).json(job); });
app.delete('/api/jobs/:id', auth, allow('super_admin'), async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id }, include: { _count: { select: { applications: true } } } });
  if (!job) return fail(res, 404, 'Job order not found');
  await prisma.$transaction(async tx => {
    await tx.application.deleteMany({ where: { jobId: job.id } });
    await tx.job.delete({ where: { id: job.id } });
  });
  await audit(req, 'delete', 'job', job.id, { reference: job.reference, title: job.title, country: job.country, applicationsRemoved: job._count.applications });
  res.json({ deleted: true, applicationsRemoved: job._count.applications });
});
app.get('/api/applications', auth, async (req, res) => { const where = req.user.role === 'candidate' ? { candidateId: req.user.candidateId || '__none__' } : req.user.branchId && !['super_admin', 'super_finance', 'recruiter'].includes(req.user.role) ? { candidate: { branchId: req.user.branchId } } : {}; res.json(await prisma.application.findMany({ where, include: { candidate: true, job: true }, orderBy: { createdAt: 'desc' } })); });
app.post('/api/applications', auth, allow('super_admin', 'recruiter', 'branch_admin', 'branch_staff'), async (req, res) => { const candidate = await prisma.candidate.findUnique({ where: { id: req.body.candidateId } }); if (!candidate || (branchScopedRoles.includes(req.user.role) && candidate.branchId !== req.user.branchId)) return fail(res, 403, 'Candidate is outside your branch'); const application = await prisma.application.create({ data: { candidateId: candidate.id, jobId: req.body.jobId, status: req.body.status || 'Shortlisted' } }); await prisma.job.update({ where: { id: req.body.jobId }, data: { filled: { increment: 1 } } }); await audit(req, 'create', 'application', application.id); res.status(201).json(application); });
app.get('/api/transactions', auth, async (req, res) => {
  const where = ['branch_admin', 'branch_finance'].includes(req.user.role) ? { branchId: req.user.branchId || '__none__' } : ['super_admin', 'super_finance'].includes(req.user.role) ? {} : { branchId: '__none__' };
  res.json(await prisma.transaction.findMany({ where, include: { branch: true, candidate: true }, orderBy: { createdAt: 'desc' } }));
});
app.post('/api/transactions', auth, allow('super_admin', 'super_finance', 'branch_finance', 'branch_staff', 'branch_admin'), async (req, res) => {
  const candidate = await prisma.candidate.findUnique({ where: { id: req.body.candidateId } });
  if (!candidate) return fail(res, 400, 'Map this payment to a registered candidate');
  if (branchScopedRoles.includes(req.user.role) && candidate.branchId !== req.user.branchId) return fail(res, 403, 'Candidate is outside your branch');
  if (!['Receipt', 'Refund', 'Other'].includes(req.body.type)) return fail(res, 400, 'Choose Receipt, Refund, or Other.');
  const otherDescription = String(req.body.otherDescription || '').trim();
  if (req.body.type === 'Other' && !otherDescription) return fail(res, 400, 'Specify what this other transaction is for.');
  if (otherDescription.length > 300) return fail(res, 400, 'The other transaction description must be 300 characters or fewer.');
  const amount = Number(req.body.amount);
  const exchangeRate = Number(req.body.exchangeRate || 1);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(exchangeRate) || exchangeRate <= 0) return fail(res, 400, 'Enter a valid payment amount and exchange rate');
  const amountKes = amount * exchangeRate;
  const transaction = await prisma.transaction.create({ data: {
    branchId: candidate.branchId, candidateId: candidate.id, party: candidate.name, type: req.body.type,
    otherDescription: req.body.type === 'Other' ? otherDescription : null, amount,
    currency: req.body.currency || 'KES', exchangeRate, amountKes,
    paymentMethod: req.body.paymentMethod || 'Cash', paymentReference: req.body.paymentReference || null,
    status: 'Pending_approval'
  } });
  await audit(req, 'create', 'transaction', transaction.id, { candidateId: candidate.id, type: transaction.type, amountKes });
  res.status(201).json(transaction);
});
app.patch('/api/transactions/:id', auth, allow('super_admin', 'super_finance', 'branch_finance'), async (req, res) => {
  const result = await prisma.$transaction(async database => {
    const existing = await database.transaction.findUnique({ where: { id: req.params.id } });
    if (!existing || (req.user.role === 'branch_finance' && existing.branchId !== req.user.branchId)) return { missing: true };
    const newStatus = req.body.status;
    if (!['Pending', 'Pending_approval', 'Paid', 'Rejected'].includes(newStatus)) return { invalidStatus: true };
    const effect = ['Receipt', 'Candidate fee', 'Agency commission'].includes(existing.type) ? 1 : existing.type === 'Refund' ? -1 : 0;
    const wasPaid = existing.status === 'Paid';
    const willBePaid = newStatus === 'Paid';
    if (existing.candidateId && effect && wasPaid !== willBePaid) {
      const candidate = await database.candidate.findUnique({ where: { id: existing.candidateId }, select: { paidAmount: true } });
      if (candidate) {
        const nextPaid = Number(candidate.paidAmount) + effect * Number(existing.amountKes) * (willBePaid ? 1 : -1);
        if (nextPaid < 0) return { refundTooLarge: true };
        await database.candidate.update({ where: { id: existing.candidateId }, data: { paidAmount: nextPaid } });
      }
    }
    const transaction = await database.transaction.update({ where: { id: existing.id }, data: { status: newStatus } });
    return { transaction };
  });
  if (result.missing) return fail(res, 404, 'Transaction not found');
  if (result.invalidStatus) return fail(res, 400, 'Invalid transaction status.');
  if (result.refundTooLarge) return fail(res, 409, 'Refund exceeds the candidate’s recorded receipts.');
  await audit(req, 'update', 'transaction', result.transaction.id, { status: result.transaction.status });
  res.json(result.transaction);
});
app.delete('/api/transactions/:id', auth, allow('super_admin'), async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const transaction = await tx.transaction.findUnique({ where: { id: req.params.id } });
    if (!transaction) return null;
    const commissionEffect = ['Receipt', 'Candidate fee', 'Agency commission'].includes(transaction.type) ? 1 : transaction.type === 'Refund' ? -1 : 0;
    if (transaction.status === 'Paid' && transaction.candidateId && commissionEffect) {
      const candidate = await tx.candidate.findUnique({ where: { id: transaction.candidateId }, select: { paidAmount: true } });
      if (candidate) await tx.candidate.update({ where: { id: transaction.candidateId }, data: { paidAmount: Math.max(0, Number(candidate.paidAmount) - commissionEffect * Number(transaction.amountKes)) } });
    }
    await tx.transaction.delete({ where: { id: transaction.id } });
    return transaction;
  });
  if (!result) return fail(res, 404, 'Transaction entry not found');
  await audit(req, 'delete', 'transaction', result.id, { candidateId: result.candidateId, party: result.party, amountKes: Number(result.amountKes), status: result.status });
  res.json({ deleted: true });
});
app.use((error, _req, res, _next) => { console.error(error); res.status(error.code === 'P2002' ? 409 : 500).json({ message: 'Request could not be completed' }); });
app.listen(port, () => console.log(`ROMS API listening on ${port}`));
