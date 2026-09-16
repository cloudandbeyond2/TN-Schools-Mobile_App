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
// 1. GET /api/stories - Fetch all storybooks with student's progress
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = req.query.studentId;
        // Fetch all books with chapters count
        const books = yield prisma.storyBook.findMany({
            include: {
                chapters: {
                    select: { id: true }
                }
            }
        });
        // If studentId is provided, resolve progress
        let progressList = [];
        if (studentId) {
            // Find direct student first
            let student = yield prisma.student.findUnique({ where: { id: studentId } });
            if (!student) {
                // Fallback: check if userId
                const studentByUserId = yield prisma.student.findFirst({
                    where: { userId: studentId }
                });
                if (studentByUserId) {
                    student = studentByUserId;
                }
            }
            if (student) {
                progressList = yield prisma.studentStoryProgress.findMany({
                    where: { studentId: student.id }
                });
            }
        }
        const data = books.map(book => {
            const prog = progressList.find(p => p.storyBookId === book.id);
            return {
                id: book.id,
                title: book.title,
                author: book.author,
                genre: book.genre,
                cover: book.cover,
                color: book.color,
                language: book.language,
                moral: book.moral,
                xpReward: book.xpReward,
                gradeLevel: book.gradeLevel,
                progress: prog ? prog.progress : 0,
                completed: prog ? prog.completed : false,
                currentChapter: prog ? prog.currentChapter : 1,
                currentPage: prog ? prog.currentPage : 1,
                totalChapters: book.chapters.length
            };
        });
        res.json({ success: true, data });
    }
    catch (err) {
        console.error('Error fetching storybooks:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 2. GET /api/stories/:id - Fetch full details for a storybook + pages
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const studentId = req.query.studentId;
        const book = yield prisma.storyBook.findUnique({
            where: { id },
            include: {
                chapters: {
                    orderBy: { chapterNumber: 'asc' },
                    include: {
                        pages: {
                            orderBy: { pageNumber: 'asc' }
                        }
                    }
                }
            }
        });
        if (!book) {
            return res.status(404).json({ success: false, error: 'Storybook not found' });
        }
        // Resolve student progress
        let progress = null;
        if (studentId) {
            let student = yield prisma.student.findUnique({ where: { id: studentId } });
            if (!student) {
                const studentByUserId = yield prisma.student.findFirst({
                    where: { userId: studentId }
                });
                if (studentByUserId) {
                    student = studentByUserId;
                }
            }
            if (student) {
                progress = yield prisma.studentStoryProgress.findUnique({
                    where: {
                        studentId_storyBookId: {
                            studentId: student.id,
                            storyBookId: id
                        }
                    }
                });
            }
        }
        res.json({
            success: true,
            data: {
                id: book.id,
                title: book.title,
                author: book.author,
                genre: book.genre,
                cover: book.cover,
                color: book.color,
                language: book.language,
                moral: book.moral,
                xpReward: book.xpReward,
                gradeLevel: book.gradeLevel,
                chapters: book.chapters,
                progress: progress ? {
                    completed: progress.completed,
                    progress: progress.progress,
                    currentChapter: progress.currentChapter,
                    currentPage: progress.currentPage
                } : {
                    completed: false,
                    progress: 0,
                    currentChapter: 1,
                    currentPage: 1
                }
            }
        });
    }
    catch (err) {
        console.error('Error fetching story details:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 3. POST /api/stories/progress - Update reading progress & award XP
router.post('/progress', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, storyBookId, currentChapter, currentPage, completed, progressPercent } = req.body;
        if (!studentId || !storyBookId) {
            return res.status(400).json({ success: false, error: 'studentId and storyBookId are required' });
        }
        // Resolve student
        let student = yield prisma.student.findUnique({ where: { id: studentId } });
        if (!student) {
            const studentByUserId = yield prisma.student.findFirst({
                where: { userId: studentId }
            });
            if (studentByUserId) {
                student = studentByUserId;
            }
        }
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        // Get storybook to reward XP
        const book = yield prisma.storyBook.findUnique({ where: { id: storyBookId } });
        if (!book) {
            return res.status(404).json({ success: false, error: 'Storybook not found' });
        }
        // Upsert progress
        const oldProgress = yield prisma.studentStoryProgress.findUnique({
            where: {
                studentId_storyBookId: {
                    studentId: student.id,
                    storyBookId
                }
            }
        });
        const isNewlyCompleted = completed && (!oldProgress || !oldProgress.completed);
        const progressRecord = yield prisma.studentStoryProgress.upsert({
            where: {
                studentId_storyBookId: {
                    studentId: student.id,
                    storyBookId
                }
            },
            update: {
                currentChapter: Number(currentChapter) || 1,
                currentPage: Number(currentPage) || 1,
                completed: completed || false,
                progress: Number(progressPercent) || 0
            },
            create: {
                studentId: student.id,
                storyBookId,
                currentChapter: Number(currentChapter) || 1,
                currentPage: Number(currentPage) || 1,
                completed: completed || false,
                progress: Number(progressPercent) || 0
            }
        });
        // If student newly completed the story, reward XP
        if (isNewlyCompleted) {
            const xpReward = book.xpReward || 50;
            // Create completion notification
            yield prisma.notification.create({
                data: {
                    userId: student.userId,
                    message: `Congratulations! You finished reading "${book.title}" and earned +${xpReward} XP! 📚✨`,
                    read: false
                }
            });
        }
        res.json({ success: true, data: progressRecord });
    }
    catch (err) {
        console.error('Error saving story progress:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
