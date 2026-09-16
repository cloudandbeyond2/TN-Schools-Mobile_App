import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { user: { name: { contains: "RRR", mode: "insensitive" } } },
        { rollNumber: { contains: "22UCA070", mode: "insensitive" } }
      ]
    },
    include: {
      user: true,
      school: true
    }
  });

  console.log(student);
  await prisma.$disconnect();
}

run().catch(console.error);
