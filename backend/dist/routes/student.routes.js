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
const client_1 = require("@prisma/client");
const mongo_1 = require("../models/mongo");
const https_1 = __importDefault(require("https"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploads_1 = require("../utils/uploads");
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({ storage, limits: uploads_1.UPLOAD_LIMITS, fileFilter: uploads_1.documentFileFilter });
const router = (0, express_1.Router)();
/* ------------------- GET PUBLISHED AI LESSONS ------------------- */
// GET /api/students/lessons?class=8&section=A&subject=Science
// Returns published lesson plans for the student's class + section.
// Lessons with section = null are visible to ALL sections of that class.
router.get('/lessons', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { class: cls, subject, section } = req.query;
        const classNum = cls ? (String(cls).match(/\d+/) || [])[0] : undefined;
        const studentSection = section ? String(section).trim().toUpperCase() : null;
        // Build AND conditions so multiple OR clauses don't overwrite each other.
        const andConditions = [{ isPublished: true }];
        if (classNum) {
            andConditions.push({ OR: [{ className: classNum }, { grade: { contains: classNum } }] });
        }
        if (subject) {
            andConditions.push({ subject: { equals: String(subject), mode: 'insensitive' } });
        }
        if (studentSection) {
            // Show all-sections lessons (section IS NULL) + lessons for this exact section
            andConditions.push({ OR: [{ section: null }, { section: studentSection }] });
        }
        const lessons = yield prisma_1.prisma.lessonPlan.findMany({
            where: { AND: andConditions },
            orderBy: { publishedAt: 'desc' },
        });
        res.json({ success: true, data: lessons });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/students/lessons/:id — a single published lesson (student view)
router.get('/lessons/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lesson = yield prisma_1.prisma.lessonPlan.findFirst({
            where: { id: req.params.id, isPublished: true },
        });
        if (!lesson) {
            return res.status(404).json({ success: false, error: 'Lesson not found or not published' });
        }
        res.json({ success: true, data: lesson });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- GET ANNOUNCEMENTS ------------------- */
router.get("/announcements", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, class: cls, section } = req.query;
        if (!schoolId || !cls) {
            return res.status(400).json({
                success: false,
                error: "schoolId and class are required",
            });
        }
        let parsedClass = String(cls).toUpperCase();
        let parsedSection = section ? String(section).toUpperCase() : "";
        if (parsedSection && parsedClass.endsWith(parsedSection)) {
            parsedClass = parsedClass.slice(0, -parsedSection.length);
        }
        const classSection = `${parsedClass}${parsedSection}`;
        const targetParents = `Class ${classSection} Parents`;
        const targetStudents = `Class ${classSection} Students`;
        const announcements = yield prisma_1.prisma.announcement.findMany({
            where: {
                schoolId: String(schoolId),
                OR: [
                    { target: targetParents },
                    { target: targetStudents },
                    { target: "All Parents taught by me" },
                    { target: "All Students" },
                    { target: "School Wide" },
                    { target: "Student Portal" }
                ],
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        console.log(announcements);
        res.json({
            success: true,
            data: announcements,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: String(err),
        });
    }
}));
// GET /api/students/:id — Get student profile with marks & attendance
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const student = yield prisma_1.prisma.student.findFirst({
            where: {
                OR: [
                    { id: req.params.id },
                    { userId: req.params.id }
                ]
            },
            include: {
                school: { select: { name: true, district: true } },
                marks: { orderBy: { createdAt: 'desc' }, take: 20 },
                attendance: { orderBy: { date: 'desc' }, take: 30 },
                scholarships: true,
            },
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const user = yield prisma_1.prisma.user.findUnique({ where: { id: student.userId }, select: { name: true, email: true, mobile: true } });
        const studentWithUser = Object.assign(Object.assign({}, student), { user });
        res.json({ success: true, data: studentWithUser });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- STUDENT MARKS ENDPOINTS ------------------- */
// GET /api/students/:id/marks - Get all marks for a student
router.get('/:id/marks', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const student = yield prisma_1.prisma.student.findFirst({
            where: { OR: [{ id }, { userId: id }] }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const marks = yield prisma_1.prisma.mark.findMany({
            where: { studentId: student.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: marks });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/students/:id/marks - Save assessment marks for a student
router.post('/:id/marks', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { subject, examType, maxMarks, scored } = req.body;
        const student = yield prisma_1.prisma.student.findFirst({
            where: { OR: [{ id }, { userId: id }] }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const pct = (scored / (maxMarks || 100)) * 100;
        let grade = "E";
        if (pct >= 90)
            grade = "A1";
        else if (pct >= 80)
            grade = "A2";
        else if (pct >= 70)
            grade = "B1";
        else if (pct >= 60)
            grade = "B2";
        else if (pct >= 50)
            grade = "C";
        else if (pct >= 35)
            grade = "D";
        const newMark = yield prisma_1.prisma.mark.create({
            data: {
                studentId: student.id,
                subject,
                examType,
                maxMarks: maxMarks || 100,
                scored,
                grade,
                academicYear: "2024-25"
            }
        });
        res.json({ success: true, data: newMark });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/students — List with filters
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, class: cls, section, userId } = req.query;
        const students = yield prisma_1.prisma.student.findMany({
            where: Object.assign(Object.assign(Object.assign(Object.assign({}, (schoolId ? { schoolId: String(schoolId) } : {})), (cls ? { class: String(cls) } : {})), (section ? { section: String(section) } : {})), (userId ? { userId: String(userId) } : {})),
            orderBy: { createdAt: 'desc' },
        });
        const userIds = students.map(s => s.userId);
        const users = yield prisma_1.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
        const userMap = new Map(users.map(u => [u.id, u]));
        const studentsWithUsers = students.map(s => (Object.assign(Object.assign({}, s), { user: userMap.get(s.userId) || { name: "Student" } })));
        res.json({ success: true, count: students.length, data: studentsWithUsers });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/students — Create student
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const student = yield prisma_1.prisma.student.create({ data: req.body });
        res.status(201).json({ success: true, data: student });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/students/:id/leave — Get leave requests for a student
router.get('/:id/leave', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const student = yield prisma_1.prisma.student.findUnique({
            where: { id: req.params.id },
            select: { user: { select: { name: true } } }
        });
        const studentName = (_a = student === null || student === void 0 ? void 0 : student.user) === null || _a === void 0 ? void 0 : _a.name;
        const leaves = yield prisma_1.prisma.leaveRequest.findMany({
            where: {
                OR: [
                    { studentId: req.params.id },
                    ...(studentName ? [{ studentName: { contains: studentName, mode: 'insensitive' } }] : [])
                ]
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: leaves });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/students/:id/homework — Get homework for a student
router.get('/:id/homework', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const student = yield prisma_1.prisma.student.findFirst({
            where: {
                OR: [
                    { id },
                    { userId: id }
                ]
            }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const classSection = `${student.class}${student.section}`;
        // Get all homework for this class
        const homeworkList = yield prisma_1.prisma.homework.findMany({
            where: {
                schoolId: student.schoolId,
                className: { startsWith: classSection }
            },
            include: {
                submissions: {
                    where: { rollNo: student.rollNumber || '' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const data = homeworkList.map((h) => {
            const submission = h.submissions[0];
            // Parse serialized answer if present
            let parsedAnswerText = (submission === null || submission === void 0 ? void 0 : submission.answerText) || null;
            let parsedFiles = [];
            if (submission === null || submission === void 0 ? void 0 : submission.answerText) {
                try {
                    const parsed = JSON.parse(submission.answerText);
                    if (parsed && typeof parsed === 'object' && ('notes' in parsed || 'files' in parsed)) {
                        parsedAnswerText = parsed.notes || '';
                        parsedFiles = parsed.files || [];
                    }
                }
                catch (e) {
                    // not JSON, fallback to raw value
                }
            }
            // Check if it was a late submission
            let submissionStatus = 'not_submitted';
            if (submission && submission.status !== 'pending') {
                submissionStatus = 'submitted';
                if (h.dueDate) {
                    const due = new Date(h.dueDate);
                    due.setHours(23, 59, 59, 999);
                    const isLateString = submission.date && submission.date.includes('Late');
                    const isLateTime = submission.createdAt && new Date(submission.createdAt) > due;
                    if (isLateString || isLateTime) {
                        submissionStatus = 'late_submission';
                    }
                }
            }
            else if (submission && submission.status === 'graded') {
                submissionStatus = 'graded';
            }
            // Override to graded if the submission explicitly has a graded status
            if (submission && submission.status === 'graded') {
                submissionStatus = 'graded';
            }
            // Dynamically select color based on subject
            const sub = h.subject || h.className.split(' - ')[1] || 'General';
            let subColor = '#2dd4bf'; // default teal
            const subLower = sub.toLowerCase();
            if (subLower.includes('math'))
                subColor = '#6366f1'; // indigo
            else if (subLower.includes('sci') || subLower.includes('phys') || subLower.includes('chem') || subLower.includes('biol'))
                subColor = '#10b981'; // emerald
            else if (subLower.includes('eng'))
                subColor = '#f59e0b'; // amber
            else if (subLower.includes('tamil'))
                subColor = '#ec4899'; // pink
            else if (subLower.includes('social') || subLower.includes('hist') || subLower.includes('civ'))
                subColor = '#3b82f6'; // blue
            return {
                id: h.id,
                title: h.title,
                subject: sub,
                subjectColor: subColor,
                className: h.className,
                dueDate: h.dueDate,
                status: submissionStatus,
                description: h.description,
                fullBrief: h.description,
                classLabel: `Class ${classSection}`,
                dueLabel: `Due: ${h.dueDate}`,
                postedLabel: new Date(h.createdAt).toLocaleDateString(),
                teacher: 'Teacher', // could populate if linked
                score: (submission === null || submission === void 0 ? void 0 : submission.score) || '—',
                feedback: (submission === null || submission === void 0 ? void 0 : submission.feedback) || null,
                submittedAnswer: parsedAnswerText,
                submittedDate: (submission === null || submission === void 0 ? void 0 : submission.date) || null,
                submittedFiles: parsedFiles,
            };
        });
        res.json({ success: true, data });
    }
    catch (err) {
        console.error('Error fetching student homework:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/students/:id/homework/:homeworkId/submit
router.post('/:id/homework/:homeworkId/submit', upload.array('files'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id, homeworkId } = req.params;
        const { answerText, existingFiles } = req.body;
        const student = yield prisma_1.prisma.student.findFirst({
            where: {
                OR: [
                    { id },
                    { userId: id }
                ]
            },
            include: { user: true }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        // Find the homework to calculate due date / late status
        const homework = yield prisma_1.prisma.homework.findUnique({
            where: { id: homeworkId }
        });
        if (!homework)
            return res.status(404).json({ success: false, error: 'Homework not found' });
        // Parse existing files if editing
        let finalFiles = [];
        if (existingFiles) {
            try {
                finalFiles = JSON.parse(existingFiles);
            }
            catch (e) { }
        }
        // Process new files
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach((f) => {
                const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${f.filename}`;
                finalFiles.push({
                    id: f.filename,
                    name: f.originalname,
                    kind: f.mimetype === 'application/pdf' ? 'pdf' : 'image',
                    sizeLabel: `${(f.size / 1024).toFixed(0)} KB`,
                    url: fileUrl
                });
            });
        }
        // Check if the submission is late
        let isLate = false;
        let lateString = '';
        if (homework.dueDate) {
            const due = new Date(homework.dueDate);
            // set due time to end of day (23:59:59.999)
            due.setHours(23, 59, 59, 999);
            if (new Date() > due) {
                isLate = true;
                lateString = ' (Late Submission)';
            }
        }
        // Serialize answerText and files list as JSON
        const serializedAnswer = JSON.stringify({
            notes: answerText || '',
            files: finalFiles
        });
        const dateText = 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + lateString;
        // Check if submission already exists
        const existingSubmission = yield prisma_1.prisma.homeworkSubmission.findFirst({
            where: {
                homeworkId,
                rollNo: student.rollNumber || ''
            }
        });
        let submission;
        if (existingSubmission) {
            submission = yield prisma_1.prisma.homeworkSubmission.update({
                where: { id: existingSubmission.id },
                data: {
                    status: 'submitted',
                    studentId: student.id,
                    answerText: serializedAnswer,
                    date: dateText
                }
            });
        }
        else {
            submission = yield prisma_1.prisma.homeworkSubmission.create({
                data: {
                    homeworkId,
                    rollNo: student.rollNumber || '',
                    name: ((_a = student.user) === null || _a === void 0 ? void 0 : _a.name) || 'Student',
                    status: 'submitted',
                    studentId: student.id,
                    answerText: serializedAnswer,
                    date: dateText
                }
            });
        }
        res.json({ success: true, data: submission });
    }
    catch (err) {
        console.error('Error submitting homework:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* Helper to get or fallback to a valid student so board prep never fails */
function getOrCreateStudent(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (id && id !== "undefined" && id !== "null") {
                const found = yield prisma_1.prisma.student.findFirst({
                    where: {
                        OR: [
                            { id },
                            { userId: id }
                        ]
                    }
                });
                if (found)
                    return found;
            }
            const anyStudent = yield prisma_1.prisma.student.findFirst();
            if (anyStudent)
                return anyStudent;
            let user = yield prisma_1.prisma.user.findFirst();
            if (!user) {
                user = yield prisma_1.prisma.user.create({
                    data: {
                        name: "Test Student",
                        role: client_1.Role.STUDENT,
                        email: "test.student@example.com"
                    }
                });
            }
            let school = yield prisma_1.prisma.school.findFirst();
            if (!school) {
                school = yield prisma_1.prisma.school.create({
                    data: {
                        dise: "33012345",
                        name: "Government Higher Secondary School",
                        district: "Coimbatore",
                        block: "Coimbatore South"
                    }
                });
            }
            return yield prisma_1.prisma.student.create({
                data: {
                    id: id && id !== "undefined" ? id : "student-default-1",
                    userId: user.id,
                    schoolId: school.id,
                    class: "10",
                    section: "A",
                    rollNumber: "1001"
                }
            });
        }
        catch (e) {
            console.error("Error in getOrCreateStudent:", e);
            return null;
        }
    });
}
/* ------------------- GET BOARD PREP DATA ------------------- */
router.get('/:id/board-prep', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const selectedClass = String(req.query.class || "10"); // "9" or "10"
        const student = yield getOrCreateStudent(id);
        if (!student)
            return res.status(500).json({ success: false, error: 'Failed to find or create student' });
        // Find or create BoardPrep in MongoDB
        let prepDoc = yield mongo_1.BoardPrep.findOne({ studentId: student.id, class: selectedClass });
        if (!prepDoc) {
            const defaultSyllabus = selectedClass === "9"
                ? [
                    { subject: "Mathematics", completed: 5, totalChapters: 9 },
                    { subject: "Science", completed: 12, totalChapters: 17 },
                    { subject: "Social Science", completed: 14, totalChapters: 21 },
                    { subject: "English", completed: 5, totalChapters: 7 },
                    { subject: "Tamil", completed: 8, totalChapters: 9 },
                ]
                : [
                    { subject: "Mathematics", completed: 9, totalChapters: 15 },
                    { subject: "Science", completed: 18, totalChapters: 22 },
                    { subject: "Social Science", completed: 20, totalChapters: 25 },
                    { subject: "English", completed: 11, totalChapters: 12 },
                    { subject: "Tamil", completed: 9, totalChapters: 10 },
                ];
            const defaultGoalsList = selectedClass === "9"
                ? [
                    { task: "Revise Science Ch-2 (Motion) notes", done: true },
                    { task: "Complete Algebra Exercise 3.2", done: false },
                    { task: "Practice 9th Tamil grammar rules", done: false },
                ]
                : [
                    { task: "Read Science Ch-4 (Carbon Compounds)", done: true },
                    { task: "Solve 15 Math Trigonometry PYQs", done: false },
                    { task: "Take Tamil Public Exam Mini-Mock", done: false },
                ];
            prepDoc = yield mongo_1.BoardPrep.create({
                studentId: student.id,
                class: selectedClass,
                syllabusProgress: defaultSyllabus,
                goals: defaultGoalsList
            });
        }
        // Query practice paper marks from PostgreSQL
        const examTypePrefix = selectedClass === "10" ? "Board Prep Mock - " : "Class 9 Practice Paper - ";
        const marks = yield prisma_1.prisma.mark.findMany({
            where: {
                studentId: student.id,
                examType: {
                    startsWith: examTypePrefix
                }
            }
        });
        res.json({
            success: true,
            data: {
                id: prepDoc._id,
                studentId: prepDoc.studentId,
                class: prepDoc.class,
                syllabusProgress: prepDoc.syllabusProgress,
                goals: prepDoc.goals,
                targetScore: prepDoc.targetScore || (selectedClass === "10" ? 480 : 475),
                targetAmbition: prepDoc.targetAmbition || (selectedClass === "10" ? "Computer Science Engineering at Anna University" : "School Centum & SSLC Topper Goal"),
                marks: marks.map((m) => ({
                    id: m.id,
                    subject: m.subject,
                    paperName: m.examType.replace(examTypePrefix, ""),
                    scored: m.scored,
                    maxMarks: m.maxMarks,
                    grade: m.grade,
                    createdAt: m.createdAt
                }))
            }
        });
    }
    catch (err) {
        console.error('Error fetching board prep data:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- UPDATE SYLLABUS PROGRESS ------------------- */
router.post('/:id/board-prep/syllabus', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { subject, completed, class: selectedClass } = req.body;
        const student = yield getOrCreateStudent(id);
        if (!student)
            return res.status(500).json({ success: false, error: 'Student not found' });
        let prepDoc = yield mongo_1.BoardPrep.findOne({ studentId: student.id, class: selectedClass || "10" });
        if (!prepDoc) {
            prepDoc = yield mongo_1.BoardPrep.create({
                studentId: student.id,
                class: selectedClass || "10",
                syllabusProgress: [
                    { subject: "Mathematics", completed: 9, totalChapters: 15 },
                    { subject: "Science", completed: 18, totalChapters: 22 },
                    { subject: "Social Science", completed: 20, totalChapters: 25 },
                    { subject: "English", completed: 11, totalChapters: 12 },
                    { subject: "Tamil", completed: 9, totalChapters: 10 }
                ],
                goals: []
            });
        }
        const item = prepDoc.syllabusProgress.find((s) => s.subject.toLowerCase() === subject.toLowerCase());
        if (item) {
            item.completed = Math.min(completed, item.totalChapters);
            yield prepDoc.save();
        }
        res.json({ success: true, data: prepDoc });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- UPDATE DAILY GOALS ------------------- */
router.post('/:id/board-prep/goals', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { goals, class: selectedClass } = req.body;
        const student = yield getOrCreateStudent(id);
        if (!student)
            return res.status(500).json({ success: false, error: 'Student not found' });
        const prepDoc = yield mongo_1.BoardPrep.findOneAndUpdate({ studentId: student.id, class: selectedClass || "10" }, { goals }, { new: true, upsert: true });
        res.json({ success: true, data: prepDoc });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- UPDATE TARGET SCORE & AMBITION ------------------- */
router.post('/:id/board-prep/target', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { targetScore, targetAmbition, class: selectedClass } = req.body;
        const student = yield getOrCreateStudent(id);
        if (!student)
            return res.status(500).json({ success: false, error: 'Student not found' });
        const prepDoc = yield mongo_1.BoardPrep.findOneAndUpdate({ studentId: student.id, class: selectedClass || "10" }, { targetScore: Number(targetScore), targetAmbition: String(targetAmbition || "") }, { new: true, upsert: true });
        res.json({ success: true, data: prepDoc });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- SUBMIT PRACTICE PAPER MARK ------------------- */
router.post('/:id/board-prep/submit-paper', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { subject, paperName, scored, maxMarks, subjectMarks, class: selectedClass } = req.body;
        const student = yield getOrCreateStudent(id);
        if (!student)
            return res.status(500).json({ success: false, error: 'Student not found' });
        const examTypePrefix = selectedClass === "10" ? "Board Prep Mock - " : "Class 9 Practice Paper - ";
        if (subjectMarks && typeof subjectMarks === 'object') {
            const createdMarks = [];
            for (const [sub, sc] of Object.entries(subjectMarks)) {
                const examType = `${examTypePrefix}${paperName} - ${sub}`;
                const scoredNum = Number(sc) || 0;
                const pct = (scoredNum / 100) * 100;
                let grade = "E";
                if (pct >= 90)
                    grade = "A1";
                else if (pct >= 80)
                    grade = "A2";
                else if (pct >= 70)
                    grade = "B1";
                else if (pct >= 60)
                    grade = "B2";
                else if (pct >= 50)
                    grade = "C";
                else if (pct >= 35)
                    grade = "D";
                yield prisma_1.prisma.mark.deleteMany({
                    where: { studentId: student.id, subject: sub, examType }
                });
                const newM = yield prisma_1.prisma.mark.create({
                    data: {
                        studentId: student.id,
                        subject: sub,
                        examType,
                        maxMarks: 100,
                        scored: scoredNum,
                        grade,
                        academicYear: "2024-25"
                    }
                });
                createdMarks.push(newM);
            }
            return res.json({ success: true, data: createdMarks });
        }
        else {
            const examType = `${examTypePrefix}${paperName}`;
            const pct = (scored / (maxMarks || 100)) * 100;
            let grade = "E";
            if (pct >= 90)
                grade = "A1";
            else if (pct >= 80)
                grade = "A2";
            else if (pct >= 70)
                grade = "B1";
            else if (pct >= 60)
                grade = "B2";
            else if (pct >= 50)
                grade = "C";
            else if (pct >= 35)
                grade = "D";
            yield prisma_1.prisma.mark.deleteMany({
                where: { studentId: student.id, subject: subject || "General", examType }
            });
            const newMark = yield prisma_1.prisma.mark.create({
                data: {
                    studentId: student.id,
                    subject: subject || "General",
                    examType,
                    maxMarks: maxMarks || 100,
                    scored: Number(scored),
                    grade,
                    academicYear: "2024-25"
                }
            });
            return res.json({ success: true, data: newMark });
        }
    }
    catch (err) {
        console.error('Error submitting paper mark:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- LANGUAGE COACHING API HELPERS ------------------- */
const wordsList = [
    { word: "Opportunity", tamil: "வாய்ப்பு (Vaaippu)", example: "This is a great opportunity to learn English." },
    { word: "Magnificent", tamil: "அற்புதமான (Arputhamaana)", example: "The school building is magnificent." },
    { word: "Curiosity", tamil: "ஆர்வம் (Aarvam)", example: "Curiosity is key to learning new concepts." },
    { word: "Determine", tamil: "தீர்மானி (Theermaani)", example: "Your efforts determine your success." },
    { word: "Encourage", tamil: "ஊக்குவி (Ookkuvi)", example: "Teachers encourage students to speak in English." },
    { word: "Perseverance", tamil: "விடாமுயற்சி (Vidaamuyarchi)", example: "Perseverance helps you overcome obstacles." },
    { word: "Integrity", tamil: "நேர்மை (Naermai)", example: "Integrity is doing the right thing when no one is watching." }
];
function callGeminiMaya(userMessage_1) {
    return __awaiter(this, arguments, void 0, function* (userMessage, history = []) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('GEMINI_API_KEY is missing');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        const prompt = `You are Maya, a friendly AI Spoken English tutor for Tamil students. The student will converse with you in a mix of Tamil, English, and Tanglish (Tamil words written in English letters).
Your instructions:
1. Speak in a warm, bilingual manner (mix of simple English and Tamil/Tanglish).
2. Keep your response very conversational and encouraging.
3. If they make a grammatical error, politely show them how to say it correctly in English.
4. If they say something in Tamil or Tanglish, suggest how to say it in natural English.
5. Provide a JSON response in the following schema:
{
  "text": "Your bilingual chat response (containing the bilingual feedback or reply)",
  "audioText": "A clean English-only sentence representing the target English to speak aloud (which can be read by speech synthesis). Make it short and simple."
}

User Message: "${userMessage}"
Response JSON:`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 1024,
                responseMimeType: "application/json"
            }
        };
        return new Promise((resolve, reject) => {
            const req = https_1.default.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    var _a, _b, _c, _d, _e;
                    try {
                        const json = JSON.parse(data);
                        const text = (_e = (_d = (_c = (_b = (_a = json.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                        const parsed = JSON.parse(text);
                        resolve({
                            text: parsed.text || "Super! Let's continue practicing.",
                            audioText: parsed.audioText || ""
                        });
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', (err) => reject(err));
            req.write(JSON.stringify(payload));
            req.end();
        });
    });
}
/* ------------------- GET LANGUAGE COACHING DETAILS ------------------- */
router.get('/:id/language-coaching', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const student = yield prisma_1.prisma.student.findFirst({
            where: {
                OR: [
                    { id },
                    { userId: id }
                ]
            },
            include: { user: true }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        // Get or Create progress stats in MongoDB
        let progress = yield mongo_1.LanguageCoachingProgress.findOne({ studentId: student.id });
        if (!progress) {
            progress = yield mongo_1.LanguageCoachingProgress.create({
                studentId: student.id,
                sentencesSpoken: 45,
                newWordsCount: 16,
                grammarScore: 78
            });
        }
        // Get badges from PostgreSQL (seed a few defaults if none exist)
        let badges = yield prisma_1.prisma.studentBadge.findMany({
            where: { studentId: student.id }
        });
        if (badges.length === 0) {
            // Create default badges for a neat UI using actual database schema fields
            const defaultBadges = [
                { badge: "💬 Active Speaker", remark: "Spoke 10 sentences today" },
                { badge: "🔬 Star Scientist", remark: "Completed Doctor Roleplay" },
                { badge: "🌟 Mentor Star", remark: "Used AI bridge 5 times" }
            ];
            yield Promise.all(defaultBadges.map(b => {
                var _a;
                return prisma_1.prisma.studentBadge.create({
                    data: {
                        studentId: student.id,
                        studentName: ((_a = student.user) === null || _a === void 0 ? void 0 : _a.name) || "Student",
                        classSection: `${student.class}-${student.section}`,
                        badge: b.badge,
                        remark: b.remark
                    }
                });
            }));
            badges = yield prisma_1.prisma.studentBadge.findMany({
                where: { studentId: student.id }
            });
        }
        // Select dynamic Word of the Day
        const dayIndex = new Date().getDate() % wordsList.length;
        const wordOfTheDay = wordsList[dayIndex];
        res.json({
            success: true,
            data: {
                stats: [
                    { label: "Sentences Spoken", value: String(progress.sentencesSpoken), color: "blue", trend: "+12 Today" },
                    { label: "Fearless Badges", value: String(badges.length), color: "yellow", trend: "Top 10%" },
                    { label: "New Words Used", value: String(progress.newWordsCount), color: "emerald", trend: "Vocab Growing" },
                    { label: "Grammar Flow", value: `${progress.grammarScore}%`, color: "fuchsia", trend: "Improving!" }
                ],
                wordOfTheDay,
                badges: badges.map((b) => ({
                    name: b.badge,
                    desc: b.remark || "Awarded by your teacher",
                    icon: b.badge.split(" ")[0] || "🏅",
                    color: b.badge.includes("Active") ? "emerald" : b.badge.includes("Scientist") ? "blue" : "purple"
                }))
            }
        });
    }
    catch (err) {
        console.error('Error fetching language coaching details:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- PROCESS LANGUAGE COACHING CHAT ------------------- */
router.post('/:id/language-coaching/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const student = yield prisma_1.prisma.student.findFirst({
            where: {
                OR: [
                    { id },
                    { userId: id }
                ]
            }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        // Increment Spoken Sentences
        yield mongo_1.LanguageCoachingProgress.findOneAndUpdate({ studentId: student.id }, { $inc: { sentencesSpoken: 1 } }, { upsert: true });
        try {
            const geminiReply = yield callGeminiMaya(message);
            return res.json({
                success: true,
                data: geminiReply
            });
        }
        catch (apiError) {
            console.warn("Gemini call failed or API key missing, falling back to mock response.");
            // Fallback response parsing
            const lowerMsg = message.toLowerCase();
            let text = "Super! I hear you. To say that in English, we can try different words. Want to practice a simple dialogue together?";
            let audioText = "Super! I hear you. Want to practice a simple dialogue together?";
            if (lowerMsg.includes("bank") && lowerMsg.includes("leave")) {
                text = "Great question! You can ask: \n\n\"Is the bank closed tomorrow?\"";
                audioText = "Is the bank closed tomorrow?";
            }
            else if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
                text = "Hello! Epdi irukkinga? Ready to practice some English today? 😊";
                audioText = "Hello! Epdi irukkinga? Ready to practice some English today?";
            }
            else if (lowerMsg.includes("enna panra") || lowerMsg.includes("enna panringa") || lowerMsg.includes("enna seikiraai")) {
                text = "Naan unga kooda pesitu iruken! (I am talking with you!) In English you can ask: 'What are you doing?'. Try asking me that! 🌟";
                audioText = "I am talking with you. In English you can ask: What are you doing?";
            }
            else if (lowerMsg.includes("name enna") || lowerMsg.includes("unoda name") || lowerMsg.includes("unga name") || lowerMsg.includes("peyar enna")) {
                text = "En name Maya! Super kelvi. In English, you can ask: 'What is your name?'. Can you type that for me? 🙌";
                audioText = "My name is Maya. In English, you can ask: What is your name?";
            }
            else if (lowerMsg.includes("how are you") || lowerMsg.includes("eppadi irukka") || lowerMsg.includes("epdi irukka")) {
                text = "I'm doing great, nandri! How are you doing today? 👍";
                audioText = "I'm doing great, nandri! How are you doing today?";
            }
            return res.json({
                success: true,
                data: { text, audioText }
            });
        }
    }
    catch (err) {
        console.error('Error processing chat:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- LOG PRONUNCIATION ATTEMPT ------------------- */
router.post('/:id/language-coaching/pronunciation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const student = yield prisma_1.prisma.student.findFirst({
            where: {
                OR: [
                    { id },
                    { userId: id }
                ]
            }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        // Update stats: sentences spoken + 1, vocabulary words + 2
        const progress = yield mongo_1.LanguageCoachingProgress.findOneAndUpdate({ studentId: student.id }, {
            $inc: { sentencesSpoken: 1, newWordsCount: 2 },
            $set: { grammarScore: 82 }
        }, { upsert: true, new: true });
        res.json({ success: true, data: progress });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- GET PORTFOLIO DETAILS ------------------- */
router.get('/:id/portfolio', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const student = yield prisma_1.prisma.student.findFirst({
            where: {
                OR: [
                    { id },
                    { userId: id }
                ]
            }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        let portfolio = yield prisma_1.prisma.portfolio.findUnique({
            where: { studentId: student.id },
            include: {
                projects: true,
                skills: true,
                achievements: true
            }
        });
        if (!portfolio) {
            // Create default portfolio and seed data
            portfolio = yield prisma_1.prisma.portfolio.create({
                data: {
                    studentId: student.id,
                    bio: "I love science, stargazing and drawing!",
                    stream: "General",
                    projects: {
                        create: []
                    },
                    skills: {
                        create: [
                            { name: "Creativity ✨", level: 90, color: "#f59e0b" },
                            { name: "Teamwork 🤝", level: 85, color: "#10b981" },
                            { name: "Curiosity 🕵️‍♂️", level: 95, color: "#ec4899" },
                            { name: "Focus 🎯", level: 70, color: "#3b82f6" }
                        ]
                    },
                    achievements: {
                        create: [
                            { title: "Spelling Bee Champion", year: "2024", icon: "fi-sr-bee", color: "amber", bg: "bg-amber-500/20" }
                        ]
                    }
                },
                include: {
                    projects: true,
                    skills: true,
                    achievements: true
                }
            });
        }
        res.json({
            success: true,
            data: portfolio
        });
    }
    catch (err) {
        console.error('Error fetching student portfolio:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- ADD PROJECT TO PORTFOLIO ------------------- */
router.post('/:id/portfolio/projects', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, category, date, image, tags, description } = req.body;
        const student = yield prisma_1.prisma.student.findFirst({
            where: {
                OR: [
                    { id },
                    { userId: id }
                ]
            }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found' });
        let portfolio = yield prisma_1.prisma.portfolio.findUnique({
            where: { studentId: student.id }
        });
        if (!portfolio) {
            portfolio = yield prisma_1.prisma.portfolio.create({
                data: { studentId: student.id }
            });
        }
        const newProject = yield prisma_1.prisma.portfolioProject.create({
            data: {
                portfolioId: portfolio.id,
                title,
                category,
                date: date || "Today",
                image: image || "📁",
                tags: tags || [],
                description: description || "Great Job! 👍"
            }
        });
        res.json({ success: true, data: newProject });
    }
    catch (err) {
        console.error('Error adding project to portfolio:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- GET SCHOLARSHIPS FOR STUDENT ------------------- */
router.get('/:studentId/scholarships', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const scholarships = yield prisma_1.prisma.scholarship.findMany({
            where: { studentId },
            orderBy: { appliedDate: 'desc' }
        });
        res.json({ success: true, data: scholarships });
    }
    catch (err) {
        console.error('Error fetching student scholarships:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- POST APPLY FOR SCHOLARSHIP ------------------- */
router.post('/:studentId/scholarships', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { scheme, amount } = req.body;
        const newScholarship = yield prisma_1.prisma.scholarship.create({
            data: {
                studentId,
                scheme,
                amount: typeof amount === 'number' ? amount : parseFloat(amount),
                status: 'PENDING'
            }
        });
        res.json({ success: true, data: newScholarship });
    }
    catch (err) {
        console.error('Error applying for scholarship:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- GET DASHBOARD SUMMARY FOR STUDENT ------------------- */
router.get('/:studentId/dashboard-summary', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { studentId } = req.params;
        const student = yield prisma_1.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                portfolio: true,
                marks: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        // Determine stream (Pure Science, Computer Science, Commerce, Arts)
        const stream = ((_a = student.portfolio) === null || _a === void 0 ? void 0 : _a.stream) || "Pure Science & Bio";
        // Dynamic subject lists and progress based on marks or defaults
        const subjectsMap = {
            "Physics": { icon: "⚛️", color: "#3b82f6" },
            "Chemistry": { icon: "🧪", color: "#10b981" },
            "Biology": { icon: "🧬", color: "#ec4899" },
            "Mathematics": { icon: "📐", color: "#6366f1" },
            "Computer Science": { icon: "💻", color: "#8b5cf6" },
            "Accountancy": { icon: "📈", color: "#f59e0b" },
            "Economics": { icon: "🏛️", color: "#f43f5e" },
            "Basic Electrical": { icon: "🔌", color: "#06b6d4" },
            "Agriculture Science": { icon: "🌱", color: "#10b981" },
            "Office Management": { icon: "💼", color: "#f59e0b" }
        };
        const calculatedSubjects = [];
        const subjectsScored = {};
        student.marks.forEach(m => {
            if (!subjectsScored[m.subject]) {
                subjectsScored[m.subject] = { total: 0, count: 0 };
            }
            const pct = (m.scored / m.maxMarks) * 100;
            subjectsScored[m.subject].total += pct;
            subjectsScored[m.subject].count += 1;
        });
        // Gather unique subjects
        const uniqueSubjects = Object.keys(subjectsScored);
        if (uniqueSubjects.length > 0) {
            uniqueSubjects.forEach(sub => {
                const avg = Math.round(subjectsScored[sub].total / subjectsScored[sub].count);
                const meta = subjectsMap[sub] || { icon: "📚", color: "#6b7280" };
                calculatedSubjects.push({
                    name: sub,
                    progress: avg,
                    color: meta.color,
                    icon: meta.icon
                });
            });
        }
        else {
            // Fallback/default subjects based on stream
            const defaultSubjects = {
                "Pure Science & Bio": ["Physics", "Chemistry", "Biology", "Mathematics"],
                "Computer Science & Math": ["Physics", "Chemistry", "Computer Science", "Mathematics"],
                "Commerce & Accountancy": ["Accountancy", "Commerce", "Economics", "Mathematics"],
                "Arts & Humanities": ["History", "Geography", "Political Science", "Economics"],
                "Vocational Education": ["Basic Electrical", "Agriculture Science", "Office Management", "Computer Science"]
            };
            const subs = defaultSubjects[stream] || defaultSubjects["Pure Science & Bio"];
            subs.forEach(name => {
                const meta = subjectsMap[name] || { icon: "📚", color: "#6b7280" };
                calculatedSubjects.push({
                    name,
                    progress: 80, // Default baseline progress
                    color: meta.color,
                    icon: meta.icon
                });
            });
        }
        // Overall Average
        let overallAvg = 80; // default baseline
        if (student.marks.length > 0) {
            const totalPct = student.marks.reduce((acc, m) => acc + (m.scored / m.maxMarks) * 100, 0);
            overallAvg = Math.round(totalPct / student.marks.length);
        }
        // Mock test scores from actual exam records
        const recentTests = student.marks.slice(0, 5).map(m => {
            const pct = (m.scored / m.maxMarks) * 100;
            let status = "good";
            if (pct >= 85)
                status = "excellent";
            else if (pct < 60)
                status = "needs-work";
            return {
                test: `${m.examType}: ${m.subject}`,
                score: `${m.scored}/${m.maxMarks}`,
                status
            };
        });
        res.json({
            success: true,
            data: {
                stream,
                overallAvg,
                testsCount: student.marks.length,
                subjects: calculatedSubjects,
                recentTests
            }
        });
    }
    catch (err) {
        console.error('Error getting student dashboard summary:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- PUT UPDATE STREAM FOR STUDENT ------------------- */
router.put('/:studentId/stream', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { stream } = req.body;
        if (!stream) {
            return res.status(400).json({ success: false, error: 'Stream is required' });
        }
        // 1. Update Student group/stream in Student model
        const student = yield prisma_1.prisma.student.update({
            where: { id: studentId },
            data: { group: stream }
        });
        // 2. Upsert/update Portfolio stream
        yield prisma_1.prisma.portfolio.upsert({
            where: { studentId },
            update: { stream },
            create: { studentId, bio: "Welcome to my digital portfolio!", stream }
        });
        res.json({
            success: true,
            message: 'Student stream updated successfully',
            data: {
                studentId,
                stream
            }
        });
    }
    catch (err) {
        console.error('Error updating student stream:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
