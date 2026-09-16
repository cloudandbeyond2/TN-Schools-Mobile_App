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
exports.createDefaultPortal = createDefaultPortal;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const router = (0, express_1.Router)();
// Default gallery placeholders used when a school portal is first provisioned.
const DEFAULT_GALLERY = [
    { imageUrl: '/portal/g1.jpg', caption: 'Campus Life', order: 0 },
    { imageUrl: '/portal/g2.jpg', caption: 'Classrooms', order: 1 },
    { imageUrl: '/portal/g3.jpg', caption: 'Activities', order: 2 },
    { imageUrl: '/portal/g4.jpg', caption: 'Events', order: 3 },
];
/**
 * Ensure a school has a default public portal (landing page config + gallery).
 * Idempotent: does nothing if a portal already exists for the school.
 * Pass a Prisma transaction client (tx) to run inside an existing transaction.
 */
function createDefaultPortal(schoolId_1) {
    return __awaiter(this, arguments, void 0, function* (schoolId, client = prisma_1.prisma) {
        const existing = yield client.schoolPortal.findUnique({ where: { schoolId } });
        if (existing)
            return existing;
        return client.schoolPortal.create({
            data: {
                schoolId,
                gallery: { create: DEFAULT_GALLERY },
            },
        });
    });
}
// GET /api/schools — List all schools
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { district, block } = req.query;
        const schools = yield prisma_1.prisma.school.findMany({
            where: Object.assign(Object.assign({}, (district ? { district: String(district) } : {})), (block ? { block: String(block) } : {})),
            include: {
                _count: { select: { students: true, teachers: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, count: schools.length, data: schools });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/schools/:id — Single school with full details
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school = yield prisma_1.prisma.school.findUnique({
            where: { id: req.params.id },
            include: {
                _count: { select: { students: true, teachers: true } },
            },
        });
        if (!school)
            return res.status(404).json({ success: false, error: 'School not found' });
        res.json({ success: true, data: school });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/schools — Create school (auto-provisions a default public portal)
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const created = yield tx.school.create({ data: req.body });
            yield createDefaultPortal(created.id, tx);
            return created;
        }));
        res.status(201).json({ success: true, data: school });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/schools/analytics/district/:district — District-level school analytics
router.get('/analytics/district/:district', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const schools = yield prisma_1.prisma.school.findMany({
            where: { district: req.params.district },
            include: {
                _count: { select: { students: true, teachers: true } },
            },
        });
        const totalStudents = schools.reduce((acc, s) => acc + s._count.students, 0);
        const totalTeachers = schools.reduce((acc, s) => acc + s._count.teachers, 0);
        res.json({
            success: true,
            data: {
                totalSchools: schools.length,
                totalStudents,
                totalTeachers,
                schools,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/schools/:id — Update school
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school = yield prisma_1.prisma.school.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json({ success: true, data: school });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/schools/:id — Delete school
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.school.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true, message: 'School deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/schools/bulk — Bulk import schools from Excel
router.post('/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { records } = req.body;
        if (!Array.isArray(records)) {
            return res.status(400).json({ success: false, error: 'Invalid payload: records must be an array' });
        }
        const createdSchools = [];
        for (const record of records) {
            if (!record.dise || !record.name)
                continue;
            const school = yield prisma_1.prisma.school.upsert({
                where: { dise: String(record.dise) },
                update: {
                    name: record.name,
                    address: record.address || null,
                    district: record.district || '',
                    block: record.block || '',
                    pincode: record.pincode || null,
                    schoolType: record.schoolType || 'Government',
                    mediumOfInstruction: record.mediumOfInstruction || 'Tamil',
                    beoId: record.beoId || undefined,
                },
                create: {
                    dise: String(record.dise),
                    name: record.name,
                    address: record.address || null,
                    district: record.district || '',
                    block: record.block || '',
                    pincode: record.pincode || null,
                    schoolType: record.schoolType || 'Government',
                    mediumOfInstruction: record.mediumOfInstruction || 'Tamil',
                    beoId: record.beoId || null,
                },
            });
            // Ensure every imported/updated school has a default portal (idempotent).
            yield createDefaultPortal(school.id);
            createdSchools.push(school);
        }
        res.json({ success: true, count: createdSchools.length, data: createdSchools });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
