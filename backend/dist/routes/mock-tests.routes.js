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
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get mock tests based on role
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role, schoolId, createdById } = req.query;
        let whereClause = {};
        if (role === 'SUPER_ADMIN') {
            whereClause = {};
        }
        else if (role === 'HEADMASTER' || role === 'TEACHER') {
            // HMs and Teachers can see State-wide tests (schoolId null) + their own school tests
            whereClause = {
                OR: [
                    { schoolId: null },
                    { schoolId: schoolId }
                ]
            };
        }
        const tests = yield prisma.mockTest.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { questions: true, assignments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: tests });
    }
    catch (error) {
        console.error('Error fetching mock tests:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch mock tests' });
    }
}));
// Create a new mock test
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, grade, subject, duration, totalMarks, createdByRole, createdById, schoolId, questions } = req.body;
        const newTest = yield prisma.mockTest.create({
            data: {
                title,
                description,
                grade,
                subject,
                duration: parseInt(duration) || 60,
                totalMarks: parseInt(totalMarks) || 100,
                createdByRole,
                createdById,
                schoolId,
                questions: {
                    create: questions.map((q, i) => ({
                        type: q.type,
                        text: q.text,
                        options: q.options || [],
                        answer: q.answer,
                        marks: parseInt(q.marks) || 1,
                        order: i
                    }))
                }
            }
        });
        res.json({ success: true, data: newTest });
    }
    catch (error) {
        console.error('Error creating mock test:', error);
        res.status(500).json({ success: false, error: 'Failed to create mock test' });
    }
}));
// Student side: Get assigned tests
router.get('/student/:studentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        // First find the student to get their school, class, section
        const student = yield prisma.student.findFirst({
            where: {
                OR: [
                    { id: studentId },
                    { userId: studentId }
                ]
            }
        });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        // Support class name variations (e.g. "10" vs "Grade 10" vs "Class 10")
        const classNum = student.class ? (student.class.match(/\d+/) || [])[0] : null;
        const classVariants = student.class ? [
            student.class,
            student.class.toLowerCase(),
            student.class.toUpperCase()
        ] : [];
        if (classNum) {
            classVariants.push(classNum, `Grade ${classNum}`, `Class ${classNum}`, `Grade${classNum}`, `Class${classNum}`, `${classNum}th`, `Grade ${classNum}th`, `Class ${classNum}th`);
        }
        const uniqueClassVariants = Array.from(new Set(classVariants));
        // Find assignments matching student's school, class, section
        const assignments = yield prisma.mockTestAssignment.findMany({
            where: {
                OR: [
                    // State-wide assignments
                    { schoolId: null, class: { in: uniqueClassVariants } },
                    // School-wide assignments
                    { schoolId: student.schoolId, class: null },
                    // Class-specific assignments
                    { schoolId: student.schoolId, class: { in: uniqueClassVariants }, section: null },
                    // Section-specific assignments
                    { schoolId: student.schoolId, class: { in: uniqueClassVariants }, section: student.section }
                ]
            },
            include: {
                mockTest: true,
                submissions: {
                    where: { studentId: student.id }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });
        res.json({ success: true, data: assignments });
    }
    catch (error) {
        console.error('Error fetching student mock tests:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch mock tests for student' });
    }
}));
// Get a single test with questions
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const test = yield prisma.mockTest.findUnique({
            where: { id: req.params.id },
            include: {
                questions: {
                    orderBy: { order: 'asc' }
                },
                assignments: true
            }
        });
        if (!test) {
            return res.status(404).json({ success: false, error: 'Test not found' });
        }
        res.json({ success: true, data: test });
    }
    catch (error) {
        console.error('Error fetching mock test:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch mock test' });
    }
}));
// Delete a mock test
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma.mockTest.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true, message: 'Mock test deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting mock test:', error);
        res.status(500).json({ success: false, error: 'Failed to delete mock test' });
    }
}));
// Assign a mock test
router.post('/:id/assign', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, class: className, section, dueDate } = req.body;
        // Find mock test first to resolve schoolId if not passed
        const mockTest = yield prisma.mockTest.findUnique({
            where: { id: req.params.id }
        });
        if (!mockTest) {
            return res.status(404).json({ success: false, error: 'Mock test not found' });
        }
        const resolvedSchoolId = schoolId || mockTest.schoolId || null;
        // Safely parse dueDate
        let parsedDueDate = null;
        if (dueDate && typeof dueDate === 'string' && dueDate.trim() !== '') {
            const d = new Date(dueDate);
            if (!isNaN(d.getTime())) {
                parsedDueDate = d;
            }
        }
        const assignment = yield prisma.mockTestAssignment.create({
            data: {
                mockTestId: req.params.id,
                schoolId: resolvedSchoolId,
                class: className || mockTest.grade,
                section: section ? String(section).trim() : null,
                dueDate: parsedDueDate
            }
        });
        res.json({ success: true, data: assignment });
    }
    catch (error) {
        console.error('Error assigning mock test:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to assign mock test' });
    }
}));
// Get submissions for a mock test
router.get('/:id/submissions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const submissions = yield prisma.mockTestSubmission.findMany({
            where: {
                assignment: {
                    mockTestId: req.params.id
                }
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: { name: true }
                        }
                    }
                },
                assignment: {
                    include: {
                        mockTest: {
                            include: { questions: true }
                        }
                    }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });
        res.json({ success: true, data: submissions });
    }
    catch (error) {
        console.error('Error fetching mock test submissions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }
}));
// Submit a test
router.post('/submit/:assignmentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { assignmentId } = req.params;
        const { studentId, answers = {} } = req.body; // answers is an object: { questionId: answerText }
        // Find actual student ID because frontend passes userId
        const student = yield prisma.student.findFirst({
            where: {
                OR: [
                    { id: studentId },
                    { userId: studentId }
                ]
            }
        });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        // Fetch the test to auto-grade MCQs
        const assignment = yield prisma.mockTestAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                mockTest: {
                    include: { questions: true }
                }
            }
        });
        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        let score = 0;
        // Simple auto-grading for MCQs
        for (const q of assignment.mockTest.questions) {
            if (q.type === 'mcq' && answers[q.id]) {
                // Compare string values directly (A == A)
                if (answers[q.id].trim().toUpperCase() === q.answer.trim().toUpperCase()) {
                    score += q.marks;
                }
            }
        }
        const submission = yield prisma.mockTestSubmission.create({
            data: {
                assignmentId,
                studentId: student.id,
                answers,
                score,
                status: 'GRADED'
            }
        });
        res.json({ success: true, data: submission });
    }
    catch (error) {
        console.error('Error submitting mock test:', error);
        res.status(500).json({ success: false, error: 'Failed to submit mock test' });
    }
}));
exports.default = router;
