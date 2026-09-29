import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const branches = await prisma.branch.findMany({ orderBy: { code: 'asc' } });
  const normalizedCodes = new Set();

  for (const branch of branches) {
    const branchCode = branch.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!branchCode || normalizedCodes.has(branchCode)) throw new Error(`Branch code is empty or duplicated after normalization: ${branch.code}`);
    normalizedCodes.add(branchCode);

    const candidates = await prisma.candidate.findMany({
      where: { branchId: branch.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, publicTrackingToken: true }
    });

    await prisma.$transaction(async tx => {
      for (const [index, candidate] of candidates.entries()) {
        await tx.candidate.update({
          where: { id: candidate.id },
          data: {
            trackingNumber: `ROMS-${branchCode}-${String(index + 1).padStart(3, '0')}`,
            publicTrackingToken: candidate.publicTrackingToken || randomBytes(24).toString('hex')
          }
        });
      }
      await tx.branch.update({ where: { id: branch.id }, data: { trackingSequence: candidates.length } });
    }, { timeout: 120000 });

    console.log(`${branch.code}: ${candidates.length} tracking IDs ready`);
  }
} finally {
  await prisma.$disconnect();
}