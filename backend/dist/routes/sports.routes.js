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
// 1. GET /api/sports/injuries/all - PE Coach gets all injury reports
router.get('/injuries/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const injuries = yield prisma_1.prisma.injuryReport.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: injuries });
    }
    catch (err) {
        console.error('Error fetching all injuries:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 2. GET /api/sports/section/:section - PE Coach fetches roster & leaderboards for a section (middle, high, hsc)
router.get('/section/:section', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { section } = req.params;
        // Map section name to classes
        let targetClasses = [];
        if (section.toLowerCase() === 'middle') {
            targetClasses = ['6', '7', '8', '06', '07', '08'];
        }
        else if (section.toLowerCase() === 'high') {
            targetClasses = ['9', '10', '09', '10'];
        }
        else if (section.toLowerCase() === 'hsc') {
            targetClasses = ['11', '12'];
        }
        else {
            return res.status(400).json({ success: false, error: 'Invalid section. Use middle, high, or hsc' });
        }
        // Get schoolId from query or fallback to first school
        let schoolId = req.query.schoolId;
        if (!schoolId) {
            const demoSchool = yield prisma_1.prisma.school.findFirst();
            if (demoSchool)
                schoolId = demoSchool.id;
        }
        // Fetch students in this section with their sports profiles
        const students = yield prisma_1.prisma.student.findMany({
            where: {
                schoolId: schoolId || undefined,
                class: { in: targetClasses }
            },
            include: {
                user: true,
                sportsProfile: {
                    include: {
                        stats: true,
                        teams: true,
                        logs: true
                    }
                }
            }
        });
        // Format roster list
        const roster = students.map(s => {
            var _a, _b, _c, _d;
            return ({
                studentId: s.id,
                name: s.user.name,
                rollNumber: s.rollNumber || '',
                className: `${s.class}${s.section || ''}`,
                hasProfile: !!s.sportsProfile,
                profileId: ((_a = s.sportsProfile) === null || _a === void 0 ? void 0 : _a.id) || null,
                stats: ((_b = s.sportsProfile) === null || _b === void 0 ? void 0 : _b.stats) || [],
                teams: ((_c = s.sportsProfile) === null || _c === void 0 ? void 0 : _c.teams) || [],
                logsCount: ((_d = s.sportsProfile) === null || _d === void 0 ? void 0 : _d.logs.length) || 0
            });
        });
        // Group stats by category (label) for leaderboard sorting
        const leaderboardMap = {};
        students.forEach(s => {
            if (s.sportsProfile) {
                s.sportsProfile.stats.forEach(stat => {
                    const key = stat.label;
                    if (!leaderboardMap[key]) {
                        leaderboardMap[key] = [];
                    }
                    leaderboardMap[key].push({
                        name: s.user.name,
                        className: `${s.class}${s.section || ''}`,
                        rollNumber: s.rollNumber || '',
                        value: stat.value,
                        score: stat.score
                    });
                });
            }
        });
        // Sort each leaderboard category by score descending
        const leaderboard = {};
        Object.keys(leaderboardMap).forEach(key => {
            leaderboard[key] = leaderboardMap[key]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10); // top 10
        });
        res.json({ success: true, data: { roster, leaderboard } });
    }
    catch (err) {
        console.error('Error fetching section sports data:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 3. GET /api/sports/:studentId - Fetch a student's profile + injury logs
router.get('/:studentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { studentId } = req.params;
        // Resolve demo student if specified
        if (studentId === 'demo-student') {
            const demoStudent = yield prisma_1.prisma.student.findFirst();
            if (demoStudent) {
                studentId = demoStudent.id;
            }
            else {
                return res.status(404).json({ success: false, error: 'No student found' });
            }
        }
        // Find profile
        let profile = yield prisma_1.prisma.sportsProfile.findUnique({
            where: { studentId },
            include: {
                teams: true,
                stats: true,
                events: true,
                logs: true,
                student: { include: { user: true } }
            }
        });
        // Fallback: Check if studentId is actually a userId
        if (!profile) {
            const studentByUserId = yield prisma_1.prisma.student.findFirst({
                where: { userId: studentId }
            });
            if (studentByUserId) {
                studentId = studentByUserId.id;
                profile = yield prisma_1.prisma.sportsProfile.findUnique({
                    where: { studentId },
                    include: {
                        teams: true,
                        stats: true,
                        events: true,
                        logs: true,
                        student: { include: { user: true } }
                    }
                });
            }
        }
        // If profile doesn't exist, create an empty one for the student
        if (!profile) {
            const studentExists = yield prisma_1.prisma.student.findUnique({ where: { id: studentId } });
            if (studentExists) {
                profile = yield prisma_1.prisma.sportsProfile.create({
                    data: { studentId },
                    include: {
                        teams: true,
                        stats: true,
                        events: true,
                        logs: true,
                        student: { include: { user: true } }
                    }
                });
            }
            else {
                return res.status(404).json({ success: false, error: 'Student not found' });
            }
        }
        // Fetch personal injuries
        const injuries = yield prisma_1.prisma.injuryReport.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' }
        });
        // Dynamically fetch from PET tables
        const petFitness = yield prisma_1.prisma.petFitnessRecord.findFirst({
            where: { studentId },
            orderBy: { updatedAt: 'desc' }
        });
        const petEventsRaw = yield prisma_1.prisma.petSportsEvent.findMany({
            where: profile.student.schoolId ? {
                OR: [
                    { schoolId: profile.student.schoolId },
                    { schoolId: null }
                ]
            } : undefined,
            orderBy: { date: 'desc' }
        });
        // Check which events the student is registered for
        const registeredTitles = new Set((profile.events || []).map(e => e.title.toLowerCase()));
        const petEvents = petEventsRaw.map(ev => (Object.assign(Object.assign({}, ev), { isRegistered: registeredTitles.has(ev.name.toLowerCase()) })));
        const awards = yield prisma_1.prisma.portfolioAchievement.findMany({
            where: { portfolio: { studentId } },
            orderBy: { createdAt: 'desc' }
        });
        const clubs = yield prisma_1.prisma.clubMember.findMany({
            where: { studentId },
            include: { club: true }
        });
        const formattedData = {
            studentId: profile.studentId,
            studentName: profile.student.user.name,
            className: `${profile.student.class}${profile.student.section || ''}`,
            rollNumber: profile.student.rollNumber || '',
            teams: profile.teams,
            stats: profile.stats,
            events: profile.events,
            logs: profile.logs,
            injuries,
            petFitness,
            petEvents,
            awards,
            clubs
        };
        res.json({ success: true, data: formattedData });
    }
    catch (err) {
        console.error('Error fetching sports profile:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 4. PUT /api/sports/profile/:studentId/stats - PE Coach records physical stats/scores
router.put('/profile/:studentId/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { stats } = req.body; // Array<{ label, value, score, icon, color }>
        if (!Array.isArray(stats)) {
            return res.status(400).json({ success: false, error: 'stats must be an array' });
        }
        // Ensure sports profile exists
        let sportsProfile = yield prisma_1.prisma.sportsProfile.findUnique({ where: { studentId } });
        if (!sportsProfile) {
            sportsProfile = yield prisma_1.prisma.sportsProfile.create({ data: { studentId } });
        }
        // Batch upsert stats
        for (const stat of stats) {
            const existing = yield prisma_1.prisma.sportsFitnessStat.findFirst({
                where: { sportsProfileId: sportsProfile.id, label: stat.label }
            });
            if (existing) {
                yield prisma_1.prisma.sportsFitnessStat.update({
                    where: { id: existing.id },
                    data: {
                        value: stat.value,
                        score: Number(stat.score),
                        icon: stat.icon || existing.icon,
                        color: stat.color || existing.color
                    }
                });
            }
            else {
                yield prisma_1.prisma.sportsFitnessStat.create({
                    data: {
                        sportsProfileId: sportsProfile.id,
                        label: stat.label,
                        value: stat.value,
                        score: Number(stat.score),
                        icon: stat.icon || '💪',
                        color: stat.color || 'bg-emerald-500'
                    }
                });
            }
        }
        res.json({ success: true, message: 'Fitness stats updated successfully' });
    }
    catch (err) {
        console.error('Error updating fitness stats:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 5. POST /api/sports/profile/:studentId/teams - PE Coach assigns student to sports team
router.post('/profile/:studentId/teams', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { name, role, icon, color, match, date } = req.body;
        if (!name || !role) {
            return res.status(400).json({ success: false, error: 'Team name and role are required' });
        }
        let resolvedStudentId = studentId;
        let sportsProfile = yield prisma_1.prisma.sportsProfile.findUnique({ where: { studentId: resolvedStudentId } });
        if (!sportsProfile) {
            const studentByUserId = yield prisma_1.prisma.student.findFirst({
                where: { userId: studentId }
            });
            if (studentByUserId) {
                resolvedStudentId = studentByUserId.id;
                sportsProfile = yield prisma_1.prisma.sportsProfile.findUnique({ where: { studentId: resolvedStudentId } });
            }
        }
        if (!sportsProfile) {
            sportsProfile = yield prisma_1.prisma.sportsProfile.create({ data: { studentId: resolvedStudentId } });
        }
        const team = yield prisma_1.prisma.sportsTeam.create({
            data: {
                sportsProfileId: sportsProfile.id,
                name,
                role,
                icon: icon || '🏆',
                color: color || 'from-cyan-500 to-blue-500',
                match: match || 'Practice Match',
                date: date || 'TBD'
            }
        });
        res.json({ success: true, data: team });
    }
    catch (err) {
        console.error('Error adding student to team:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 5.1 POST /api/sports/profile/:studentId/logs - Log a workout activity
router.post('/profile/:studentId/logs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { activity, duration, intensity, calories, date } = req.body;
        if (!activity || !duration) {
            return res.status(400).json({ success: false, error: 'Activity name and duration are required' });
        }
        let resolvedStudentId = studentId;
        let sportsProfile = yield prisma_1.prisma.sportsProfile.findUnique({ where: { studentId: resolvedStudentId } });
        if (!sportsProfile) {
            const studentByUserId = yield prisma_1.prisma.student.findFirst({
                where: { userId: studentId }
            });
            if (studentByUserId) {
                resolvedStudentId = studentByUserId.id;
                sportsProfile = yield prisma_1.prisma.sportsProfile.findUnique({ where: { studentId: resolvedStudentId } });
            }
        }
        if (!sportsProfile) {
            sportsProfile = yield prisma_1.prisma.sportsProfile.create({ data: { studentId: resolvedStudentId } });
        }
        const log = yield prisma_1.prisma.sportsHealthLog.create({
            data: {
                sportsProfileId: sportsProfile.id,
                activity,
                duration,
                intensity: intensity || 'Medium',
                calories: Number(calories) || 0,
                date: date || 'Today'
            }
        });
        res.json({ success: true, data: log });
    }
    catch (err) {
        console.error('Error adding activity log:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 5.2 POST /api/sports/profile/:studentId/events - Schedule a sports event
router.post('/profile/:studentId/events', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { title, date, type, icon } = req.body;
        if (!title || !date) {
            return res.status(400).json({ success: false, error: 'Event title and date are required' });
        }
        let resolvedStudentId = studentId;
        let sportsProfile = yield prisma_1.prisma.sportsProfile.findUnique({ where: { studentId: resolvedStudentId } });
        if (!sportsProfile) {
            const studentByUserId = yield prisma_1.prisma.student.findFirst({
                where: { userId: studentId }
            });
            if (studentByUserId) {
                resolvedStudentId = studentByUserId.id;
                sportsProfile = yield prisma_1.prisma.sportsProfile.findUnique({ where: { studentId: resolvedStudentId } });
            }
        }
        if (!sportsProfile) {
            sportsProfile = yield prisma_1.prisma.sportsProfile.create({ data: { studentId: resolvedStudentId } });
        }
        const event = yield prisma_1.prisma.sportsEvent.create({
            data: {
                sportsProfileId: sportsProfile.id,
                title,
                date,
                type: type || 'General',
                icon: icon || '📅'
            }
        });
        res.json({ success: true, data: event });
    }
    catch (err) {
        console.error('Error scheduling sports event:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 5.3 POST /api/sports/events/:eventId/register - Student registers for a PET sports event
router.post('/events/:eventId/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.params;
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'studentId is required' });
        }
        const petEvent = yield prisma_1.prisma.petSportsEvent.findUnique({ where: { id: eventId } });
        if (!petEvent) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        let resolvedStudentId = studentId;
        let sportsProfile = yield prisma_1.prisma.sportsProfile.findUnique({ where: { studentId: resolvedStudentId } });
        if (!sportsProfile) {
            const studentByUserId = yield prisma_1.prisma.student.findFirst({
                where: { userId: studentId }
            });
            if (studentByUserId) {
                resolvedStudentId = studentByUserId.id;
                sportsProfile = yield prisma_1.prisma.sportsProfile.findUnique({ where: { studentId: resolvedStudentId } });
            }
        }
        if (!sportsProfile) {
            sportsProfile = yield prisma_1.prisma.sportsProfile.create({ data: { studentId: resolvedStudentId } });
        }
        // Check if already registered
        const existing = yield prisma_1.prisma.sportsEvent.findFirst({
            where: {
                sportsProfileId: sportsProfile.id,
                title: petEvent.name
            }
        });
        if (!existing) {
            yield prisma_1.prisma.sportsEvent.create({
                data: {
                    sportsProfileId: sportsProfile.id,
                    title: petEvent.name,
                    date: petEvent.date,
                    type: petEvent.kind,
                    icon: petEvent.kind === 'Competition' ? '🏆' : '⚽'
                }
            });
            // Increment participants count on petSportsEvent
            yield prisma_1.prisma.petSportsEvent.update({
                where: { id: eventId },
                data: { participants: { increment: 1 } }
            });
        }
        res.json({ success: true, message: 'Successfully registered for event', isRegistered: true });
    }
    catch (err) {
        console.error('Error registering for event:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 6. POST /api/sports/injury - Student reports a sports injury
router.post('/injury', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, type, severity, description, date } = req.body;
        if (!studentId || !type || !severity) {
            return res.status(400).json({ success: false, error: 'studentId, type, and severity are required' });
        }
        // Resolve student info
        const student = yield prisma_1.prisma.student.findUnique({
            where: { id: studentId },
            include: { user: true }
        });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        const report = yield prisma_1.prisma.injuryReport.create({
            data: {
                studentId,
                studentName: student.user.name,
                className: `${student.class}${student.section || ''}`,
                type,
                severity,
                description: description || '',
                date: date || 'Today'
            }
        });
        res.json({ success: true, data: report });
    }
    catch (err) {
        console.error('Error creating injury report:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 7. PUT /api/sports/injury/:id/status - PE Coach updates injury resolution status
router.put('/injury/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, error: 'status is required' });
        }
        const report = yield prisma_1.prisma.injuryReport.update({
            where: { id },
            data: { status }
        });
        res.json({ success: true, data: report });
    }
    catch (err) {
        console.error('Error updating injury status:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
