-- Publish gate for the AI Lesson Planner: a teacher's lesson plan is only
-- visible to students (as a focused projection view) once it is published.
ALTER TABLE "LessonPlan" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LessonPlan" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "LessonPlan" ADD COLUMN "className" TEXT;
CREATE INDEX "LessonPlan_isPublished_idx" ON "LessonPlan"("isPublished");
