import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

const sql = fs.readFileSync('./prisma/migrations/20260629000001_add_headmaster_profile/migration.sql', 'utf8');

// A simple but robust SQL statement splitter
const statements = sql
  .split(';')
  .map((s) => s.trim())
  .filter((s) => {
    if (!s) return false;
    // Remove comments
    const withoutComments = s.replace(/--.*$/gm, '').trim();
    return withoutComments.length > 0;
  });

async function run() {
  console.log(`Applying HeadmasterProfile migration (${statements.length} statements)...`);
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim() + ';';
    try {
      await prisma.$executeRawUnsafe(stmt);
      ok++;
      console.log(`✅ [${i + 1}] Applied: ${stmt.split('\n')[0].substring(0, 90)}`);
    } catch (e: any) {
      failed++;
      console.error(`❌ [${i + 1}] Failed: ${stmt.split('\n')[0].substring(0, 90)}`);
      console.error(`   Error: ${e?.message || e}`);
    }
  }
  await prisma.$disconnect();
  console.log(`\n📊 Results: ${ok} applied, ${failed} failed`);
}

run().catch(console.error);
