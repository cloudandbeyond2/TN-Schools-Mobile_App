import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { randomUUID } from 'crypto';

const router = Router();

// ═══════════════════════════════════════════════════
//   NEET CHAPTERS
// ═══════════════════════════════════════════════════

// ─── GET /api/neet-prep/chapters?schoolId=&teacherId=&subject= ───
router.get('/chapters', async (req: Request, res: Response) => {
  try {
    const { schoolId, teacherId, subject } = req.query;

    if (!schoolId) {
      return res.json({ success: true, data: [], count: 0 });
    }

    const where: any = {};
    where.schoolId  = String(schoolId);
    if (teacherId) where.teacherId = String(teacherId);
    if (subject)   where.subject   = String(subject);

    const data = await prisma.nEETChapter.findMany({
      where,
      orderBy: [{ subject: 'asc' }, { chapter: 'asc' }],
    });

    return res.json({ success: true, data, count: data.length });
  } catch (err: any) {
    console.error('[GET /api/neet-prep/chapters]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch chapters' });
  }
});

// ─── GET /api/neet-prep/chapters/:id ────────────────────────────
router.get('/chapters/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.nEETChapter.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Chapter not found' });
    return res.json({ success: true, data: item });
  } catch (err: any) {
    console.error('[GET /api/neet-prep/chapters/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch chapter' });
  }
});

// ─── POST /api/neet-prep/chapters ────────────────────────────────
router.post('/chapters', async (req: Request, res: Response) => {
  try {
    const { subject, chapter, difficulty, totalQuestions, attempted, correct, status, generatedQuestions, schoolId, teacherId } = req.body;

    if (!subject || !chapter) {
      return res.status(400).json({ success: false, error: 'subject and chapter are required' });
    }

    const id  = randomUUID();
    const now = new Date();

    const rows: any[] = await prisma.$queryRaw`
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
  } catch (err: any) {
    console.error('[POST /api/neet-prep/chapters]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create chapter' });
  }
});

// ─── PUT /api/neet-prep/chapters/:id ─────────────────────────────
router.put('/chapters/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.nEETChapter.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Chapter not found' });

    const { subject, chapter, difficulty, totalQuestions, attempted, correct, status, generatedQuestions } = req.body;
    const now = new Date();

    const rows: any[] = await prisma.$queryRaw`
      UPDATE "NEETChapter"
      SET
        subject          = ${subject        ?? existing.subject},
        chapter          = ${chapter        ?? existing.chapter},
        difficulty       = ${difficulty     ?? existing.difficulty},
        "totalQuestions" = ${totalQuestions !== undefined ? Number(totalQuestions) : existing.totalQuestions},
        attempted        = ${attempted      !== undefined ? Number(attempted)      : existing.attempted},
        correct          = ${correct        !== undefined ? Number(correct)        : existing.correct},
        status           = ${status         ?? existing.status},
        "generatedQuestions" = ${generatedQuestions !== undefined ? JSON.stringify(generatedQuestions) : (existing.generatedQuestions ? JSON.stringify(existing.generatedQuestions) : null)}::jsonb,
        "updatedAt"      = ${now}
      WHERE id = ${req.params.id}
      RETURNING *
    `;

    return res.json({ success: true, data: rows[0], message: 'Chapter updated' });
  } catch (err: any) {
    console.error('[PUT /api/neet-prep/chapters/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update chapter' });
  }
});

// ─── DELETE /api/neet-prep/chapters/:id ──────────────────────────
router.delete('/chapters/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.nEETChapter.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Chapter not found' });

    await prisma.nEETChapter.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: `Chapter "${existing.chapter}" deleted` });
  } catch (err: any) {
    console.error('[DELETE /api/neet-prep/chapters/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete chapter' });
  }
});

// ═══════════════════════════════════════════════════
//   NEET MOCK TESTS
// ═══════════════════════════════════════════════════

// ─── GET /api/neet-prep/mock-tests?schoolId=&teacherId= ──────────
router.get('/mock-tests', async (req: Request, res: Response) => {
  try {
    const { schoolId, teacherId } = req.query;

    if (!schoolId) {
      return res.json({ success: true, data: [], count: 0 });
    }

    const where: any = {};
    where.schoolId  = String(schoolId);
    if (teacherId) where.teacherId = String(teacherId);

    const data = await prisma.nEETMockTest.findMany({
      where,
      orderBy: { examDate: 'desc' },
    });

    return res.json({ success: true, data, count: data.length });
  } catch (err: any) {
    console.error('[GET /api/neet-prep/mock-tests]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch mock tests' });
  }
});

// ─── GET /api/neet-prep/mock-tests/:id ───────────────────────────
router.get('/mock-tests/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.nEETMockTest.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Mock test not found' });
    return res.json({ success: true, data: item });
  } catch (err: any) {
    console.error('[GET /api/neet-prep/mock-tests/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch mock test' });
  }
});

// ─── POST /api/neet-prep/mock-tests ──────────────────────────────
router.post('/mock-tests', async (req: Request, res: Response) => {
  try {
    const { title, subject, examDate, duration, totalStudents, avgScore, topScore, maxScore, schoolId, teacherId } = req.body;

    if (!title) return res.status(400).json({ success: false, error: 'title is required' });

    const id  = randomUUID();
    const now = new Date();

    const rows: any[] = await prisma.$queryRaw`
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
  } catch (err: any) {
    console.error('[POST /api/neet-prep/mock-tests]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create mock test' });
  }
});

// ─── PUT /api/neet-prep/mock-tests/:id ───────────────────────────
router.put('/mock-tests/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.nEETMockTest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Mock test not found' });

    const { title, subject, examDate, duration, totalStudents, avgScore, topScore, maxScore } = req.body;
    const now = new Date();

    const rows: any[] = await prisma.$queryRaw`
      UPDATE "NEETMockTest"
      SET
        title           = ${title          ?? existing.title},
        subject         = ${subject        ?? existing.subject},
        "examDate"      = ${examDate       ?? existing.examDate},
        duration        = ${duration       ?? existing.duration},
        "totalStudents" = ${totalStudents  !== undefined ? Number(totalStudents) : existing.totalStudents},
        "avgScore"      = ${avgScore       !== undefined ? Number(avgScore)      : existing.avgScore},
        "topScore"      = ${topScore       !== undefined ? Number(topScore)      : existing.topScore},
        "maxScore"      = ${maxScore       !== undefined ? Number(maxScore)      : existing.maxScore},
        "updatedAt"     = ${now}
      WHERE id = ${req.params.id}
      RETURNING *
    `;

    return res.json({ success: true, data: rows[0], message: 'Mock test updated' });
  } catch (err: any) {
    console.error('[PUT /api/neet-prep/mock-tests/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update mock test' });
  }
});

// ─── DELETE /api/neet-prep/mock-tests/:id ────────────────────────
router.delete('/mock-tests/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.nEETMockTest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Mock test not found' });

    await prisma.nEETMockTest.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: `Mock test "${existing.title}" deleted` });
  } catch (err: any) {
    console.error('[DELETE /api/neet-prep/mock-tests/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete mock test' });
  }
});

export default router;
