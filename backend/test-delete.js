const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDelete() {
  const subject = await prisma.academicSubject.findFirst({
    where: { name: 'Information Technology' }
  });
  if (!subject) {
    console.log("Subject not found");
    return;
  }
  console.log(`Deleting subject: ${subject.name} (${subject.id})`);
  try {
    await prisma.academicSubject.delete({ where: { id: subject.id } });
    console.log("Deleted successfully!");
  } catch (err) {
    console.error("Failed to delete:", err);
  }
}

testDelete().catch(console.error).finally(() => prisma.$disconnect());
