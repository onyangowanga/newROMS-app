import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const password = await bcrypt.hash(process.env.SEED_PASSWORD || 'password@123', 12);

const branches = await Promise.all([
  prisma.branch.upsert({ where: { code: 'NBO' }, update: {}, create: { name: 'Nairobi', code: 'NBO' } }),
  prisma.branch.upsert({ where: { code: 'MBA' }, update: {}, create: { name: 'Mombasa', code: 'MBA', accent: '#e76f51' } }),
  prisma.branch.upsert({ where: { code: 'KSM' }, update: {}, create: { name: 'Kisumu', code: 'KSM', accent: '#d9a441' } })
]);
const [nairobi, mombasa, kisumu] = branches;
const users = [
  ['admin@rabiyaroms.top', 'ROMS Administrator', 'super_admin', null],
  ['finance@rabiyaroms.top', 'Agency Finance', 'super_finance', null],
  ['nairobi@rabiyaroms.top', 'Nairobi Operations', 'branch_staff', nairobi.id],
  ['mombasa.finance@rabiyaroms.top', 'Mombasa Finance', 'branch_finance', mombasa.id],
  ['recruiter@rabiyaroms.top', 'Global Recruiter', 'recruiter', null]
];
for (const [email, name, role, branchId] of users) {
  await prisma.user.upsert({ where: { email }, update: { name, role, branchId, passwordHash: password }, create: { email, name, role, branchId, passwordHash: password } });
}
await prisma.job.createMany({ data: [
  { title: 'Care Assistants', employer: 'NordCare Group', country: 'Finland', openings: 18, filled: 11 },
  { title: 'Welders', employer: 'Al Noor Construction', country: 'Qatar', openings: 12, filled: 8 }
], skipDuplicates: true });
console.log('ROMS seed complete. Seed password is controlled by SEED_PASSWORD.');
await prisma.$disconnect();
