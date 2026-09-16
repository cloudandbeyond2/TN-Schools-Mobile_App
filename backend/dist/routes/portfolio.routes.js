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
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const router = (0, express_1.Router)();
const queryIncludes = {
    skills: true,
    projects: true,
    achievements: true,
    student: {
        include: {
            school: true,
            clubMembers: {
                include: {
                    club: true
                }
            },
            sportsProfile: {
                include: {
                    teams: true,
                    stats: true,
                    events: true
                }
            },
            socialActivities: true,
            marks: {
                take: 15,
                orderBy: { createdAt: 'desc' }
            },
            attendance: {
                take: 100
            },
            scholarships: true,
            labAttempts: {
                include: {
                    experiment: true
                }
            },
            readingProgress: {
                include: {
                    chapter: true
                }
            },
            projectSubmissions: {
                include: {
                    project: true
                }
            },
            schoolPressActivities: true
        }
    }
};
// GET /api/portfolio/:studentId
router.get('/:studentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        let portfolio = yield prisma_1.prisma.portfolio.findUnique({
            where: { studentId },
            include: queryIncludes
        });
        // If portfolio doesn't exist but student exists, initialize one automatically
        if (!portfolio && studentId !== 'demo-student') {
            const studentExists = yield prisma_1.prisma.student.findUnique({ where: { id: studentId } });
            if (studentExists) {
                portfolio = yield prisma_1.prisma.portfolio.create({
                    data: {
                        studentId,
                        bio: JSON.stringify({
                            bioText: "Welcome to my digital portfolio!",
                            strengths: ["Fast learner", "Team player"],
                            areasOfGrowth: ["Time management"],
                            termGoals: ["Score above 90% in Math", "Learn web programming"],
                            leadershipRoles: ["Class Monitor"],
                            vocationalSkills: ["Basic Electronics", "Scratch Programming"],
                            languageFluency: { "Tamil": "Native", "English": "Fluent" },
                            careerGoal: "Engineering (Computer Science & AI)",
                            subjectInterests: ["Environmental Science", "Mathematics", "Tamil Literature"],
                            talentPrep: ["NTSE Prep Active", "SSLC Target 95%+", "JEE Mock Target Active"],
                            communicationRole: "Speaker / Lead",
                            teacherEndorsement: "Shows remarkable logical clarity and deep engagement in computer education. The programming model built for the science exhibition was excellent.",
                            teacherName: "Mrs. Abirami",
                            parentEndorsement: "Exhibits great dedication to self-study and maintains an excellent balance between sports and math homework goals.",
                            parentName: "Mr. Balasubramanian"
                        }),
                        stream: "General"
                    },
                    include: queryIncludes
                });
            }
        }
        // If a specific student's portfolio isn't found, try to fetch the first demo student's portfolio
        if (!portfolio) {
            const demoStudent = yield prisma_1.prisma.student.findFirst();
            if (demoStudent) {
                portfolio = yield prisma_1.prisma.portfolio.findUnique({
                    where: { studentId: demoStudent.id },
                    include: queryIncludes
                });
            }
        }
        if (!portfolio) {
            return res.status(404).json({ success: false, error: 'Portfolio not found' });
        }
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: portfolio.student.userId }
        });
        // Parse the JSON bio to extract SWOT, leadership, vocational, and language skills
        let bioData = {
            bioText: portfolio.bio || "Welcome to my digital portfolio!",
            strengths: [],
            areasOfGrowth: [],
            termGoals: [],
            leadershipRoles: [],
            vocationalSkills: [],
            languageFluency: {},
            careerGoal: "Engineering (Computer Science & AI)",
            subjectInterests: ["Environmental Science", "Mathematics", "Tamil Literature"],
            talentPrep: ["NTSE Prep Active", "SSLC Target 95%+", "JEE Mock Target Active"],
            communicationRole: "Speaker / Lead",
            teacherEndorsement: "Shows remarkable logical clarity and deep engagement in computer education. The programming model built for the science exhibition was excellent.",
            teacherName: "Mrs. Abirami",
            parentEndorsement: "Exhibits great dedication to self-study and maintains an excellent balance between sports and math homework goals.",
            parentName: "Mr. Balasubramanian"
        };
        if (portfolio.bio) {
            try {
                if (portfolio.bio.trim().startsWith('{')) {
                    const parsed = JSON.parse(portfolio.bio);
                    bioData = {
                        bioText: parsed.bioText || "Welcome to my digital portfolio!",
                        strengths: parsed.strengths || [],
                        areasOfGrowth: parsed.areasOfGrowth || [],
                        termGoals: parsed.termGoals || [],
                        leadershipRoles: parsed.leadershipRoles || [],
                        vocationalSkills: parsed.vocationalSkills || [],
                        languageFluency: parsed.languageFluency || {},
                        careerGoal: parsed.careerGoal || "Engineering (Computer Science & AI)",
                        subjectInterests: parsed.subjectInterests || ["Environmental Science", "Mathematics", "Tamil Literature"],
                        talentPrep: parsed.talentPrep || ["NTSE Prep Active", "SSLC Target 95%+", "JEE Mock Target Active"],
                        communicationRole: parsed.communicationRole || "Speaker / Lead",
                        teacherEndorsement: parsed.teacherEndorsement || "Shows remarkable logical clarity and deep engagement in computer education. The programming model built for the science exhibition was excellent.",
                        teacherName: parsed.teacherName || "Mrs. Abirami",
                        parentEndorsement: parsed.parentEndorsement || "Exhibits great dedication to self-study and maintains an excellent balance between sports and math homework goals.",
                        parentName: parsed.parentName || "Mr. Balasubramanian"
                    };
                }
            }
            catch (e) {
                console.error("Error parsing portfolio bio JSON:", e);
            }
        }
        // Calculate attendance percentage
        const attendanceRecords = portfolio.student.attendance || [];
        const totalDays = attendanceRecords.length;
        const presentDays = attendanceRecords.filter(r => r.status === 'PRESENT').length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 92; // Default to 92 if no records
        // Format student record integrations
        const formattedData = {
            id: portfolio.id,
            studentId: portfolio.studentId,
            profile: {
                name: (user === null || user === void 0 ? void 0 : user.name) || "Student",
                email: (user === null || user === void 0 ? void 0 : user.email) || "",
                class: portfolio.student.class,
                section: portfolio.student.section,
                stream: portfolio.stream || "General",
                rollNumber: portfolio.student.rollNumber || "N/A",
                emisNumber: portfolio.student.emisNumber || "N/A",
                schoolName: portfolio.student.school.name,
                bio: bioData.bioText,
                strengths: bioData.strengths,
                areasOfGrowth: bioData.areasOfGrowth,
                termGoals: bioData.termGoals,
                leadershipRoles: bioData.leadershipRoles,
                vocationalSkills: bioData.vocationalSkills,
                languageFluency: bioData.languageFluency,
                careerGoal: bioData.careerGoal,
                subjectInterests: bioData.subjectInterests,
                talentPrep: bioData.talentPrep,
                communicationRole: bioData.communicationRole,
                teacherEndorsement: bioData.teacherEndorsement,
                teacherName: bioData.teacherName,
                parentEndorsement: bioData.parentEndorsement,
                parentName: bioData.parentName,
                projectsCount: portfolio.projects.length,
                awardsCount: portfolio.achievements.length,
                attendanceRate
            },
            skills: portfolio.skills,
            projects: portfolio.projects,
            achievements: portfolio.achievements,
            clubs: portfolio.student.clubMembers.map(cm => ({
                name: cm.club.name,
                role: cm.role,
                category: cm.club.category,
                icon: cm.club.icon,
                themeColor: cm.club.themeColor,
                themeBg: cm.club.themeBg
            })),
            sports: portfolio.student.sportsProfile ? {
                teams: portfolio.student.sportsProfile.teams,
                stats: portfolio.student.sportsProfile.stats,
                events: portfolio.student.sportsProfile.events
            } : null,
            socialActivities: portfolio.student.socialActivities,
            marksSummary: portfolio.student.marks.map(m => ({
                subject: m.subject,
                examName: m.examType,
                marksObtained: m.scored,
                maxMarks: m.maxMarks,
                remarks: m.grade
            })),
            scholarships: portfolio.student.scholarships.map(s => ({
                name: s.scheme,
                amount: s.amount,
                status: s.status,
                academicYear: s.createdAt.getFullYear().toString()
            })),
            labAttempts: portfolio.student.labAttempts.map(la => ({
                experimentTitle: la.experiment.title,
                completed: la.completed,
                score: la.score,
                date: la.createdAt
            })),
            readingProgress: portfolio.student.readingProgress.map(rp => ({
                chapterTitle: rp.chapter.title,
                pagesRead: rp.pagesRead,
                completed: rp.completed
            })),
            schoolPress: portfolio.student.schoolPressActivities.map(sp => ({
                activityType: "Press Article",
                description: sp.description,
                points: sp.isApproved ? 20 : 5,
                date: sp.createdAt
            }))
        };
        res.json({ success: true, data: formattedData });
    }
    catch (err) {
        console.error('Error fetching portfolio:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/portfolio — Create or update portfolio details (bio, stream, SWOT, extra fields)
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, bio, stream, strengths, areasOfGrowth, termGoals, leadershipRoles, vocationalSkills, languageFluency, careerGoal, subjectInterests, talentPrep, communicationRole, teacherEndorsement, teacherName, parentEndorsement, parentName } = req.body;
        // Create the bio JSON if complex fields are provided
        let bioString = bio;
        if (strengths || areasOfGrowth || termGoals || leadershipRoles || vocationalSkills || languageFluency || careerGoal || subjectInterests || talentPrep || communicationRole || teacherEndorsement || teacherName || parentEndorsement || parentName) {
            bioString = JSON.stringify({
                bioText: bio || "Welcome to my digital portfolio!",
                strengths: strengths || [],
                areasOfGrowth: areasOfGrowth || [],
                termGoals: termGoals || [],
                leadershipRoles: leadershipRoles || [],
                vocationalSkills: vocationalSkills || [],
                languageFluency: languageFluency || {},
                careerGoal: careerGoal || "Engineering (Computer Science & AI)",
                subjectInterests: subjectInterests || ["Environmental Science", "Mathematics", "Tamil Literature"],
                talentPrep: talentPrep || ["NTSE Prep Active", "SSLC Target 95%+", "JEE Mock Target Active"],
                communicationRole: communicationRole || "Speaker / Lead",
                teacherEndorsement: teacherEndorsement || "Shows remarkable logical clarity and deep engagement in computer education. The programming model built for the science exhibition was excellent.",
                teacherName: teacherName || "Mrs. Abirami",
                parentEndorsement: parentEndorsement || "Exhibits great dedication to self-study and maintains an excellent balance between sports and math homework goals.",
                parentName: parentName || "Mr. Balasubramanian"
            });
        }
        const portfolio = yield prisma_1.prisma.portfolio.upsert({
            where: { studentId },
            update: { bio: bioString, stream },
            create: { studentId, bio: bioString, stream }
        });
        res.json({ success: true, data: portfolio });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/portfolio/:studentId/skills — Add or update a portfolio skill
router.post('/:studentId/skills', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { name, level, color } = req.body;
        const portfolio = yield prisma_1.prisma.portfolio.findUnique({ where: { studentId } });
        if (!portfolio) {
            return res.status(404).json({ success: false, error: 'Portfolio not found' });
        }
        const newSkill = yield prisma_1.prisma.portfolioSkill.create({
            data: {
                portfolioId: portfolio.id,
                name,
                level: parseInt(level),
                color
            }
        });
        res.json({ success: true, data: newSkill });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/portfolio/:studentId/skills/:skillId — Remove a portfolio skill
router.delete('/:studentId/skills/:skillId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { skillId } = req.params;
        yield prisma_1.prisma.portfolioSkill.delete({
            where: { id: skillId }
        });
        res.json({ success: true, message: 'Skill deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/portfolio/:studentId/projects — Add or update a portfolio project
router.post('/:studentId/projects', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { title, category, date, image, tags, description } = req.body;
        const portfolio = yield prisma_1.prisma.portfolio.findUnique({ where: { studentId } });
        if (!portfolio) {
            return res.status(404).json({ success: false, error: 'Portfolio not found' });
        }
        const newProject = yield prisma_1.prisma.portfolioProject.create({
            data: {
                portfolioId: portfolio.id,
                title,
                category,
                date,
                image,
                tags: Array.isArray(tags) ? tags : [tags],
                description
            }
        });
        res.json({ success: true, data: newProject });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/portfolio/:studentId/projects/:projectId — Remove a portfolio project
router.delete('/:studentId/projects/:projectId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        yield prisma_1.prisma.portfolioProject.delete({
            where: { id: projectId }
        });
        res.json({ success: true, message: 'Project deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/portfolio/:studentId/achievements — Add or update a portfolio achievement
router.post('/:studentId/achievements', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { title, year, icon, color, bg } = req.body;
        const portfolio = yield prisma_1.prisma.portfolio.findUnique({ where: { studentId } });
        if (!portfolio) {
            return res.status(404).json({ success: false, error: 'Portfolio not found' });
        }
        const newAchievement = yield prisma_1.prisma.portfolioAchievement.create({
            data: {
                portfolioId: portfolio.id,
                title,
                year,
                icon,
                color,
                bg
            }
        });
        res.json({ success: true, data: newAchievement });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/portfolio/:studentId/achievements/:achievementId — Remove a portfolio achievement
router.delete('/:studentId/achievements/:achievementId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { achievementId } = req.params;
        yield prisma_1.prisma.portfolioAchievement.delete({
            where: { id: achievementId }
        });
        res.json({ success: true, message: 'Achievement deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
