-- Add section targeting to LessonPlan so teachers can publish to a specific
-- class section (A/B/C/D) or to all sections (NULL = all).
ALTER TABLE "LessonPlan" ADD COLUMN "section" TEXT;
CREATE INDEX "LessonPlan_section_idx" ON "LessonPlan"("section");
