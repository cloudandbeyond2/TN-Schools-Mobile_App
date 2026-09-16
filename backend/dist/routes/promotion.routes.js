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
// ─── Helpers ──────────────────────────────────────────────────────
function nextClass(fromClass) {
    const n = parseInt(fromClass, 10);
    if (isNaN(n) || n >= 12)
        return null;
    return String(n + 1);
}
function nextAcademicYear(year) {
    const norm = (0, kpi_service_1.normalizeYear)(year);
    if (!norm)
        return null;
    const start = parseInt(norm.slice(0, 4), 10) + 1;
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
// Per-student attendance % and marks aggregates for one academic year.
function computeYearStats(studentIds, academicYear) {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = new Map();
        if (studentIds.length === 0)
            return stats;
        for (const id of studentIds) {
            stats.set(id, { attendancePct: null, daysPresent: null, totalWorkingDays: null, averageMarksPct: null, marksSummary: [] });
        }
        const range = (0, kpi_service_1.yearToDateRange)(academicYear);
        if (range) {
            const attGroups = yield prisma_1.prisma.attendance.groupBy({
                by: ['studentId', 'status'],
                where: { studentId: { in: studentIds }, date: { gte: range[0], lte: range[1] } },
                _count: { _all: true },
            });
            const attTotals = new Map();
            for (const g of attGroups) {
                const t = attTotals.get(g.studentId) || { present: 0, total: 0 };
                t.total += g._count._all;
                if (g.status === 'PRESENT' || g.status === 'LATE')
                    t.present += g._count._all;
                attTotals.set(g.studentId, t);
            }
            for (const [id, t] of attTotals) {
                const s = stats.get(id);
                s.daysPresent = t.present;
                s.totalWorkingDays = t.total;
                s.attendancePct = t.total > 0 ? Math.round((t.present / t.total) * 1000) / 10 : null;
            }
        }
        const markGroups = yield prisma_1.prisma.mark.groupBy({
            by: ['studentId', 'subject'],
            where: { studentId: { in: studentIds }, academicYear: { in: (0, kpi_service_1.yearVariants)(academicYear) } },
            _sum: { scored: true, maxMarks: true },
            _count: { _all: true },
        });
        const markTotals = new Map();
        for (const g of markGroups) {
            const scored = g._sum.scored || 0;
            const max = g._sum.maxMarks || 0;
            const s = stats.get(g.studentId);
            s.marksSummary.push({
                subject: g.subject,
                exams: g._count._all,
                scored,
                maxMarks: max,
                pct: max > 0 ? Math.round((scored / max) * 1000) / 10 : null,
            });
            const t = markTotals.get(g.studentId) || { scored: 0, max: 0 };
            t.scored += scored;
            t.max += max;
            markTotals.set(g.studentId, t);
        }
        for (const [id, t] of markTotals) {
            const s = stats.get(id);
            s.averageMarksPct = t.max > 0 ? Math.round((t.scored / t.max) * 1000) / 10 : null;
        }
        return stats;
    });
}
const EDITABLE_STATUSES = ['DRAFT', 'REJECTED'];
// ─── GET /api/promotions/batches?schoolId=&status= (HM) ──────────
router.get('/batches', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, status } = req.query;
        if (!schoolId)
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        const batches = yield prisma_1.prisma.promotionBatch.findMany({
            where: Object.assign({ schoolId: String(schoolId) }, (status ? { status: String(status) } : {})),
            include: { _count: { select: { records: true } } },
            orderBy: [{ fromAcademicYear: 'desc' }, { fromClass: 'asc' }],
        });
        res.json({ success: true, data: batches });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── POST /api/promotions/batches (HM creates draft) ─────────────
router.post('/batches', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, fromClass, toAcademicYear, submittedById } = req.body;
        const fromAcademicYear = (0, kpi_service_1.normalizeYear)(req.body.fromAcademicYear);
        if (!schoolId || !fromClass || !fromAcademicYear) {
            return res.status(400).json({ success: false, error: 'schoolId, fromClass and a valid fromAcademicYear (e.g. "2026-27") are required' });
        }
        const toYear = (0, kpi_service_1.normalizeYear)(toAcademicYear) || nextAcademicYear(fromAcademicYear);
        if (!toYear) {
            return res.status(400).json({ success: false, error: 'fromAcademicYear must look like "2024-25"' });
        }
        const existing = yield prisma_1.prisma.promotionBatch.findUnique({
            where: { schoolId_fromClass_fromAcademicYear: { schoolId, fromClass: String(fromClass), fromAcademicYear } },
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                error: `A promotion batch for class ${fromClass} (${fromAcademicYear}) already exists with status ${existing.status}`,
                existingBatchId: existing.id,
            });
        }
        const students = yield prisma_1.prisma.student.findMany({
            where: {
                schoolId,
                class: String(fromClass),
                OR: [{ studentStatus: 'Active' }, { studentStatus: null }],
            },
            select: { id: true, section: true },
            orderBy: { rollNumber: 'asc' },
        });
        if (students.length === 0) {
            return res.status(400).json({ success: false, error: `No active students found in class ${fromClass}` });
        }
        const isFinalClass = String(fromClass) === '12';
        const defaultToClass = nextClass(String(fromClass));
        const batch = yield prisma_1.prisma.promotionBatch.create({
            data: {
                schoolId,
                fromClass: String(fromClass),
                fromAcademicYear,
                toAcademicYear: toYear,
                submittedById: submittedById || null,
                records: {
                    create: students.map((s) => ({
                        studentId: s.id,
                        result: isFinalClass ? 'GRADUATED' : 'PROMOTED',
                        toClass: isFinalClass ? null : defaultToClass,
                        toSection: isFinalClass ? null : s.section,
                    })),
                },
            },
            include: { _count: { select: { records: true } } },
        });
        res.status(201).json({ success: true, data: batch });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/promotions/pending?beoUserId=&block= (BEO queue) ───
router.get('/pending', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { beoUserId, block } = req.query;
        if (!beoUserId && !block) {
            return res.status(400).json({ success: false, error: 'beoUserId or block is required' });
        }
        const schoolWhere = [];
        if (beoUserId)
            schoolWhere.push({ beoId: String(beoUserId) });
        if (block)
            schoolWhere.push({ block: { equals: String(block), mode: 'insensitive' } });
        const batches = yield prisma_1.prisma.promotionBatch.findMany({
            where: { status: 'PENDING_BEO_APPROVAL', school: { OR: schoolWhere } },
            include: {
                school: { select: { id: true, name: true, dise: true, block: true, district: true } },
                _count: { select: { records: true } },
            },
            orderBy: { submittedAt: 'asc' },
        });
        res.json({ success: true, data: batches });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/promotions/history?schoolId=&academicYear= (HM) ────
router.get('/history', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, academicYear } = req.query;
        if (!schoolId)
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        const rows = yield prisma_1.prisma.studentAcademicHistory.findMany({
            where: Object.assign({ schoolId: String(schoolId) }, (academicYear ? { academicYear: String(academicYear) } : {})),
            include: { student: { select: { id: true, rollNumber: true, user: { select: { name: true } } } } },
            orderBy: [{ academicYear: 'desc' }, { class: 'asc' }, { section: 'asc' }],
        });
        res.json({ success: true, data: rows });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/promotions/history/student/:studentId ──────────────
router.get('/history/student/:studentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield prisma_1.prisma.studentAcademicHistory.findMany({
            where: { studentId: req.params.studentId },
            orderBy: { academicYear: 'desc' },
        });
        res.json({ success: true, data: rows });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/promotions/batches/:id (HM/BEO detail + evidence) ──
router.get('/batches/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const batch = yield prisma_1.prisma.promotionBatch.findUnique({
            where: { id: req.params.id },
            include: {
                school: { select: { id: true, name: true, dise: true, block: true, district: true } },
                records: {
                    include: {
                        student: {
                            select: {
                                id: true, rollNumber: true, section: true, group: true, gender: true,
                                user: { select: { name: true } },
                            },
                        },
                    },
                    orderBy: { id: 'asc' },
                },
            },
        });
        if (!batch)
            return res.status(404).json({ success: false, error: 'Batch not found' });
        const stats = yield computeYearStats(batch.records.map((r) => r.studentId), batch.fromAcademicYear);
        const records = batch.records.map((r) => (Object.assign(Object.assign({}, r), { yearStats: stats.get(r.studentId) || null })));
        res.json({ success: true, data: Object.assign(Object.assign({}, batch), { records }) });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── PUT /api/promotions/batches/:id/records (HM bulk decisions) ─
router.put('/batches/:id/records', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, error: 'records array is required' });
        }
        const batch = yield prisma_1.prisma.promotionBatch.findUnique({ where: { id: req.params.id } });
        if (!batch)
            return res.status(404).json({ success: false, error: 'Batch not found' });
        if (!EDITABLE_STATUSES.includes(batch.status)) {
            return res.status(409).json({ success: false, error: `Batch is ${batch.status}; only DRAFT or REJECTED batches can be edited` });
        }
        const isFinalClass = batch.fromClass === '12';
        for (const r of records) {
            if (!['PROMOTED', 'DETAINED', 'TRANSFERRED', 'GRADUATED'].includes(r.result)) {
                return res.status(400).json({ success: false, error: `Invalid result "${r.result}"` });
            }
            if (isFinalClass && r.result === 'PROMOTED') {
                return res.status(400).json({ success: false, error: 'Class 12 students cannot be PROMOTED — use GRADUATED, DETAINED or TRANSFERRED' });
            }
            if (!isFinalClass && r.result === 'GRADUATED') {
                return res.status(400).json({ success: false, error: 'Only class 12 students can be GRADUATED' });
            }
            if (r.result === 'PROMOTED') {
                if (!r.toClass)
                    return res.status(400).json({ success: false, error: 'toClass is required for PROMOTED records' });
                if (r.toClass === '11' && !r.toGroup) {
                    return res.status(400).json({ success: false, error: 'toGroup (HSC group code) is required when promoting into class 11' });
                }
            }
        }
        yield prisma_1.prisma.$transaction(records.map((r) => prisma_1.prisma.promotionRecord.update({
            where: { id: r.id },
            data: {
                result: r.result,
                toClass: r.result === 'PROMOTED' ? r.toClass : null,
                toSection: r.result === 'PROMOTED' ? r.toSection || null : null,
                toGroup: r.result === 'PROMOTED' ? r.toGroup || null : null,
                remarks: r.remarks || null,
            },
        })));
        res.json({ success: true, message: `${records.length} records updated` });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── POST /api/promotions/batches/:id/refresh-students ───────────
router.post('/batches/:id/refresh-students', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const batch = yield prisma_1.prisma.promotionBatch.findUnique({
            where: { id: req.params.id },
            include: { records: { select: { id: true, studentId: true } } },
        });
        if (!batch)
            return res.status(404).json({ success: false, error: 'Batch not found' });
        if (!EDITABLE_STATUSES.includes(batch.status)) {
            return res.status(409).json({ success: false, error: `Batch is ${batch.status}; cannot refresh students` });
        }
        const students = yield prisma_1.prisma.student.findMany({
            where: { schoolId: batch.schoolId, class: batch.fromClass, OR: [{ studentStatus: 'Active' }, { studentStatus: null }] },
            select: { id: true, section: true },
        });
        const currentIds = new Set(students.map((s) => s.id));
        const recordedIds = new Set(batch.records.map((r) => r.studentId));
        const toAdd = students.filter((s) => !recordedIds.has(s.id));
        const toRemove = batch.records.filter((r) => !currentIds.has(r.studentId));
        const isFinalClass = batch.fromClass === '12';
        const defaultToClass = nextClass(batch.fromClass);
        yield prisma_1.prisma.$transaction([
            ...(toAdd.length
                ? [prisma_1.prisma.promotionRecord.createMany({
                        data: toAdd.map((s) => ({
                            batchId: batch.id,
                            studentId: s.id,
                            result: (isFinalClass ? 'GRADUATED' : 'PROMOTED'),
                            toClass: isFinalClass ? null : defaultToClass,
                            toSection: isFinalClass ? null : s.section,
                        })),
                    })]
                : []),
            ...(toRemove.length
                ? [prisma_1.prisma.promotionRecord.deleteMany({ where: { id: { in: toRemove.map((r) => r.id) } } })]
                : []),
        ]);
        res.json({ success: true, added: toAdd.length, removed: toRemove.length });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── DELETE /api/promotions/batches/:id (HM, DRAFT/REJECTED only) ─
router.delete('/batches/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const batch = yield prisma_1.prisma.promotionBatch.findUnique({ where: { id: req.params.id } });
        if (!batch)
            return res.status(404).json({ success: false, error: 'Batch not found' });
        if (!EDITABLE_STATUSES.includes(batch.status)) {
            return res.status(409).json({ success: false, error: `Batch is ${batch.status}; only DRAFT or REJECTED batches can be deleted` });
        }
        yield prisma_1.prisma.promotionBatch.delete({ where: { id: batch.id } }); // records cascade
        res.json({ success: true, message: 'Batch deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── POST /api/promotions/batches/:id/submit (HM → BEO) ──────────
router.post('/batches/:id/submit', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { submittedById } = req.body;
        const batch = yield prisma_1.prisma.promotionBatch.findUnique({ where: { id: req.params.id } });
        if (!batch)
            return res.status(404).json({ success: false, error: 'Batch not found' });
        if (!EDITABLE_STATUSES.includes(batch.status)) {
            return res.status(409).json({ success: false, error: `Batch is ${batch.status}; only DRAFT or REJECTED batches can be submitted` });
        }
        const updated = yield prisma_1.prisma.promotionBatch.update({
            where: { id: batch.id },
            data: {
                status: 'PENDING_BEO_APPROVAL',
                submittedById: submittedById || batch.submittedById,
                submittedAt: new Date(),
                reviewedById: null,
                reviewedAt: null,
                reviewRemarks: null,
            },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── POST /api/promotions/batches/:id/reject (BEO) ───────────────
router.post('/batches/:id/reject', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reviewedById, remarks } = req.body;
        if (!remarks || !String(remarks).trim()) {
            return res.status(400).json({ success: false, error: 'remarks are required when rejecting a batch' });
        }
        const batch = yield prisma_1.prisma.promotionBatch.findUnique({ where: { id: req.params.id } });
        if (!batch)
            return res.status(404).json({ success: false, error: 'Batch not found' });
        if (batch.status !== 'PENDING_BEO_APPROVAL') {
            return res.status(409).json({ success: false, error: `Batch is ${batch.status}; only pending batches can be rejected` });
        }
        const updated = yield prisma_1.prisma.promotionBatch.update({
            where: { id: batch.id },
            data: { status: 'REJECTED', reviewedById: reviewedById || null, reviewedAt: new Date(), reviewRemarks: String(remarks) },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── POST /api/promotions/batches/:id/approve (BEO) ──────────────
// Snapshots each student's year into StudentAcademicHistory, then
// applies the promotion decisions to the live Student rows.
router.post('/batches/:id/approve', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reviewedById, remarks } = req.body;
        const batch = yield prisma_1.prisma.promotionBatch.findUnique({
            where: { id: req.params.id },
            include: {
                records: {
                    include: {
                        student: {
                            select: {
                                id: true, class: true, section: true, group: true, rollNumber: true, schoolId: true,
                                phoneNumber: true, parentMobile: true, parentEmail: true, city: true, district: true,
                                user: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!batch)
            return res.status(404).json({ success: false, error: 'Batch not found' });
        if (batch.status !== 'PENDING_BEO_APPROVAL' || batch.executedAt) {
            return res.status(409).json({ success: false, error: `Batch is ${batch.status}${batch.executedAt ? ' and already executed' : ''}; cannot approve` });
        }
        // Heavy aggregation outside the transaction
        const stats = yield computeYearStats(batch.records.map((r) => r.studentId), batch.fromAcademicYear);
        yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            // Idempotency guard inside the transaction
            const fresh = yield tx.promotionBatch.findUnique({ where: { id: batch.id }, select: { status: true, executedAt: true } });
            if (!fresh || fresh.status !== 'PENDING_BEO_APPROVAL' || fresh.executedAt) {
                throw new Error('CONFLICT: batch already processed');
            }
            for (const record of batch.records) {
                const s = record.student;
                const yearStats = stats.get(record.studentId);
                yield tx.studentAcademicHistory.upsert({
                    where: { studentId_academicYear: { studentId: record.studentId, academicYear: batch.fromAcademicYear } },
                    create: {
                        studentId: record.studentId,
                        schoolId: s.schoolId,
                        academicYear: batch.fromAcademicYear,
                        class: s.class,
                        section: s.section,
                        group: s.group,
                        rollNumber: s.rollNumber,
                        result: record.result,
                        attendancePct: (_a = yearStats === null || yearStats === void 0 ? void 0 : yearStats.attendancePct) !== null && _a !== void 0 ? _a : null,
                        daysPresent: (_b = yearStats === null || yearStats === void 0 ? void 0 : yearStats.daysPresent) !== null && _b !== void 0 ? _b : null,
                        totalWorkingDays: (_c = yearStats === null || yearStats === void 0 ? void 0 : yearStats.totalWorkingDays) !== null && _c !== void 0 ? _c : null,
                        averageMarksPct: (_d = yearStats === null || yearStats === void 0 ? void 0 : yearStats.averageMarksPct) !== null && _d !== void 0 ? _d : null,
                        marksSummary: (_e = yearStats === null || yearStats === void 0 ? void 0 : yearStats.marksSummary) !== null && _e !== void 0 ? _e : [],
                        promotionRecordId: record.id,
                    },
                    update: {
                        class: s.class,
                        section: s.section,
                        group: s.group,
                        rollNumber: s.rollNumber,
                        result: record.result,
                        attendancePct: (_f = yearStats === null || yearStats === void 0 ? void 0 : yearStats.attendancePct) !== null && _f !== void 0 ? _f : null,
                        daysPresent: (_g = yearStats === null || yearStats === void 0 ? void 0 : yearStats.daysPresent) !== null && _g !== void 0 ? _g : null,
                        totalWorkingDays: (_h = yearStats === null || yearStats === void 0 ? void 0 : yearStats.totalWorkingDays) !== null && _h !== void 0 ? _h : null,
                        averageMarksPct: (_j = yearStats === null || yearStats === void 0 ? void 0 : yearStats.averageMarksPct) !== null && _j !== void 0 ? _j : null,
                        marksSummary: (_k = yearStats === null || yearStats === void 0 ? void 0 : yearStats.marksSummary) !== null && _k !== void 0 ? _k : [],
                        promotionRecordId: record.id,
                    },
                });
                if (record.result === 'PROMOTED') {
                    yield tx.student.update({
                        where: { id: record.studentId },
                        data: {
                            class: record.toClass,
                            section: record.toSection || s.section,
                            group: (_l = record.toGroup) !== null && _l !== void 0 ? _l : s.group,
                            academicYear: batch.toAcademicYear,
                            rollNumber: null,
                            studentStatus: 'Active',
                        },
                    });
                }
                else if (record.result === 'DETAINED') {
                    yield tx.student.update({
                        where: { id: record.studentId },
                        data: { academicYear: batch.toAcademicYear, studentStatus: 'Active' },
                    });
                }
                else if (record.result === 'TRANSFERRED') {
                    yield tx.student.update({
                        where: { id: record.studentId },
                        data: { studentStatus: 'Transferred' },
                    });
                }
                else if (record.result === 'GRADUATED') {
                    yield tx.student.update({
                        where: { id: record.studentId },
                        data: { studentStatus: 'Alumni', academicYear: batch.toAcademicYear },
                    });
                    yield tx.headmasterAlumni.create({
                        data: {
                            name: s.user.name,
                            batch: batch.fromAcademicYear,
                            contribution: `Completed Class 12 (${batch.fromAcademicYear})`,
                            role: 'Alumni Member',
                            phone: s.phoneNumber || s.parentMobile || 'N/A',
                            email: s.parentEmail || 'N/A',
                            location: s.city || s.district || 'N/A',
                            schoolId: s.schoolId,
                        },
                    });
                }
            }
            yield tx.promotionRecord.updateMany({ where: { batchId: batch.id }, data: { applied: true } });
            yield tx.promotionBatch.update({
                where: { id: batch.id },
                data: {
                    status: 'APPROVED',
                    reviewedById: reviewedById || null,
                    reviewedAt: new Date(),
                    reviewRemarks: remarks ? String(remarks) : null,
                    executedAt: new Date(),
                },
            });
        }), { timeout: 60000 });
        const result = yield prisma_1.prisma.promotionBatch.findUnique({
            where: { id: batch.id },
            include: { _count: { select: { records: true } } },
        });
        res.json({ success: true, data: result });
    }
    catch (err) {
        if (String(err).includes('CONFLICT')) {
            return res.status(409).json({ success: false, error: 'Batch already processed' });
        }
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
