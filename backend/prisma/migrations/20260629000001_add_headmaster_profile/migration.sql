-- CreateTable
CREATE TABLE IF NOT EXISTS "HeadmasterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "employeeId" TEXT,
    "joiningDate" TIMESTAMP(3),
    "address" TEXT,
    "gender" TEXT,
    "dob" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeadmasterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HeadmasterProfile_userId_key" ON "HeadmasterProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HeadmasterProfile_employeeId_key" ON "HeadmasterProfile"("employeeId");

-- AddForeignKey
ALTER TABLE "HeadmasterProfile" DROP CONSTRAINT IF EXISTS "HeadmasterProfile_userId_fkey";
ALTER TABLE "HeadmasterProfile" ADD CONSTRAINT "HeadmasterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeadmasterProfile" DROP CONSTRAINT IF EXISTS "HeadmasterProfile_schoolId_fkey";
ALTER TABLE "HeadmasterProfile" ADD CONSTRAINT "HeadmasterProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
