import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const sql = fs.readFileSync('./prisma/migrations/20260629000000_fix_all_relationships/migration.sql', 'utf8');

// Split into individual statements (split on semicolons at end of line)
const rawStatements = sql.split(/;[\r\n]/);
const statements = rawStatements
  .map((s) => s.trim())
  .filter((s) => {
    if (!s) return false;
    if (/^--/.test(s)) return false; // Skip pure comment lines
    // Remove inline comments and check if there's actual SQL
    const withoutComments = s.replace(/--.*$/gm, '').trim();
    return withoutComments.length > 0;
  });

async function run() {
  console.log(`Applying ${statements.length} SQL statements to database...`);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;

    try {
      await prisma.$executeRawUnsafe(stmt + ';');
      ok++;
      console.log(`✅ [${i + 1}] ${stmt.split('\n')[0].substring(0, 90)}`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('does not exist') ||
        msg.includes('already been done')
      ) {
        skipped++;
        console.log(`⏭️  [${i + 1}] SKIP (already applied): ${stmt.split('\n')[0].substring(0, 70)}`);
      } else {
        failed++;
        console.error(`❌ [${i + 1}] FAILED: ${stmt.split('\n')[0].substring(0, 80)}`);
        console.error(`    → ${msg.substring(0, 300)}`);
      }
    }
  }

  await prisma.$disconnect();
  console.log(`\n📊 Results: ${ok} applied, ${skipped} skipped, ${failed} failed`);
}

run().catch(console.error);
