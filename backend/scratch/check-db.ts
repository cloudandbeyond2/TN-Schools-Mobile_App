import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const exams = await prisma.competitiveExam.findMany();
  console.log("Total exams found:", exams.length);
  for (const exam of exams) {
    console.log(`- Exam: ID=${exam.id}, Name="${exam.examName}", Category="${exam.category}"`);
    console.log(`  Syllabus is Null/Undefined? ${exam.syllabus === null || exam.syllabus === undefined}`);
    if (exam.syllabus) {
      console.log(`  Syllabus content (first 200 chars):`, JSON.stringify(exam.syllabus).substring(0, 200));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
