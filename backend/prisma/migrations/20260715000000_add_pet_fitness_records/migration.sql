-- CreateTable
CREATE TABLE "PetFitnessRecord" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "studentId" TEXT,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL DEFAULT '',
    "sport" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "heightCm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endurance" INTEGER NOT NULL DEFAULT 70,
    "strength" INTEGER NOT NULL DEFAULT 70,
    "flexibility" INTEGER NOT NULL DEFAULT 70,
    "speed" INTEGER NOT NULL DEFAULT 70,
    "lastAssessed" TEXT NOT NULL DEFAULT '',
    "activityLevel" TEXT NOT NULL DEFAULT 'Moderate',
    "weeklyActivityHrs" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "restingHeartRate" INTEGER NOT NULL DEFAULT 0,
    "bloodGroup" TEXT NOT NULL DEFAULT '',
    "vision" TEXT NOT NULL DEFAULT 'Normal',
    "lastCheckup" TEXT NOT NULL DEFAULT '',
    "healthNotes" TEXT NOT NULL DEFAULT '',
    "mentalHealth" TEXT NOT NULL DEFAULT 'Good',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetFitnessRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PetFitnessRecord_schoolId_idx" ON "PetFitnessRecord"("schoolId");

-- CreateIndex
CREATE INDEX "PetFitnessRecord_studentId_idx" ON "PetFitnessRecord"("studentId");
