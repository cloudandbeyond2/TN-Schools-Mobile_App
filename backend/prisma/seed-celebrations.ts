import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🌱 Seeding Government Holidays and Celebrations...\n");

  // Clear existing records with null schoolId (global ones) so we can re-run safely
  const deleted = await prisma.celebration.deleteMany({
    where: { schoolId: null }
  });
  console.log(`  🗑️ Cleared ${deleted.count} existing global celebrations`);

  const holidays = [
    { title: "New Year's Day", date: new Date("2026-01-01"), description: "State Government Holiday for New Year", type: "HOLIDAY" },
    { title: "Pongal", date: new Date("2026-01-14"), description: "Traditional harvest festival of Tamil Nadu", type: "HOLIDAY" },
    { title: "Thiruvalluvar Day", date: new Date("2026-01-15"), description: "Honoring the legendary poet and philosopher Thiruvalluvar", type: "HOLIDAY" },
    { title: "Uzhavar Thirunal", date: new Date("2026-01-16"), description: "Farmers Day celebrations across the state", type: "HOLIDAY" },
    { title: "Republic Day", date: new Date("2026-01-26"), description: "National Holiday celebrating India's Constitution adoption", type: "HOLIDAY" },
    { title: "Good Friday", date: new Date("2026-04-03"), description: "Christian Holiday of Good Friday", type: "HOLIDAY" },
    { title: "Tamil New Year / Puthandu", date: new Date("2026-04-14"), description: "Official Tamil New Year Day holiday", type: "HOLIDAY" },
    { title: "May Day", date: new Date("2026-05-01"), description: "International Workers' Day", type: "HOLIDAY" },
    { title: "Independence Day", date: new Date("2026-08-15"), description: "National Holiday commemorating Independence Day", type: "HOLIDAY" },
    { title: "Vinayagar Chaturthi", date: new Date("2026-09-04"), description: "Ganesha festival state holiday", type: "HOLIDAY" },
    { title: "Milad-un-Nabi", date: new Date("2026-09-15"), description: "Prophet's Birthday state holiday", type: "HOLIDAY" },
    { title: "Gandhi Jayanthi", date: new Date("2026-10-02"), description: "National Holiday honoring Mahatma Gandhi's Birthday", type: "HOLIDAY" },
    { title: "Ayutha Pooja", date: new Date("2026-10-20"), description: "Navratri Ayutha Pooja state holiday", type: "HOLIDAY" },
    { title: "Vijayadasami", date: new Date("2026-10-21"), description: "Vijayadasami state holiday", type: "HOLIDAY" },
    { title: "Deepavali / Diwali", date: new Date("2026-11-08"), description: "Festival of Lights grand holiday", type: "HOLIDAY" },
    { title: "Christmas Day", date: new Date("2026-12-25"), description: "Christmas festival state holiday", type: "HOLIDAY" },
  ];

  const events = [
    { title: "Republic Day Celebration", date: new Date("2026-01-26"), description: "Flag hoisting ceremony, speech by Headmaster, and parade.", type: "EVENT" },
    { title: "National Science Day Exhibition", date: new Date("2026-02-28"), description: "Syllabus-mapped science projects, live experiments, and model presentations by students.", type: "EVENT" },
    { title: "Annual Sports Meet", date: new Date("2026-03-12"), description: "Track and field events, inter-house sports competitions and trophy distribution.", type: "EVENT" },
    { title: "Cultural Art Festival", date: new Date("2026-04-25"), description: "Traditional Tamil dances (Bharatanatyam, Karakattam), music, and drama.", type: "EVENT" },
    { title: "Independence Day Parade", date: new Date("2026-08-15"), description: "Flag hoisting, national anthem, speech on freedom fighters, and sweet distribution.", type: "EVENT" },
    { title: "Teachers Day Honors", date: new Date("2026-09-05"), description: "Students organize cultural programs to express gratitude to teachers.", type: "EVENT" },
    { title: "Gandhi Jayanti Shramdaan", date: new Date("2026-10-02"), description: "Cleanliness drive by NSS/NCC and discussion on Gandhian values.", type: "EVENT" },
    { title: "Children's Day Carnival", date: new Date("2026-11-14"), description: "Fun fair, game stalls, magic show, and principal's special message.", type: "EVENT" },
    { title: "School Annual Day", date: new Date("2026-12-18"), description: "Annual academic reporting, theatrical plays, and honoring class toppers.", type: "EVENT" },
  ];

  for (const h of holidays) {
    await prisma.celebration.create({
      data: {
        title: h.title,
        date: h.date,
        description: h.description,
        type: h.type,
        schoolId: null
      }
    });
  }
  console.log(`  ✅ Seeded ${holidays.length} Government Holidays`);

  for (const e of events) {
    await prisma.celebration.create({
      data: {
        title: e.title,
        date: e.date,
        description: e.description,
        type: e.type,
        schoolId: null
      }
    });
  }
  console.log(`  ✅ Seeded ${events.length} State-Wide School Events`);

  console.log("\n✨ Seeding celebrations & holidays complete!\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
