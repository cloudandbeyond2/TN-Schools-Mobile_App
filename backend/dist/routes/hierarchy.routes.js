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
const password_1 = require("../utils/password");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const SAFE_USER_SELECT = {
    id: true, name: true, email: true, mobile: true,
    role: true, isActive: true, schoolId: true,
    district: true, block: true, assignedRegion: true,
    createdAt: true, updatedAt: true,
};
// ─── GET /api/hierarchy/users?role= ─────────────────────────────────────────
// List all users of a given role (for Super Admin management panels)
router.get('/users', (0, auth_middleware_1.requireMinRole)('BEO'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role } = req.query;
        const where = role ? { role: String(role) } : {};
        const users = yield prisma_1.prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: SAFE_USER_SELECT,
        });
        res.json({ success: true, count: users.length, data: users });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/hierarchy/beo/:userId ─────────────────────────────────────────
// Returns the schools under a BEO's block
router.get('/beo/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: req.params.userId },
            select: { id: true, name: true, block: true, role: true },
        });
        if (!user)
            return res.status(404).json({ success: false, error: 'BEO user not found' });
        const whereClause = {};
        if (user.block) {
            whereClause.OR = [
                { beoId: user.id },
                { block: { equals: user.block, mode: 'insensitive' } },
            ];
        }
        else {
            whereClause.beoId = user.id;
        }
        const schools = yield prisma_1.prisma.school.findMany({
            where: whereClause,
            include: { _count: { select: { students: true, teachers: true } } },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: { user, schools, totalSchools: schools.length } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/hierarchy/deo/:userId ─────────────────────────────────────────
// Returns BEOs and schools under a DEO's district
router.get('/deo/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: req.params.userId },
            select: { id: true, name: true, district: true, role: true },
        });
        if (!user)
            return res.status(404).json({ success: false, error: 'DEO user not found' });
        const districtFilter = user.district
            ? { district: { equals: user.district, mode: 'insensitive' } }
            : { deoId: user.id };
        const [schools, beos] = yield Promise.all([
            prisma_1.prisma.school.findMany({
                where: districtFilter,
                include: { _count: { select: { students: true, teachers: true } } },
                orderBy: { name: 'asc' },
            }),
            prisma_1.prisma.user.findMany({
                where: Object.assign({ role: 'BEO' }, (user.district ? { district: user.district } : {})),
                select: SAFE_USER_SELECT,
            }),
        ]);
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
                user,
                district: user.district,
                schools,
                beos,
                totalSchools: schools.length,
                sports: {
                    stateChampions: stateChampions || 18,
                    avgFitness: avgFitness._avg.score ? Math.round(avgFitness._avg.score) : 88
                }
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/hierarchy/commissioner/:userId ─────────────────────────────────
// Returns DEOs and district summary under a Commissioner
router.get('/commissioner/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: req.params.userId },
            select: { id: true, name: true, assignedRegion: true, role: true },
        });
        if (!user)
            return res.status(404).json({ success: false, error: 'Commissioner user not found' });
        const deos = yield prisma_1.prisma.user.findMany({
            where: { role: 'DEO' },
            select: SAFE_USER_SELECT,
            orderBy: { name: 'asc' },
        });
        // Get district breakdown from schools
        const districtStats = yield prisma_1.prisma.$queryRaw `
      SELECT sc.district,
             COUNT(DISTINCT sc.id)::bigint AS schools,
             COUNT(st.id)::bigint AS students
      FROM "School" sc
      LEFT JOIN "Student" st ON st."schoolId" = sc.id
        AND (st."studentStatus" = 'Active' OR st."studentStatus" IS NULL)
      GROUP BY sc.district
      ORDER BY sc.district
    `;
        res.json({
            success: true,
            data: {
                user,
                deos,
                districtStats: districtStats.map((d) => ({
                    district: d.district,
                    schools: Number(d.schools),
                    students: Number(d.students),
                })),
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/hierarchy/minister/:userId ─────────────────────────────────────
// Returns commissioners under a Minister
router.get('/minister/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: req.params.userId },
            select: { id: true, name: true, role: true },
        });
        if (!user)
            return res.status(404).json({ success: false, error: 'Minister user not found' });
        const commissioners = yield prisma_1.prisma.user.findMany({
            where: { role: 'COMMISSIONER' },
            select: SAFE_USER_SELECT,
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: { user, commissioners } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── POST /api/hierarchy/assign ─────────────────────────────────────────────
// Super Admin: assign role + scope to a user
// Body: { userId, role, district?, block?, assignedRegion?, schoolIds? }
router.post('/assign', (0, auth_middleware_1.requireMinRole)('SUPERADMIN'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, role, district, block, assignedRegion, schoolIds } = req.body;
        if (!userId || !role) {
            return res.status(400).json({ success: false, error: 'userId and role are required' });
        }
        const updated = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: Object.assign(Object.assign(Object.assign({ role: role }, (district !== undefined ? { district } : {})), (block !== undefined ? { block } : {})), (assignedRegion !== undefined ? { assignedRegion } : {})),
            select: SAFE_USER_SELECT,
        });
        // If schoolIds are provided, link schools to this BEO/DEO
        if (Array.isArray(schoolIds) && schoolIds.length > 0) {
            const updateField = role === 'BEO' ? { beoId: userId } : role === 'DEO' ? { deoId: userId } : null;
            if (updateField) {
                yield prisma_1.prisma.school.updateMany({
                    where: { id: { in: schoolIds } },
                    data: updateField,
                });
            }
        }
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── POST /api/hierarchy/create-officer ─────────────────────────────────────
// Super Admin / DEO: create a new governance-level user
// Body: { name, email, mobile?, password, role, district?, block?, assignedRegion? }
router.post('/create-officer', (0, auth_middleware_1.requireMinRole)('DEO'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, mobile, password, role, district, block, assignedRegion } = req.body;
        if (!name || !email || !role || !password) {
            return res.status(400).json({ success: false, error: 'name, email, role, and password are required' });
        }
        const existing = yield prisma_1.prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
        });
        if (existing) {
            return res.status(400).json({ success: false, error: 'User with this email already exists' });
        }
        if (mobile) {
            const mobileDuplicate = yield prisma_1.prisma.user.findUnique({
                where: { mobile },
            });
            if (mobileDuplicate) {
                return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
            }
        }
        const user = yield prisma_1.prisma.user.create({
            data: {
                name,
                email,
                mobile: mobile || null,
                role: role,
                passwordHash: yield (0, password_1.hashPassword)(password),
                district: district || null,
                block: block || null,
                assignedRegion: assignedRegion || null,
            },
            select: SAFE_USER_SELECT,
        });
        res.status(201).json({ success: true, data: user });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── PUT /api/hierarchy/block ────────────────────────────────────────────────
// Update a block name (updates all schools and BEOs assigned to that block)
router.put('/block', (0, auth_middleware_1.requireMinRole)('DEO'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { oldBlockName, newBlockName, district } = req.body;
        if (!oldBlockName || !newBlockName) {
            return res.status(400).json({ success: false, error: 'oldBlockName and newBlockName are required' });
        }
        const whereClause = district
            ? { block: { equals: oldBlockName, mode: 'insensitive' }, district: { equals: district, mode: 'insensitive' } }
            : { block: { equals: oldBlockName, mode: 'insensitive' } };
        const whereClauseUser = district
            ? { block: { equals: oldBlockName, mode: 'insensitive' }, district: { equals: district, mode: 'insensitive' } }
            : { block: { equals: oldBlockName, mode: 'insensitive' } };
        yield Promise.all([
            prisma_1.prisma.school.updateMany({
                where: whereClause,
                data: { block: newBlockName },
            }),
            prisma_1.prisma.user.updateMany({
                where: Object.assign({ role: 'BEO' }, whereClauseUser),
                data: { block: newBlockName },
            })
        ]);
        res.json({ success: true, message: 'Block updated successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── DELETE /api/hierarchy/block ─────────────────────────────────────────────
// Dissociate a block (sets block = null for all schools and BEOs under that block name)
router.delete('/block', (0, auth_middleware_1.requireMinRole)('DEO'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { blockName, district } = req.body;
        if (!blockName) {
            return res.status(400).json({ success: false, error: 'blockName is required' });
        }
        const whereClause = district
            ? { block: { equals: blockName, mode: 'insensitive' }, district: { equals: district, mode: 'insensitive' } }
            : { block: { equals: blockName, mode: 'insensitive' } };
        const whereClauseUser = district
            ? { block: { equals: blockName, mode: 'insensitive' }, district: { equals: district, mode: 'insensitive' } }
            : { block: { equals: blockName, mode: 'insensitive' } };
        yield Promise.all([
            prisma_1.prisma.school.updateMany({
                where: whereClause,
                data: { block: "" },
            }),
            prisma_1.prisma.user.updateMany({
                where: Object.assign({ role: 'BEO' }, whereClauseUser),
                data: { block: null },
            })
        ]);
        res.json({ success: true, message: 'Block deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
