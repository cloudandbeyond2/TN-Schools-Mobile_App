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
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const hscGroups_1 = require("../constants/hscGroups");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Stream affinity for exams open to all groups (sorts them toward
// "recommended" for students of the matching stream).
const EXAM_STREAM_AFFINITY = [
    { match: /ipmat|integrated programme in management/i, streams: ['COMMERCE'] },
    { match: /clat|ailet|law/i, streams: ['ARTS', 'COMMERCE'] },
];
// ─── GET /api/competitive-exams?schoolId=&category=&status= ──────
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, category, status, search } = req.query;
        const where = {};
        if (schoolId)
            where.schoolId = String(schoolId);
        if (category)
            where.category = String(category);
        if (status)
            where.status = String(status);
        if (search) {
            where.OR = [
                { examName: { contains: String(search), mode: 'insensitive' } },
                { conductedBy: { contains: String(search), mode: 'insensitive' } },
                { eligibility: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        const data = yield prisma_1.prisma.competitiveExam.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data, count: data.length });
    }
    catch (err) {
        console.error('[GET /api/competitive-exams]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch exams' });
    }
}));
// ─── GET /api/competitive-exams/groups?streamCategory= ───────────
// TN HSC group master data (DGE Annexure I). Registered before /:id.
router.get('/groups', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { streamCategory } = req.query;
        const data = streamCategory
            ? hscGroups_1.HSC_GROUPS.filter((g) => g.streamCategory === String(streamCategory))
            : hscGroups_1.HSC_GROUPS;
        return res.json({ success: true, data, streamLabels: hscGroups_1.STREAM_LABELS });
    }
    catch (err) {
        console.error('[GET /api/competitive-exams/groups]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch groups' });
    }
}));
// ─── GET /api/competitive-exams/recommendations?group=2503&class=12
// Splits the exam catalog into "recommended for this HSC group" and
// "others", each with a human-readable reason.
router.get('/recommendations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groupCode = req.query.group ? String(req.query.group) : '';
        const group = (0, hscGroups_1.getGroup)(groupCode);
        const exams = yield prisma_1.prisma.competitiveExam.findMany({ orderBy: [{ examDate: 'asc' }, { examName: 'asc' }] });
        if (!group) {
            return res.json({
                success: true,
                data: {
                    group: null,
                    groupNotSet: true,
                    recommended: [],
                    others: exams.map((exam) => ({ exam, reason: 'Set your HSC group to get personalised recommendations' })),
                },
            });
        }
        const subjects = (0, hscGroups_1.groupSubjectsWithEquivalents)(group);
        const recommended = [];
        const others = [];
        for (const exam of exams) {
            const applicableGroups = exam.applicableGroups || [];
            const requiredSubjects = exam.requiredSubjects || [];
            const affinity = EXAM_STREAM_AFFINITY.find((a) => a.match.test(exam.examName));
            if (applicableGroups.length > 0) {
                if (applicableGroups.includes(group.code)) {
                    recommended.push({
                        exam,
                        reason: requiredSubjects.length
                            ? `Your group includes ${requiredSubjects.join(', ')} — you meet the subject requirement`
                            : `Group ${group.code} is eligible for this exam`,
                    });
                }
                else {
                    others.push({ exam, reason: `Not open to group ${group.code} (${requiredSubjects.length ? `requires ${requiredSubjects.join(', ')}` : 'restricted group list'})` });
                }
            }
            else if (requiredSubjects.length > 0) {
                const missing = requiredSubjects.filter((s) => !subjects.has(s));
                if (missing.length === 0) {
                    recommended.push({ exam, reason: `Your group includes ${requiredSubjects.join(', ')} — you meet the subject requirement` });
                }
                else {
                    others.push({ exam, reason: `Requires ${missing.join(', ')}, which is not in your group` });
                }
            }
            else if (affinity && affinity.streams.includes(group.streamCategory)) {
                recommended.push({ exam, reason: `Well suited for ${hscGroups_1.STREAM_LABELS[group.streamCategory]} students` });
            }
            else {
                others.push({ exam, reason: 'Open to all groups' });
            }
        }
        // Open-to-all exams first inside "others"
        others.sort((a, b) => (a.reason === 'Open to all groups' ? -1 : 0) - (b.reason === 'Open to all groups' ? -1 : 0));
        return res.json({
            success: true,
            data: {
                group: {
                    code: group.code,
                    name: group.name,
                    subjects: group.partIIISubjects,
                    streamCategory: group.streamCategory,
                    streamLabel: hscGroups_1.STREAM_LABELS[group.streamCategory],
                },
                groupNotSet: false,
                recommended,
                others,
            },
        });
    }
    catch (err) {
        console.error('[GET /api/competitive-exams/recommendations]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to compute recommendations' });
    }
}));
// ─── GET /api/competitive-exams/:id ──────────────────────────────
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield prisma_1.prisma.competitiveExam.findUnique({ where: { id: req.params.id } });
        if (!item)
            return res.status(404).json({ success: false, error: 'Exam not found' });
        return res.json({ success: true, data: item });
    }
    catch (err) {
        console.error('[GET /api/competitive-exams/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch exam' });
    }
}));
// ─── POST /api/competitive-exams ─────────────────────────────────
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { examName, category, conductedBy, registrationDeadline, examDate, status, eligibility, website, studentsEnrolled, studentsCleared, schoolId, teacherId, syllabus } = req.body;
        if (!examName || !category || !conductedBy || !registrationDeadline || !examDate) {
            return res.status(400).json({
                success: false,
                error: 'examName, category, conductedBy, registrationDeadline, and examDate are required',
            });
        }
        const created = yield prisma_1.prisma.competitiveExam.create({
            data: {
                examName,
                category,
                conductedBy,
                registrationDeadline,
                examDate,
                status: status || 'Upcoming',
                eligibility: eligibility || 'N/A',
                website: website || null,
                studentsEnrolled: Number(studentsEnrolled) || 0,
                studentsCleared: Number(studentsCleared) || 0,
                schoolId: schoolId || null,
                teacherId: teacherId || null,
                syllabus: syllabus || null
            }
        });
        return res.status(201).json({
            success: true,
            data: created,
            message: `"${examName}" added to Competitive Exams`,
        });
    }
    catch (err) {
        console.error('[POST /api/competitive-exams]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to create exam' });
    }
}));
// ─── PUT /api/competitive-exams/:id ──────────────────────────────
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.prisma.competitiveExam.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Exam not found' });
        const { examName, category, conductedBy, registrationDeadline, examDate, status, eligibility, website, studentsEnrolled, studentsCleared, syllabus } = req.body;
        // Handle NEET Prep alignment if this is a NEET exam
        const isNeet = existing.examName.toLowerCase().includes('neet') || (examName && examName.toLowerCase().includes('neet'));
        if (isNeet && syllabus !== undefined) {
            try {
                const oldSyllabus = existing.syllabus || [];
                const newSyllabus = syllabus || [];
                // Flatten chapters for easier lookup: map id -> { subject, name }
                const oldChaptersMap = new Map();
                if (Array.isArray(oldSyllabus)) {
                    for (const subject of oldSyllabus) {
                        if (subject && typeof subject === 'object' && Array.isArray(subject.chapters)) {
                            for (const ch of subject.chapters) {
                                if (ch && typeof ch === 'object' && ch.id && ch.name) {
                                    oldChaptersMap.set(String(ch.id), { subject: String(subject.name), name: String(ch.name) });
                                }
                            }
                        }
                    }
                }
                const newChaptersMap = new Map();
                if (Array.isArray(newSyllabus)) {
                    for (const subject of newSyllabus) {
                        if (subject && typeof subject === 'object' && Array.isArray(subject.chapters)) {
                            for (const ch of subject.chapters) {
                                if (ch && typeof ch === 'object' && ch.id && ch.name) {
                                    newChaptersMap.set(String(ch.id), { subject: String(subject.name), name: String(ch.name) });
                                }
                            }
                        }
                    }
                }
                // 1. Identify deleted chapters: present in old, missing in new
                for (const [id, oldCh] of oldChaptersMap.entries()) {
                    if (!newChaptersMap.has(id)) {
                        console.log(`[NEET Syllabus Sync] Deleting chapter from NEETChapter table: ${oldCh.subject} - ${oldCh.name}`);
                        yield prisma_1.prisma.nEETChapter.deleteMany({
                            where: {
                                subject: oldCh.subject,
                                chapter: oldCh.name
                            }
                        });
                    }
                }
                // 2. Identify renamed chapters: present in both, but name is different
                for (const [id, newCh] of newChaptersMap.entries()) {
                    const oldCh = oldChaptersMap.get(id);
                    if (oldCh && oldCh.name !== newCh.name) {
                        console.log(`[NEET Syllabus Sync] Renaming chapter in NEETChapter table: ${oldCh.name} -> ${newCh.name}`);
                        yield prisma_1.prisma.nEETChapter.updateMany({
                            where: {
                                subject: oldCh.subject,
                                chapter: oldCh.name
                            },
                            data: {
                                chapter: newCh.name
                            }
                        });
                    }
                }
            }
            catch (syncErr) {
                console.error('[NEET Syllabus Sync Error]', syncErr.message);
            }
        }
        const updated = yield prisma_1.prisma.competitiveExam.update({
            where: { id: req.params.id },
            data: {
                examName: examName !== undefined ? examName : undefined,
                category: category !== undefined ? category : undefined,
                conductedBy: conductedBy !== undefined ? conductedBy : undefined,
                registrationDeadline: registrationDeadline !== undefined ? registrationDeadline : undefined,
                examDate: examDate !== undefined ? examDate : undefined,
                status: status !== undefined ? status : undefined,
                eligibility: eligibility !== undefined ? eligibility : undefined,
                website: website !== undefined ? website : undefined,
                studentsEnrolled: studentsEnrolled !== undefined ? Number(studentsEnrolled) : undefined,
                studentsCleared: studentsCleared !== undefined ? Number(studentsCleared) : undefined,
                syllabus: syllabus !== undefined ? syllabus : undefined
            }
        });
        return res.json({ success: true, data: updated, message: `"${existing.examName}" updated` });
    }
    catch (err) {
        console.error('[PUT /api/competitive-exams/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to update exam' });
    }
}));
// ─── DELETE /api/competitive-exams/:id ───────────────────────────
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.prisma.competitiveExam.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Exam not found' });
        yield prisma_1.prisma.competitiveExam.delete({ where: { id: req.params.id } });
        return res.json({ success: true, message: `"${existing.examName}" deleted` });
    }
    catch (err) {
        console.error('[DELETE /api/competitive-exams/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to delete exam' });
    }
}));
// ─── POST /api/competitive-exams/upload-syllabus-pdf ──────────────
router.post('/upload-syllabus-pdf', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const uploadsDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        const fileExt = path_1.default.extname(req.file.originalname) || '.pdf';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExt}`;
        const filePath = path_1.default.join(uploadsDir, fileName);
        fs_1.default.writeFileSync(filePath, req.file.buffer);
        return res.json({
            success: true,
            url: `/uploads/${fileName}`,
            name: req.file.originalname
        });
    }
    catch (err) {
        console.error('[POST /api/competitive-exams/upload-syllabus-pdf]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to upload syllabus PDF' });
    }
}));
exports.default = router;
