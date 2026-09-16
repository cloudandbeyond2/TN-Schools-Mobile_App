/**
 * seed-hierarchy.ts
 * Creates demo governance accounts for the full TN-Schools role hierarchy:
 *   SUPERADMIN → MINISTER → COMMISSIONER → DEO → BEO → (existing Headmasters)
 *
 * Run: npx ts-node -P prisma/tsconfig.json prisma/seed-hierarchy.ts
 *
 * Safe to run multiple times — uses upsert by email.
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function hash(pwd: string) {
  return hashPassword(pwd);
}

async function upsertUser(data: {
  email: string;
  name: string;
  password: string;
  role: any;
  district?: string;
  block?: string;
  assignedRegion?: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { email: { equals: data.email, mode: "insensitive" } },
  });
  if (existing) {
    console.log(`  ⚡ Already exists: ${data.email} (${data.role})`);
    // Update scope fields in case they changed
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: data.role,
        district: data.district ?? existing.district,
        block: data.block ?? existing.block,
        assignedRegion: data.assignedRegion ?? existing.assignedRegion,
      },
    });
    return existing;
  }

  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await hash(data.password),
      role: data.role,
      district: data.district ?? null,
      block: data.block ?? null,
      assignedRegion: data.assignedRegion ?? null,
    },
  });
  console.log(`  ✅ Created: ${data.email} (${data.role})`);
  return created;
}

async function main() {
  console.log("\n🌱 Seeding governance hierarchy users...\n");

  // ── 1. Super Admin ─────────────────────────────────────────────────────────
  await upsertUser({
    email: "superadmin@tn.gov.in",
    name: "Super Administrator",
    password: "admin@123",
    role: "SUPERADMIN",
  });

  // ── 2. Minister ────────────────────────────────────────────────────────────
  await upsertUser({
    email: "minister@tn.gov.in",
    name: "Minister for School Education",
    password: "minister@123",
    role: "MINISTER",
  });

  // ── 3. Commissioner ────────────────────────────────────────────────────────
  await upsertUser({
    email: "commissioner@tn.gov.in",
    name: "Commissioner of School Education",
    password: "comm@123",
    role: "COMMISSIONER",
    assignedRegion: "Tamil Nadu",
  });

  // ── 4. District Education Officers ────────────────────────────────────────
  const deoCbePwd = "deo@123";
  const districts = [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
    "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram",
    "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam",
    "Kanyakumari", "Namakkal", "Perambalur", "Pudukkottai", "Ramanathapuram",
    "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur",
    "Theni", "Thiruvallur", "Thiruvarur", "Thoothukudi", "Tiruchirappalli",
    "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvannamalai", "The Nilgiris",
    "Vellore", "Viluppuram", "Virudhunagar"
  ];
  const deoUsers = districts.map((dist) => ({
    email: `deo.${dist.toLowerCase().replace(/\s+/g, "")}@tn.gov.in`,
    name: `DEO - ${dist}`,
    district: dist
  }));
  for (const d of deoUsers) {
    await upsertUser({ ...d, password: deoCbePwd, role: "DEO" });
  }

  // ── 5. Block Education Officers ───────────────────────────────────────────
  const beoUsers = [
    { email: "beo.cbsouth@tn.gov.in",  name: "BEO - Coimbatore South",  block: "Coimbatore South",  district: "Coimbatore" },
    { email: "beo.cbnorth@tn.gov.in",  name: "BEO - Coimbatore North",  block: "Coimbatore North",  district: "Coimbatore" },
    { email: "beo.pollachi@tn.gov.in", name: "BEO - Pollachi",          block: "Pollachi",          district: "Coimbatore" },
  ];
  for (const b of beoUsers) {
    const created = await upsertUser({ ...b, password: "beo@123", role: "BEO" });

    // Assign schools in the matching block to this BEO
    const result = await prisma.school.updateMany({
      where: {
        block: { equals: b.block, mode: "insensitive" },
        beoId: null,
      },
      data: { beoId: created.id },
    });
    if (result.count > 0) {
      console.log(`    → Linked ${result.count} school(s) in "${b.block}" to ${b.email}`);
    }
  }

  // ── 6. Link DEOs to schools in their district ─────────────────────────────
  console.log("\n🔗 Linking DEOs to schools by district...");
  for (const d of deoUsers) {
    const deoUser = await prisma.user.findFirst({
      where: { email: { equals: d.email, mode: "insensitive" } },
    });
    if (!deoUser) continue;

    const result = await prisma.school.updateMany({
      where: {
        district: { equals: d.district, mode: "insensitive" },
        deoId: null,
      },
      data: { deoId: deoUser.id },
    });
    if (result.count > 0) {
      console.log(`  → Linked ${result.count} school(s) in "${d.district}" to ${d.email}`);
    }
  }

  console.log("\n✨ Hierarchy seed complete!\n");
  console.log("Demo credentials:");
  console.log("  superadmin@tn.gov.in / admin@123       → /super-admin");
  console.log("  minister@tn.gov.in   / minister@123    → /minister");
  console.log("  commissioner@tn.gov.in / comm@123      → /commissioner");
  console.log("  deo.coimbatore@tn.gov.in / deo@123     → /district-education-officer");
  console.log("  beo.cbsouth@tn.gov.in / beo@123        → /block-education-officer\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
