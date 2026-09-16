import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyRelationships() {
  console.log('\n🔍 Verifying database relationships and FK constraints...\n');

  try {
    // Check FK constraints on key tables
    const fkQuery = await prisma.$queryRaw<any[]>`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `;

    // Group by table
    const byTable: Record<string, any[]> = {};
    for (const row of fkQuery) {
      if (!byTable[row.table_name]) byTable[row.table_name] = [];
      byTable[row.table_name].push(row);
    }

    console.log(`Total FK constraints found: ${fkQuery.length}\n`);

    // Check tables we care about
    const expectedTables = [
      'Student', 'Teacher', 'ClassRoom', 'StudentBadge', 'HomeworkSubmission',
      'WatchlistStudent', 'HeadmasterStaff', 'HeadmasterParent', 'MidDayMeal',
      'SchoolAsset', 'Message', 'ParentNotification', 'HeadmasterProfile'
    ];

    for (const table of expectedTables) {
      const fks = byTable[table] || [];
      if (fks.length === 0) {
        console.log(`⚠️  ${table}: NO foreign key constraints found`);
      } else {
        console.log(`✅ ${table}: ${fks.length} FK(s)`);
        for (const fk of fks) {
          console.log(`   - ${fk.column_name} → ${fk.foreign_table_name} (${fk.delete_rule})`);
        }
      }
    }

    // Check new columns exist
    console.log('\n📋 Checking new columns...');
    const columns = await prisma.$queryRaw<any[]>`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND (
          (table_name = 'HeadmasterStaff' AND column_name = 'userId') OR
          (table_name = 'HeadmasterParent' AND column_name = 'userId') OR
          (table_name = 'WatchlistStudent' AND column_name = 'studentId') OR
          (table_name = 'HomeworkSubmission' AND column_name = 'studentId') OR
          (table_name = 'LeaveRequest' AND column_name = 'staffId') OR
          (table_name = 'Message' AND column_name = 'parentId') OR
          (table_name = 'HeadmasterProfile' AND column_name = 'userId') OR
          (table_name = 'HeadmasterProfile' AND column_name = 'schoolId')
        )
      ORDER BY table_name, column_name
    `;
    
    const expectedCols = [
      ['HeadmasterParent', 'userId'],
      ['HeadmasterStaff', 'userId'],
      ['HomeworkSubmission', 'studentId'],
      ['LeaveRequest', 'staffId'],
      ['Message', 'parentId'],
      ['WatchlistStudent', 'studentId'],
      ['HeadmasterProfile', 'userId'],
      ['HeadmasterProfile', 'schoolId'],
    ];

    for (const [tbl, col] of expectedCols) {
      const found = columns.find(c => c.table_name === tbl && c.column_name === col);
      console.log(found ? `✅ ${tbl}.${col} exists` : `❌ ${tbl}.${col} MISSING`);
    }

    // Check Message table record count
    const messageCount = await prisma.message.count();
    console.log(`\n💬 Message table: ${messageCount} records`);

    // Quick integrity check — count orphaned schoolId values in HeadmasterStaff
    const orphanedStaff = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as cnt FROM "HeadmasterStaff" 
      WHERE "schoolId" IS NOT NULL AND "schoolId" NOT IN (SELECT id FROM "School")
    `;
    console.log(`\n🔗 Orphaned schoolId in HeadmasterStaff: ${orphanedStaff[0]?.cnt ?? 0}`);

  } catch (e) {
    console.error('Error during verification:', e);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRelationships();
