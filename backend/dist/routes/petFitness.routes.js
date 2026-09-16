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
const auth_middleware_1 = require("../middleware/auth.middleware");
// PET portal — student fitness records (body measurements, fitness
// assessment, physical activity, health indicators).
//
// All endpoints require at least the PET/TEACHER tier: these records contain
// student health data and are maintained by physical-education staff.
// Records are scoped to the caller's school when the token carries one.
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireMinRole)('PET'));
// Only these body fields are ever written to the table.
const WRITABLE_STRING_FIELDS = [
    'schoolId', 'studentId', 'name', 'class', 'sport', 'status', 'lastAssessed',
    'activityLevel', 'bloodGroup', 'vision', 'lastCheckup', 'healthNotes', 'mentalHealth',
];
const WRITABLE_NUMBER_FIELDS = [
    'heightCm', 'weightKg', 'endurance', 'strength', 'flexibility', 'speed',
    'weeklyActivityHrs', 'restingHeartRate',
];
function pickWritable(body) {
    const data = {};
    for (const key of WRITABLE_STRING_FIELDS) {
        if (typeof body[key] === 'string')
            data[key] = body[key];
    }
    for (const key of WRITABLE_NUMBER_FIELDS) {
        if (body[key] !== undefined && body[key] !== null && !Number.isNaN(Number(body[key]))) {
            data[key] = Number(body[key]);
        }
    }
    return data;
}
function schoolScope(req) {
    var _a;
    // SUPERADMIN (and staff tokens without a school) see everything.
    return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.schoolId) ? { schoolId: req.user.schoolId } : {};
}
// GET /api/pet/fitness-records — list records for the caller's school
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const records = yield prisma_1.prisma.petFitnessRecord.findMany({
            where: schoolScope(req),
            orderBy: [{ class: 'asc' }, { name: 'asc' }],
        });
        res.json({ success: true, data: records });
    }
    catch (err) {
        console.error('Error fetching PET fitness records:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/pet/fitness-records — create one record
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const data = pickWritable(req.body);
        if (!data.name || typeof data.name !== 'string') {
            return res.status(400).json({ success: false, error: 'name is required' });
        }
        if (!data.schoolId && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.schoolId))
            data.schoolId = req.user.schoolId;
        const record = yield prisma_1.prisma.petFitnessRecord.create({ data: data });
        res.json({ success: true, data: record });
    }
    catch (err) {
        console.error('Error creating PET fitness record:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/pet/fitness-records/bulk — create many (Add by Class)
router.post('/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, error: 'records must be a non-empty array' });
        }
        const rows = records
            .map((r) => pickWritable(r))
            .filter((r) => r.name);
        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: 'every record needs a name' });
        }
        for (const row of rows) {
            if (!row.schoolId && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.schoolId))
                row.schoolId = req.user.schoolId;
        }
        const created = yield prisma_1.prisma.$transaction(rows.map((row) => prisma_1.prisma.petFitnessRecord.create({ data: row })));
        res.json({ success: true, data: created });
    }
    catch (err) {
        console.error('Error bulk-creating PET fitness records:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/pet/fitness-records/:id — update one record
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.petFitnessRecord.findFirst({
            where: Object.assign({ id }, schoolScope(req)),
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        const data = pickWritable(req.body);
        delete data.schoolId; // scope is fixed at creation
        const record = yield prisma_1.prisma.petFitnessRecord.update({ where: { id }, data: data });
        res.json({ success: true, data: record });
    }
    catch (err) {
        console.error('Error updating PET fitness record:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/pet/fitness-records/:id — remove one record
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.petFitnessRecord.findFirst({
            where: Object.assign({ id }, schoolScope(req)),
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        yield prisma_1.prisma.petFitnessRecord.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting PET fitness record:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
