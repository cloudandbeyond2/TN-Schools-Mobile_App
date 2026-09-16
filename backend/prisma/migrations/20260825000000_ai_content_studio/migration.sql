-- CreateTable
CREATE TABLE "AiContent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "teacherId" TEXT,
    "classRoomId" TEXT,
    "skillKey" TEXT NOT NULL,
    "outputKind" TEXT NOT NULL,
    "subjectPack" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "section" TEXT,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'english',
    "payload" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiContent_schoolId_idx" ON "AiContent"("schoolId");

-- CreateIndex
CREATE INDEX "AiContent_teacherId_idx" ON "AiContent"("teacherId");

-- CreateIndex
CREATE INDEX "AiContent_skillKey_idx" ON "AiContent"("skillKey");

-- CreateIndex
CREATE INDEX "AiContent_isPublished_idx" ON "AiContent"("isPublished");

-- CreateIndex
CREATE INDEX "AiContent_className_idx" ON "AiContent"("className");
