-- ============================================================
-- Migration: fix_all_relationships
-- Applied: 2026-06-29
-- Purpose: Add FK constraints, new columns, and Message table
--          to establish full referential integrity across all
--          modules: Students, Teachers, Staff, Parents, School.
-- ============================================================

-- ─── Step 1: Add new columns ─────────────────────────────────

-- HeadmasterStaff: formal link to User table
ALTER TABLE "HeadmasterStaff" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "HeadmasterStaff_userId_key" ON "HeadmasterStaff"("userId");

-- HeadmasterParent: formal link to User table
ALTER TABLE "HeadmasterParent" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "HeadmasterParent_userId_key" ON "HeadmasterParent"("userId");

-- WatchlistStudent: formal link to Student table
ALTER TABLE "WatchlistStudent" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "WatchlistStudent_studentId_key" ON "WatchlistStudent"("studentId");

-- HomeworkSubmission: formal link to Student table
ALTER TABLE "HomeworkSubmission" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
CREATE INDEX IF NOT EXISTS "HomeworkSubmission_studentId_idx" ON "HomeworkSubmission"("studentId");

-- LeaveRequest: audit trail — who submitted the leave
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "staffId" TEXT;

-- ─── Step 2: Clean orphaned data before adding FK constraints ─

-- ClassRoom: delete any rooms referencing non-existent schools (schoolId NOT NULL)
DELETE FROM "ClassRoom"
WHERE "schoolId" NOT IN (SELECT id FROM "School");

-- MidDayMeal: delete orphaned records (schoolId NOT NULL)
DELETE FROM "MidDayMeal"
WHERE "schoolId" NOT IN (SELECT id FROM "School");

-- SchoolAsset: delete orphaned records (schoolId NOT NULL)
DELETE FROM "SchoolAsset"
WHERE "schoolId" NOT IN (SELECT id FROM "School");

-- All nullable schoolId models: nullify invalid references
UPDATE "WatchlistStudent"   SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "HeadmasterStaff"    SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "HeadmasterTempStaff" SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "HeadmasterParent"   SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "PTAMeeting"         SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "HeadmasterAlumni"   SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "StudyMaterial"      SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "Announcement"       SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "Homework"           SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "EvaluationSubmission" SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "LabEquipment"       SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "LeaveRequest"       SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "LessonPlan"         SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "Question"           SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "Club"               SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");
UPDATE "ClubEvent"          SET "schoolId" = NULL WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School");

-- StudentBadge: delete badges referencing non-existent students (studentId NOT NULL)
DELETE FROM "StudentBadge"
WHERE "studentId" NOT IN (SELECT id FROM "Student");

-- ParentNotification: nullify studentId references pointing to non-existent students
UPDATE "ParentNotification"
SET "studentId" = NULL
WHERE "studentId" IS NOT NULL AND "studentId" NOT IN (SELECT id FROM "Student");

-- ─── Step 3: Add FK constraints (School relations) ───────────

-- ClassRoom → School (cascade on school delete)
ALTER TABLE "ClassRoom"
  ADD CONSTRAINT "ClassRoom_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE CASCADE;

-- MidDayMeal → School (cascade)
ALTER TABLE "MidDayMeal"
  ADD CONSTRAINT "MidDayMeal_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE CASCADE;

-- SchoolAsset → School (cascade)
ALTER TABLE "SchoolAsset"
  ADD CONSTRAINT "SchoolAsset_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE CASCADE;

-- WatchlistStudent → School (set null)
ALTER TABLE "WatchlistStudent"
  ADD CONSTRAINT "WatchlistStudent_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- HeadmasterStaff → School (set null)
ALTER TABLE "HeadmasterStaff"
  ADD CONSTRAINT "HeadmasterStaff_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- HeadmasterTempStaff → School (set null)
ALTER TABLE "HeadmasterTempStaff"
  ADD CONSTRAINT "HeadmasterTempStaff_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- HeadmasterParent → School (set null)
ALTER TABLE "HeadmasterParent"
  ADD CONSTRAINT "HeadmasterParent_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- PTAMeeting → School (set null)
ALTER TABLE "PTAMeeting"
  ADD CONSTRAINT "PTAMeeting_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- HeadmasterAlumni → School (set null)
ALTER TABLE "HeadmasterAlumni"
  ADD CONSTRAINT "HeadmasterAlumni_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- StudyMaterial → School (set null)
ALTER TABLE "StudyMaterial"
  ADD CONSTRAINT "StudyMaterial_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- Announcement → School (set null)
ALTER TABLE "Announcement"
  ADD CONSTRAINT "Announcement_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- Homework → School (set null)
ALTER TABLE "Homework"
  ADD CONSTRAINT "Homework_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- EvaluationSubmission → School (set null)
ALTER TABLE "EvaluationSubmission"
  ADD CONSTRAINT "EvaluationSubmission_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- LabEquipment → School (set null)
ALTER TABLE "LabEquipment"
  ADD CONSTRAINT "LabEquipment_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- LeaveRequest → School (set null)
ALTER TABLE "LeaveRequest"
  ADD CONSTRAINT "LeaveRequest_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- LessonPlan → School (set null)
ALTER TABLE "LessonPlan"
  ADD CONSTRAINT "LessonPlan_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- Question → School (set null)
ALTER TABLE "Question"
  ADD CONSTRAINT "Question_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- Club → School (set null)
ALTER TABLE "Club"
  ADD CONSTRAINT "Club_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- ClubEvent → School (set null)
ALTER TABLE "ClubEvent"
  ADD CONSTRAINT "ClubEvent_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL;

-- ─── Step 4: Add FK constraints (Student relations) ──────────

-- StudentBadge → Student (cascade on student delete)
ALTER TABLE "StudentBadge"
  ADD CONSTRAINT "StudentBadge_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE CASCADE;

-- WatchlistStudent → Student (set null on student delete)
ALTER TABLE "WatchlistStudent"
  ADD CONSTRAINT "WatchlistStudent_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE SET NULL;

-- HomeworkSubmission → Student (set null on student delete)
ALTER TABLE "HomeworkSubmission"
  ADD CONSTRAINT "HomeworkSubmission_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE SET NULL;

-- ParentNotification → Student (set null on student delete)
ALTER TABLE "ParentNotification"
  ADD CONSTRAINT "ParentNotification_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE SET NULL;

-- ─── Step 5: Add FK constraints (User relations) ─────────────

-- HeadmasterStaff → User (set null on user delete)
ALTER TABLE "HeadmasterStaff"
  ADD CONSTRAINT "HeadmasterStaff_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;

-- HeadmasterParent → User (set null on user delete)
ALTER TABLE "HeadmasterParent"
  ADD CONSTRAINT "HeadmasterParent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;

-- ─── Step 6: Fix Student/Teacher → User cascade behavior ─────

-- Drop existing FK (no cascade) and re-add with CASCADE
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_userId_fkey";
ALTER TABLE "Student"
  ADD CONSTRAINT "Student_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "Teacher" DROP CONSTRAINT IF EXISTS "Teacher_userId_fkey";
ALTER TABLE "Teacher"
  ADD CONSTRAINT "Teacher_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

-- ─── Step 7: Create Message table ────────────────────────────

CREATE TABLE IF NOT EXISTS "Message" (
  id          TEXT         NOT NULL PRIMARY KEY,
  "parentId"  TEXT         NOT NULL,
  sender      TEXT         NOT NULL,
  text        TEXT         NOT NULL,
  "schoolId"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "HeadmasterParent"(id) ON DELETE CASCADE,
  CONSTRAINT "Message_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Message_parentId_idx" ON "Message"("parentId");
CREATE INDEX IF NOT EXISTS "Message_schoolId_idx" ON "Message"("schoolId");
