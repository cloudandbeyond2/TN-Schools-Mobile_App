import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import {
  BoardPrep,
  SSLCQuestionPaper,
  SSLCPrepPlan,
  SSLCMockTest,
  SSLCMockAttempt,
  SSLCRevisionPlan,
} from '../models/mongo';
import { requireRole, getAuthUser, AppRole } from '../middleware/auth.middleware';

const router = Router();

// Roles allowed to manage (create/update/delete/publish) SSLC prep content.
const STAFF_ROLES: AppRole[] = ['TEACHER', 'HEADMASTER', 'BEO', 'DEO', 'COMMISSIONER', 'MINISTER', 'SUPERADMIN'];
const OVERSIGHT_ROLES: AppRole[] = ['HEADMASTER', 'BEO', 'DEO', 'COMMISSIONER', 'MINISTER', 'SUPERADMIN'];

const SSLC_SUBJECTS = ['Tamil', 'English', 'Mathematics', 'Science', 'Social Science'];

const isStaffRole = async (req: Request) => {
  const user = await getAuthUser(req);
  return !!user && STAFF_ROLES.includes(user.role);
};

/* ════════════════════════════════════════════════════════════════════
   PREVIOUS QUESTION PAPERS
   ════════════════════════════════════════════════════════════════════ */

// List papers — school-specific + state-wide. All roles.
router.get('/papers', async (req: Request, res: Response) => {
  try {
    const { class: cls, subject, schoolId } = req.query as Record<string, string>;
    const filter: any = {};
    if (cls) filter.class = cls;
    if (subject && subject !== 'All') filter.subject = subject;
    if (schoolId) {
      filter.$or = [{ schoolId }, { schoolId: null }, { schoolId: { $exists: false } }];
    }
    const papers = await SSLCQuestionPaper.find(filter).sort({ year: -1, createdAt: -1 });
    res.json({ success: true, data: papers });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Add a paper — teachers and above.
router.post('/papers', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    const { class: cls, subject, year, paperType, title, fileUrl, durationMinutes, maxMarks,
      schoolId, uploadedById, uploadedByName } = req.body;
    if (!cls || !subject || !year || !title) {
      return res.status(400).json({ success: false, error: 'class, subject, year and title are required' });
    }
    const paper = await SSLCQuestionPaper.create({
      class: String(cls), subject, year: String(year),
      paperType: paperType || 'Board', title, fileUrl,
      durationMinutes: durationMinutes || 180, maxMarks: maxMarks || 100,
      schoolId: schoolId || undefined,
      uploadedById, uploadedByName,
      uploadedByRole: String(req.headers['x-user-role'] || 'TEACHER'),
    });
    res.json({ success: true, data: paper });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.delete('/papers/:id', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    await SSLCQuestionPaper.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Track a download/open — any role.
router.post('/papers/:id/download', async (req: Request, res: Response) => {
  try {
    const paper = await SSLCQuestionPaper.findByIdAndUpdate(
      req.params.id, { $inc: { downloads: 1 } }, { new: true });
    res.json({ success: true, data: paper });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ════════════════════════════════════════════════════════════════════
   SUBJECT PREPARATION PLANS
   ════════════════════════════════════════════════════════════════════ */

// List plans. Students only ever see published plans; staff may pass
// includeDrafts=true (role header enforced) to manage drafts.
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const { class: cls, subject, schoolId, includeDrafts } = req.query as Record<string, string>;
    const filter: any = {};
    if (cls) filter.class = cls;
    if (subject && subject !== 'All') filter.subject = subject;
    if (schoolId) {
      filter.$or = [{ schoolId }, { schoolId: null }, { schoolId: { $exists: false } }];
    }
    if (!(includeDrafts === 'true' && (await isStaffRole(req)))) filter.published = true;
    
    let plans = await SSLCPrepPlan.find(filter).sort({ subject: 1, createdAt: -1 });

    // Auto-seed high-yield state board prep plans if collection is empty
    if (plans.length === 0) {
      await seedMasterPrepPlans();
      plans = await SSLCPrepPlan.find(filter).sort({ subject: 1, createdAt: -1 });
    }

    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post('/plans', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    const { schoolId, class: cls, subject, title, description, teacherId, teacherName, weeks, published } = req.body;
    if (!schoolId || !cls || !subject || !title) {
      return res.status(400).json({ success: false, error: 'schoolId, class, subject and title are required' });
    }
    const plan = await SSLCPrepPlan.create({
      schoolId, class: String(cls), subject, title, description,
      teacherId, teacherName, weeks: weeks || [], published: !!published,
    });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.put('/plans/:id', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    const { title, description, weeks, subject, class: cls } = req.body;
    const update: any = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (weeks !== undefined) update.weeks = weeks;
    if (subject !== undefined) update.subject = subject;
    if (cls !== undefined) update.class = String(cls);
    const plan = await SSLCPrepPlan.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.patch('/plans/:id/publish', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    const plan = await SSLCPrepPlan.findByIdAndUpdate(
      req.params.id, { published: !!req.body.published }, { new: true });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.delete('/plans/:id', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    await SSLCPrepPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ════════════════════════════════════════════════════════════════════
   MOCK TESTS
   ════════════════════════════════════════════════════════════════════ */

// Strip answer keys before sending a test to a student.
const sanitizeTestForStudent = (test: any) => {
  const obj = test.toObject ? test.toObject() : { ...test };
  obj.questions = (obj.questions || []).map((q: any) => {
    const { answer, ...rest } = q;
    return rest;
  });
  return obj;
};

// List tests. Students see published only; staff can pass all=true.
router.get('/mock-tests', async (req: Request, res: Response) => {
  try {
    const { class: cls, subject, schoolId, all } = req.query as Record<string, string>;
    const filter: any = {};
    if (cls) filter.class = cls;
    if (subject && subject !== 'All') filter.subject = subject;
    if (schoolId) {
      filter.$or = [{ schoolId }, { schoolId: null }, { schoolId: { $exists: false } }];
    }
    const staff = all === 'true' && isStaffRole(req);
    if (!staff) filter.published = true;
    const tests = await SSLCMockTest.find(filter).sort({ createdAt: -1 });
    const data = staff
      ? tests
      : tests.map((t: any) => {
          const obj = sanitizeTestForStudent(t);
          obj.questionCount = (t.questions || []).length;
          return obj;
        });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Single test — answer keys removed unless the caller is staff.
router.get('/mock-tests/:id', async (req: Request, res: Response) => {
  try {
    const test = await SSLCMockTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, error: 'Test not found' });
    res.json({ success: true, data: (await isStaffRole(req)) ? test : sanitizeTestForStudent(test) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post('/mock-tests', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    const { schoolId, class: cls, subject, title, durationMinutes, totalMarks,
      difficulty, questions, published, createdById, createdByName } = req.body;
    if (!cls || !subject || !title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'class, subject, title and at least one question are required' });
    }
    const normalizedQuestions = questions.map((q: any, i: number) => ({
      qid: q.qid || `q${i + 1}`,
      type: q.type === 'short' ? 'short' : 'mcq',
      text: q.text,
      options: q.options || [],
      answer: q.answer,
      marks: Number(q.marks) || 1,
    }));
    const computedTotal = normalizedQuestions.reduce((sum, q) => sum + q.marks, 0);
    const test = await SSLCMockTest.create({
      schoolId: schoolId || undefined,
      class: String(cls), subject, title,
      durationMinutes: durationMinutes || 180,
      totalMarks: totalMarks || computedTotal,
      difficulty: difficulty || 'Medium',
      questions: normalizedQuestions,
      published: !!published,
      createdById, createdByName,
      createdByRole: String(req.headers['x-user-role'] || 'TEACHER'),
    });
    res.json({ success: true, data: test });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.patch('/mock-tests/:id/publish', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    const test = await SSLCMockTest.findByIdAndUpdate(
      req.params.id, { published: !!req.body.published }, { new: true });
    res.json({ success: true, data: test });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.delete('/mock-tests/:id', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    await SSLCMockTest.findByIdAndDelete(req.params.id);
    await SSLCMockAttempt.deleteMany({ testId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Submit an attempt — server grades MCQs against the stored answer key;
// short answers are graded from the student's self-evaluation marks
// (capped at the question's max marks).
router.post('/mock-tests/:id/attempts', async (req: Request, res: Response) => {
  try {
    const { studentId, answers, selfMarks, timeTakenSeconds } = req.body;
    if (!studentId) return res.status(400).json({ success: false, error: 'studentId is required' });

    const test = await SSLCMockTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, error: 'Test not found' });

    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { userId: studentId }] },
      include: { user: true },
    });

    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    const answerMap: Record<string, string> = answers || {};
    const selfMap: Record<string, number> = selfMarks || {};

    for (const q of test.questions as any[]) {
      maxScore += q.marks;
      if (q.type === 'mcq') {
        const given = String(answerMap[q.qid] ?? '').trim().toUpperCase();
        const expected = String(q.answer ?? '').trim().toUpperCase();
        // Accept either the option letter ("A") or the full option text.
        const expectedLetter = expected.length > 1 ? expected.charAt(0) : expected;
        if (given && (given === expected || given.charAt(0) === expectedLetter)) {
          score += q.marks;
          correctCount += 1;
        }
      } else {
        const awarded = Math.max(0, Math.min(Number(selfMap[q.qid]) || 0, q.marks));
        score += awarded;
        if (awarded >= q.marks * 0.5) correctCount += 1;
      }
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

    const attempt = await SSLCMockAttempt.create({
      testId: String(test._id),
      studentId: student?.id || studentId,
      studentName: student?.user?.name,
      schoolId: student?.schoolId || test.schoolId,
      class: test.class,
      subject: test.subject,
      testTitle: test.title,
      answers: answerMap,
      score, maxScore, percentage, correctCount,
      questionCount: (test.questions || []).length,
      timeTakenSeconds,
    });

    res.json({ success: true, data: attempt });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// All attempts for a test — staff only (class performance view).
router.get('/mock-tests/:id/attempts', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    const attempts = await SSLCMockAttempt.find({ testId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: attempts });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// A student's own attempt history.
router.get('/attempts', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query as Record<string, string>;
    if (!studentId) return res.status(400).json({ success: false, error: 'studentId is required' });
    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { userId: studentId }] },
    });
    const attempts = await SSLCMockAttempt.find({
      studentId: { $in: [studentId, student?.id].filter(Boolean) },
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: attempts });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ════════════════════════════════════════════════════════════════════
   PERFORMANCE ANALYSIS HELPERS
   ════════════════════════════════════════════════════════════════════ */

interface SubjectHistoryPoint {
  percent: number;
  at: number; // epoch millis, for regression ordering
  source: string;
}

// Collect a student's chronological score history per subject from
// PostgreSQL Mark rows, ModelExamResult rows and mock test attempts.
async function collectSubjectHistory(studentDbId: string): Promise<Record<string, SubjectHistoryPoint[]>> {
  const history: Record<string, SubjectHistoryPoint[]> = {};
  const push = (subject: string, percent: number, at: Date, source: string) => {
    const key = SSLC_SUBJECTS.find((s) => s.toLowerCase() === subject.toLowerCase()) || subject;
    if (!history[key]) history[key] = [];
    history[key].push({ percent: Math.round(percent * 10) / 10, at: new Date(at).getTime(), source });
  };

  const marks = await prisma.mark.findMany({ where: { studentId: studentDbId } });
  for (const m of marks) {
    if (m.maxMarks > 0) push(m.subject, (m.scored / m.maxMarks) * 100, m.createdAt, m.examType);
  }

  const modelResults = await prisma.modelExamResult.findMany({
    where: { studentId: studentDbId },
    include: { exam: true },
  });
  for (const r of modelResults) {
    const subjectCols: Array<[string, number | null]> = [
      ['Tamil', r.tamil], ['English', r.english], ['Mathematics', r.mathematics],
      ['Science', r.science], ['Social Science', r.socialScience],
    ];
    for (const [subject, scored] of subjectCols) {
      if (scored !== null && scored !== undefined) {
        push(subject, scored, r.createdAt, r.exam?.examName || 'Model Exam');
      }
    }
  }

  const attempts = await SSLCMockAttempt.find({ studentId: studentDbId });
  for (const a of attempts) {
    push(a.subject, a.percentage, a.createdAt, `Mock: ${a.testTitle}`);
  }

  for (const key of Object.keys(history)) history[key].sort((a, b) => a.at - b.at);
  return history;
}

// Least-squares linear regression over (index, percent) points,
// projected one step ahead. Returns clamped [0, 100].
function predictNextPercent(points: SubjectHistoryPoint[]): { predicted: number; trend: number } {
  if (points.length === 0) return { predicted: 0, trend: 0 };
  if (points.length === 1) return { predicted: points[0].percent, trend: 0 };
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  points.forEach((p, i) => {
    sumX += i; sumY += p.percent; sumXY += i * p.percent; sumXX += i * i;
  });
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const predicted = Math.max(0, Math.min(100, intercept + slope * n));
  return { predicted: Math.round(predicted * 10) / 10, trend: Math.round(slope * 10) / 10 };
}

function gradeForPercent(pct: number): string {
  if (pct >= 90) return 'A1';
  if (pct >= 80) return 'A2';
  if (pct >= 70) return 'B1';
  if (pct >= 60) return 'B2';
  if (pct >= 50) return 'C';
  if (pct >= 35) return 'D';
  return 'U';
}

async function buildPrediction(studentDbId: string) {
  const history = await collectSubjectHistory(studentDbId);
  const subjects = SSLC_SUBJECTS.map((subject) => {
    const points = history[subject] || [];
    const { predicted, trend } = predictNextPercent(points);
    const avg = points.length
      ? Math.round((points.reduce((s, p) => s + p.percent, 0) / points.length) * 10) / 10
      : 0;
    // Confidence grows with sample size, shrinks with score volatility.
    let confidence = 0;
    if (points.length >= 2) {
      const variance = points.reduce((s, p) => s + Math.pow(p.percent - avg, 2), 0) / points.length;
      confidence = Math.round(Math.max(20, Math.min(95, 40 + points.length * 8 - Math.sqrt(variance))));
    } else if (points.length === 1) {
      confidence = 30;
    }
    return {
      subject,
      samples: points.length,
      averagePercent: avg,
      predictedPercent: predicted,
      predictedMarks: Math.round(predicted), // out of 100 per subject
      trend, // percent-points per exam; positive = improving
      confidence,
      grade: gradeForPercent(predicted),
      risk: predicted < 35 ? 'High' : predicted < 55 ? 'Medium' : 'Low',
      history: points.slice(-10),
    };
  });

  const withData = subjects.filter((s) => s.samples > 0);
  const predictedTotal = subjects.reduce((sum, s) => sum + (s.samples > 0 ? s.predictedMarks : 0), 0);
  const overallPercent = withData.length
    ? Math.round((withData.reduce((s, x) => s + x.predictedPercent, 0) / withData.length) * 10) / 10
    : 0;

  return {
    subjects,
    overall: {
      predictedTotal, // out of 500
      maxTotal: 500,
      overallPercent,
      grade: gradeForPercent(overallPercent),
      passLikely: withData.length > 0 && withData.every((s) => s.predictedPercent >= 35),
      subjectsWithData: withData.length,
    },
  };
}

function buildPredictionsBatch(
  students: any[],
  allMarks: any[],
  allModelResults: any[],
  allAttempts: any[]
) {
  const marksByStudent: Record<string, any[]> = {};
  for (const m of allMarks) {
    if (!marksByStudent[m.studentId]) marksByStudent[m.studentId] = [];
    marksByStudent[m.studentId].push(m);
  }

  const modelResultsByStudent: Record<string, any[]> = {};
  for (const r of allModelResults) {
    if (!modelResultsByStudent[r.studentId]) modelResultsByStudent[r.studentId] = [];
    modelResultsByStudent[r.studentId].push(r);
  }

  const attemptsByStudent: Record<string, any[]> = {};
  for (const a of allAttempts) {
    if (!attemptsByStudent[a.studentId]) attemptsByStudent[a.studentId] = [];
    attemptsByStudent[a.studentId].push(a);
  }

  const results: Record<string, any> = {};

  for (const student of students) {
    const studentDbId = student.id;
    const history: Record<string, SubjectHistoryPoint[]> = {};
    const push = (subject: string, percent: number, at: Date, source: string) => {
      const key = SSLC_SUBJECTS.find((s) => s.toLowerCase() === subject.toLowerCase()) || subject;
      if (!history[key]) history[key] = [];
      history[key].push({ percent: Math.round(percent * 10) / 10, at: new Date(at).getTime(), source });
    };

    const sMarks = marksByStudent[studentDbId] || [];
    for (const m of sMarks) {
      if (m.maxMarks > 0) push(m.subject, (m.scored / m.maxMarks) * 100, m.createdAt, m.examType);
    }

    const sModelResults = modelResultsByStudent[studentDbId] || [];
    for (const r of sModelResults) {
      const subjectCols: Array<[string, number | null]> = [
        ['Tamil', r.tamil], ['English', r.english], ['Mathematics', r.mathematics],
        ['Science', r.science], ['Social Science', r.socialScience],
      ];
      for (const [subject, scored] of subjectCols) {
        if (scored !== null && scored !== undefined) {
          push(subject, scored, r.createdAt, r.exam?.examName || 'Model Exam');
        }
      }
    }

    const sAttempts = attemptsByStudent[studentDbId] || [];
    for (const a of sAttempts) {
      push(a.subject, a.percentage, a.createdAt, `Mock: ${a.testTitle}`);
    }

    for (const key of Object.keys(history)) history[key].sort((a, b) => a.at - b.at);

    const subjects = SSLC_SUBJECTS.map((subject) => {
      const points = history[subject] || [];
      const { predicted, trend } = predictNextPercent(points);
      const avg = points.length
        ? Math.round((points.reduce((s, p) => s + p.percent, 0) / points.length) * 10) / 10
        : 0;
      let confidence = 0;
      if (points.length >= 2) {
        const variance = points.reduce((s, p) => s + Math.pow(p.percent - avg, 2), 0) / points.length;
        confidence = Math.round(Math.max(20, Math.min(95, 40 + points.length * 8 - Math.sqrt(variance))));
      } else if (points.length === 1) {
        confidence = 30;
      }
      return {
        subject,
        samples: points.length,
        averagePercent: avg,
        predictedPercent: predicted,
        predictedMarks: Math.round(predicted),
        trend,
        confidence,
        grade: gradeForPercent(predicted),
        risk: predicted < 35 ? 'High' : predicted < 55 ? 'Medium' : 'Low',
        history: points.slice(-10),
      };
    });

    const withData = subjects.filter((s) => s.samples > 0);
    const predictedTotal = subjects.reduce((sum, s) => sum + (s.samples > 0 ? s.predictedMarks : 0), 0);
    const overallPercent = withData.length
      ? Math.round((withData.reduce((s, x) => s + x.predictedPercent, 0) / withData.length) * 10) / 10
      : 0;

    results[studentDbId] = {
      subjects,
      overall: {
        predictedTotal,
        maxTotal: 500,
        overallPercent,
        grade: gradeForPercent(overallPercent),
        passLikely: withData.length > 0 && withData.every((s) => s.predictedPercent >= 35),
        subjectsWithData: withData.length,
      },
    };
  }

  return results;
}

/* ════════════════════════════════════════════════════════════════════
   PERFORMANCE PREDICTIONS
   ════════════════════════════════════════════════════════════════════ */

router.get('/predictions/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { userId: studentId }] },
      include: { user: true },
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const prediction = await buildPrediction(student.id);
    res.json({
      success: true,
      data: {
        studentId: student.id,
        studentName: student.user?.name,
        class: student.class,
        ...prediction,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ════════════════════════════════════════════════════════════════════
   AI REVISION PLAN
   ════════════════════════════════════════════════════════════════════ */

// Topic pools used to compose concrete revision tasks per subject.
const REVISION_TOPICS: Record<string, Record<string, string[]>> = {
  '9': {
    Tamil: ['இயல் 1-3 உரைநடை', 'செய்யுள் மனப்பாடம்', 'இலக்கணம் – புணர்ச்சி', 'கட்டுரை எழுதுதல்'],
    English: ['Prose Units 1-3', 'Poem appreciation questions', 'Grammar – Tenses & Voice', 'Letter & essay writing'],
    Mathematics: ['Set Theory', 'Algebra – Factorization', 'Geometry – Triangles', 'Coordinate Geometry basics', 'Statistics – Mean/Median'],
    Science: ['Laws of Motion', 'Matter Around Us', 'Cell Structure', 'Light – Reflection', 'Acids, Bases & Salts intro'],
    'Social Science': ['French Revolution', 'Physical Geography of India', 'Constitution basics', 'Economics – Understanding Development'],
  },
  '10': {
    Tamil: ['இயல் 1-4 திருக்குறள்', 'உரைநடை பகுதி PYQ', 'இலக்கணம் – அணி & யாப்பு', 'மொழிப்பயிற்சி வினாக்கள்'],
    English: ['Prose comprehension PYQs', 'Poem memoriter lines', 'Grammar – Reported speech, Modals', 'Paragraph & letter formats'],
    Mathematics: ['Relations & Functions', 'Algebra – Quadratics', 'Trigonometry identities', 'Mensuration formulas', 'Statistics & Probability'],
    Science: ['Laws of Motion & Optics', 'Periodic Classification', 'Carbon & its Compounds', 'Heredity & Evolution', 'Electricity numericals'],
    'Social Science': ['Nationalism in India', 'India – Resources & Agriculture', 'Central & State Government', 'Money and Credit'],
  },
};

router.get('/revision-plan/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const cls = String(req.query.class || '10');
    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { userId: studentId }] },
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    const plan = await SSLCRevisionPlan.findOne({ studentId: student.id, class: cls });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Generate (or regenerate) a personalised 7-day revision plan from the
// student's real performance data — weakest subjects get the most days.
router.post('/revision-plan/generate', async (req: Request, res: Response) => {
  try {
    const { studentId, class: cls, dailyMinutes } = req.body;
    if (!studentId) return res.status(400).json({ success: false, error: 'studentId is required' });
    const selectedClass = String(cls || '10');

    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { userId: studentId }] },
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const prediction = await buildPrediction(student.id);
    const prepDoc = await BoardPrep.findOne({ studentId: student.id, class: selectedClass });

    // Weakness score per subject: low predicted % and low syllabus
    // completion both raise priority.
    const ranked = prediction.subjects
      .map((s) => {
        const syllabusItem = prepDoc?.syllabusProgress?.find(
          (p: any) => p.subject.toLowerCase() === s.subject.toLowerCase());
        const completionPct = syllabusItem && syllabusItem.totalChapters > 0
          ? (syllabusItem.completed / syllabusItem.totalChapters) * 100
          : 60;
        const performance = s.samples > 0 ? s.predictedPercent : 55;
        return {
          ...s,
          completionPct,
          weakness: (100 - performance) * 0.7 + (100 - completionPct) * 0.3,
        };
      })
      .sort((a, b) => b.weakness - a.weakness);

    const focusAreas = ranked.slice(0, 3).map((s, i) => ({
      subject: s.subject,
      reason: s.samples > 0
        ? `Predicted score ${s.predictedPercent}% · syllabus ${Math.round(s.completionPct)}% complete`
        : `No test data yet · syllabus ${Math.round(s.completionPct)}% complete`,
      priority: (i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
      averagePercent: s.averagePercent,
    }));

    // Day allocation over 7 days: weakest 3 days, next 2 days, then 1+1.
    const allocation = [ranked[0], ranked[0], ranked[0], ranked[1], ranked[1], ranked[2], ranked[3] || ranked[0]];
    const topicPool = REVISION_TOPICS[selectedClass] || REVISION_TOPICS['10'];
    const usedTopicIdx: Record<string, number> = {};

    const days = allocation.map((s, i) => {
      const topics = topicPool[s.subject] || ['Revise class notes', 'Solve previous exam questions'];
      const idx = usedTopicIdx[s.subject] || 0;
      usedTopicIdx[s.subject] = idx + 1;
      const topic = topics[idx % topics.length];
      return {
        day: i + 1,
        subject: s.subject,
        focus: topic,
        tasks: [
          { text: `Revise notes: ${topic}`, done: false },
          { text: `Solve 10 practice questions on ${topic}`, done: false },
          { text: i % 2 === 0
              ? `Attempt a 30-min mini mock on ${s.subject}`
              : `Write a one-page summary of ${topic} from memory`, done: false },
        ],
      };
    });

    const plan = await SSLCRevisionPlan.findOneAndUpdate(
      { studentId: student.id, class: selectedClass },
      {
        studentId: student.id,
        class: selectedClass,
        dailyMinutes: Number(dailyMinutes) || 90,
        focusAreas,
        days,
        source: 'ai',
      },
      { new: true, upsert: true },
    );

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Toggle one revision task done/undone.
router.patch('/revision-plan/:studentId/task', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { class: cls, dayIndex, taskIndex, done } = req.body;
    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { userId: studentId }] },
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const plan = await SSLCRevisionPlan.findOne({ studentId: student.id, class: String(cls || '10') });
    if (!plan) return res.status(404).json({ success: false, error: 'Revision plan not found' });

    const day = plan.days[Number(dayIndex)];
    const task = day?.tasks?.[Number(taskIndex)];
    if (!task) return res.status(400).json({ success: false, error: 'Invalid day/task index' });
    task.done = !!done;
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ════════════════════════════════════════════════════════════════════
   CLASS / SCHOOL ANALYTICS (teacher & headmaster oversight)
   ════════════════════════════════════════════════════════════════════ */

router.get('/analytics/school', requireRole(STAFF_ROLES), async (req: Request, res: Response) => {
  try {
    const { schoolId, class: cls, section, teacherId } = req.query as Record<string, string>;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });
    
    let classes = cls ? [cls] : ['9', '10'];

    let teacherConditions: any = {};
    if (teacherId) {
      const teacherIds: string[] = [teacherId];

      const user = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { email: true }
      });
      if (user && user.email) {
        const staff = await prisma.headmasterStaff.findFirst({
          where: { email: user.email },
          select: { id: true }
        });
        if (staff) {
          teacherIds.push(staff.id);
        }
      }

      const staff = await prisma.headmasterStaff.findUnique({
        where: { id: teacherId },
        select: { email: true }
      });
      if (staff && staff.email) {
        const matchedUser = await prisma.user.findFirst({
          where: { email: { equals: staff.email, mode: 'insensitive' } },
          select: { id: true }
        });
        if (matchedUser) {
          teacherIds.push(matchedUser.id);
        }
      }

      const teacherClassrooms = await prisma.classRoom.findMany({
        where: { 
          schoolId, 
          teacherId: { in: teacherIds }
        },
        select: { className: true, section: true }
      });
      if (teacherClassrooms.length > 0) {
        let filteredClassrooms = teacherClassrooms;
        if (cls) {
          filteredClassrooms = filteredClassrooms.filter(c => c.className === cls);
        }
        if (section) {
          filteredClassrooms = filteredClassrooms.filter(c => c.section.toUpperCase() === section.toUpperCase());
        }

        if (filteredClassrooms.length > 0) {
          teacherConditions = {
            OR: filteredClassrooms.map((cr) => ({
              class: cr.className,
              section: cr.section
            }))
          };
          classes = Array.from(new Set(filteredClassrooms.map(c => c.className)));
        } else {
          teacherConditions = { id: 'none' };
          classes = [];
        }
      } else {
        teacherConditions = { id: 'none' };
        classes = [];
      }
    } else {
      teacherConditions = {
        class: { in: classes },
        ...(section ? { section } : {})
      };
    }

    const students = await prisma.student.findMany({
      where: { 
        schoolId, 
        ...teacherConditions
      },
      include: { user: true },
    });
    const studentIds = students.map((s: any) => s.id);

    // Syllabus readiness from BoardPrep docs.
    const prepDocs = await BoardPrep.find({ studentId: { $in: studentIds } });
    let readinessSum = 0;
    let readinessCount = 0;
    for (const doc of prepDocs) {
      for (const item of doc.syllabusProgress || []) {
        if (item.totalChapters > 0) {
          readinessSum += (item.completed / item.totalChapters) * 100;
          readinessCount += 1;
        }
      }
    }
    const avgSyllabusCompletion = readinessCount ? Math.round(readinessSum / readinessCount) : 0;

    // Mock test participation & subject averages.
    const attempts = await SSLCMockAttempt.find({ studentId: { $in: studentIds } });
    const attemptedStudentIds = new Set(attempts.map((a) => a.studentId));
    const subjectAverages = SSLC_SUBJECTS.map((subject) => {
      const subjAttempts = attempts.filter((a) => a.subject === subject);
      const avg = subjAttempts.length
        ? Math.round(subjAttempts.reduce((s, a) => s + a.percentage, 0) / subjAttempts.length)
        : null;
      return { subject, attempts: subjAttempts.length, averagePercent: avg };
    });

    // Per-student predictions (bounded to keep the endpoint responsive).
    const scanLimit = Math.min(students.length, 120);
    const activeStudentSubset = students.slice(0, scanLimit);
    const activeStudentIds = activeStudentSubset.map(s => s.id);

    const [allMarks, allModelResults] = await Promise.all([
      prisma.mark.findMany({ where: { studentId: { in: activeStudentIds } } }),
      prisma.modelExamResult.findMany({
        where: { studentId: { in: activeStudentIds } },
        include: { exam: true }
      })
    ]);

    const subsetAttempts = attempts.filter(a => activeStudentIds.includes(a.studentId));

    const batchPredictions = buildPredictionsBatch(
      activeStudentSubset,
      allMarks,
      allModelResults,
      subsetAttempts
    );

    const perStudent = activeStudentSubset.map((s) => {
      const prediction = batchPredictions[s.id];
      return {
        studentId: s.id,
        name: s.user?.name || 'Student',
        rollNumber: s.rollNumber,
        class: s.class,
        section: s.section,
        predictedTotal: prediction.overall.predictedTotal,
        overallPercent: prediction.overall.overallPercent,
        grade: prediction.overall.grade,
        passLikely: prediction.overall.passLikely,
        subjectsWithData: prediction.overall.subjectsWithData,
        weakestSubject: prediction.subjects
          .filter((x: any) => x.samples > 0)
          .sort((a: any, b: any) => a.predictedPercent - b.predictedPercent)[0]?.subject || null,
      };
    });

    const withData = perStudent.filter((p) => p.subjectsWithData > 0);
    const atRisk = withData
      .filter((p) => p.overallPercent < 45)
      .sort((a, b) => a.overallPercent - b.overallPercent);

    const tests = await SSLCMockTest.find({
      $or: [{ schoolId }, { schoolId: null }, { schoolId: { $exists: false } }],
      class: { $in: classes },
    }).sort({ createdAt: -1 }).limit(20);

    res.json({
      success: true,
      data: {
        totals: {
          students: students.length,
          class9: students.filter((s: any) => s.class === '9').length,
          class10: students.filter((s: any) => s.class === '10').length,
          avgSyllabusCompletion,
          mockAttempts: attempts.length,
          mockParticipationPercent: students.length
            ? Math.round((attemptedStudentIds.size / students.length) * 100)
            : 0,
          predictedPassRate: withData.length
            ? Math.round((withData.filter((p) => p.passLikely).length / withData.length) * 100)
            : 0,
        },
        subjectAverages,
        students: perStudent.sort((a, b) => b.predictedTotal - a.predictedTotal),
        atRisk: atRisk.slice(0, 15),
        recentTests: tests.map((t: any) => ({
          id: t._id,
          title: t.title,
          subject: t.subject,
          class: t.class,
          published: t.published,
          createdByName: t.createdByName,
          questionCount: (t.questions || []).length,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

async function seedMasterPrepPlans() {
  try {
    const count = await SSLCPrepPlan.countDocuments();
    if (count > 0) return;

    const masterPlans = [
      {
        class: "10",
        subject: "Tamil",
        title: "SSLC தமிழ் 100 நாட்கள் அரசுத் தேர்வு சாதனைத் திட்டம் 2026",
        description: "தமிழ்நாடு அரசுப் பாடத்திட்டத்தின்படி பத்தாம் வகுப்பு செய்யுள், உரைநடை, இலக்கணம் மற்றும் மொழிப் பயிற்சி வாரவாரி வழிகாட்டி.",
        teacherName: "முனைவர் க. சுப்பிரமணியன் (முதுகலை தமிழசிரியர்)",
        published: true,
        weeks: [
          { week: 1, focus: "செய்யுள் & உரைநடை - இயல் 1-3", topics: ["அன்னை மொழியே & தமிழ்ச் சொல் வளம்", "காற்றே வா & முல்லைப் பாட்டு", "விருந்து போற்றுதும் & காசிக்காண்டம்"], activities: ["மனப்பாடப் பாடல்கள் 5 முறை எழுதிப் பார்த்தல்", "உரைநடை வினாக்களுக்கு 2 பக்கப் பத்தி விடை எழுதுதல்"] },
          { week: 2, focus: "இலக்கணம் & மொழித்திறன் பயிற்சி", topics: ["எழுத்து, சொல் வகைப்பாடு", "தொகைநிலை & தொகாநிலைத் தொடர்கள்", "புணர்ச்சி விதிகள் & அணி இலக்கணம்"], activities: ["பண்புத்தொகை, வினைத்தொகை பகுத்தறிதல்", "படைப்பாக்கப் பயிற்சி - கவிதை புனைதல்"] },
          { week: 3, focus: "செய்யுள் & துணைப்பாடம் - இயல் 4-6", topics: ["செயற்கை நுண்ணறிவு & திருக்குறள்", "நீதி வெண்பா & திருவிளையாடற் புராணம்", "பூத்தொடுத்தல் & முத்துக்கুমারசாமி பிள்ளைத் தமிழ்"], activities: ["திருக்குறள் மனப்பாடப் பகுதிகள் பயிற்சி", "துணைப்பாடக் கட்டுரை வரைதல்"] },
          { week: 4, focus: "மாதிரி வினாத்தாள் & அரசுத் தேர்வுப் பயிற்சி", topics: ["பகுதி 1-4 அரசு வினாத்தாள் அமைப்பு", "படைப்பாக்கக் கட்டுரைகள் & கடிதம் எழுதுதல்", "பிழை திருத்தம் & மொழிபெயர்ப்பு"], activities: ["3 மணி நேர முழு மாதிரித் தேர்வு எழுதுதல்", "முந்தைய ஆண்டு வினாத்தாள் பயிற்சி"] }
        ]
      },
      {
        class: "10",
        subject: "Mathematics",
        title: "SSLC Mathematics 100/100 Blueprint Strategy Plan 2026",
        description: "Step-by-step 4-week intensive revision plan targeting 5-mark and 8-mark high-yield board exam questions.",
        teacherName: "R. Ramanujam, M.Sc., M.Ed. (PGT Maths)",
        published: true,
        weeks: [
          { week: 1, focus: "Relations, Functions & Sequences (Algebraic Foundations)", topics: ["Relations and Functions (Exercise 1.1 - 1.5)", "Arithmetic & Geometric Progressions (AP & GP)", "Sum to n terms of AP/GP and Special Series"], activities: ["Solve all 5-mark Theorem proofs & Function mappings", "Practice 10 Previous Year AP/GP Board Questions"] },
          { week: 2, focus: "Algebra & Matrices", topics: ["Simultaneous Linear Equations in 3 variables", "Quadratic Equations, Nature of Roots & Graphs", "Matrix Operations, Multiplication & Transpose"], activities: ["Draw Parabola Graphs for 8-mark questions", "Solve Matrix Multiplication word problems"] },
          { week: 3, focus: "Geometry & Coordinate Geometry", topics: ["Thales Theorem, Angle Bisector & Pythagoras Theorems", "Practical Geometry - Construction of Tangents & Triangles", "Slope of Line & Equation of Straight Lines"], activities: ["Draw Practical Geometry constructions with steps", "Calculate Area of Quadrilateral using vertices"] },
          { week: 4, focus: "Trigonometry, Mensuration & Probability", topics: ["Heights & Distances using Trigonometric Ratios", "Surface Area & Volume of Combined Solids (Cone, Hemisphere, Cylinder)", "Probability & Addition Theorem of Probability"], activities: ["Complete 3 Full Model Mathematics Question Papers", "Memorize all Mensuration formulas & Trigonometric values"] }
        ]
      },
      {
        class: "10",
        subject: "Science",
        title: "SSLC Science Mastery & High-Yield Diagram Plan",
        description: "Covering Physics, Chemistry, and Biology with focus on compulsory numericals and labeled diagrams.",
        teacherName: "S. Meenakshi, M.Sc., B.Ed.",
        published: true,
        weeks: [
          { week: 1, focus: "Physics Units (Motion, Optics & Electricity)", topics: ["Newton's Laws of Motion & Conservation of Momentum", "Refraction of Light, Lenses & Human Eye", "Ohm's Law, Joule's Law of Heating & Electric Circuits"], activities: ["Solve Physics compulsory numerical problems", "Draw Labeled Ray Diagrams for Convex/Concave Lenses"] },
          { week: 2, focus: "Chemistry Units (Atoms, Periodic Table & Reactions)", topics: ["Relative Atomic Mass & Mole Concept", "Modern Periodic Table & Metallurgy of Aluminium/Copper", "Types of Chemical Reactions, pH Scale & Carbon Compounds"], activities: ["Practice balancing chemical equations", "Calculate pH values & Mole conversion problems"] },
          { week: 3, focus: "Biology Units (Plant Anatomy & Human Systems)", topics: ["Plant Anatomy & Physiology (Xylem/Phloem)", "Nervous System, Endocrine Glands & Hormones", "Genetics - Mendel's Laws & DNA Structure"], activities: ["Draw Labeled Diagrams of Neuron, Brain, and Heart", "Write 4-mark answers on Monohybrid/Dihybrid Cross"] },
          { week: 4, focus: "Environmental Management & Revision", topics: ["Renewable Energy Resources & Conservation", "Waste Management & Eco-friendly Practices", "Practical Viva Questions & Model Exam Paper Analysis"], activities: ["Take 2-Hour Science Mock Test", "Revise 1-mark Fill ups & Match the Following"] }
        ]
      },
      {
        class: "10",
        subject: "English",
        title: "SSLC English Board Exam Excellence Plan",
        description: "Grammar, Prose, Poetry appreciation, Supplementary Reader summaries, and Letter writing templates.",
        teacherName: "P. Jennifer, M.A., M.Phil.",
        published: true,
        weeks: [
          { week: 1, focus: "Prose Units 1-3 & Core Grammar", topics: ["His First Flight & The Night the Ghost Got In", "Tenses, Active & Passive Voice", "Direct and Indirect Speech Transformation"], activities: ["Write 5-line answers for Prose questions", "Complete 20 Active/Passive voice transformation drills"] },
          { week: 2, focus: "Poetry Appreciation & Figures of Speech", topics: ["Life, I am Every Woman, The Ant and the Cricket", "Rhyming Scheme, Alliteration & Metaphor Identification", "Paraphrasing Poetic Stanzas"], activities: ["Memorize poem lines for Memory Poem section", "Practice poetic device identification"] },
          { week: 3, focus: "Supplementary Reader & Writing Skills", topics: ["The Tempest, Zigzag & The Story of Mulan", "Notice Writing, Advertisement Design & Picture Comprehension", "Formal Letter Writing (Editor/Headmaster)"], activities: ["Draft an attractive product Advertisement", "Write a 150-word Paragraph on Supplementary characters"] },
          { week: 4, focus: "Full Syllabus Grammar Drills & Mock Test", topics: ["Error Spotting, Road Map Directions & Sentence Rearrangement", "Summary Writing & Note Making Techniques", "Public Exam Time Management"], activities: ["Solve 3 Board Exam Model English Papers", "Self-assess against State Marking Scheme"] }
        ]
      },
      {
        class: "10",
        subject: "Social Science",
        title: "SSLC Social Science Timeline & Map Blueprint Plan",
        description: "Comprehensive guide for History, Geography, Civics, Economics, History Timeline, and Map marking.",
        teacherName: "K. Alagappan, M.A., B.Ed.",
        published: true,
        weeks: [
          { week: 1, focus: "History (Imperialism, World Wars & Freedom Struggle)", topics: ["Outbreak of WWI & WWII Consequences", "Anti-Colonial Movements & Nationalism in India", "Freedom Struggle in Tamil Nadu & Social Reformers"], activities: ["Mark 10 Historical Events on India History Timeline (1900-1950)", "Write 5-mark answers on Veerapandiya Kattabomman & Velu Nachiyar"] },
          { week: 2, focus: "Geography (Physiography, Climate & Agriculture)", topics: ["India - Location, Relief & Drainage Systems", "Climate, Natural Vegetation & Soils of India", "Agriculture, Resources & Industries"], activities: ["Mark Rivers, Mountain Ranges & Ports on India Physical Map", "Practice 2-mark distinction questions (Western vs Eastern Ghats)"] },
          { week: 3, focus: "Civics & Economics", topics: ["Indian Constitution, Fundamental Rights & Duties", "Central & State Executive (President, Governor, Chief Minister)", "Gross Domestic Product (GDP) & Globalization"], activities: ["Memorize Preamble & Key Constitutional Articles", "Explain Green Revolution & Public Distribution System (PDS)"] },
          { week: 4, focus: "Map Marking Drills & Final Board Review", topics: ["India Map & Tamil Nadu Map Intensive Practice", "History Timeline Practice (1910 - 1940)", "5-Mark High-Yield Long Answers Review"], activities: ["Complete 5 Full Map Marking Worksheets", "Write 3-Hour Social Science Board Revision Exam"] }
        ]
      },
      {
        class: "9",
        subject: "Tamil",
        title: "ஒன்பதாம் வகுப்பு தமிழ் ஆண்டுத் தேர்வு தயாரிப்புத் திட்டம்",
        description: "9 ஆம் வகுப்பு தமிழ் பாடநூல் இயல்கள் 1-9 செய்யுள், உரைநடை மற்றும் இலக்கண வழிகாட்டி.",
        teacherName: "முனைவர் க. சுப்பிரமணியன்",
        published: true,
        weeks: [
          { week: 1, focus: "திராவிட மொழிக்குடும்பம் & செய்யுள்", topics: ["திராவிட மொழிக்குடும்பம்", "தமிழோவியம் & தமிழ் விடு தூது", "வளரும் செல்வம்"], activities: ["மனப்பாடப் பாடல்கள் எழுதிப் பார்த்தல்", "உரைநடை வினா விடை பயிற்சி"] },
          { week: 2, focus: "இலக்கணம் & துணைப்பாடம்", topics: ["தொடர் இலக்கணம்", "துணைப்பாடக் கதைகள்", "பகுபத உறுப்பிலக்கணம்"], activities: ["இலக்கணப் பயிற்சிகள் செய்தல்", "பகுபத உறுப்பிலக்கணம் பிரித்து எழுதுதல்"] },
          { week: 3, focus: "இயற்கை & சுற்றுச்சூழல் இயல்கள்", topics: ["நீரின்றி அமையாது உலகு", "பட்டமரம் & பெரியபுராணம்", "புறநானூறு & தண்ணீர் தண்ணீர்"], activities: ["சுற்றுச்சூழல் விழிப்புணர்வுக் கட்டுரை", "செய்யுள் நயம்பாராட்டல்"] },
          { week: 4, focus: "மாதிரித் தேர்வு & கட்டுரைப் பயிற்சி", topics: ["ஆண்டு இறுதி மாதிரி வினாத்தாள்", "கடிதம் & கட்டுரை வரைதல்"], activities: ["மாதிரித் தேர்வு எழுதுதல்"] }
        ]
      },
      {
        class: "9",
        subject: "Mathematics",
        title: "Class 9 Mathematics Exam Foundation Plan",
        description: "Set Language, Real Numbers, Algebra, Coordinate Geometry, and Statistics revision for Class 9.",
        teacherName: "R. Ramanujam, M.Sc.",
        published: true,
        weeks: [
          { week: 1, focus: "Set Language & Real Numbers", topics: ["Types of Sets, Set Operations & Venn Diagrams", "Laws of Exponents & Radicals", "Rational & Irrational Numbers"], activities: ["Draw Venn diagrams for De Morgan's Laws", "Practice Irrational Number proofs"] },
          { week: 2, focus: "Algebra & Polynomials", topics: ["Polynomial Addition, Subtraction & Multiplication", "Algebraic Identities & Factorization", "Synthetic Division & Remainder Theorem"], activities: ["Factorize cubic polynomials using Synthetic Division", "Solve 10 Algebra practice problems"] },
          { week: 3, focus: "Geometry & Coordinate Geometry", topics: ["Properties of Parallelograms & Quadrilaterals", "Distance Formula & Midpoint Formula", "Section Formula & Centroid of Triangle"], activities: ["Find Centroid of Triangle given 3 vertices", "Construct Triangles in Practical Geometry"] },
          { week: 4, focus: "Trigonometry & Statistics", topics: ["Trigonometric Ratios & Complementary Angles", "Mean, Median, Mode for Ungrouped & Grouped Data", "Probability Basics"], activities: ["Calculate Mean/Median for Frequency tables", "Solve 3-Hour Class 9 Mathematics Revision Exam"] }
        ]
      }
    ];

    await SSLCPrepPlan.insertMany(masterPlans);
  } catch (err) {
    console.error("Error seeding master prep plans:", err);
  }
}

export default router;
