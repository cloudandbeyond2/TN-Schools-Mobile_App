import { prisma } from '../src/config/prisma';

async function main() {
  console.log("Creating Celebration table in PostgreSQL...");
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Celebration" (
          "id" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "date" TIMESTAMP(3) NOT NULL,
          "description" TEXT,
          "type" TEXT NOT NULL DEFAULT 'EVENT',
          "schoolId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "Celebration_pkey" PRIMARY KEY ("id")
      );
    `;
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Celebration" 
        ADD CONSTRAINT "Celebration_schoolId_fkey" 
        FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `;
      console.log("Added foreign key constraint.");
    } catch (err) {
      console.log("FK constraint skip: already exists or failed.");
    }

    try {
      await prisma.$executeRaw`
        CREATE INDEX "Celebration_schoolId_idx" ON "Celebration"("schoolId");
      `;
      console.log("Created schoolId index.");
    } catch (err) {
      console.log("Index skip: already exists or failed.");
    }

    console.log("✅ Celebration table creation complete!");
  } catch (err) {
    console.error("❌ Failed to create table:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
