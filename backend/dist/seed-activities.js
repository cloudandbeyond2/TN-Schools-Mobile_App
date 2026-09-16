"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Seeding student activities...');
        // 1. Create or ensure a default School exists
        let school = yield prisma.school.findFirst();
        if (!school) {
            school = yield prisma.school.create({
                data: {
                    dise: 'DEMO1234',
                    name: 'Demo Public School',
                    district: 'Chennai',
                    block: 'Central',
                }
            });
        }
        // 2. Ensure a default User and Student exist
        let user = yield prisma.user.findFirst({ where: { role: 'STUDENT' } });
        if (!user) {
            user = yield prisma.user.create({
                data: {
                    name: 'Demo Student',
                    email: 'student@demo.com',
                    role: 'STUDENT',
                    schoolId: school.id,
                }
            });
        }
        let student = yield prisma.student.findFirst({ where: { userId: user.id } });
        if (!student) {
            student = yield prisma.student.create({
                data: {
                    userId: user.id,
                    schoolId: school.id,
                    class: '10',
                    section: 'A',
                }
            });
        }
        // Clear existing to avoid duplicates if ran multiple times
        yield prisma.clubEvent.deleteMany();
        yield prisma.clubMember.deleteMany();
        yield prisma.club.deleteMany();
        // 3. Create Clubs
        console.log('Creating clubs...');
        for (const c of discoverClubs) {
            yield prisma.club.create({
                data: Object.assign(Object.assign({}, c), { schoolId: school.id })
            });
        }
        // 4. Assign student to Robotics and Debate clubs (My Clubs)
        const robotics = yield prisma.club.findFirst({ where: { name: 'Robotics Club' } });
        const debate = yield prisma.club.findFirst({ where: { name: 'Debate Society' } });
        console.log('Assigning student to clubs...');
        if (robotics) {
            yield prisma.clubMember.create({
                data: {
                    clubId: robotics.id,
                    studentId: student.id,
                    role: 'Member'
                }
            });
        }
        if (debate) {
            yield prisma.clubMember.create({
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
            yield prisma.clubEvent.create({
                data: Object.assign(Object.assign({}, e), { schoolId: school.id })
            });
        }
        console.log('Activities Seeding completed successfully! 🌱');
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
