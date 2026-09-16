import { PrismaClient } from '@prisma/client';
import { hashPassword, isBcryptHash } from '../src/utils/password';

const prisma = new PrismaClient();

async function migrateUsers() {
  const users = await prisma.user.findMany({
    where: { passwordHash: { not: null } },
    select: { id: true, passwordHash: true },
  });
  let migrated = 0;
  let skipped = 0;
  for (const u of users) {
    if (!u.passwordHash || isBcryptHash(u.passwordHash)) {
      skipped++;
      continue;
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await hashPassword(u.passwordHash) },
    });
    migrated++;
  }
  console.log(`User: migrated ${migrated}, skipped ${skipped}`);
}

async function migrateHeadmasterStaff() {
  const rows = await prisma.headmasterStaff.findMany({ select: { id: true, password: true } });
  let migrated = 0;
  let skipped = 0;
  for (const r of rows) {
    if (!r.password || isBcryptHash(r.password)) {
      skipped++;
      continue;
    }
    await prisma.headmasterStaff.update({
      where: { id: r.id },
      data: { password: await hashPassword(r.password) },
    });
    migrated++;
  }
  console.log(`HeadmasterStaff: migrated ${migrated}, skipped ${skipped}`);
}

async function migrateHeadmasterTempStaff() {
  const rows = await prisma.headmasterTempStaff.findMany({ select: { id: true, password: true } });
  let migrated = 0;
  let skipped = 0;
  for (const r of rows) {
    if (!r.password || isBcryptHash(r.password)) {
      skipped++;
      continue;
    }
    await prisma.headmasterTempStaff.update({
      where: { id: r.id },
      data: { password: await hashPassword(r.password) },
    });
    migrated++;
  }
  console.log(`HeadmasterTempStaff: migrated ${migrated}, skipped ${skipped}`);
}

async function migrateHeadmasterParent() {
  const rows = await prisma.headmasterParent.findMany({ select: { id: true, password: true } });
  let migrated = 0;
  let skipped = 0;
  for (const r of rows) {
    if (!r.password || isBcryptHash(r.password)) {
      skipped++;
      continue;
    }
    await prisma.headmasterParent.update({
      where: { id: r.id },
      data: { password: await hashPassword(r.password) },
    });
    migrated++;
  }
  console.log(`HeadmasterParent: migrated ${migrated}, skipped ${skipped}`);
}

async function run() {
  await migrateUsers();
  await migrateHeadmasterStaff();
  await migrateHeadmasterTempStaff();
  await migrateHeadmasterParent();
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
