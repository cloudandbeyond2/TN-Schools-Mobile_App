import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const students = await prisma.student.findMany({
    include: {
      user: true,
      school: true
    }
  });

  for (const s of students) {
    console.log({
      id: s.id,
      name: s.user.name,
      class: s.class,
      section: s.section,
      group: s.group,
      schoolName: s.school.name
    });
  }

  await prisma.$disconnect();
}

run().catch(console.error);
