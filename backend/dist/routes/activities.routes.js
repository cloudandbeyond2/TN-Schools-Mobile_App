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
// GET /api/activities — Fetch all clubs and events
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, studentId } = req.query;
        let clubs = yield prisma_1.prisma.club.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            orderBy: { name: 'asc' }
        });
        if (clubs.length === 0 && schoolId) {
            const sId = String(schoolId);
            const defaultClubs = [
                { schoolId: sId, name: "Junior Red Cross (JRC)", category: "Jrc", icon: "fi fi-rr-heart", themeColor: "text-rose-500", themeBg: "bg-rose-500/10 border-rose-500/20", themeTagBg: "bg-rose-500/20" },
                { schoolId: sId, name: "National Cadet Corps (NCC)", category: "Ncc", icon: "fi fi-rr-star", themeColor: "text-blue-500", themeBg: "bg-blue-500/10 border-blue-500/20", themeTagBg: "bg-blue-500/20" },
                { schoolId: sId, name: "National Green Corps (Eco Club)", category: "Green Corps", icon: "fi fi-rr-leaf", themeColor: "text-emerald-500", themeBg: "bg-emerald-500/10 border-emerald-500/20", themeTagBg: "bg-emerald-500/20" },
                { schoolId: sId, name: "National Service Scheme (NSS)", category: "Nss", icon: "fi fi-rr-heart", themeColor: "text-red-500", themeBg: "bg-red-500/10 border-red-500/20", themeTagBg: "bg-red-500/20" },
                { schoolId: sId, name: "Scouts & Guides", category: "Scouts & Guides", icon: "fi fi-rr-star", themeColor: "text-amber-500", themeBg: "bg-amber-500/10 border-amber-500/20", themeTagBg: "bg-amber-500/20" },
                { schoolId: sId, name: "Sports Club", category: "Sports", icon: "fi fi-rr-star", themeColor: "text-orange-500", themeBg: "bg-orange-500/10 border-orange-500/20", themeTagBg: "bg-orange-500/20" },
                { schoolId: sId, name: "Red Ribbon Club (RRC)", category: "Academics", icon: "fi fi-rr-star", themeColor: "text-red-500", themeBg: "bg-red-500/10 border-red-500/20", themeTagBg: "bg-red-500/20" },
                { schoolId: sId, name: "Road Safety Patrol (RSP)", category: "Academics", icon: "fi fi-rr-star", themeColor: "text-blue-500", themeBg: "bg-blue-500/10 border-blue-500/20", themeTagBg: "bg-blue-500/20" }
            ];
            yield prisma_1.prisma.club.createMany({
                data: defaultClubs
            });
            clubs = yield prisma_1.prisma.club.findMany({
                where: { schoolId: sId },
                orderBy: { name: 'asc' }
            });
        }
        // Fetch actual sports events logged by the PET teacher
        const petEvents = yield prisma_1.prisma.petSportsEvent.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            orderBy: { date: 'asc' },
        });
        const events = petEvents.map(pe => {
            let icon = "fi fi-rr-star";
            const s = pe.sport.toLowerCase();
            if (s.includes("chess"))
                icon = "fi fi-rr-chess-knight";
            else if (s.includes("badminton") || s.includes("tennis") || s.includes("ball"))
                icon = "fi fi-rr-basketball";
            else if (s.includes("athletics") || s.includes("run") || pe.name.toLowerCase().includes("sports day"))
                icon = "fi fi-rr-running";
            let themeColor = "text-blue-500";
            if (pe.kind.toLowerCase().includes("competition") || pe.kind.toLowerCase().includes("championship")) {
                themeColor = "text-amber-500";
            }
            return {
                id: pe.id,
                title: pe.name,
                type: `${pe.sport} (${pe.level})`,
                icon,
                themeColor,
                eventDate: pe.date
            };
        });
        let formattedMyClubs = [];
        if (studentId && studentId !== 'undefined') {
            const myClubs = yield prisma_1.prisma.clubMember.findMany({
                where: { studentId: String(studentId) },
                include: { club: true }
            });
            formattedMyClubs = myClubs.map(member => ({
                name: member.club.name,
                role: member.role,
                icon: member.club.icon,
                color: member.club.themeColor,
                nextEvent: "See details in club page"
            }));
        }
        res.json({ success: true, data: { discoverClubs: clubs, upcomingEvents: events, myClubs: formattedMyClubs } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/activities/student/:studentId — Fetch clubs for a specific student
router.get('/student/:studentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = req.params.studentId;
        const myClubs = yield prisma_1.prisma.clubMember.findMany({
            where: { studentId },
            include: {
                club: true
            }
        });
        // Transform the data to match the frontend shape
        const formattedMyClubs = myClubs.map(member => ({
            name: member.club.name,
            role: member.role,
            icon: member.club.icon,
            color: member.club.themeColor,
            nextEvent: "See details in club page" // Placeholder since we didn't add events per club yet
        }));
        res.json({ success: true, data: { myClubs: formattedMyClubs } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/activities/clubs — Create a new club (Headmaster)
router.post('/clubs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, category, icon, themeColor, themeBg, themeTagBg, description, sponsor, meetingTime, schoolId } = req.body;
        const club = yield prisma_1.prisma.club.create({
            data: {
                name,
                category,
                icon,
                themeColor,
                themeBg,
                themeTagBg,
                description,
                sponsor,
                meetingTime,
                schoolId
            }
        });
        res.json({ success: true, data: club });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/activities/events — Create a new event (Teacher/Sponsor)
router.post('/events', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, eventDate, type, icon, themeColor, clubId, schoolId } = req.body;
        const event = yield prisma_1.prisma.clubEvent.create({
            data: {
                title,
                eventDate: new Date(eventDate),
                type,
                icon,
                themeColor,
                clubId,
                schoolId
            }
        });
        res.json({ success: true, data: event });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/activities/clubs/:id — Delete a club (PET/Headmaster)
router.delete('/clubs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.club.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Club deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/activities/club/:id — Fetch a single club details
router.get('/club/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const club = yield prisma_1.prisma.club.findUnique({
            where: { id },
            include: {
                events: {
                    orderBy: { eventDate: 'asc' }
                },
                _count: {
                    select: { members: true }
                }
            }
        });
        if (!club) {
            return res.status(404).json({ success: false, error: 'Club not found' });
        }
        res.json({ success: true, data: club });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/activities/club/:id/members — List club members with student details (PET/Headmaster)
router.get('/club/:id/members', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const members = yield prisma_1.prisma.clubMember.findMany({
            where: { clubId: id },
            include: { student: { include: { user: { select: { name: true } } } } },
            orderBy: { joinedAt: 'asc' }
        });
        const formatted = members.map(m => {
            var _a;
            return ({
                id: m.id,
                studentId: m.studentId,
                name: ((_a = m.student.user) === null || _a === void 0 ? void 0 : _a.name) || 'Student',
                class: m.student.class,
                section: m.student.section,
                role: m.role,
                joinedAt: m.joinedAt
            });
        });
        res.json({ success: true, count: formatted.length, data: formatted });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/activities/club/:id/membership/:studentId — Check if student is already a member
router.get('/club/:id/membership/:studentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, studentId } = req.params;
        const member = yield prisma_1.prisma.clubMember.findUnique({
            where: { clubId_studentId: { clubId: id, studentId } }
        });
        res.json({ success: true, isMember: !!member, data: member });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/activities/join — Student joins a club
router.post('/join', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clubId, studentId } = req.body;
        if (!clubId || !studentId) {
            return res.status(400).json({ success: false, error: 'clubId and studentId are required' });
        }
        // Check if already a member
        const existing = yield prisma_1.prisma.clubMember.findUnique({
            where: { clubId_studentId: { clubId, studentId } }
        });
        if (existing) {
            return res.status(409).json({ success: false, error: 'Already a member of this club' });
        }
        const member = yield prisma_1.prisma.clubMember.create({
            data: { clubId, studentId, role: 'Member' }
        });
        res.json({ success: true, data: member });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/activities/leave — Student leaves a club
router.delete('/leave', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clubId, studentId } = req.body;
        yield prisma_1.prisma.clubMember.delete({
            where: { clubId_studentId: { clubId, studentId } }
        });
        res.json({ success: true, message: 'Left club successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
