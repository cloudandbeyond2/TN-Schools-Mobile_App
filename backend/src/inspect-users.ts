import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  console.log("Users:", JSON.stringify(users, null, 2));

  const students = await prisma.student.findMany({
    select: { id: true, userId: true, class: true, section: true, rollNumber: true }
  });
  console.log("Students:", JSON.stringify(students, null, 2));
}

main().finally(() => prisma.$disconnect());
