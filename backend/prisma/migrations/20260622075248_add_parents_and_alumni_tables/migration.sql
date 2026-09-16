-- CreateTable
CREATE TABLE "HeadmasterParent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "studentName" TEXT NOT NULL DEFAULT 'N/A',
    "studentClass" TEXT NOT NULL DEFAULT 'N/A',
    "term" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT '123456',
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeadmasterParent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeadmasterAlumni" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "contribution" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT 'N/A',
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeadmasterAlumni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeadmasterParent_schoolId_idx" ON "HeadmasterParent"("schoolId");

-- CreateIndex
CREATE INDEX "HeadmasterAlumni_schoolId_idx" ON "HeadmasterAlumni"("schoolId");
