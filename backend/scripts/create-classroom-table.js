const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createClassroomTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClassRoom" (
        id TEXT PRIMARY KEY,
        "schoolId" TEXT NOT NULL,
        "teacherId" TEXT,
        "className" TEXT NOT NULL,
        section TEXT NOT NULL,
        subject TEXT NOT NULL,
        "academicYear" TEXT NOT NULL DEFAULT '2024-25',
        "roomNumber" TEXT,
        schedule TEXT,
        "totalStudents" INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ ClassRoom table created!');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ClassRoom_schoolId_idx" ON "ClassRoom"("schoolId")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ClassRoom_teacherId_idx" ON "ClassRoom"("teacherId")
    `);
    console.log('✅ Indexes created!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

createClassroomTable();
