/**
 * Dev fixture: ensure a bcrypt-hashed TEACHER login exists for verifying the
 * Smart Class page, with a Class 10 ClassRoom assigned to them.
 *
 * Run: npx ts-node scratch/create-smart-class-test-teacher.ts
 * Login: testteacher@tn.edu / 123456 (Parents & Staffs tab)
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst();
  if (!school) throw new Error('No school found in DB');

  const passwordHash = await hashPassword('123456');

  let user = await prisma.user.findFirst({
    where: { email: { equals: 'testteacher@tn.edu', mode: 'insensitive' } },
  });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, role: 'TEACHER', schoolId: user.schoolId ?? school.id, isActive: true },
    });
    console.log('Updated existing user', user.id);
  } else {
    user = await prisma.user.create({
      data: {
        name: 'Test Teacher',
        email: 'testteacher@tn.edu',
        passwordHash,
        role: 'TEACHER',
        schoolId: school.id,
      },
    });
    console.log('Created user', user.id);
  }

  const existingClass = await prisma.classRoom.findFirst({
    where: { teacherId: user.id, className: '10' },
  });
  if (existingClass) {
    console.log('ClassRoom already assigned:', existingClass.id);
  } else {
    const room = await prisma.classRoom.create({
      data: {
        schoolId: user.schoolId ?? school.id,
        teacherId: user.id,
        className: '10',
        section: 'A',
        subject: 'Mathematics',
        academicYear: '2026-27',
      },
    });
    console.log('Created ClassRoom', room.id);
  }

  console.log('Done. Login: testteacher@tn.edu / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
