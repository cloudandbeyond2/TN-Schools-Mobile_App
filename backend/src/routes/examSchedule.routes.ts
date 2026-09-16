import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, verifyRequestAsync } from '../middleware/auth.middleware';

const router = Router();
router.use((req: Request, res: Response, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return authenticate(req, res, next);
});

// Helper to notify staff, students, and parents when an exam is scheduled
async function notifyExamScheduled(
  schoolId: string,
  cls: string,
  section: string,
  subject: string,
  invigilatorName: string | null,
  examDate: Date,
  startTime: string
) {
  try {
    const formattedDate = examDate.toISOString().split('T')[0];
    const message = `An exam for ${subject} is scheduled on ${formattedDate} at ${startTime}.`;
    
    // 1. Notify Students in the class
    const students = await prisma.student.findMany({
      where: { schoolId, class: cls, section: section !== 'All' ? section : undefined }
    });
    
    const studentUserIds = Array.from(new Set(students.map(s => s.userId).filter((id): id is string => Boolean(id))));
    if (studentUserIds.length > 0) {
      const existingNotifs = await prisma.notification.findMany({
        where: {
          userId: { in: studentUserIds },
          message,
        },
        select: { userId: true },
      });
      const alreadyNotified = new Set(existingNotifs.map(n => n.userId));
      const toNotify = studentUserIds.filter(id => !alreadyNotified.has(id));

      if (toNotify.length > 0) {
        await prisma.notification.createMany({
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
      const parentLinks = await prisma.parentStudentLink.findMany({
        where: { studentId: { in: studentIds } },
        include: { parent: true }
      });
      
      // Dispatch standard user notifications to parents with rich details
      const parentNotifications = parentLinks
        .filter(pl => pl.parent?.userId)
        .map(pl => ({
          userId: pl.parent.userId!,
          studentId: pl.studentId,
          type: 'Exam Schedule',
          title: 'New Exam Scheduled',
          message,
        }));
      
      if (parentNotifications.length > 0) {
        await prisma.notification.createMany({
          data: parentNotifications,
          skipDuplicates: true
        });
      }
    }

    // 3. Notify Invigilator (Staff)
    if (invigilatorName) {
      const invigilatorMsg = `You are assigned as invigilator for ${subject} exam on ${formattedDate} at ${startTime}.`;
      const staffUser = await prisma.user.findFirst({
        where: { schoolId, name: invigilatorName, role: 'TEACHER' }
      });
      let targetUserId = staffUser?.id;
      if (!targetUserId) {
        const headmasterStaff = await prisma.headmasterStaff.findFirst({
          where: { schoolId, name: invigilatorName }
        });
        targetUserId = headmasterStaff?.userId || undefined;
      }
      if (targetUserId) {
        const existing = await prisma.notification.findFirst({
          where: { userId: targetUserId, message: invigilatorMsg }
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              message: invigilatorMsg,
            }
          });
        }
      }
    }
  } catch (err) {
    console.error('[notifyExamScheduled Error]', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exam-schedule
// Query params: schoolId?, class?, section?, examType?, academicYear?,
//               status?, fromDate?, toDate?
// class can be a raw string "Class 11 - B" or a number "11" — matched with contains.
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      req.user = (await verifyRequestAsync(req)) || undefined;
    }
    let { schoolId, class: cls, section, examType, academicYear, status, fromDate, toDate } = req.query;

    if (!schoolId && req.user?.schoolId && req.user?.role !== 'SUPERADMIN') {
      schoolId = req.user.schoolId;
    }

    const andClauses: any[] = [];

    // School ID: resolve UUID and DISE code
    if (schoolId) {
      const schoolStr = String(schoolId);
      try {
        const schoolObj = await prisma.school.findFirst({
          where: { OR: [{ id: schoolStr }, { dise: schoolStr }] },
          select: { id: true, dise: true }
        });
        if (schoolObj) {
          const ids = Array.from(new Set([schoolStr, schoolObj.id, schoolObj.dise].filter(Boolean)));
          andClauses.push({ schoolId: { in: ids } });
        } else {
          andClauses.push({ schoolId: schoolStr });
        }
      } catch {
        andClauses.push({ schoolId: schoolStr });
      }
    }

    // Class: numeric fuzzy match — "11" matches "Class 11 (Commerce)", "11", "Class 11 - B" etc.
    if (cls) {
      const clsStr = String(cls);
      const numericOnly = clsStr.match(/\d+/)?.[0];
      if (numericOnly) {
        andClauses.push({ class: { contains: numericOnly, mode: 'insensitive' } });
      } else {
        andClauses.push({ class: { contains: clsStr, mode: 'insensitive' } });
      }
    }

    // Section: match exact section OR school-wide "All" exams
    if (section && String(section) !== 'All') {
      const secStr = String(section).trim();
      andClauses.push({
        OR: [
          { section: { equals: 'All', mode: 'insensitive' } },
          { section: null },
          { section: { equals: '', mode: 'insensitive' } },
          { section: { equals: secStr, mode: 'insensitive' } },
        ]
      });
    }

    if (examType)     andClauses.push({ examType:     String(examType) });
    if (academicYear) andClauses.push({ academicYear: String(academicYear) });
    if (status)       andClauses.push({ status:       String(status) });

    if (fromDate || toDate) {
      const dateClause: any = {};
      if (fromDate) dateClause.gte = new Date(String(fromDate));
      if (toDate)   dateClause.lte = new Date(String(toDate));
      andClauses.push({ examDate: dateClause });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

    const schedules = await prisma.examSchedule.findMany({
      where,
      orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
    });

    return res.json({ success: true, count: schedules.length, data: schedules });
  } catch (err) {
    console.error('[ExamSchedule GET /]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exam-schedule/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schedule = await prisma.examSchedule.findUnique({ where: { id } });

    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Exam schedule not found' });
    }

    return res.json({ success: true, data: schedule });
  } catch (err) {
    console.error('[ExamSchedule GET /:id]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exam-schedule
// Create a single exam schedule entry
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      schoolId, title, examType, class: cls, section, subject,
      examDate, startTime, endTime, maxMarks, passMark,
      venue, invigilator, academicYear, status, notes,
      examMode, theoryMaxMarks, practicalMaxMarks, published,
    } = req.body;

    // Validate required fields
    if (!schoolId || !title || !examType || !cls || !subject || !examDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: schoolId, title, examType, class, subject, examDate, startTime, endTime',
      });
    }

    const schedule = await prisma.examSchedule.create({
      data: {
        schoolId,
        title:        String(title),
        examType:     String(examType),
        class:        String(cls),
        section:      section ? String(section) : 'All',
        subject:      String(subject),
        examDate:     new Date(examDate),
        startTime:    String(startTime),
        endTime:      String(endTime),
        maxMarks:     maxMarks  !== undefined ? Number(maxMarks)  : 100,
        passMark:     passMark  !== undefined ? Number(passMark)  : 35,
        venue:        venue       ? String(venue)       : 'Classroom',
        invigilator:  invigilator ? String(invigilator) : null,
        academicYear: academicYear ? String(academicYear) : '2024-25',
        status:       status ? String(status) : 'Scheduled',
        notes:        notes ? String(notes) : null,
        examMode:     examMode ? String(examMode) : 'Theory',
        theoryMaxMarks: theoryMaxMarks !== undefined ? Number(theoryMaxMarks) : 100,
        practicalMaxMarks: practicalMaxMarks !== undefined ? Number(practicalMaxMarks) : 0,
        published:    published !== undefined ? Boolean(published) : false,
      },
    });

    // Notify users
    await notifyExamScheduled(
      schoolId,
      String(cls),
      section ? String(section) : 'All',
      String(subject),
      invigilator ? String(invigilator) : null,
      new Date(examDate),
      String(startTime)
    );

    return res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    console.error('[ExamSchedule POST /]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exam-schedule/bulk
// Bulk-create multiple exam schedule entries at once
// Body: { schedules: ExamSchedule[] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { schedules } = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide a non-empty schedules array' });
    }

    const data = schedules.map((s: any) => ({
      schoolId:     String(s.schoolId),
      title:        String(s.title),
      examType:     String(s.examType),
      class:        String(s.class),
      section:      s.section ? String(s.section) : 'All',
      subject:      String(s.subject),
      examDate:     new Date(s.examDate),
      startTime:    String(s.startTime),
      endTime:      String(s.endTime),
      maxMarks:     s.maxMarks  !== undefined ? Number(s.maxMarks)  : 100,
      passMark:     s.passMark  !== undefined ? Number(s.passMark)  : 35,
      venue:        s.venue       ? String(s.venue)       : 'Classroom',
      invigilator:  s.invigilator ? String(s.invigilator) : null,
      academicYear: s.academicYear ? String(s.academicYear) : '2024-25',
      status:       s.status ? String(s.status) : 'Scheduled',
      notes:        s.notes ? String(s.notes) : null,
      examMode:     s.examMode ? String(s.examMode) : 'Theory',
      theoryMaxMarks: s.theoryMaxMarks !== undefined ? Number(s.theoryMaxMarks) : 100,
      practicalMaxMarks: s.practicalMaxMarks !== undefined ? Number(s.practicalMaxMarks) : 0,
      published:    s.published !== undefined ? Boolean(s.published) : false,
    }));

    const result = await prisma.examSchedule.createMany({ data, skipDuplicates: true });

    // Notify users for all scheduled exams
    for (const s of data) {
      await notifyExamScheduled(
        s.schoolId,
        s.class,
        s.section,
        s.subject,
        s.invigilator,
        s.examDate,
        s.startTime
      );
    }

    return res.status(201).json({ success: true, created: result.count });
  } catch (err) {
    console.error('[ExamSchedule POST /bulk]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/exam-schedule/:id
// Update any fields of an existing exam schedule
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title, examType, class: cls, section, subject,
      examDate, startTime, endTime, maxMarks, passMark,
      venue, invigilator, academicYear, status, notes,
      examMode, theoryMaxMarks, practicalMaxMarks, published,
    } = req.body;

    const existing = await prisma.examSchedule.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Exam schedule not found' });
    }

    const updated = await prisma.examSchedule.update({
      where: { id },
      data: {
        ...(title        !== undefined && { title:        String(title) }),
        ...(examType     !== undefined && { examType:     String(examType) }),
        ...(cls          !== undefined && { class:        String(cls) }),
        ...(section      !== undefined && { section:      String(section) }),
        ...(subject      !== undefined && { subject:      String(subject) }),
        ...(examDate     !== undefined && { examDate:     new Date(examDate) }),
        ...(startTime    !== undefined && { startTime:    String(startTime) }),
        ...(endTime      !== undefined && { endTime:      String(endTime) }),
        ...(maxMarks     !== undefined && { maxMarks:     Number(maxMarks) }),
        ...(passMark     !== undefined && { passMark:     Number(passMark) }),
        ...(venue        !== undefined && { venue:        String(venue) }),
        ...(invigilator  !== undefined && { invigilator:  invigilator ? String(invigilator) : null }),
        ...(academicYear !== undefined && { academicYear: String(academicYear) }),
        ...(status       !== undefined && { status:       String(status) }),
        ...(notes        !== undefined && { notes:        notes ? String(notes) : null }),
        ...(examMode     !== undefined && { examMode:     String(examMode) }),
        ...(theoryMaxMarks !== undefined && { theoryMaxMarks: Number(theoryMaxMarks) }),
        ...(practicalMaxMarks !== undefined && { practicalMaxMarks: Number(practicalMaxMarks) }),
        ...(published    !== undefined && { published:    Boolean(published) }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[ExamSchedule PUT /:id]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/exam-schedule/:id/status
// Quick status update: Scheduled | Completed | Postponed | Cancelled
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', async (req: Request, res: Response) => {
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

    const updated = await prisma.examSchedule.update({
      where: { id },
      data: { status: String(status) },
    });

    if (String(status) === 'Completed') {
      try {
        const clsClean = String(updated.class).replace(/class\s*/i, '').split(' ')[0].trim();
        const existingModel = await prisma.modelExam.findFirst({
          where: {
            schoolId: updated.schoolId,
            class: clsClean,
            examName: updated.title,
          },
        });

        if (!existingModel) {
          await prisma.modelExam.create({
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
      } catch (syncErr) {
        console.warn('Sync on status update failed:', syncErr);
      }
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[ExamSchedule PATCH /:id/status]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/exam-schedule/:id
// Delete a single exam schedule entry
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.examSchedule.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Exam schedule not found' });
    }

    await prisma.examSchedule.delete({ where: { id } });

    return res.json({ success: true, message: 'Exam schedule deleted successfully' });
  } catch (err) {
    console.error('[ExamSchedule DELETE /:id]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/exam-schedule
// Bulk-delete by schoolId + examType + academicYear
// Body: { schoolId, examType?, academicYear? }
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { schoolId, examType, academicYear } = req.body;

    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    const where: any = { schoolId: String(schoolId) };
    if (examType)     where.examType     = String(examType);
    if (academicYear) where.academicYear = String(academicYear);

    const result = await prisma.examSchedule.deleteMany({ where });

    return res.json({ success: true, deleted: result.count });
  } catch (err) {
    console.error('[ExamSchedule DELETE /]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
