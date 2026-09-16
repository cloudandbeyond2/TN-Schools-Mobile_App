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
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
// ═══════════════════════════════════════════════════
//   NEET CHAPTERS
// ═══════════════════════════════════════════════════
// ─── GET /api/neet-prep/chapters?schoolId=&teacherId=&subject= ───
router.get('/chapters', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, teacherId, subject } = req.query;
        const where = {};
        if (schoolId)
            where.schoolId = String(schoolId);
        if (teacherId)
            where.teacherId = String(teacherId);
        if (subject)
            where.subject = String(subject);
        const data = yield prisma_1.prisma.nEETChapter.findMany({
            where,
            orderBy: [{ subject: 'asc' }, { chapter: 'asc' }],
        });
        return res.json({ success: true, data, count: data.length });
    }
    catch (err) {
        console.error('[GET /api/neet-prep/chapters]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch chapters' });
    }
}));
// ─── GET /api/neet-prep/chapters/:id ────────────────────────────
router.get('/chapters/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield prisma_1.prisma.nEETChapter.findUnique({ where: { id: req.params.id } });
        if (!item)
            return res.status(404).json({ success: false, error: 'Chapter not found' });
        return res.json({ success: true, data: item });
    }
    catch (err) {
        console.error('[GET /api/neet-prep/chapters/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch chapter' });
    }
}));
// ─── POST /api/neet-prep/chapters ────────────────────────────────
router.post('/chapters', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subject, chapter, difficulty, totalQuestions, attempted, correct, status, generatedQuestions, schoolId, teacherId } = req.body;
        if (!subject || !chapter) {
            return res.status(400).json({ success: false, error: 'subject and chapter are required' });
        }
        const id = (0, crypto_1.randomUUID)();
        const now = new Date();
        const rows = yield prisma_1.prisma.$queryRaw `
      INSERT INTO "NEETChapter"
        (id, subject, chapter, difficulty, "totalQuestions", attempted, correct, status,
         "generatedQuestions", "schoolId", "teacherId", "createdAt", "updatedAt")
      VALUES
        (${id}, ${subject}, ${chapter}, ${difficulty || 'Medium'},
         ${Number(totalQuestions) || 0}, ${Number(attempted) || 0},
         ${Number(correct) || 0}, ${status || 'Pending'}, ${generatedQuestions ? JSON.stringify(generatedQuestions) : null}::jsonb,
         ${schoolId || null}, ${teacherId || null}, ${now}, ${now})
      RETURNING *
    `;
        return res.status(201).json({ success: true, data: rows[0], message: `Chapter "${chapter}" added` });
    }
    catch (err) {
        console.error('[POST /api/neet-prep/chapters]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to create chapter' });
    }
}));
// ─── PUT /api/neet-prep/chapters/:id ─────────────────────────────
router.put('/chapters/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.prisma.nEETChapter.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Chapter not found' });
        const { subject, chapter, difficulty, totalQuestions, attempted, correct, status, generatedQuestions } = req.body;
        const now = new Date();
        const rows = yield prisma_1.prisma.$queryRaw `
      UPDATE "NEETChapter"
      SET
        subject          = ${subject !== null && subject !== void 0 ? subject : existing.subject},
        chapter          = ${chapter !== null && chapter !== void 0 ? chapter : existing.chapter},
        difficulty       = ${difficulty !== null && difficulty !== void 0 ? difficulty : existing.difficulty},
        "totalQuestions" = ${totalQuestions !== undefined ? Number(totalQuestions) : existing.totalQuestions},
        attempted        = ${attempted !== undefined ? Number(attempted) : existing.attempted},
        correct          = ${correct !== undefined ? Number(correct) : existing.correct},
        status           = ${status !== null && status !== void 0 ? status : existing.status},
        "generatedQuestions" = ${generatedQuestions !== undefined ? JSON.stringify(generatedQuestions) : (existing.generatedQuestions ? JSON.stringify(existing.generatedQuestions) : null)}::jsonb,
        "updatedAt"      = ${now}
      WHERE id = ${req.params.id}
      RETURNING *
    `;
        return res.json({ success: true, data: rows[0], message: 'Chapter updated' });
    }
    catch (err) {
        console.error('[PUT /api/neet-prep/chapters/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to update chapter' });
    }
}));
// ─── DELETE /api/neet-prep/chapters/:id ──────────────────────────
router.delete('/chapters/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.prisma.nEETChapter.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Chapter not found' });
        yield prisma_1.prisma.nEETChapter.delete({ where: { id: req.params.id } });
        return res.json({ success: true, message: `Chapter "${existing.chapter}" deleted` });
    }
    catch (err) {
        console.error('[DELETE /api/neet-prep/chapters/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to delete chapter' });
    }
}));
// ═══════════════════════════════════════════════════
//   NEET MOCK TESTS
// ═══════════════════════════════════════════════════
// ─── GET /api/neet-prep/mock-tests?schoolId=&teacherId= ──────────
router.get('/mock-tests', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, teacherId } = req.query;
        const where = {};
        if (schoolId)
            where.schoolId = String(schoolId);
        if (teacherId)
            where.teacherId = String(teacherId);
        const data = yield prisma_1.prisma.nEETMockTest.findMany({
            where,
            orderBy: { examDate: 'desc' },
        });
        return res.json({ success: true, data, count: data.length });
    }
    catch (err) {
        console.error('[GET /api/neet-prep/mock-tests]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch mock tests' });
    }
}));
// ─── GET /api/neet-prep/mock-tests/:id ───────────────────────────
router.get('/mock-tests/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield prisma_1.prisma.nEETMockTest.findUnique({ where: { id: req.params.id } });
        if (!item)
            return res.status(404).json({ success: false, error: 'Mock test not found' });
        return res.json({ success: true, data: item });
    }
    catch (err) {
        console.error('[GET /api/neet-prep/mock-tests/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch mock test' });
    }
}));
// ─── POST /api/neet-prep/mock-tests ──────────────────────────────
router.post('/mock-tests', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, subject, examDate, duration, totalStudents, avgScore, topScore, maxScore, schoolId, teacherId } = req.body;
        if (!title)
            return res.status(400).json({ success: false, error: 'title is required' });
        const id = (0, crypto_1.randomUUID)();
        const now = new Date();
        const rows = yield prisma_1.prisma.$queryRaw `
      INSERT INTO "NEETMockTest"
        (id, title, subject, "examDate", duration, "totalStudents", "avgScore", "topScore",
         "maxScore", "schoolId", "teacherId", "createdAt", "updatedAt")
      VALUES
        (${id}, ${title}, ${subject || 'Full Syllabus'}, ${examDate || ''},
         ${duration || '3 hrs 20 min'}, ${Number(totalStudents) || 0},
         ${Number(avgScore) || 0}, ${Number(topScore) || 0},
         ${Number(maxScore) || 720}, ${schoolId || null}, ${teacherId || null},
         ${now}, ${now})
      RETURNING *
    `;
        return res.status(201).json({ success: true, data: rows[0], message: `Mock test "${title}" created` });
    }
    catch (err) {
        console.error('[POST /api/neet-prep/mock-tests]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to create mock test' });
    }
}));
// ─── PUT /api/neet-prep/mock-tests/:id ───────────────────────────
router.put('/mock-tests/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.prisma.nEETMockTest.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Mock test not found' });
        const { title, subject, examDate, duration, totalStudents, avgScore, topScore, maxScore } = req.body;
        const now = new Date();
        const rows = yield prisma_1.prisma.$queryRaw `
      UPDATE "NEETMockTest"
      SET
        title           = ${title !== null && title !== void 0 ? title : existing.title},
        subject         = ${subject !== null && subject !== void 0 ? subject : existing.subject},
        "examDate"      = ${examDate !== null && examDate !== void 0 ? examDate : existing.examDate},
        duration        = ${duration !== null && duration !== void 0 ? duration : existing.duration},
        "totalStudents" = ${totalStudents !== undefined ? Number(totalStudents) : existing.totalStudents},
        "avgScore"      = ${avgScore !== undefined ? Number(avgScore) : existing.avgScore},
        "topScore"      = ${topScore !== undefined ? Number(topScore) : existing.topScore},
        "maxScore"      = ${maxScore !== undefined ? Number(maxScore) : existing.maxScore},
        "updatedAt"     = ${now}
      WHERE id = ${req.params.id}
      RETURNING *
    `;
        return res.json({ success: true, data: rows[0], message: 'Mock test updated' });
    }
    catch (err) {
        console.error('[PUT /api/neet-prep/mock-tests/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to update mock test' });
    }
}));
// ─── DELETE /api/neet-prep/mock-tests/:id ────────────────────────
router.delete('/mock-tests/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.prisma.nEETMockTest.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Mock test not found' });
        yield prisma_1.prisma.nEETMockTest.delete({ where: { id: req.params.id } });
        return res.json({ success: true, message: `Mock test "${existing.title}" deleted` });
    }
    catch (err) {
        console.error('[DELETE /api/neet-prep/mock-tests/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to delete mock test' });
    }
}));
exports.default = router;
