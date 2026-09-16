import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating Trichy district information in database...");

  // 1. Standardise all Trichy schools to district: "Trichy"
  const schoolUpdate = await prisma.school.updateMany({
    where: {
      district: {
        in: ["trichy", "Trichy", "97trichy", "trichy ", " Trichy"],
      },
    },
    data: {
      district: "Trichy",
    },
  });
  console.log(`Updated ${schoolUpdate.count} schools to district "Trichy"`);

  // 2. Add some clean sample schools for Trichy if they don't exist
  const sampleSchools = [
    { dise: "33150100101", name: "GHS Trichy West", block: "Trichy West" },
    { dise: "33150100102", name: "GGHSS Srirangam", block: "Srirangam" },
    { dise: "33150100103", name: "GBHSS Lalgudi", block: "Lalgudi" },
  ];

  for (const s of sampleSchools) {
    const existing = await prisma.school.findUnique({ where: { dise: s.dise } });
    if (!existing) {
      await prisma.school.create({
        data: {
          dise: s.dise,
          name: s.name,
          district: "Trichy",
          block: s.block,
          schoolType: "Government",
          mediumOfInstruction: "Tamil",
        },
      });
      console.log(`Created sample school: ${s.name} in block ${s.block}`);
    }
  }

  // 3. Update DEO user "deo.tiruchirappalli@tn.gov.in" to district: "Trichy"
  const deoUpdate = await prisma.user.updateMany({
    where: {
      email: {
        equals: "deo.tiruchirappalli@tn.gov.in",
        mode: "insensitive",
      },
    },
    data: {
      district: "Trichy",
    },
  });
  console.log(`Updated ${deoUpdate.count} DEO user(s) to district "Trichy"`);

  console.log("Trichy database updates complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
