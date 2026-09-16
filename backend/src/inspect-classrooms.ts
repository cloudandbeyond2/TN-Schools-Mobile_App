import { prisma } from './config/prisma';

async function test() {
  try {
    console.log('--- ClassRoom Records ---');
    const classrooms = await prisma.$queryRaw`SELECT * FROM "ClassRoom"`;
    console.log(classrooms);

    console.log('\n--- HeadmasterStaff Records ---');
    const staff = await prisma.headmasterStaff.findMany();
    console.log(staff);

    console.log('\n--- Teacher Table Records ---');
    const teachers = await prisma.teacher.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });
    console.log(teachers);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
