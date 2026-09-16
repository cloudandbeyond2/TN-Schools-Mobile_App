-- CreateTable
CREATE TABLE "HeadmasterTempStaff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "agency" TEXT NOT NULL DEFAULT 'Direct Contract',
    "joined" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT 'N/A',
    "email" TEXT NOT NULL DEFAULT 'N/A',
    "duration" TEXT NOT NULL DEFAULT '12 Months',
    "salary" TEXT NOT NULL DEFAULT 'N/A',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "password" TEXT NOT NULL DEFAULT '123456',
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeadmasterTempStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeadmasterTempStaff_schoolId_idx" ON "HeadmasterTempStaff"("schoolId");
