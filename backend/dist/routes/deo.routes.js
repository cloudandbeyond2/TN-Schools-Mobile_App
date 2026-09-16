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
const kpi_service_1 = require("../services/kpi.service");
const router = (0, express_1.Router)();
// ─── 1. INFRASTRUCTURE ENDPOINTS ──────────────────────────────────────
// GET /api/deo/infrastructure - Fetch infrastructure projects
router.get('/infrastructure', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { district } = req.query;
        const where = {};
        if (district) {
            where.district = String(district);
        }
        const projects = yield prisma_1.prisma.ministerInfrastructureProject.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: projects });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/deo/infrastructure - Create an infrastructure project
router.post('/infrastructure', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { school, block, type, budget, completion, deadline, status, district } = req.body;
        if (!school || !district) {
            return res.status(400).json({ success: false, error: 'School name and district are required.' });
        }
        const project = yield prisma_1.prisma.ministerInfrastructureProject.create({
            data: {
                id: `infra-${Math.random().toString(36).substr(2, 9)}`,
                name: school,
                district,
                type: type || 'General Repair',
                budget: budget || '₹5L',
                completion: completion !== undefined ? Number(completion) : 0,
                deadline: deadline || '2025',
                status: status || 'Planned',
                updatedAt: new Date()
            }
        });
        res.status(201).json({ success: true, data: project });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── 2. GRIEVANCES ENDPOINTS ──────────────────────────────────────────
// GET /api/deo/grievances - Fetch grievances
router.get('/grievances', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { district } = req.query;
        const where = {};
        if (district) {
            where.district = String(district);
        }
        const grievances = yield prisma_1.prisma.ministerGrievance.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: grievances });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/deo/grievances - Create a grievance log
router.post('/grievances', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { petitioner, district, category, filed, status, escalation, ministerAction } = req.body;
        if (!petitioner || !district) {
            return res.status(400).json({ success: false, error: 'Petitioner and district are required.' });
        }
        const grievance = yield prisma_1.prisma.ministerGrievance.create({
            data: {
                id: `grievance-${Math.random().toString(36).substr(2, 9)}`,
                petitioner,
                district,
                category: category || 'General',
                filed: filed || new Date().toISOString().split('T')[0],
                status: status || 'Pending',
                escalation: escalation || 'L1',
                ministerAction: ministerAction || 'Under Review',
                updatedAt: new Date()
            }
        });
        res.status(201).json({ success: true, data: grievance });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── 3. CIRCULARS ENDPOINTS ───────────────────────────────────────────
// GET /api/deo/circulars - Fetch circular announcements
router.get('/circulars', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const circulars = yield prisma_1.prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: circulars });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/deo/circulars - Log/Create circular announcement
router.post('/circulars', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, body, target, date } = req.body;
        if (!title || !body) {
            return res.status(400).json({ success: false, error: 'Title and body are required.' });
        }
        const announcement = yield prisma_1.prisma.announcement.create({
            data: {
                title,
                body,
                target: target || 'All',
                sender: 'District Education Officer',
                date: date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                pinned: false,
                readReceipts: '0/0 read'
            }
        });
        res.status(201).json({ success: true, data: announcement });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── 4. TEACHERS DIRECTORY ENDPOINT ───────────────────────────────────
// GET /api/deo/teachers - Retrieve all teachers under the district
router.get('/teachers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { district } = req.query;
        const where = {};
        if (district) {
            where.school = { district: String(district) };
        }
        const teachers = yield prisma_1.prisma.teacher.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        mobile: true,
                    }
                },
                school: {
                    select: {
                        name: true,
                        block: true,
                        district: true,
                    }
                }
            }
        });
        const formatted = teachers.map((t) => {
            var _a, _b, _c, _d, _e;
            return ({
                id: t.id,
                name: ((_a = t.user) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
                email: ((_b = t.user) === null || _b === void 0 ? void 0 : _b.email) || 'N/A',
                mobile: ((_c = t.user) === null || _c === void 0 ? void 0 : _c.mobile) || 'N/A',
                school: ((_d = t.school) === null || _d === void 0 ? void 0 : _d.name) || 'N/A',
                block: ((_e = t.school) === null || _e === void 0 ? void 0 : _e.block) || 'N/A',
                subject: t.subjects && t.subjects.length > 0 ? t.subjects[0] : 'General',
                status: 'Active'
            });
        });
        res.json({ success: true, data: formatted });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── 5. SCHOLARSHIP LOGS ENDPOINT ──────────────────────────────────────
// GET /api/deo/scholarships - Fetch scholarships records
router.get('/scholarships', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { district } = req.query;
        const where = {};
        if (district) {
            where.student = { school: { district: String(district) } };
        }
        const list = yield prisma_1.prisma.scholarship.findMany({
            where,
            include: {
                student: {
                    select: {
                        user: {
                            select: {
                                name: true,
                            }
                        },
                        school: {
                            select: {
                                name: true,
                                block: true,
                            }
                        }
                    }
                }
            },
            orderBy: { appliedDate: 'desc' }
        });
        const formatted = list.map((s) => {
            var _a, _b, _c, _d, _e, _f;
            return ({
                id: s.id,
                studentName: ((_b = (_a = s.student) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.name) || 'Student',
                school: ((_d = (_c = s.student) === null || _c === void 0 ? void 0 : _c.school) === null || _d === void 0 ? void 0 : _d.name) || 'N/A',
                block: ((_f = (_e = s.student) === null || _e === void 0 ? void 0 : _e.school) === null || _f === void 0 ? void 0 : _f.block) || 'N/A',
                scheme: s.scheme,
                amount: `₹${s.amount.toLocaleString()}`,
                date: s.appliedDate ? new Date(s.appliedDate).toISOString().split('T')[0] : 'N/A',
                status: s.status === 'PENDING' ? 'Intervention Pending' : s.status === 'APPROVED' ? 'Counselled' : s.status === 'DISBURSED' ? 'Re-enrolled' : 'Dropped'
            });
        });
        res.json({ success: true, data: formatted });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── 6. WELFARE SCHEMES ENDPOINT ───────────────────────────────────────
// GET /api/deo/schemes - Fetch active welfare schemes
router.get('/schemes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [minSchemes, scholSchemes] = yield Promise.all([
            prisma_1.prisma.ministerScheme.findMany(),
            prisma_1.prisma.scholarshipScheme.findMany()
        ]);
        const formatted = [
            ...minSchemes.map((m) => ({
                id: m.id,
                name: m.name,
                ministry: m.ministry,
                budget: m.budget,
                beneficiaries: m.beneficiaries,
                progress: m.progress,
                status: m.status
            })),
            ...scholSchemes.map((s) => ({
                id: s.id,
                name: s.name,
                ministry: 'Welfare Department',
                budget: s.amountText,
                beneficiaries: 'Eligible Students',
                progress: 100,
                status: 'Active'
            }))
        ];
        res.json({ success: true, data: formatted });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── 7. PERFORMANCE & RANKINGS ENDPOINT ─────────────────────────────────
// GET /api/deo/performance - Aggregate performance details by block
router.get('/performance', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { district } = req.query;
        if (!district) {
            return res.status(400).json({ success: false, error: 'District is required.' });
        }
        const schools = yield prisma_1.prisma.school.findMany({
            where: { district: String(district) },
            include: {
                _count: {
                    select: { students: true }
                },
                teachers: true
            }
        });
        const blockNames = Array.from(new Set(schools.map(s => s.block).filter(Boolean)));
        const currYear = (0, kpi_service_1.currentAcademicYear)();
        const blocksData = yield Promise.all(blockNames.map((bname, idx) => __awaiter(void 0, void 0, void 0, function* () {
            const schoolsInBlock = schools.filter(s => s.block === bname);
            const schoolIds = schoolsInBlock.map(s => s.id);
            const studentCount = schoolsInBlock.reduce((sum, s) => sum + s._count.students, 0);
            const teacherCount = schoolsInBlock.reduce((sum, s) => sum + s.teachers.length, 0);
            const kpiOverall = yield (0, kpi_service_1.computeKpis)(schoolIds, currYear);
            const kpi10 = yield (0, kpi_service_1.computeKpis)(schoolIds, currYear, { class: '10th' });
            const kpi12 = yield (0, kpi_service_1.computeKpis)(schoolIds, currYear, { class: '12th' });
            const attendance = kpiOverall.attendancePct !== null ? Math.round(kpiOverall.attendancePct) : 88;
            const pass10 = kpi10.marks.passPct !== null ? Math.round(kpi10.marks.passPct) : (kpiOverall.marks.passPct !== null ? Math.round(kpiOverall.marks.passPct) : 85);
            const pass12 = kpi12.marks.passPct !== null ? Math.round(kpi12.marks.passPct) : (kpiOverall.marks.passPct !== null ? Math.round(kpiOverall.marks.passPct) : 82);
            return {
                name: bname,
                schools: schoolsInBlock.length,
                students: studentCount,
                teachers: teacherCount || 5,
                attendance,
                pass10,
                pass12,
                overall: Math.round((attendance + pass10 + pass12) / 3),
                rank: idx + 1
            };
        })));
        // Sort by overall descending
        blocksData.sort((a, b) => b.overall - a.overall);
        blocksData.forEach((b, idx) => {
            b.rank = idx + 1;
        });
        res.json({ success: true, data: blocksData });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/deo/rankings - Return schools ranked by composite metrics
router.get('/rankings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { district } = req.query;
        if (!district) {
            return res.status(400).json({ success: false, error: 'District is required.' });
        }
        const schools = yield prisma_1.prisma.school.findMany({
            where: { district: String(district) },
            include: {
                _count: {
                    select: { students: true }
                }
            }
        });
        const currYear = (0, kpi_service_1.currentAcademicYear)();
        const ranked = yield Promise.all(schools.map((s) => __awaiter(void 0, void 0, void 0, function* () {
            const kpiOverall = yield (0, kpi_service_1.computeKpis)([s.id], currYear);
            const kpi10 = yield (0, kpi_service_1.computeKpis)([s.id], currYear, { class: '10th' });
            const kpi12 = yield (0, kpi_service_1.computeKpis)([s.id], currYear, { class: '12th' });
            const pass10 = kpi10.marks.passPct !== null ? Math.round(kpi10.marks.passPct) : (kpiOverall.marks.passPct !== null ? Math.round(kpiOverall.marks.passPct) : 85);
            const pass12 = kpi12.marks.passPct !== null ? Math.round(kpi12.marks.passPct) : (kpiOverall.marks.passPct !== null ? Math.round(kpiOverall.marks.passPct) : 82);
            const composite = Math.round((pass10 + pass12) / 2 * 10) / 10;
            return {
                name: s.name,
                block: s.block || 'District Block',
                students: s._count.students || 0,
                pass10,
                pass12,
                composite
            };
        })));
        // Sort by composite descending
        ranked.sort((a, b) => b.composite - a.composite);
        const result = ranked.map((s, idx) => (Object.assign(Object.assign({}, s), { rank: idx + 1 })));
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── 8. DROPOUTS ENDPOINTS ────────────────────────────────────────────
// GET /api/deo/dropouts - Retrieve dropout records
router.get('/dropouts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { district } = req.query;
        const where = {};
        if (district) {
            where.district = String(district);
        }
        const dropouts = yield prisma_1.prisma.dropoutRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: dropouts });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/deo/dropouts - Log a new dropout record
router.post('/dropouts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentName, school, block, class: className, reason, date, status, district } = req.body;
        if (!studentName || !school || !district) {
            return res.status(400).json({ success: false, error: 'Student name, school, and district are required.' });
        }
        const newRecord = yield prisma_1.prisma.dropoutRecord.create({
            data: {
                studentName,
                school,
                block: block || 'Coimbatore Block',
                class: className || '8th',
                reason: reason || 'Economic',
                date: date || new Date().toISOString().split('T')[0],
                status: status || 'Intervention Pending',
                district,
            }
        });
        res.status(201).json({ success: true, data: newRecord });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/deo/sports - Retrieve sports excellence stats for the district
router.get('/sports', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { district } = req.query;
        if (!district) {
            return res.status(400).json({ success: false, error: 'District is required.' });
        }
        const schools = yield prisma_1.prisma.school.findMany({
            where: { district: { equals: String(district), mode: 'insensitive' } },
            select: { id: true }
        });
        const schoolIds = schools.map(s => s.id);
        const [stateChampions, avgFitness] = yield Promise.all([
            prisma_1.prisma.sportsTeam.count({
                where: {
                    sportsProfile: { student: { schoolId: { in: schoolIds } } },
                    OR: [
                        { name: { contains: 'State', mode: 'insensitive' } },
                        { match: { contains: 'State', mode: 'insensitive' } }
                    ]
                }
            }),
            prisma_1.prisma.sportsFitnessStat.aggregate({
                where: {
                    sportsProfile: { student: { schoolId: { in: schoolIds } } },
                    label: { contains: 'Fitness', mode: 'insensitive' }
                },
                _avg: { score: true }
            })
        ]);
        res.json({
            success: true,
            data: {
                stateChampions: stateChampions || 18,
                avgFitness: avgFitness._avg.score ? Math.round(avgFitness._avg.score) : 88
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
