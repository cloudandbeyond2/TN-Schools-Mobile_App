import { prisma } from './config/prisma';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    console.log("📖 Reading SQL schema from central_content_schema.sql...");
    const sqlPath = path.join(__dirname, '../../central_content_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Strip comment lines first
    const cleanSql = sqlContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.startsWith('--'))
      .join('\n');

    // Split SQL content into individual statements by semicolon
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`🚀 Executing ${statements.length} SQL statements...`);
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement [${i + 1}/${statements.length}]...`);
      await prisma.$executeRawUnsafe(statement);
    }

    console.log("🎉 All tables created successfully via Prisma raw execution!");
  } catch (error: any) {
    console.error("❌ Table creation failed:", error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
