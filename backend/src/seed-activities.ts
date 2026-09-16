import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const discoverClubs = [
  { name: "Eco Warriors", category: "Environment", icon: "🌱", themeColor: "text-emerald-600 dark:text-emerald-400", themeBg: "bg-emerald-500/10 border-emerald-500/20", themeTagBg: "bg-emerald-500/20" },
  { name: "Drama Troupe", category: "Arts", icon: "🎭", themeColor: "text-purple-600 dark:text-purple-400", themeBg: "bg-purple-500/10 border-purple-500/20", themeTagBg: "bg-purple-500/20" },
  { name: "Math Olympiad", category: "Academics", icon: "♾️", themeColor: "text-blue-600 dark:text-blue-400", themeBg: "bg-blue-500/10 border-blue-500/20", themeTagBg: "bg-blue-500/20" },
  { name: "Creative Writing", category: "Literature", icon: "✍️", themeColor: "text-amber-600 dark:text-amber-400", themeBg: "bg-amber-500/10 border-amber-500/20", themeTagBg: "bg-amber-500/20" },
  { name: "Photography", category: "Arts", icon: "📸", themeColor: "text-cyan-600 dark:text-cyan-400", themeBg: "bg-cyan-500/10 border-cyan-500/20", themeTagBg: "bg-cyan-500/20" },
  { name: "Astronomy Club", category: "Science", icon: "🔭", themeColor: "text-indigo-600 dark:text-indigo-400", themeBg: "bg-indigo-500/10 border-indigo-500/20", themeTagBg: "bg-indigo-500/20" },
  { name: "Robotics Club", category: "Science", icon: "🤖", themeColor: "from-blue-500 to-indigo-600", themeBg: "bg-blue-500/10 border-blue-500/20", themeTagBg: "bg-blue-500/20" },
  { name: "Debate Society", category: "Academics", icon: "🎙️", themeColor: "from-rose-500 to-pink-600", themeBg: "bg-rose-500/10 border-rose-500/20", themeTagBg: "bg-rose-500/20" }
];

const upcomingEvents = [
  { title: "Annual Science Fair", eventDate: new Date("2026-10-15"), type: "School-wide", icon: "🔬", themeColor: "text-emerald-600 dark:text-emerald-400" },
  { title: "Inter-school Debate", eventDate: new Date("2026-10-22"), type: "Competition", icon: "🏆", themeColor: "text-amber-600 dark:text-amber-400" },
  { title: "Autumn Art Exhibition", eventDate: new Date("2026-11-05"), type: "Showcase", icon: "🎨", themeColor: "text-purple-600 dark:text-purple-400" },
];

async function main() {
  console.log('Seeding student activities...');

  // 1. Create or ensure a default School exists
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        dise: 'DEMO1234',
        name: 'Demo Public School',
        district: 'Chennai',
        block: 'Central',
      }
    });
  }

  // 2. Ensure a default User and Student exist
  let user = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Demo Student',
        email: 'student@demo.com',
        role: 'STUDENT',
        schoolId: school.id,
      }
    });
  }

  let student = await prisma.student.findFirst({ where: { userId: user.id } });
  if (!student) {
    student = await prisma.student.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        class: '10',
        section: 'A',
      }
    });
  }

  // Clear existing to avoid duplicates if ran multiple times
  await prisma.clubEvent.deleteMany();
  await prisma.clubMember.deleteMany();
  await prisma.club.deleteMany();

  // 3. Create Clubs
  console.log('Creating clubs...');
  for (const c of discoverClubs) {
    await prisma.club.create({
      data: {
        ...c,
        schoolId: school.id
      }
    });
  }

  // 4. Assign student to Robotics and Debate clubs (My Clubs)
  const robotics = await prisma.club.findFirst({ where: { name: 'Robotics Club' } });
  const debate = await prisma.club.findFirst({ where: { name: 'Debate Society' } });

  console.log('Assigning student to clubs...');
  if (robotics) {
    await prisma.clubMember.create({
      data: {
        clubId: robotics.id,
        studentId: student.id,
        role: 'Member'
      }
    });
  }
  if (debate) {
    await prisma.clubMember.create({
      data: {
        clubId: debate.id,
        studentId: student.id,
        role: 'Vice President'
      }
    });
  }

  // 5. Create Events
  console.log('Creating events...');
  for (const e of upcomingEvents) {
    await prisma.clubEvent.create({
      data: {
        ...e,
        schoolId: school.id
      }
    });
  }

  console.log('Activities Seeding completed successfully! 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
