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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const userResolver_1 = require("../config/userResolver");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const aiConfig_service_1 = require("../services/aiConfig.service");
const sms_1 = require("../utils/sms");
const router = (0, express_1.Router)();
function createSafeNotification(userId, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const resolvedId = yield (0, userResolver_1.resolveUserId)(userId);
            if (!resolvedId) {
                console.warn(`[createSafeNotification] Could not resolve userId ${userId} to a PostgreSQL User. Skipping notification.`);
                return;
            }
            yield prisma_1.prisma.notification.create({
                data: {
                    userId: resolvedId,
                    message,
                }
            });
        }
        catch (err) {
            console.error(`[createSafeNotification] Failed to create notification for user ${userId}:`, err);
        }
    });
}
// =========================================================================
// 1. Study Materials
// =========================================================================
// GET /api/teacher/subjects/:userId
router.get('/subjects/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const teacher = yield prisma_1.prisma.teacher.findUnique({
            where: { userId }
        });
        if (!teacher) {
            // Fallback: If no teacher record found, just return an empty array or defaults
            return res.json({ success: true, data: [] });
        }
        res.json({ success: true, data: teacher.subjects || [] });
    }
    catch (err) {
        console.error('Error fetching teacher subjects:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}));
// GET /api/teacher/materials
router.get('/materials', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, category } = req.query;
        const materials = yield prisma_1.prisma.studyMaterial.findMany({
            where: Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), (category && category !== 'All' ? { category: String(category) } : {})),
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: materials });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/materials
router.post('/materials', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, category, classSection, format, size, schoolId, userId, fileData } = req.body;
        if (!title || !category || !classSection) {
            return res.status(400).json({ success: false, error: 'title, category, and classSection are required' });
        }
        const material = yield prisma_1.prisma.studyMaterial.create({
            data: {
                title,
                category,
                classSection,
                format: format || 'PDF',
                size: size || '1.5 MB',
                date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                schoolId: schoolId || null,
                fileContent: fileData || null, // Persist base64 data directly to database
            },
        });
        if (userId) {
            yield createSafeNotification(userId, `Uploaded new study material "${title}" for ${classSection}`);
        }
        res.status(201).json({ success: true, data: material });
    }
    catch (err) {
        console.error('Error in POST /materials:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/teacher/materials/download/:id
router.get('/materials/download/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const material = yield prisma_1.prisma.studyMaterial.findUnique({ where: { id } });
        if (!material) {
            return res.status(404).json({ success: false, error: 'Material not found' });
        }
        if (material.fileContent) {
            const base64Content = material.fileContent.replace(/^data:.*;base64,/, "");
            const buffer = Buffer.from(base64Content, 'base64');
            const filename = `${material.title.replace(/[^a-zA-Z0-9]/g, '_')}.${material.format.toLowerCase()}`;
            res.setHeader('Content-Type', material.format.toLowerCase() === 'pdf' ? 'application/pdf' : 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(buffer);
        }
        else {
            // Fallback to local disk file for backwards compatibility
            const filePath = path_1.default.join(__dirname, '../../store', `${material.id}.${material.format.toLowerCase()}`);
            if (fs_1.default.existsSync(filePath)) {
                return res.download(filePath, `${material.title}.${material.format.toLowerCase()}`);
            }
            return res.status(404).json({ success: false, error: 'File content not found in database or disk' });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/teacher/materials/:id
router.delete('/materials/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const material = yield prisma_1.prisma.studyMaterial.findUnique({ where: { id } });
        if (material) {
            // Clean up local disk file if it exists (for backwards compatibility)
            const filePath = path_1.default.join(__dirname, '../../store', `${material.id}.${material.format.toLowerCase()}`);
            if (fs_1.default.existsSync(filePath)) {
                try {
                    fs_1.default.unlinkSync(filePath);
                }
                catch (unlinkErr) {
                    console.error(`Failed to delete file on disk for material ${id}:`, unlinkErr);
                }
            }
        }
        yield prisma_1.prisma.studyMaterial.delete({ where: { id } });
        res.json({ success: true, message: 'Material deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/teacher/list — Fetch staff from HeadmasterStaff table for dropdowns
router.get('/list', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const staff = yield prisma_1.prisma.headmasterStaff.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : { id: 'none' },
            select: { id: true, name: true, subject: true },
            orderBy: { name: 'asc' },
        });
        const mapped = staff.map(s => ({
            id: s.id,
            name: `${s.name} (${s.subject})`,
        }));
        res.json({ success: true, data: mapped });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 2. Announcements
// =========================================================================
// GET /api/teacher/announcements
router.get('/announcements', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, pinned } = req.query;
        const announcements = yield prisma_1.prisma.announcement.findMany({
            where: Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), (pinned !== undefined ? { pinned: pinned === 'true' } : {})),
            orderBy: [
                { pinned: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        res.json({ success: true, data: announcements });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/announcements
router.post('/announcements', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, body, target, sender, pinned, schoolId, userId, sendSMS } = req.body;
        if (!title || !body || !target) {
            return res.status(400).json({ success: false, error: 'title, body, and target are required' });
        }
        const announcement = yield prisma_1.prisma.announcement.create({
            data: {
                title,
                body,
                target,
                sender: sender || 'You (Teacher)',
                pinned: !!pinned,
                date: 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                schoolId: schoolId || null,
            },
        });
        if (userId) {
            yield createSafeNotification(userId, `Posted new announcement: "${title}"`);
        }
        // SMS notice broadcasting to parents if checked
        if (sendSMS) {
            try {
                let studentsList = [];
                const classMatch = target.match(/^Class\s+(\d+)([a-zA-Z]+)\s+Parents$/i);
                if (classMatch) {
                    const clsName = classMatch[1];
                    const secLetter = classMatch[2].toUpperCase();
                    studentsList = yield prisma_1.prisma.student.findMany({
                        where: {
                            schoolId: schoolId || undefined,
                            class: clsName,
                            section: secLetter,
                        }
                    });
                }
                else if (target === 'All Parents taught by me' && userId) {
                    const teacher = yield prisma_1.prisma.teacher.findUnique({
                        where: { userId },
                    });
                    const classrooms = yield prisma_1.prisma.classRoom.findMany({
                        where: {
                            schoolId: schoolId || undefined,
                            teacherId: (teacher === null || teacher === void 0 ? void 0 : teacher.id) || userId,
                        }
                    });
                    if (classrooms.length > 0) {
                        studentsList = yield prisma_1.prisma.student.findMany({
                            where: {
                                schoolId: schoolId || undefined,
                                OR: classrooms.map(c => ({
                                    class: c.className,
                                    section: c.section,
                                }))
                            }
                        });
                    }
                    else {
                        studentsList = yield prisma_1.prisma.student.findMany({
                            where: { schoolId: schoolId || undefined }
                        });
                    }
                }
                else {
                    studentsList = yield prisma_1.prisma.student.findMany({
                        where: { schoolId: schoolId || undefined }
                    });
                }
                const smsMessage = `Notice: ${title} - ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`;
                const processedPhones = new Set();
                for (const student of studentsList) {
                    const parents = yield (0, sms_1.getStudentParents)(student.id);
                    for (const parent of parents) {
                        if (parent.phone && !processedPhones.has(parent.phone)) {
                            processedPhones.add(parent.phone);
                            // 1. Deliver mock SMS
                            yield (0, sms_1.sendMockSMS)(parent.phone, smsMessage);
                            // 2. Add DB parentNotification record
                            if (parent.id) {
                                yield prisma_1.prisma.parentNotification.create({
                                    data: {
                                        parentId: parent.id,
                                        studentId: student.id,
                                        type: 'NOTICE_BROADCAST',
                                        title: `Notice: ${title}`,
                                        message: body,
                                    }
                                });
                            }
                        }
                    }
                }
            }
            catch (smsErr) {
                console.error('Error dispatching notice SMS:', smsErr);
            }
        }
        res.status(201).json({ success: true, data: announcement });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/teacher/announcements/:id
router.delete('/announcements/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.announcement.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Announcement deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 3. Homework & Submissions
// =========================================================================
// GET /api/teacher/homework
router.get('/homework', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, status } = req.query;
        const homeworkList = yield prisma_1.prisma.homework.findMany({
            where: Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), (status ? { status: String(status) } : {})),
            include: {
                submissions: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: homeworkList });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/homework
router.post('/homework', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, className, dueDate, status, description, schoolId, userId } = req.body;
        if (!title || !className || !dueDate) {
            return res.status(400).json({ success: false, error: 'title, className, and dueDate are required' });
        }
        const homework = yield prisma_1.prisma.homework.create({
            data: {
                title,
                className,
                dueDate,
                status: status || 'active',
                description: description || '',
                schoolId: schoolId || null,
            },
        });
        if (userId) {
            yield createSafeNotification(userId, `Assigned new homework "${title}" for ${className}`);
        }
        // Automatically seed submissions for all students in the class
        // We parse class number from className, e.g. "10A - Mathematics" -> class "10", section "A"
        const classMatch = className.match(/(\d+)\s*([A-Za-z])/);
        if (classMatch && schoolId) {
            const clsNum = classMatch[1];
            const secLetter = classMatch[2].toUpperCase();
            const students = yield prisma_1.prisma.student.findMany({
                where: {
                    schoolId: String(schoolId),
                    class: clsNum,
                    section: secLetter,
                },
                include: { user: true },
            });
            if (students.length > 0) {
                const subRecords = students.map((s, index) => ({
                    homeworkId: homework.id,
                    rollNo: s.rollNumber || `${clsNum}${secLetter}${String(index + 1).padStart(2, '0')}`,
                    name: s.user.name,
                    status: 'pending',
                    score: '—',
                    date: '—',
                }));
                yield prisma_1.prisma.homeworkSubmission.createMany({
                    data: subRecords,
                });
                // Send notifications to each student and their parents
                for (const s of students) {
                    if (s.userId) {
                        yield createSafeNotification(s.userId, `New Homework: "${title}" has been assigned for your class. Due Date: ${dueDate}`);
                    }
                    try {
                        const parents = yield (0, sms_1.getStudentParents)(s.id);
                        for (const parent of parents) {
                            if (parent.id) {
                                yield prisma_1.prisma.parentNotification.create({
                                    data: {
                                        parentId: parent.id,
                                        studentId: s.id,
                                        type: 'HOMEWORK_ALERT',
                                        title: 'New Homework Assigned',
                                        message: `New homework "${title}" has been assigned to your child ${s.user.name}. Due Date: ${dueDate}`,
                                    },
                                });
                            }
                        }
                    }
                    catch (parentErr) {
                        console.error(`Error notifying parents for student ${s.id}:`, parentErr);
                    }
                }
            }
        }
        const updatedHw = yield prisma_1.prisma.homework.findUnique({
            where: { id: homework.id },
            include: { submissions: true },
        });
        res.status(201).json({ success: true, data: updatedHw });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/teacher/homework/:id/submissions
router.get('/homework/:id/submissions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const submissions = yield prisma_1.prisma.homeworkSubmission.findMany({
            where: { homeworkId: req.params.id },
            orderBy: { rollNo: 'asc' },
        });
        res.json({ success: true, data: submissions });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/teacher/homework/submissions/:subId
router.put('/homework/submissions/:subId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { score, status, feedback } = req.body;
        const submission = yield prisma_1.prisma.homeworkSubmission.update({
            where: { id: req.params.subId },
            data: {
                score,
                status,
                feedback,
                date: status === 'submitted' ? 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—',
            },
        });
        res.json({ success: true, data: submission });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/teacher/homework/:id
router.delete('/homework/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.homework.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Homework deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 4. AI Evaluations
// =========================================================================
// GET /api/teacher/evaluations
router.get('/evaluations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const evaluations = yield prisma_1.prisma.evaluationSubmission.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: evaluations });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/teacher/evaluations/:id
router.put('/evaluations/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { score, status, ocrContent } = req.body;
        const updated = yield prisma_1.prisma.evaluationSubmission.update({
            where: { id: req.params.id },
            data: {
                score,
                status,
                ocrContent: ocrContent || undefined,
            },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 5. Science Labs Manager
// =========================================================================
// GET /api/teacher/labs
router.get('/labs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const labs = yield prisma_1.prisma.labEquipment.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: labs });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/labs
router.post('/labs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, classSection, status, date, safetyCheck, schoolId, userId, classRoomId, location, count } = req.body;
        const lab = yield prisma_1.prisma.labEquipment.create({
            data: {
                name,
                classSection: classSection || '',
                status: status || 'scheduled',
                date: date || '',
                safetyCheck: safetyCheck !== undefined ? !!safetyCheck : true,
                schoolId: schoolId || null,
                classRoomId: classRoomId || null,
                location: location || 'N/A',
                count: count !== undefined ? Number(count) : 1
            },
        });
        if (userId) {
            yield createSafeNotification(userId, `Scheduled new science lab "${name}" for ${classSection}`);
        }
        res.status(201).json({ success: true, data: lab });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/teacher/labs/:id
router.put('/labs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lab = yield prisma_1.prisma.labEquipment.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json({ success: true, data: lab });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/teacher/labs/:id
router.delete('/labs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.labEquipment.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true, message: 'Lab equipment deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 6. Leave Requests
// =========================================================================
// GET /api/teacher/leave
router.get('/leave', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, userId } = req.query;
        let staffIdFilter = undefined;
        if (userId) {
            const staff = yield prisma_1.prisma.headmasterStaff.findFirst({
                where: { userId: String(userId) }
            });
            if (staff) {
                staffIdFilter = staff.id;
            }
            else {
                staffIdFilter = String(userId);
            }
        }
        const leaves = yield prisma_1.prisma.leaveRequest.findMany({
            where: Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), { OR: [
                    ...(staffIdFilter ? [{ staffId: staffIdFilter }] : []),
                    { studentId: { not: null } }
                ] }),
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: leaves });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/leave
router.post('/leave', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, duration, reason, studentName, studentId, schoolId, userId, staffId } = req.body;
        let finalStudentName = studentName || 'Unknown';
        if (studentId && !studentName) {
            const student = yield prisma_1.prisma.student.findUnique({ where: { id: studentId }, include: { user: true } });
            if (student && student.user) {
                finalStudentName = student.user.name || 'Unknown';
            }
        }
        const leave = yield prisma_1.prisma.leaveRequest.create({
            data: {
                type,
                duration,
                reason,
                studentName: finalStudentName,
                studentId: studentId || null,
                staffId: staffId || null, // Audit: who submitted the leave
                status: 'Pending',
                schoolId: schoolId || null,
            },
        });
        if (userId) {
            yield createSafeNotification(userId, `Submitted leave request (${type}) for ${duration}`);
        }
        res.status(201).json({ success: true, data: leave });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 7. AI Lesson Planner
// =========================================================================
// GET /api/teacher/lessons
router.get('/lessons', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, subject, grade } = req.query;
        const lessons = yield prisma_1.prisma.lessonPlan.findMany({
            where: Object.assign(Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), (subject ? { subject: { equals: String(subject), mode: 'insensitive' } } : {})), (grade ? { grade: { equals: String(grade), mode: 'insensitive' } } : {})),
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: lessons });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/teacher/lessons/:id
router.get('/lessons/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lesson = yield prisma_1.prisma.lessonPlan.findUnique({
            where: { id: req.params.id },
        });
        if (!lesson) {
            return res.status(404).json({ success: false, error: 'Lesson plan not found' });
        }
        res.json({ success: true, data: lesson });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/lessons
router.post('/lessons', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { syllabus, grade, subject, topic, duration, planData, schoolId, userId, section } = req.body;
        const lesson = yield prisma_1.prisma.lessonPlan.create({
            data: {
                syllabus,
                grade,
                subject,
                topic,
                duration,
                planData,
                schoolId: schoolId || null,
                section: section && section !== 'All' ? section : null,
            },
        });
        if (userId) {
            yield createSafeNotification(userId, `Generated AI Lesson Plan for "${topic}" (Grade ${grade})`);
        }
        res.status(201).json({ success: true, data: lesson });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/teacher/lessons/:id
router.put('/lessons/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { syllabus, grade, subject, topic, duration, planData } = req.body;
        const lesson = yield prisma_1.prisma.lessonPlan.update({
            where: { id: req.params.id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (syllabus !== undefined ? { syllabus } : {})), (grade !== undefined ? { grade } : {})), (subject !== undefined ? { subject } : {})), (topic !== undefined ? { topic } : {})), (duration !== undefined ? { duration } : {})), (planData !== undefined ? { planData } : {})),
        });
        res.json({ success: true, data: lesson });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/teacher/lessons/:id
router.delete('/lessons/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.lessonPlan.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Lesson plan deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/teacher/lessons/:id/publish — publish/unpublish a lesson to students.
// Derives className from the grade (e.g. "Grade 10" -> "10") so students in that
// class + subject see it on their AI Lessons board.
// Accepts optional `section` ("A"|"B"|"C"|"D"|"All") to restrict to one section;
// omitting it or passing "All" sets section = null (visible to all sections).
router.put('/lessons/:id/publish', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { isPublished, section } = req.body;
        const existing = yield prisma_1.prisma.lessonPlan.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Lesson plan not found' });
        }
        const className = (String(existing.grade || '').match(/\d+/) || [])[0] || null;
        const resolvedSection = section && section !== 'All' ? section : null;
        const lesson = yield prisma_1.prisma.lessonPlan.update({
            where: { id: req.params.id },
            data: {
                isPublished: !!isPublished,
                publishedAt: isPublished ? new Date() : null,
                className,
                section: resolvedSection,
            },
        });
        res.json({ success: true, data: lesson });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 8. Question Bank CRUD
// =========================================================================
// GET /api/teacher/questions
router.get('/questions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { grade, subject, topic, difficulty, schoolId } = req.query;
        const questions = yield prisma_1.prisma.question.findMany({
            where: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), (grade ? { grade: String(grade) } : {})), (subject ? { subject: String(subject) } : {})), (topic ? { topic: { contains: String(topic), mode: 'insensitive' } } : {})), (difficulty ? { difficulty: String(difficulty) } : {})),
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: questions });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/questions
router.post('/questions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { questions, schoolId, userId } = req.body; // Array of questions
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, error: 'questions array is required' });
        }
        const records = questions.map((q) => ({
            grade: q.grade || 'Grade 10',
            subject: q.subject || 'Mathematics',
            topic: q.topic || 'Pythagoras Theorem',
            difficulty: q.difficulty || 'medium',
            type: q.type,
            text: q.text,
            options: q.options || [],
            answer: q.answer,
            marks: q.marks || 1,
            schoolId: schoolId || null,
        }));
        yield prisma_1.prisma.question.createMany({ data: records });
        if (userId) {
            yield createSafeNotification(userId, `Added ${questions.length} question(s) to the Question Bank for ${((_a = records[0]) === null || _a === void 0 ? void 0 : _a.subject) || 'Science'}`);
        }
        res.status(201).json({ success: true, count: records.length });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/teacher/questions/:id
router.put('/questions/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const question = yield prisma_1.prisma.question.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json({ success: true, data: question });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/teacher/questions/:id
router.delete('/questions/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.question.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Question deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 9. Student Badges (Engagement)
// =========================================================================
// GET /api/teacher/badges
router.get('/badges', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        let where = undefined;
        if (schoolId) {
            const students = yield prisma_1.prisma.student.findMany({
                where: { schoolId: String(schoolId) },
                select: { id: true },
            });
            where = { studentId: { in: students.map(s => s.id) } };
        }
        const badges = yield prisma_1.prisma.studentBadge.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: badges });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/badges
router.post('/badges', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, studentName, classSection, badge, remark, userId } = req.body;
        if (!studentId || !studentName || !badge) {
            return res.status(400).json({ success: false, error: 'studentId, studentName, and badge are required' });
        }
        const record = yield prisma_1.prisma.studentBadge.create({
            data: {
                studentId,
                studentName,
                classSection,
                badge,
                remark,
            },
        });
        if (userId) {
            yield createSafeNotification(userId, `Awarded "${badge}" badge to ${studentName} (${classSection})`);
        }
        res.status(201).json({ success: true, data: record });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 10. Scholarships verification
// =========================================================================
// GET /api/teacher/scholarships
router.get('/scholarships', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const scholarships = yield prisma_1.prisma.scholarship.findMany({
            where: schoolId ? { student: { schoolId: String(schoolId) } } : undefined,
            include: {
                student: {
                    include: { user: { select: { name: true } } }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: scholarships });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/teacher/scholarships/:id
router.put('/scholarships/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.body;
        const updated = yield prisma_1.prisma.scholarship.update({
            where: { id: req.params.id },
            data: {
                status,
                approvedDate: status === 'APPROVED' ? new Date() : undefined,
            },
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/scholarships
router.post('/scholarships', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, scheme, amount } = req.body;
        const newScholarship = yield prisma_1.prisma.scholarship.create({
            data: {
                studentId,
                scheme,
                amount: Number(amount),
                status: 'PENDING'
            },
            include: {
                student: {
                    include: { user: { select: { name: true } } }
                }
            }
        });
        res.json({ success: true, data: newScholarship });
    }
    catch (err) {
        console.error('Error creating scholarship:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/teacher/scholarships/:id
router.delete('/scholarships/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield prisma_1.prisma.scholarship.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true, data: deleted });
    }
    catch (err) {
        console.error('Error deleting scholarship:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 11. Parent-Teacher Messages (persisted to DB via Message model)
// =========================================================================
// Helper to resolve parentId from User ID to HeadmasterParent ID if needed
function resolveParentId(idStr) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: idStr }
        });
        if (user && user.role === 'PARENT') {
            const hmParent = yield prisma_1.prisma.headmasterParent.findFirst({
                where: {
                    OR: [
                        { userId: user.id },
                        { email: user.email || undefined },
                        { phone: user.mobile || undefined }
                    ]
                }
            });
            if (hmParent) {
                return hmParent.id;
            }
        }
        return idStr;
    });
}
// GET /api/teacher/messages/:parentId
router.get('/messages/:parentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { parentId } = req.params;
        const resolvedParentId = yield resolveParentId(parentId);
        const msgs = yield prisma_1.prisma.message.findMany({
            where: { parentId: resolvedParentId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, sender: true, text: true, createdAt: true },
        });
        const formatted = msgs.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            time: m.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        }));
        res.json({ success: true, data: formatted });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/messages
router.post('/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { parentId, sender, text, schoolId } = req.body;
        if (!parentId || !sender || !text) {
            return res.status(400).json({ success: false, error: 'parentId, sender, and text are required' });
        }
        const resolvedParentId = yield resolveParentId(parentId);
        const msg = yield prisma_1.prisma.message.create({
            data: { parentId: resolvedParentId, sender, text, schoolId: schoolId || null },
        });
        const newMsg = {
            id: msg.id,
            sender: msg.sender,
            text: msg.text,
            time: msg.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        res.status(201).json({ success: true, data: newMsg });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/teacher/analytics/class
router.get('/analytics/class', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, class: cls, section } = req.query;
        if (!schoolId || !cls || !section) {
            // Fallback to original query if any parameters are missing
            const students = yield prisma_1.prisma.student.findMany({
                where: Object.assign(Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), (cls ? { class: String(cls) } : {})), (section ? { section: String(section) } : {})),
                include: {
                    user: { select: { name: true } },
                    marks: true,
                    attendance: true,
                },
                orderBy: { rollNumber: 'asc' },
            });
            return res.json({ success: true, data: students });
        }
        const schoolIdStr = String(schoolId);
        const classStr = String(cls);
        const sectionStr = String(section);
        // Optimized Raw SQL query to fetch all required fields, joined and aggregated 
        // into JSON arrays in a single database roundtrip (minimizing WAN latency).
        const students = yield prisma_1.prisma.$queryRaw `
      SELECT 
        s.id, 
        s."userId", 
        s."schoolId", 
        s.class, 
        s.section, 
        s."rollNumber", 
        s.dob, 
        s.gender, 
        s.religion, 
        s.caste, 
        s."parentName", 
        s."parentMobile", 
        s."createdAt",
        s."updatedAt",
        json_build_object('name', u.name) AS "user",
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', m.id,
            'studentId', m."studentId",
            'subject', m.subject,
            'examType', m."examType",
            'maxMarks', m."maxMarks",
            'scored', m.scored,
            'grade', m.grade,
            'academicYear', m."academicYear",
            'createdAt', m."createdAt"
          ))
           FROM "Mark" m 
           WHERE m."studentId" = s.id), 
          '[]'::json
        ) AS marks,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', a.id,
            'studentId', a."studentId",
            'schoolId', a."schoolId",
            'date', a.date,
            'status', a.status,
            'method', a.method,
            'createdAt', a."createdAt"
          ))
           FROM "Attendance" a 
           WHERE a."studentId" = s.id), 
          '[]'::json
        ) AS attendance
      FROM "Student" s
      JOIN "User" u ON s."userId" = u.id
      WHERE s."schoolId" = ${schoolIdStr} 
        AND s.class = ${classStr} 
        AND s.section = ${sectionStr}
      ORDER BY s."rollNumber" ASC
    `;
        res.json({ success: true, data: students });
    }
    catch (err) {
        console.error('Error fetching optimized class analytics:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/teacher/profile/:userId
router.get('/profile/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        const { userId } = req.params;
        // 1. Try to find in User + Teacher tables
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                teacher: {
                    include: { school: { select: { name: true } } }
                },
                school: { select: { name: true } }
            }
        });
        if (user) {
            return res.json({
                success: true,
                type: 'user',
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email || '',
                    phone: user.mobile || '',
                    role: user.role,
                    schoolId: user.schoolId || ((_a = user.teacher) === null || _a === void 0 ? void 0 : _a.schoolId) || '',
                    schoolName: ((_b = user.school) === null || _b === void 0 ? void 0 : _b.name) || ((_d = (_c = user.teacher) === null || _c === void 0 ? void 0 : _c.school) === null || _d === void 0 ? void 0 : _d.name) || 'Tamil Nadu School',
                    emisId: ((_e = user.teacher) === null || _e === void 0 ? void 0 : _e.employeeId) || user.emisId || 'N/A',
                    subjects: ((_f = user.teacher) === null || _f === void 0 ? void 0 : _f.subjects) || [],
                    subject: ((_h = (_g = user.teacher) === null || _g === void 0 ? void 0 : _g.subjects) === null || _h === void 0 ? void 0 : _h.join(', ')) || 'General',
                    qualification: ((_j = user.teacher) === null || _j === void 0 ? void 0 : _j.qualification) || 'N/A',
                    joiningDate: ((_k = user.teacher) === null || _k === void 0 ? void 0 : _k.joiningDate) ? user.teacher.joiningDate.toISOString().split('T')[0] : '',
                    address: ((_l = user.teacher) === null || _l === void 0 ? void 0 : _l.address) || '',
                    gender: ((_m = user.teacher) === null || _m === void 0 ? void 0 : _m.gender) || '',
                    dob: ((_o = user.teacher) === null || _o === void 0 ? void 0 : _o.dob) ? user.teacher.dob.toISOString().split('T')[0] : ''
                }
            });
        }
        // 2. Try to find in HeadmasterStaff table
        const staff = yield prisma_1.prisma.headmasterStaff.findUnique({
            where: { id: userId }
        });
        if (staff) {
            let schoolName = 'Tamil Nadu School';
            if (staff.schoolId) {
                const school = yield prisma_1.prisma.school.findUnique({
                    where: { id: staff.schoolId },
                    select: { name: true }
                });
                if (school)
                    schoolName = school.name;
            }
            return res.json({
                success: true,
                type: 'staff',
                data: {
                    id: staff.id,
                    name: staff.name,
                    email: staff.email || '',
                    phone: staff.phone || '',
                    role: 'TEACHER',
                    schoolId: staff.schoolId || '',
                    schoolName,
                    emisId: staff.emisId || 'N/A',
                    subjects: [staff.subject],
                    subject: staff.subject || 'General',
                    qualification: 'N/A',
                    joiningDate: staff.createdAt ? staff.createdAt.toISOString().split('T')[0] : '',
                    address: staff.address || '',
                    gender: staff.gender || '',
                    dob: staff.dob ? staff.dob.toISOString().split('T')[0] : ''
                }
            });
        }
        return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/teacher/profile/:userId
router.put('/profile/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { name, email, phone, subjects, qualification, joiningDate } = req.body;
        // 1. Try to find in User
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (user) {
            yield prisma_1.prisma.user.update({
                where: { id: userId },
                data: {
                    name,
                    email: email || null,
                    mobile: phone || null,
                }
            });
            const teacher = yield prisma_1.prisma.teacher.findUnique({
                where: { userId }
            });
            if (teacher) {
                yield prisma_1.prisma.teacher.update({
                    where: { userId },
                    data: {
                        subjects: Array.isArray(subjects) ? subjects : subjects ? String(subjects).split(',').map(s => s.trim()) : [],
                        qualification,
                        joiningDate: joiningDate ? new Date(joiningDate) : null,
                        address: req.body.address || null,
                        gender: req.body.gender || null,
                        dob: req.body.dob ? new Date(req.body.dob) : null,
                    }
                });
            }
            else if (user.schoolId) {
                yield prisma_1.prisma.teacher.create({
                    data: {
                        userId,
                        schoolId: user.schoolId,
                        subjects: Array.isArray(subjects) ? subjects : subjects ? String(subjects).split(',').map(s => s.trim()) : [],
                        qualification,
                        joiningDate: joiningDate ? new Date(joiningDate) : null,
                        employeeId: user.emisId || 'TCH-' + Math.floor(1000 + Math.random() * 9000),
                        address: req.body.address || null,
                        gender: req.body.gender || null,
                        dob: req.body.dob ? new Date(req.body.dob) : null,
                    }
                });
            }
            return res.json({ success: true, message: 'Profile updated successfully' });
        }
        // 2. Try to find in HeadmasterStaff
        const staff = yield prisma_1.prisma.headmasterStaff.findUnique({
            where: { id: userId }
        });
        if (staff) {
            yield prisma_1.prisma.headmasterStaff.update({
                where: { id: userId },
                data: {
                    name,
                    email: email || null,
                    phone: phone || 'N/A',
                    subject: Array.isArray(subjects) ? subjects[0] : subjects || 'General',
                    address: req.body.address || null,
                    gender: req.body.gender || null,
                    dob: req.body.dob ? new Date(req.body.dob) : null,
                }
            });
            return res.json({ success: true, message: 'Profile updated successfully' });
        }
        return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// 8. School Press
// =========================================================================
// GET /api/teacher/school-press
router.get('/school-press', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId, schoolId, class: studentClass, approvedOnly, studentId } = req.query;
        let whereClause = {};
        if (approvedOnly === 'true' && studentId) {
            whereClause = {
                OR: [
                    Object.assign(Object.assign({ isApproved: true }, (teacherId ? { teacherId: String(teacherId) } : {})), (schoolId || studentClass ? {
                        student: Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), (studentClass ? { class: String(studentClass) } : {}))
                    } : {})),
                    {
                        studentId: String(studentId)
                    }
                ]
            };
        }
        else {
            whereClause = Object.assign(Object.assign(Object.assign(Object.assign({}, (approvedOnly === 'true' ? { isApproved: true } : {})), (teacherId ? { teacherId: String(teacherId) } : {})), (studentId ? { studentId: String(studentId) } : {})), (schoolId || studentClass ? {
                student: Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), (studentClass ? { class: String(studentClass) } : {}))
            } : {}));
        }
        const activities = yield prisma_1.prisma.schoolPressActivity.findMany({
            where: whereClause,
            include: {
                student: { select: { id: true, user: { select: { name: true } }, class: true, section: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: activities });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/teacher/school-press
router.post('/school-press', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, teacherId, description, photos } = req.body;
        if (!studentId || !description) {
            return res.status(400).json({ success: false, error: 'Student ID and description are required' });
        }
        const newActivity = yield prisma_1.prisma.schoolPressActivity.create({
            data: {
                studentId,
                teacherId,
                description,
                photos: photos || [],
                isApproved: teacherId ? true : false // Auto-approve if created by teacher
            }
        });
        res.json({ success: true, data: newActivity });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/teacher/school-press/:id/approve
router.put('/school-press/:id/approve', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield prisma_1.prisma.schoolPressActivity.update({
            where: { id },
            data: { isApproved: true }
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/teacher/school-press/:id
router.delete('/school-press/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.schoolPressActivity.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// =========================================================================
// Risk Alerts
// =========================================================================
// GET /api/teacher/risk-alerts
router.get('/risk-alerts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        }
        const alerts = yield prisma_1.prisma.studentRiskAlert.findMany({
            where: { schoolId: String(schoolId) },
            include: {
                student: {
                    include: { user: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: alerts });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// POST /api/teacher/risk-alerts
router.post('/risk-alerts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, schoolId, riskLevel, issue, attendance, lastScore } = req.body;
        const alert = yield prisma_1.prisma.studentRiskAlert.create({
            data: {
                studentId,
                schoolId,
                riskLevel,
                issue,
                attendance: Number(attendance) || 0,
                lastScore: Number(lastScore) || 0,
            }
        });
        res.json({ success: true, data: alert });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// PUT /api/teacher/risk-alerts/:id
router.put('/risk-alerts/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { riskLevel, issue, attendance, lastScore, notified, notificationMessage } = req.body;
        const data = {};
        if (riskLevel !== undefined)
            data.riskLevel = riskLevel;
        if (issue !== undefined)
            data.issue = issue;
        if (attendance !== undefined)
            data.attendance = Number(attendance) || 0;
        if (lastScore !== undefined)
            data.lastScore = Number(lastScore) || 0;
        if (notified !== undefined)
            data.notified = notified;
        if (notificationMessage !== undefined)
            data.notificationMessage = notificationMessage;
        const alert = yield prisma_1.prisma.studentRiskAlert.update({
            where: { id },
            data
        });
        res.json({ success: true, data: alert });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// DELETE /api/teacher/risk-alerts/:id
router.delete('/risk-alerts/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.studentRiskAlert.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// =========================================================================
// Maths Formulas
// =========================================================================
// GET /api/teacher/maths-formulas
router.get('/maths-formulas', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const formulas = yield prisma_1.prisma.mathsFormula.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: formulas });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// POST /api/teacher/maths-formulas
router.post('/maths-formulas', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { titleEn, titleTa, formula, category, categoryNameEn, categoryNameTa, standard, term, popular, bg, mnemonicPrompt, mnemonicText } = req.body;
        const newFormula = yield prisma_1.prisma.mathsFormula.create({
            data: {
                titleEn,
                titleTa,
                formula,
                category,
                categoryNameEn,
                categoryNameTa,
                standard,
                term,
                popular: popular || false,
                bg: bg || "from-blue-400 to-indigo-500",
                mnemonicPrompt,
                mnemonicText
            }
        });
        res.status(201).json({ success: true, data: newFormula });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// PUT /api/teacher/maths-formulas/:id
router.put('/maths-formulas/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield prisma_1.prisma.mathsFormula.update({
            where: { id },
            data: req.body
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// DELETE /api/teacher/maths-formulas/:id
router.delete('/maths-formulas/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.mathsFormula.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// =========================================================================
// Science Fact Management (Teacher & Student Shared)
// =========================================================================
const SCIENCE_FACT_FILE = path_1.default.join(__dirname, '../../data/science_fact_today.json');
const DEFAULT_SCIENCE_FACTS = [
    {
        id: "fact-sound-water",
        title: "Sound Travels Four Times Faster In Water",
        category: "Physics & Waves",
        targetClass: "Class 7-B",
        generatedAt: new Date().toISOString(),
        generatedBy: "Mrs. Sumathi Devi (Science Teacher)",
        scienceFact: "Have you ever tried calling out to a friend across a swimming pool versus shouting through the air? In air, sound moves fast, but in water, it travels nearly four times faster. When you speak in air, sound waves bump into gas molecules, which are spread far apart. Water is a liquid, so its molecules are packed much closer together. Because of this tight packing, water molecules quickly pass energy to their neighbors like a game of tag. This allows sound to zoom through oceans and lakes at incredible speeds, which is why whales can communicate across hundreds of miles underwater.",
        whyItHappens: "Sound is a wave of energy that relies on particles to travel from one point to another. Since particles in liquids like water are much closer together than in gases like air, sound energy transfers from one particle to the next much more quickly. Therefore, materials with closely packed molecules allow sound waves to travel at significantly higher speeds.",
        didYouKnow: "In solid materials like iron or steel, where molecules are packed even tighter than in water, sound travels nearly fifteen times faster than it does in open air!",
        tryItSteps: [
            "Tap two plastic spoons together in open air and listen carefully to the loudness of the sound.",
            "Next, fill a large bowl with clean tap water.",
            "Place your ear gently against the outside wall of the bowl, submerge the two spoons completely in the water, and tap them together again.",
            "Notice how much louder, sharper, and clearer the tapping sound feels when it travels through the water and the container wall compared to open air."
        ],
        thinkAboutIt: "If sound travels so well through water, how do you think marine animals like dolphins use sound to explore their environment and locate objects in dark ocean waters?",
        thinkHint: "Dolphins send out high-pitched clicking sounds that bounce off fish and rocks. Because sound moves fast in water, the echo returns quickly, giving them a clear 'sound map' of their surroundings!",
        quiz: [
            {
                id: 1,
                question: "How much faster does sound travel in water compared to air?",
                options: [
                    { key: "A", text: "Two times faster" },
                    { key: "B", text: "Four times faster" },
                    { key: "C", text: "Ten times faster" },
                    { key: "D", text: "It travels at the exact same speed" }
                ],
                correct: "B",
                explanation: "Sound travels nearly four times faster through liquid water than through gas in the air."
            },
            {
                id: 2,
                question: "Why does sound travel faster through water than through air?",
                options: [
                    { key: "A", text: "Water is colder than air" },
                    { key: "B", text: "Water molecules are packed closer together than air molecules" },
                    { key: "C", text: "Air molecules are heavier than water molecules" },
                    { key: "D", text: "Water eliminates gravity" }
                ],
                correct: "B",
                explanation: "The denser packing of liquid molecules allows mechanical energy to transfer faster between neighboring particles."
            },
            {
                id: 3,
                question: "In which of the following states of matter does sound travel the fastest?",
                options: [
                    { key: "A", text: "Gas" },
                    { key: "B", text: "Liquid" },
                    { key: "C", text: "Solid" },
                    { key: "D", text: "Vacuum" }
                ],
                correct: "C",
                explanation: "Solids have the most tightly packed particles, allowing sound waves to travel fastest of all."
            }
        ]
    },
    {
        id: "fact-venus-heat",
        title: "Venus Is Hotter Than Mercury Despite Being Further",
        category: "Space & Astronomy",
        targetClass: "Class 7-B",
        generatedAt: new Date().toISOString(),
        generatedBy: "Mrs. Sumathi Devi (Science Teacher)",
        scienceFact: "Mercury is the closest planet to the Sun, so you might think it would be the hottest planet in our solar system. However, Venus takes the crown as the hottest planet, even though it is twice as far from the Sun! This happens because Mercury has almost no atmosphere to trap heat, meaning its night side freezes while its day side bakes. Venus, on the other hand, is wrapped in a thick blanket of clouds made of carbon dioxide. This thick atmosphere traps solar heat just like a car with closed windows on a sunny summer day.",
        whyItHappens: "The thick layer of carbon dioxide surrounding Venus causes an extreme greenhouse effect. Heat from the Sun passes through the upper cloud layer but gets trapped underneath, unable to escape back into space. This continuous heat trapping creates scorching surface temperatures of nearly 465 degrees Celsius both day and night.",
        didYouKnow: "A single day on Venus is longer than a year on Venus because the planet rotates extremely slowly on its axis while orbiting the Sun!",
        tryItSteps: [
            "Place two identical small cups of room-temperature water on a sunny windowsill.",
            "Cover one cup tightly with clear plastic wrap or a transparent glass jar, and leave the second cup uncovered in open air.",
            "Wait 20 minutes, then dip your fingertip into both cups to compare their temperatures.",
            "Notice how the covered cup becomes significantly warmer because trapped air cannot carry the heat away, mimicking a planetary greenhouse effect."
        ],
        thinkAboutIt: "How does understanding the atmospheric heat trapping on Venus help scientists protect Earth's climate and environment?",
        thinkHint: "Studying Venus teaches scientists how greenhouse gases trap thermal energy in an atmosphere, highlighting why keeping Earth's atmospheric gases balanced is vital for life!",
        quiz: [
            {
                id: 1,
                question: "Which planet is the hottest in our solar system?",
                options: [
                    { key: "A", text: "Mercury" },
                    { key: "B", text: "Venus" },
                    { key: "C", text: "Mars" },
                    { key: "D", text: "Jupiter" }
                ],
                correct: "B",
                explanation: "Venus is the hottest planet in our solar system with surface temperatures around 465 degrees Celsius."
            },
            {
                id: 2,
                question: "Why is Venus hotter than Mercury despite being further from the Sun?",
                options: [
                    { key: "A", text: "Venus is closer to the Earth" },
                    { key: "B", text: "Venus has a thick atmosphere that traps heat like a blanket" },
                    { key: "C", text: "Mercury is made entirely of ice" },
                    { key: "D", text: "Venus generates its own light" }
                ],
                correct: "B",
                explanation: "Venus has a dense atmosphere rich in carbon dioxide that creates a powerful heat-trapping greenhouse effect."
            },
            {
                id: 3,
                question: "What is the process called when an atmosphere traps solar thermal energy?",
                options: [
                    { key: "A", text: "The greenhouse effect" },
                    { key: "B", text: "Photosynthesis" },
                    { key: "C", text: "Evaporation" },
                    { key: "D", text: "Condensation" }
                ],
                correct: "A",
                explanation: "The greenhouse effect occurs when atmospheric gases trap heat from solar radiation."
            }
        ]
    },
    {
        id: "fact-ice-floats",
        title: "Ice Floats Because Water Expands When It Freezes",
        category: "Chemistry & States of Matter",
        targetClass: "Class 7-B",
        generatedAt: new Date().toISOString(),
        generatedBy: "Mrs. Sumathi Devi (Science Teacher)",
        scienceFact: "Most liquids shrink and get denser when they cool down and turn solid. But liquid water is special! When water freezes into ice, its molecules arrange themselves into open hexagonal rings that take up more space than liquid water. Because the same amount of water now takes up a larger volume, ice becomes less dense than liquid water. This unique property causes ice cubes to float on top of your glass of water, and ice sheets to float on lakes during winter.",
        whyItHappens: "As liquid water cools below 4 degrees Celsius, hydrogen bonds force water molecules into a crystal lattice with lots of empty space between them. This expansion decreases the density of ice relative to liquid water, making ice lighter per unit volume.",
        didYouKnow: "If ice sank instead of floating, lakes and oceans would freeze solid from the bottom up, killing all marine life underneath every winter!",
        tryItSteps: [
            "Fill a clear plastic bottle completely to the top with tap water and mark the liquid height with a marker.",
            "Place the bottle upright in the freezer overnight.",
            "Check the bottle the next morning and notice how the ice has pushed past your marker line, proving that water expands as it freezes."
        ],
        thinkAboutIt: "Why is floating ice crucial for fish and sea plants living in frozen lakes during freezing cold winters?",
        thinkHint: "The floating ice layer acts like an insulating blanket at the top of the lake, protecting the liquid water below from cold winter air so fish can survive!",
        quiz: [
            {
                id: 1,
                question: "Why does ice float on liquid water?",
                options: [
                    { key: "A", text: "Ice is warmer than water" },
                    { key: "B", text: "Water expands when it freezes, making ice less dense" },
                    { key: "C", text: "Air gets pushed out of ice" },
                    { key: "D", text: "Ice contains salt" }
                ],
                correct: "B",
                explanation: "Water molecules expand into a crystal lattice when freezing, lowering the density of ice."
            },
            {
                id: 2,
                question: "At what temperature does liquid water reach its maximum density?",
                options: [
                    { key: "A", text: "0 degrees Celsius" },
                    { key: "B", text: "4 degrees Celsius" },
                    { key: "C", text: "100 degrees Celsius" },
                    { key: "D", text: "-10 degrees Celsius" }
                ],
                correct: "B",
                explanation: "Liquid water reaches its maximum density at 4 degrees Celsius before expanding as it freezes toward 0 degrees."
            },
            {
                id: 3,
                question: "How does floating ice help aquatic animals during winter?",
                options: [
                    { key: "A", text: "It provides food for fish" },
                    { key: "B", text: "It acts as an insulating blanket keeping water underneath liquid" },
                    { key: "C", text: "It heats the water to boiling point" },
                    { key: "D", text: "It increases water salinity" }
                ],
                correct: "B",
                explanation: "Surface ice insulates the water underneath from extreme cold air, preventing lakes from freezing solid."
            }
        ]
    },
    {
        id: "fact-volcano",
        title: "Volcanoes Erupt When Underground Trapped Gas Escapes",
        category: "Earth Science & Geology",
        targetClass: "Class 7-B",
        generatedAt: new Date().toISOString(),
        generatedBy: "Mrs. Sumathi Devi (Science Teacher)",
        scienceFact: "Deep inside the Earth, it is so hot that solid rocks melt into a thick liquid called magma. This magma contains trapped gases like carbon dioxide and water vapor. Because hot magma is lighter than the solid rocks surrounding it, it pushes its way up toward the Earth's surface through cracks. As magma gets closer to the surface, the trapped gas bubbles expand rapidly, just like when you shake a bottle of fizzy soda and open the cap. When the pressure gets too high, the volcano erupts, blasting out red-hot lava, ash, and gases into the sky.",
        whyItHappens: "Melting underground rocks release gases that build intense pressure beneath Earth's crust. When crustal pressure becomes unbearable, magma is forced upward through vents, erupting onto the surface as liquid lava.",
        didYouKnow: "The largest active volcano in our solar system is Olympus Mons on Mars, which is nearly three times taller than Mount Everest!",
        tryItSteps: [
            "Place a small plastic cup on a tray, add 2 tablespoons of baking soda, 1 teaspoon of dish soap, and red food coloring.",
            "Slowly pour 1/4 cup of vinegar into the cup.",
            "Observe how carbon dioxide gas bubbles create a thick foaming red lava flow that overflows the cup, simulating a volcanic eruption."
        ],
        thinkAboutIt: "Why do you think some volcanoes erupt with giant explosive blasts while others slowly ooze liquid lava like warm honey?",
        thinkHint: "Thick sticky magma traps gas bubbles until they explode violently, while runny magma allows gas bubbles to escape easily without big explosions!",
        quiz: [
            {
                id: 1,
                question: "What is melted rock called when it is still deep underground?",
                options: [
                    { key: "A", text: "Lava" },
                    { key: "B", text: "Magma" },
                    { key: "C", text: "Pumice" },
                    { key: "D", text: "Basalt" }
                ],
                correct: "B",
                explanation: "Melted rock underground is called magma; once it erupts onto the surface, it is called lava."
            },
            {
                id: 2,
                question: "What happens to magma once it erupts onto Earth's surface?",
                options: [
                    { key: "A", text: "It is called lava" },
                    { key: "B", text: "It turns into ice" },
                    { key: "C", text: "It disappears" },
                    { key: "D", text: "It turns into water" }
                ],
                correct: "A",
                explanation: "Once magma breaks through the Earth's crust and reaches the surface, scientists refer to it as lava."
            },
            {
                id: 3,
                question: "Which factor plays a key role in building up pressure inside a volcano?",
                options: [
                    { key: "A", text: "Cold water" },
                    { key: "B", text: "Trapped gas bubbles expanding in magma" },
                    { key: "C", text: "Moonlight" },
                    { key: "D", text: "Wind speed" }
                ],
                correct: "B",
                explanation: "Expanding gas bubbles trapped in magma build up extreme pressure that triggers volcanic eruptions."
            }
        ]
    }
];
const SCIENCE_FACT_CLASSES_FILE = path_1.default.join(__dirname, '../../data/science_fact_by_class.json');
function getStoredFact(targetClass, classNum) {
    try {
        const dir = path_1.default.dirname(SCIENCE_FACT_CLASSES_FILE);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        if (targetClass && fs_1.default.existsSync(SCIENCE_FACT_CLASSES_FILE)) {
            const rawMap = fs_1.default.readFileSync(SCIENCE_FACT_CLASSES_FILE, 'utf8');
            const classMap = JSON.parse(rawMap);
            const normClass = targetClass.trim();
            if (classMap[normClass])
                return classMap[normClass];
            // Fuzzy matching by class substring or class number (e.g. "Class 7-B" vs "7")
            for (const [key, fact] of Object.entries(classMap)) {
                if (key.toLowerCase().includes(normClass.toLowerCase()) ||
                    normClass.toLowerCase().includes(key.toLowerCase()) ||
                    (classNum && key.includes(classNum))) {
                    return fact;
                }
            }
        }
        if (fs_1.default.existsSync(SCIENCE_FACT_FILE)) {
            const raw = fs_1.default.readFileSync(SCIENCE_FACT_FILE, 'utf8');
            return JSON.parse(raw);
        }
    }
    catch (e) {
        console.error('Error reading science fact file:', e);
    }
    return DEFAULT_SCIENCE_FACTS[0];
}
function saveStoredFact(factData) {
    try {
        const dir = path_1.default.dirname(SCIENCE_FACT_FILE);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        // Save as latest global fallback
        fs_1.default.writeFileSync(SCIENCE_FACT_FILE, JSON.stringify(factData, null, 2), 'utf8');
        // Save under class key in science_fact_by_class.json
        if (factData.targetClass) {
            let classMap = {};
            if (fs_1.default.existsSync(SCIENCE_FACT_CLASSES_FILE)) {
                try {
                    classMap = JSON.parse(fs_1.default.readFileSync(SCIENCE_FACT_CLASSES_FILE, 'utf8'));
                }
                catch (err) { }
            }
            classMap[factData.targetClass] = factData;
            fs_1.default.writeFileSync(SCIENCE_FACT_CLASSES_FILE, JSON.stringify(classMap, null, 2), 'utf8');
        }
    }
    catch (e) {
        console.error('Error writing science fact file:', e);
    }
}
function generateScienceFactWithAI(promptTopic) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const apiKey = yield (0, aiConfig_service_1.getGeminiApiKey)();
            if (!apiKey || apiKey.trim() === '') {
                console.log('[Science Fact AI] No GEMINI_API_KEY found; falling back to curated pool.');
                return null;
            }
            const systemInstructions = `You are an engaging science educator creating a "Science Fact" page for middle school students (Classes 6–8, ages 11–14). Generate ONE fascinating science fact that is accurate, age-appropriate, and easy to understand. Do NOT use emojis.`;
            const userPrompt = `
Generate a middle school science fact page.
${promptTopic ? `Topic Focus: ${promptTopic}` : 'Choose a random exciting topic in Physics, Chemistry, Biology, Environmental Science, or Space Astronomy.'}

Return ONLY raw valid JSON (no markdown formatting, no codeblocks):
{
  "title": "A short, catchy heading (5-8 words)",
  "category": "Physics & Waves / Space & Astronomy / Chemistry / Biology / Earth Science",
  "scienceFact": "Explain the fact in 80-120 words using simple, clear language and relatable everyday examples.",
  "whyItHappens": "Briefly explain the science behind the fact in 2-3 sentences.",
  "didYouKnow": "One surprising or fun related fact.",
  "tryItSteps": [
    "Step 1 simple observation or activity",
    "Step 2...",
    "Step 3..."
  ],
  "thinkAboutIt": "One open-ended curiosity question.",
  "thinkHint": "A short helpful hint for the question.",
  "quiz": [
    {
      "id": 1,
      "question": "Question 1?",
      "options": [
        { "key": "A", "text": "Option A" },
        { "key": "B", "text": "Option B" },
        { "key": "C", "text": "Option C" },
        { "key": "D", "text": "Option D" }
      ],
      "correct": "B",
      "explanation": "Reason for correct answer."
    },
    {
      "id": 2,
      "question": "Question 2?",
      "options": [
        { "key": "A", "text": "Option A" },
        { "key": "B", "text": "Option B" },
        { "key": "C", "text": "Option C" },
        { "key": "D", "text": "Option D" }
      ],
      "correct": "A",
      "explanation": "Reason for correct answer."
    },
    {
      "id": 3,
      "question": "Question 3?",
      "options": [
        { "key": "A", "text": "Option A" },
        { "key": "B", "text": "Option B" },
        { "key": "C", "text": "Option C" },
        { "key": "D", "text": "Option D" }
      ],
      "correct": "C",
      "explanation": "Reason for correct answer."
    }
  ]
}
`;
            const payload = {
                contents: [{ parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    maxOutputTokens: 2048,
                },
            };
            return yield new Promise((resolve) => {
                const postData = JSON.stringify(payload);
                const options = {
                    hostname: 'generativelanguage.googleapis.com',
                    port: 443,
                    path: '/v1beta/models/gemini-2.5-flash:generateContent',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData),
                        'x-goog-api-key': apiKey,
                    },
                };
                const req = https_1.default.request(options, (res) => {
                    const chunks = [];
                    res.on('data', (c) => chunks.push(c));
                    res.on('end', () => {
                        var _a, _b, _c, _d, _e;
                        try {
                            const bodyStr = Buffer.concat(chunks).toString('utf8');
                            const parsed = JSON.parse(bodyStr);
                            const rawText = (_e = (_d = (_c = (_b = (_a = parsed.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                            if (rawText) {
                                const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                                const factObj = JSON.parse(cleanJson);
                                resolve(factObj);
                                return;
                            }
                        }
                        catch (e) {
                            console.error('[Science Fact AI Parse Error]', e);
                        }
                        resolve(null);
                    });
                });
                req.on('error', (err) => {
                    console.error('[Science Fact AI Network Error]', err);
                    resolve(null);
                });
                req.write(postData);
                req.end();
            });
        }
        catch (err) {
            console.error('[generateScienceFactWithAI error]', err);
            return null;
        }
    });
}
// GET /api/teacher/science-fact/today
router.get('/science-fact/today', (req, res) => {
    const { targetClass, classNum } = req.query || {};
    const currentFact = getStoredFact(targetClass ? String(targetClass) : undefined, classNum ? String(classNum) : undefined);
    res.json({ success: true, data: currentFact, allTopics: DEFAULT_SCIENCE_FACTS });
});
// POST /api/teacher/science-fact/generate — Teacher triggers AI science fact generation!
router.post('/science-fact/generate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherName, targetClass, topicId, promptTopic } = req.body || {};
        let factPayload = null;
        let isAiGenerated = false;
        const searchTerm = (promptTopic || topicId || '').toLowerCase().trim();
        // 1. Try Gemini AI generation first
        const aiResult = yield generateScienceFactWithAI(searchTerm || undefined);
        if (aiResult && aiResult.title && aiResult.scienceFact) {
            factPayload = aiResult;
            isAiGenerated = true;
        }
        else {
            // 2. Keyword & ID matching fallback
            const matchedFact = DEFAULT_SCIENCE_FACTS.find((f) => f.id === topicId ||
                f.title.toLowerCase().includes(searchTerm) ||
                f.category.toLowerCase().includes(searchTerm) ||
                ((searchTerm.includes('volcano') || searchTerm.includes('valcano') || searchTerm.includes('magma') || searchTerm.includes('lava')) && f.id === 'fact-volcano'));
            if (matchedFact) {
                factPayload = matchedFact;
            }
            else {
                const current = getStoredFact();
                const currentIdx = DEFAULT_SCIENCE_FACTS.findIndex((f) => f.id === current.id);
                const nextIdx = (currentIdx + 1) % DEFAULT_SCIENCE_FACTS.length;
                factPayload = DEFAULT_SCIENCE_FACTS[nextIdx];
            }
        }
        const newTodayFact = Object.assign(Object.assign({}, factPayload), { id: `fact-${Date.now()}`, generatedAt: new Date().toISOString(), generatedBy: isAiGenerated
                ? `${teacherName || 'Mrs. Sumathi Devi'} (Generated by AI Science Assistant)`
                : (teacherName || 'Mrs. Sumathi Devi (Science Teacher)'), targetClass: targetClass || 'Class 7-B', isAiGenerated });
        saveStoredFact(newTodayFact);
        res.json({
            success: true,
            message: isAiGenerated
                ? 'AI generated & published new Science Fact for students!'
                : 'Science Fact updated & published for students!',
            data: newTodayFact,
            isAiGenerated,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// POST /api/teacher/science-fact/publish — Teacher manually customizes & publishes fact
router.post('/science-fact/publish', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customFact = req.body;
        if (!customFact.title || !customFact.scienceFact) {
            return res.status(400).json({ success: false, error: 'title and scienceFact are required' });
        }
        const factToPublish = Object.assign(Object.assign({}, customFact), { id: customFact.id || `fact-${Date.now()}`, generatedAt: new Date().toISOString(), generatedBy: customFact.generatedBy || 'Mrs. Sumathi Devi', targetClass: customFact.targetClass || 'Class 7-B' });
        saveStoredFact(factToPublish);
        res.json({
            success: true,
            message: 'Custom Science Fact published successfully!',
            data: factToPublish
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
exports.default = router;
