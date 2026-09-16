const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.academicSubject.count();
  const subjects = await prisma.academicSubject.findMany({
    select: { name: true, board: true, class: true }
  });
  console.log(`Total subjects in DB: ${count}`);
  console.log(subjects);
}

check().catch(console.error).finally(() => prisma.$disconnect());
