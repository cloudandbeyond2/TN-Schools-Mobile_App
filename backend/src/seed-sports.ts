import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SECTION_METRICS = {
  middle: {
    stats: [
      { label: "Sprint Speed (100m)", value: "14.5s", score: 82, icon: "⚡", color: "bg-amber-500" },
      { label: "Standing Broad Jump", value: "1.85m", score: 76, icon: "📏", color: "bg-cyan-500" },
      { label: "Shuttle Run (Agility)", value: "10.6s", score: 84, icon: "🏃", color: "bg-blue-500" },
      { label: "Flexibility (Sit & Reach)", value: "Excellent", score: 90, icon: "🧘", color: "bg-rose-500" },
      { label: "Overall Fitness", value: "Grade A", score: 86, icon: "💪", color: "bg-emerald-500" }
    ],
    teams: [
      { name: "Junior Football Club", role: "Forward", icon: "⚽", color: "from-green-500 to-emerald-500", match: "District Under-14 Meet", date: "This Saturday, 3:00 PM" },
      { name: "Badminton Club", role: "Singles Player", icon: "🏸", color: "from-yellow-500 to-orange-500", match: "Inter-School Selection", date: "Next Wednesday, 4:00 PM" }
    ],
    events: [
      { title: "Under-14 Football Selection", date: "Nov 12, 2026", type: "Selection", icon: "⚽" },
      { title: "Annual Yoga Demonstration", date: "Nov 20, 2026", type: "School-wide", icon: "🧘" }
    ],
    logs: [
      { date: "Oct 24", activity: "Football Practice", duration: "1h 00m", calories: 350, intensity: "High" },
      { date: "Oct 22", activity: "Yoga Session", duration: "45m", calories: 150, intensity: "Low" },
      { date: "Oct 20", activity: "Sprint Drills", duration: "30m", calories: 200, intensity: "High" }
    ]
  },
  high: {
    stats: [
      { label: "Sprint Speed", value: "12.5s", score: 85, icon: "⚡", color: "bg-amber-500" },
      { label: "Shot Put", value: "9.8m", score: 80, icon: "⚪", color: "bg-orange-500" },
      { label: "Cardio Endurance", value: "Excellent", score: 90, icon: "❤️", color: "bg-rose-500" },
      { label: "Agility", value: "Above Average", score: 78, icon: "🏃", color: "bg-blue-500" },
      { label: "Overall Fitness", value: "Grade A", score: 88, icon: "💪", color: "bg-emerald-500" }
    ],
    teams: [
      { name: "School Football Team", role: "Midfielder", icon: "⚽", color: "from-blue-500 to-cyan-500", match: "Inter-school Quarterfinals", date: "This Friday, 4:00 PM" },
      { name: "Athletics Club", role: "Sprinter (100m)", icon: "🏃", color: "from-orange-500 to-amber-500", match: "District Meet Tryouts", date: "Next Monday, 6:00 AM" }
    ],
    events: [
      { title: "Annual Sports Day", date: "Nov 15, 2026", type: "School-wide", icon: "🏟️" },
      { title: "Basketball Team Tryouts", date: "Oct 25, 2026", type: "Selection", icon: "🏀" },
      { title: "Fitness Assessment Test", date: "Oct 28, 2026", type: "Mandatory", icon: "📋" }
    ],
    logs: [
      { date: "Oct 18", activity: "Football Practice", duration: "1h 30m", calories: 450, intensity: "High" },
      { date: "Oct 16", activity: "Track Training", duration: "45m", calories: 320, intensity: "High" },
      { date: "Oct 15", activity: "Yoga / Stretching", duration: "30m", calories: 120, intensity: "Low" },
      { date: "Oct 14", activity: "Football Match", duration: "2h 00m", calories: 600, intensity: "Maximum" }
    ]
  },
  hsc: {
    stats: [
      { label: "Sprint Speed (100m)", value: "12.1s", score: 88, icon: "⚡", color: "bg-amber-500" },
      { label: "Shot Put", value: "11.2m", score: 85, icon: "⚪", color: "bg-orange-500" },
      { label: "Beep Test (Cardio)", value: "Level 9.5", score: 92, icon: "🏃", color: "bg-rose-500" },
      { label: "Agility (Shuttle Run)", value: "Above Average", score: 80, icon: "🏃", color: "bg-blue-500" },
      { label: "Overall Fitness", value: "Grade A", score: 90, icon: "💪", color: "bg-emerald-500" }
    ],
    teams: [
      { name: "Varsity Basketball Team", role: "Point Guard", icon: "🏀", color: "from-purple-500 to-indigo-500", match: "State-Level Quarterfinals", date: "This Friday, 5:30 PM" },
      { name: "Senior Cricket Team", role: "All-Rounder", icon: "🏏", color: "from-red-500 to-pink-500", match: "District Championship Cup", date: "Next Sunday, 9:00 AM" }
    ],
    events: [
      { title: "State-Level Athletic Meet", date: "Nov 28, 2026", type: "State-wide", icon: "🏃" },
      { title: "Inter-School Cricket Tournament", date: "Nov 05, 2026", type: "Championship", icon: "🏏" }
    ],
    logs: [
      { date: "Oct 25", activity: "Gym Session", duration: "1h 15m", calories: 400, intensity: "High" },
      { date: "Oct 23", activity: "Cardio Running", duration: "50m", calories: 380, intensity: "High" },
      { date: "Oct 22", activity: "Basketball Drills", duration: "1h 30m", calories: 500, intensity: "Maximum" }
    ]
  }
};

async function main() {
  console.log('Seeding standard-wise sports profiles for all students...');

  const students = await prisma.student.findMany({
    include: { user: true }
  });

  if (students.length === 0) {
    console.error('No students found in the database. Please seed users & students first.');
    return;
  }

  // Delete all existing sports profiles to re-seed cleanly
  await prisma.sportsProfile.deleteMany({});
  console.log('Cleared existing sports profiles.');

  for (const student of students) {
    // Determine section/standard
    const classNum = parseInt(student.class.replace(/\D/g, ""), 10);
    let sectionKey: "middle" | "high" | "hsc" = "high";
    if (classNum >= 6 && classNum <= 8) {
      sectionKey = "middle";
    } else if (classNum >= 11 && classNum <= 12) {
      sectionKey = "hsc";
    }

    const config = SECTION_METRICS[sectionKey];

    await prisma.sportsProfile.create({
      data: {
        studentId: student.id,
        teams: {
          create: config.teams
        },
        stats: {
          create: config.stats
        },
        events: {
          create: config.events
        },
        logs: {
          create: config.logs
        }
      }
    });

    console.log(`Seeded ${sectionKey.toUpperCase()} sports profile for ${student.user.name} (Class: ${student.class}-${student.section || 'A'})`);
  }

  console.log('All student sports profiles successfully seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
