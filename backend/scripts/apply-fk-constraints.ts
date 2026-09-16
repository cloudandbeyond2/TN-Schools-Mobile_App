import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements: { sql: string; desc: string }[] = [
  // ─── Add missing columns ────────────────────────────────────
  {
    sql: `ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "staffId" TEXT`,
    desc: 'Add LeaveRequest.staffId column',
  },

  // ─── Create Message table ───────────────────────────────────
  {
    sql: `CREATE TABLE IF NOT EXISTS "Message" (
      id          TEXT         NOT NULL PRIMARY KEY,
      "parentId"  TEXT         NOT NULL,
      sender      TEXT         NOT NULL,
      text        TEXT         NOT NULL,
      "schoolId"  TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    desc: 'Create Message table',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS "Message_parentId_idx" ON "Message"("parentId")`,
    desc: 'Index Message.parentId',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS "Message_schoolId_idx" ON "Message"("schoolId")`,
    desc: 'Index Message.schoolId',
  },

  // ─── FK: Message → HeadmasterParent, School ─────────────────
  {
    sql: `ALTER TABLE "Message" ADD CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "HeadmasterParent"(id) ON DELETE CASCADE`,
    desc: 'FK Message.parentId → HeadmasterParent',
  },
  {
    sql: `ALTER TABLE "Message" ADD CONSTRAINT "Message_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK Message.schoolId → School',
  },

  // ─── FK: ClassRoom → School (CASCADE) ───────────────────────
  {
    sql: `ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE CASCADE`,
    desc: 'FK ClassRoom.schoolId → School CASCADE',
  },

  // ─── FK: MidDayMeal → School (CASCADE) ──────────────────────
  {
    sql: `ALTER TABLE "MidDayMeal" ADD CONSTRAINT "MidDayMeal_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE CASCADE`,
    desc: 'FK MidDayMeal.schoolId → School CASCADE',
  },

  // ─── FK: SchoolAsset → School (CASCADE) ─────────────────────
  {
    sql: `ALTER TABLE "SchoolAsset" ADD CONSTRAINT "SchoolAsset_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE CASCADE`,
    desc: 'FK SchoolAsset.schoolId → School CASCADE',
  },

  // ─── FK: WatchlistStudent → School, Student ─────────────────
  {
    sql: `ALTER TABLE "WatchlistStudent" ADD CONSTRAINT "WatchlistStudent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK WatchlistStudent.schoolId → School SET NULL',
  },
  {
    sql: `ALTER TABLE "WatchlistStudent" ADD CONSTRAINT "WatchlistStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE SET NULL`,
    desc: 'FK WatchlistStudent.studentId → Student SET NULL',
  },

  // ─── FK: HeadmasterStaff → School, User ─────────────────────
  {
    sql: `ALTER TABLE "HeadmasterStaff" ADD CONSTRAINT "HeadmasterStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK HeadmasterStaff.schoolId → School SET NULL',
  },
  {
    sql: `ALTER TABLE "HeadmasterStaff" ADD CONSTRAINT "HeadmasterStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL`,
    desc: 'FK HeadmasterStaff.userId → User SET NULL',
  },

  // ─── FK: HeadmasterTempStaff → School ───────────────────────
  {
    sql: `ALTER TABLE "HeadmasterTempStaff" ADD CONSTRAINT "HeadmasterTempStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK HeadmasterTempStaff.schoolId → School SET NULL',
  },

  // ─── FK: HeadmasterParent → School, User ────────────────────
  {
    sql: `ALTER TABLE "HeadmasterParent" ADD CONSTRAINT "HeadmasterParent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK HeadmasterParent.schoolId → School SET NULL',
  },
  {
    sql: `ALTER TABLE "HeadmasterParent" ADD CONSTRAINT "HeadmasterParent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL`,
    desc: 'FK HeadmasterParent.userId → User SET NULL',
  },

  // ─── FK: StudentBadge → Student (CASCADE) ───────────────────
  {
    sql: `ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE CASCADE`,
    desc: 'FK StudentBadge.studentId → Student CASCADE',
  },

  // ─── FK: HomeworkSubmission → Student (SET NULL) ────────────
  {
    sql: `ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE SET NULL`,
    desc: 'FK HomeworkSubmission.studentId → Student SET NULL',
  },

  // ─── FK: ParentNotification → Student (SET NULL) ────────────
  {
    sql: `ALTER TABLE "ParentNotification" ADD CONSTRAINT "ParentNotification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE SET NULL`,
    desc: 'FK ParentNotification.studentId → Student SET NULL',
  },

  // ─── FK: PTAMeeting → School ────────────────────────────────
  {
    sql: `ALTER TABLE "PTAMeeting" ADD CONSTRAINT "PTAMeeting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK PTAMeeting.schoolId → School SET NULL',
  },

  // ─── FK: HeadmasterAlumni → School ──────────────────────────
  {
    sql: `ALTER TABLE "HeadmasterAlumni" ADD CONSTRAINT "HeadmasterAlumni_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK HeadmasterAlumni.schoolId → School SET NULL',
  },

  // ─── FK: StudyMaterial → School ─────────────────────────────
  {
    sql: `ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK StudyMaterial.schoolId → School SET NULL',
  },

  // ─── FK: Announcement → School ──────────────────────────────
  {
    sql: `ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK Announcement.schoolId → School SET NULL',
  },

  // ─── FK: Homework → School ──────────────────────────────────
  {
    sql: `ALTER TABLE "Homework" ADD CONSTRAINT "Homework_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK Homework.schoolId → School SET NULL',
  },

  // ─── FK: EvaluationSubmission → School ──────────────────────
  {
    sql: `ALTER TABLE "EvaluationSubmission" ADD CONSTRAINT "EvaluationSubmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK EvaluationSubmission.schoolId → School SET NULL',
  },

  // ─── FK: LabEquipment → School ──────────────────────────────
  {
    sql: `ALTER TABLE "LabEquipment" ADD CONSTRAINT "LabEquipment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK LabEquipment.schoolId → School SET NULL',
  },

  // ─── FK: LeaveRequest → School ──────────────────────────────
  {
    sql: `ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK LeaveRequest.schoolId → School SET NULL',
  },

  // ─── FK: LessonPlan → School ────────────────────────────────
  {
    sql: `ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK LessonPlan.schoolId → School SET NULL',
  },

  // ─── FK: Question → School ──────────────────────────────────
  {
    sql: `ALTER TABLE "Question" ADD CONSTRAINT "Question_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK Question.schoolId → School SET NULL',
  },

  // ─── FK: Club → School ──────────────────────────────────────
  {
    sql: `ALTER TABLE "Club" ADD CONSTRAINT "Club_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK Club.schoolId → School SET NULL',
  },

  // ─── FK: ClubEvent → School ─────────────────────────────────
  {
    sql: `ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE SET NULL`,
    desc: 'FK ClubEvent.schoolId → School SET NULL',
  },

  // ─── Fix Student → User cascade ─────────────────────────────
  {
    sql: `ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_userId_fkey"`,
    desc: 'Drop old Student.userId FK (no cascade)',
  },
  {
    sql: `ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE`,
    desc: 'FK Student.userId → User CASCADE',
  },
];

async function applyFKs() {
  console.log(`\n🔧 Applying ${statements.length} FK constraints and schema fixes...\n`);
  let ok = 0, skipped = 0, failed = 0;

  for (const { sql, desc } of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      ok++;
      console.log(`✅ ${desc}`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (
        msg.includes('already exists') ||
        msg.includes('does not exist') ||
        msg.includes('already been done') ||
        msg.includes('duplicate')
      ) {
        skipped++;
        console.log(`⏭️  SKIP: ${desc}`);
      } else {
        failed++;
        console.error(`❌ FAIL: ${desc}`);
        console.error(`   → ${msg.substring(0, 250)}`);
      }
    }
  }

  console.log(`\n📊 Results: ${ok} applied, ${skipped} skipped, ${failed} failed`);
  await prisma.$disconnect();
}

applyFKs().catch(console.error);
