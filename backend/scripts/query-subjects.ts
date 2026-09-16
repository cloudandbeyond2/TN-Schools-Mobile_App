import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const subjects = await prisma.centralSubject.findMany({
    select: {
      class: true,
      name: true,
      applicableGroups: true
    }
  });

  console.log(subjects);
  await prisma.$disconnect();
}

run().catch(console.error);
