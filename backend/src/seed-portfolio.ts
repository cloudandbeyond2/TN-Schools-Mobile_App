import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding portfolio data...');

  // Get the first student as our demo student
  const student = await prisma.student.findFirst({
    include: { user: true, school: true }
  });
  if (!student) {
    console.error('No student found. Please seed the database with students first.');
    return;
  }

  // Delete existing portfolio if any
  await prisma.portfolio.deleteMany({
    where: { studentId: student.id }
  });

  // Create new portfolio
  const portfolio = await prisma.portfolio.create({
    data: {
      studentId: student.id,
      bio: "I am a passionate learner with a strong interest in applied sciences and literature. My goal is to use technology to solve local environmental challenges while maintaining a deep connection to my cultural roots.",
      stream: "Science Stream Explorer",
      skills: {
        create: [
          { name: "Public Speaking", level: 90, color: "from-rose-500 to-pink-500" },
          { name: "Python Programming", level: 75, color: "from-blue-500 to-cyan-500" },
          { name: "Creative Writing", level: 85, color: "from-amber-500 to-orange-500" },
          { name: "Data Analysis", level: 60, color: "from-emerald-500 to-teal-500" },
        ]
      },
      achievements: {
        create: [
          { title: "1st Place - State Science Exhibition", year: "2026", icon: "🏆", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { title: "Distinction in Mathematics Olympiad", year: "2025", icon: "🥇", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { title: "Best Debater - Inter-School Fest", year: "2025", icon: "🎙️", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
        ]
      },
      projects: {
        create: [
          { title: "Smart City Traffic Model", category: "Science Fair", date: "Oct 2026", image: "🏙️", tags: ["IoT", "Physics", "Arduino"], description: "Built a working model of automated traffic lights using Arduino to reduce congestion." },
          { title: "Tamil Poetry Anthology", category: "Literature", date: "Aug 2026", image: "📜", tags: ["Creative Writing", "Tamil"], description: "A collection of 15 original poems exploring the themes of nature and modern society." },
          { title: "Local Biodiversity Survey", category: "Ecology Project", date: "May 2026", image: "🌿", tags: ["Biology", "Field Work"], description: "Cataloged over 50 native plant species in the school's surrounding district." },
        ]
      }
    }
  });

  console.log(`Successfully seeded portfolio for student ID: ${student.id} (${student.user?.name || 'Arjun Kumar'})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
