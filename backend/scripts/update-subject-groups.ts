import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log("Updating subject groups in PostgreSQL database...");
  
  const rules = [
    { name: "Tamil", groups: [] },
    { name: "English", groups: [] },
    { name: "Mathematics", groups: [] },
    { name: "Physics", groups: ["Biology", "Computer Science"] },
    { name: "Chemistry", groups: ["Biology", "Computer Science"] },
    { name: "Bio-Botany", groups: ["Biology"] },
    { name: "Bio-Zoology", groups: ["Biology"] },
    { name: "Computer Science", groups: ["Computer Science"] },
    { name: "Commerce", groups: ["Commerce"] },
    { name: "Accountancy", groups: ["Commerce"] },
    { name: "Economics", groups: ["Commerce"] }
  ];

  for (const rule of rules) {
    const result = await prisma.centralSubject.updateMany({
      where: {
        name: {
          equals: rule.name,
          mode: 'insensitive'
        }
      },
      data: {
        applicableGroups: rule.groups
      }
    });
    console.log(`Updated subject '${rule.name}' with groups [${rule.groups.join(', ')}]. Affected count: ${result.count}`);
  }

  await prisma.$disconnect();
  console.log("Finished updating subject groups.");
}

run().catch(console.error);
