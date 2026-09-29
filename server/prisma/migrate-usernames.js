import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const clean = value => value.toLowerCase().replace(/[^a-z0-9._-]/g, '').replace(/^[._-]+|[._-]+$/g, '').slice(0, 26) || 'user';

try {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  const usernames = new Set(users.map(user => user.username?.toLowerCase()).filter(Boolean));
  for (const user of users) {
    if (user.username) continue;
    const base = clean(user.email.split('@')[0]);
    let username = base;
    let suffix = 1;
    while (usernames.has(username)) {
      const tail = String(suffix++);
      username = `${base.slice(0, 32 - tail.length)}${tail}`;
    }
    await prisma.user.update({ where: { id: user.id }, data: { username } });
    usernames.add(username);
    console.log(`Assigned username for ${user.role}`);
  }
} finally {
  await prisma.$disconnect();
}