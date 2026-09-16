import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const counts = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
    console.log('Group by success:', counts);
    const students = await prisma.student.count({ where: { studentStatus: 'Active' } });
    console.log('Student count success:', students);
  } catch(e) {
    console.error('error', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
