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
// Helper to notify staff, students, and parents when an exam is scheduled
function notifyExamScheduled(schoolId, cls, section, subject, invigilatorName, examDate, startTime) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const formattedDate = examDate.toISOString().split('T')[0];
            const message = `An exam for ${subject} is scheduled on ${formattedDate} at ${startTime}.`;
            // 1. Notify Students in the class
            const students = yield prisma_1.prisma.student.findMany({
                where: { schoolId, class: cls, section: section !== 'All' ? section : undefined }
            });
            const studentUserIds = Array.from(new Set(students.map(s => s.userId).filter((id) => Boolean(id))));
            if (studentUserIds.length > 0) {
                const existingNotifs = yield prisma_1.prisma.notification.findMany({
                    where: {
                        userId: { in: studentUserIds },
                        message,
                    },
                    select: { userId: true },
                });
                const alreadyNotified = new Set(existingNotifs.map(n => n.userId));
                const toNotify = studentUserIds.filter(id => !alreadyNotified.has(id));
                if (toNotify.length > 0) {
                    yield prisma_1.prisma.notification.createMany({
                        data: toNotify.map(userId => ({
                            userId,
                            message,
                        }))
                    });
                }
            }
            // 2. Notify Parents
            const studentIds = students.map(s => s.id);
            if (studentIds.length > 0) {
                const parentLinks = yield prisma_1.prisma.parentStudentLink.findMany({
                    where: { studentId: { in: studentIds } },
                    include: { parent: true }
                });
                const parentUserIds = Array.from(new Set(parentLinks.map(pl => { var _a; return (_a = pl.parent) === null || _a === void 0 ? void 0 : _a.userId; }).filter((id) => Boolean(id))));
                if (parentUserIds.length > 0) {
                    const existingParentNotifs = yield prisma_1.prisma.notification.findMany({
                        where: {
                            userId: { in: parentUserIds },
                            message,
                        },
                        select: { userId: true },
                    });
                    const alreadyNotifiedParents = new Set(existingParentNotifs.map(n => n.userId));
                    const parentsToNotify = parentUserIds.filter(id => !alreadyNotifiedParents.has(id));
                    if (parentsToNotify.length > 0) {
                        yield prisma_1.prisma.notification.createMany({
                            data: parentsToNotify.map(userId => ({
                                userId,
                                message,
                            })),
                            skipDuplicates: true
                        });
                    }
                }
                // Also add to ParentNotification table
                const parentNotifications = parentLinks.map(pl => ({
                    parentId: pl.parentId,
                    studentId: pl.studentId,
                    type: 'Exam Schedule',
                    title: 'New Exam Scheduled',
                    message,
                }));
                if (parentNotifications.length > 0) {
                    yield prisma_1.prisma.parentNotification.createMany({
                        data: parentNotifications,
                        skipDuplicates: true
                    });
                }
            }
            // 3. Notify Invigilator (Staff)
            if (invigilatorName) {
                const invigilatorMsg = `You are assigned as invigilator for ${subject} exam on ${formattedDate} at ${startTime}.`;
                const staffUser = yield prisma_1.prisma.user.findFirst({
                    where: { schoolId, name: invigilatorName, role: 'TEACHER' }
                });
                let targetUserId = staffUser === null || staffUser === void 0 ? void 0 : staffUser.id;
                if (!targetUserId) {
                    const headmasterStaff = yield prisma_1.prisma.headmasterStaff.findFirst({
                        where: { schoolId, name: invigilatorName }
                    });
                    targetUserId = (headmasterStaff === null || headmasterStaff === void 0 ? void 0 : headmasterStaff.userId) || undefined;
                }
                if (targetUserId) {
                    const existing = yield prisma_1.prisma.notification.findFirst({
                        where: { userId: targetUserId, message: invigilatorMsg }
                    });
                    if (!existing) {
                        yield prisma_1.prisma.notification.create({
                            data: {
                                userId: targetUserId,
                                message: invigilatorMsg,
                            }
                        });
                    }
                }
            }
        }
        catch (err) {
            console.error('[notifyExamScheduled Error]', err);
        }
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exam-schedule
// Query params: schoolId (required), class?, section?, examType?, academicYear?,
//               status?, fromDate?, toDate?
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, class: cls, section, examType, academicYear, status, fromDate, toDate } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        }
        const where = { schoolId: String(schoolId) };
        if (cls)
            where.class = String(cls);
        if (section)
            where.section = String(section);
        if (examType)
            where.examType = String(examType);
        if (academicYear)
            where.academicYear = String(academicYear);
        if (status)
            where.status = String(status);
        if (fromDate || toDate) {
            where.examDate = {};
            if (fromDate)
                where.examDate.gte = new Date(String(fromDate));
            if (toDate)
                where.examDate.lte = new Date(String(toDate));
        }
        const schedules = yield prisma_1.prisma.examSchedule.findMany({
            where,
            orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
        });
        return res.json({ success: true, count: schedules.length, data: schedules });
    }
    catch (err) {
        console.error('[ExamSchedule GET /]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exam-schedule/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const schedule = yield prisma_1.prisma.examSchedule.findUnique({ where: { id } });
        if (!schedule) {
            return res.status(404).json({ success: false, error: 'Exam schedule not found' });
        }
        return res.json({ success: true, data: schedule });
    }
    catch (err) {
        console.error('[ExamSchedule GET /:id]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exam-schedule
// Create a single exam schedule entry
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, title, examType, class: cls, section, subject, examDate, startTime, endTime, maxMarks, passMark, venue, invigilator, academicYear, status, notes, examMode, theoryMaxMarks, practicalMaxMarks, published, } = req.body;
        // Validate required fields
        if (!schoolId || !title || !examType || !cls || !subject || !examDate || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: schoolId, title, examType, class, subject, examDate, startTime, endTime',
            });
        }
        const schedule = yield prisma_1.prisma.examSchedule.create({
            data: {
                schoolId,
                title: String(title),
                examType: String(examType),
                class: String(cls),
                section: section ? String(section) : 'All',
                subject: String(subject),
                examDate: new Date(examDate),
                startTime: String(startTime),
                endTime: String(endTime),
                maxMarks: maxMarks !== undefined ? Number(maxMarks) : 100,
                passMark: passMark !== undefined ? Number(passMark) : 35,
                venue: venue ? String(venue) : 'Classroom',
                invigilator: invigilator ? String(invigilator) : null,
                academicYear: academicYear ? String(academicYear) : '2024-25',
                status: status ? String(status) : 'Scheduled',
                notes: notes ? String(notes) : null,
                examMode: examMode ? String(examMode) : 'Theory',
                theoryMaxMarks: theoryMaxMarks !== undefined ? Number(theoryMaxMarks) : 100,
                practicalMaxMarks: practicalMaxMarks !== undefined ? Number(practicalMaxMarks) : 0,
                published: published !== undefined ? Boolean(published) : false,
            },
        });
        // Notify users
        yield notifyExamScheduled(schoolId, String(cls), section ? String(section) : 'All', String(subject), invigilator ? String(invigilator) : null, new Date(examDate), String(startTime));
        return res.status(201).json({ success: true, data: schedule });
    }
    catch (err) {
        console.error('[ExamSchedule POST /]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exam-schedule/bulk
// Bulk-create multiple exam schedule entries at once
// Body: { schedules: ExamSchedule[] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schedules } = req.body;
        if (!Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({ success: false, error: 'Provide a non-empty schedules array' });
        }
        const data = schedules.map((s) => ({
            schoolId: String(s.schoolId),
            title: String(s.title),
            examType: String(s.examType),
            class: String(s.class),
            section: s.section ? String(s.section) : 'All',
            subject: String(s.subject),
            examDate: new Date(s.examDate),
            startTime: String(s.startTime),
            endTime: String(s.endTime),
            maxMarks: s.maxMarks !== undefined ? Number(s.maxMarks) : 100,
            passMark: s.passMark !== undefined ? Number(s.passMark) : 35,
            venue: s.venue ? String(s.venue) : 'Classroom',
            invigilator: s.invigilator ? String(s.invigilator) : null,
            academicYear: s.academicYear ? String(s.academicYear) : '2024-25',
            status: s.status ? String(s.status) : 'Scheduled',
            notes: s.notes ? String(s.notes) : null,
            examMode: s.examMode ? String(s.examMode) : 'Theory',
            theoryMaxMarks: s.theoryMaxMarks !== undefined ? Number(s.theoryMaxMarks) : 100,
            practicalMaxMarks: s.practicalMaxMarks !== undefined ? Number(s.practicalMaxMarks) : 0,
            published: s.published !== undefined ? Boolean(s.published) : false,
        }));
        const result = yield prisma_1.prisma.examSchedule.createMany({ data, skipDuplicates: true });
        // Notify users for all scheduled exams
        for (const s of data) {
            yield notifyExamScheduled(s.schoolId, s.class, s.section, s.subject, s.invigilator, s.examDate, s.startTime);
        }
        return res.status(201).json({ success: true, created: result.count });
    }
    catch (err) {
        console.error('[ExamSchedule POST /bulk]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/exam-schedule/:id
// Update any fields of an existing exam schedule
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, examType, class: cls, section, subject, examDate, startTime, endTime, maxMarks, passMark, venue, invigilator, academicYear, status, notes, examMode, theoryMaxMarks, practicalMaxMarks, published, } = req.body;
        const existing = yield prisma_1.prisma.examSchedule.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Exam schedule not found' });
        }
        const updated = yield prisma_1.prisma.examSchedule.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (title !== undefined && { title: String(title) })), (examType !== undefined && { examType: String(examType) })), (cls !== undefined && { class: String(cls) })), (section !== undefined && { section: String(section) })), (subject !== undefined && { subject: String(subject) })), (examDate !== undefined && { examDate: new Date(examDate) })), (startTime !== undefined && { startTime: String(startTime) })), (endTime !== undefined && { endTime: String(endTime) })), (maxMarks !== undefined && { maxMarks: Number(maxMarks) })), (passMark !== undefined && { passMark: Number(passMark) })), (venue !== undefined && { venue: String(venue) })), (invigilator !== undefined && { invigilator: invigilator ? String(invigilator) : null })), (academicYear !== undefined && { academicYear: String(academicYear) })), (status !== undefined && { status: String(status) })), (notes !== undefined && { notes: notes ? String(notes) : null })), (examMode !== undefined && { examMode: String(examMode) })), (theoryMaxMarks !== undefined && { theoryMaxMarks: Number(theoryMaxMarks) })), (practicalMaxMarks !== undefined && { practicalMaxMarks: Number(practicalMaxMarks) })), (published !== undefined && { published: Boolean(published) })),
        });
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('[ExamSchedule PUT /:id]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/exam-schedule/:id/status
// Quick status update: Scheduled | Completed | Postponed | Cancelled
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const allowed = ['Scheduled', 'In Progress', 'Completed', 'Postponed', 'Cancelled'];
        if (!status || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `status must be one of: ${allowed.join(', ')}`,
            });
        }
        const updated = yield prisma_1.prisma.examSchedule.update({
            where: { id },
            data: { status: String(status) },
        });
        if (String(status) === 'Completed') {
            try {
                const clsClean = String(updated.class).replace(/class\s*/i, '').split(' ')[0].trim();
                const existingModel = yield prisma_1.prisma.modelExam.findFirst({
                    where: {
                        schoolId: updated.schoolId,
                        class: clsClean,
                        examName: updated.title,
                    },
                });
                if (!existingModel) {
                    yield prisma_1.prisma.modelExam.create({
                        data: {
                            schoolId: updated.schoolId,
                            examName: updated.title,
                            examType: updated.examType || 'Unit Test 1',
                            class: clsClean,
                            section: updated.section === 'All' ? 'A' : updated.section,
                            academicYear: updated.academicYear || '2024-25',
                            examDate: updated.examDate,
                        },
                    });
                }
            }
            catch (syncErr) {
                console.warn('Sync on status update failed:', syncErr);
            }
        }
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('[ExamSchedule PATCH /:id/status]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/exam-schedule/:id
// Delete a single exam schedule entry
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.examSchedule.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Exam schedule not found' });
        }
        yield prisma_1.prisma.examSchedule.delete({ where: { id } });
        return res.json({ success: true, message: 'Exam schedule deleted successfully' });
    }
    catch (err) {
        console.error('[ExamSchedule DELETE /:id]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/exam-schedule
// Bulk-delete by schoolId + examType + academicYear
// Body: { schoolId, examType?, academicYear? }
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, examType, academicYear } = req.body;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        }
        const where = { schoolId: String(schoolId) };
        if (examType)
            where.examType = String(examType);
        if (academicYear)
            where.academicYear = String(academicYear);
        const result = yield prisma_1.prisma.examSchedule.deleteMany({ where });
        return res.json({ success: true, deleted: result.count });
    }
    catch (err) {
        console.error('[ExamSchedule DELETE /]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
