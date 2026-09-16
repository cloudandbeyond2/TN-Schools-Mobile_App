import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  HSC_GROUPS,
  STREAM_LABELS,
  StreamCategory,
  getGroup,
  groupSubjectsWithEquivalents,
} from '../constants/hscGroups';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Stream affinity for exams open to all groups (sorts them toward
// "recommended" for students of the matching stream).
const EXAM_STREAM_AFFINITY: Array<{ match: RegExp; streams: StreamCategory[] }> = [
  { match: /ipmat|integrated programme in management/i, streams: ['COMMERCE'] },
  { match: /clat|ailet|law/i, streams: ['ARTS', 'COMMERCE'] },
];

// ─── GET /api/competitive-exams?schoolId=&teacherId=&targetClass=&category=&status= ──────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { schoolId, teacherId, targetClass, class: classParam, category, status, search } = req.query;

    const filterClass = targetClass || classParam;
    const whereConditions: any[] = [];

    if (teacherId) {
      whereConditions.push({ teacherId: String(teacherId) });
      if (schoolId) {
        whereConditions.push({ schoolId: String(schoolId) });
      }
    } else if (schoolId) {
      whereConditions.push({
        OR: [
          { schoolId: String(schoolId) },
          { schoolId: null },
        ],
      });
    }

    if (filterClass && String(filterClass) !== 'All') {
      const clsStr = String(filterClass).replace(/^(class\s*)/i, '').trim();
      whereConditions.push({
        OR: [
          { targetClass: null },
          { targetClass: 'All' },
          { targetClass: { contains: clsStr, mode: 'insensitive' } },
        ],
      });
    }

    if (category) whereConditions.push({ category: String(category) });
    if (status) whereConditions.push({ status: String(status) });
    if (search) {
      whereConditions.push({
        OR: [
          { examName:    { contains: String(search), mode: 'insensitive' } },
          { conductedBy: { contains: String(search), mode: 'insensitive' } },
          { eligibility: { contains: String(search), mode: 'insensitive' } },
        ],
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const data = await prisma.competitiveExam.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data, count: data.length });
  } catch (err: any) {
    console.error('[GET /api/competitive-exams]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch exams' });
  }
});

// ─── GET /api/competitive-exams/groups?streamCategory= ───────────
// TN HSC group master data (DGE Annexure I). Registered before /:id.
router.get('/groups', async (req: Request, res: Response) => {
  try {
    const { streamCategory } = req.query;
    const data = streamCategory
      ? HSC_GROUPS.filter((g) => g.streamCategory === String(streamCategory))
      : HSC_GROUPS;
    return res.json({ success: true, data, streamLabels: STREAM_LABELS });
  } catch (err: any) {
    console.error('[GET /api/competitive-exams/groups]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
});

// ─── GET /api/competitive-exams/recommendations?group=2503&class=12
// Splits the exam catalog into "recommended for this HSC group" and
// "others", each with a human-readable reason.
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const groupCode = req.query.group ? String(req.query.group) : '';
    const group = getGroup(groupCode);
    const { schoolId, class: classParam, targetClass } = req.query;
    const filterClass = targetClass || classParam;

    const whereConditions: any[] = [];
    if (schoolId) {
      whereConditions.push({
        OR: [{ schoolId: String(schoolId) }, { schoolId: null }],
      });
    }
    if (filterClass && String(filterClass) !== 'All') {
      const clsStr = String(filterClass).replace(/^(class\s*)/i, '').trim();
      whereConditions.push({
        OR: [
          { targetClass: null },
          { targetClass: 'All' },
          { targetClass: { contains: clsStr, mode: 'insensitive' } },
        ],
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const exams = await prisma.competitiveExam.findMany({
      where,
      orderBy: [{ examDate: 'asc' }, { examName: 'asc' }],
    });

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

    const subjects = groupSubjectsWithEquivalents(group);
    const recommended: any[] = [];
    const others: any[] = [];

    for (const exam of exams) {
      const applicableGroups: string[] = (exam as any).applicableGroups || [];
      const requiredSubjects: string[] = (exam as any).requiredSubjects || [];
      const affinity = EXAM_STREAM_AFFINITY.find((a) => a.match.test(exam.examName));

      if (applicableGroups.length > 0) {
        if (applicableGroups.includes(group.code)) {
          recommended.push({
            exam,
            reason: requiredSubjects.length
              ? `Your group includes ${requiredSubjects.join(', ')} — you meet the subject requirement`
              : `Group ${group.code} is eligible for this exam`,
          });
        } else {
          others.push({ exam, reason: `Not open to group ${group.code} (${requiredSubjects.length ? `requires ${requiredSubjects.join(', ')}` : 'restricted group list'})` });
        }
      } else if (requiredSubjects.length > 0) {
        const missing = requiredSubjects.filter((s) => !subjects.has(s));
        if (missing.length === 0) {
          recommended.push({ exam, reason: `Your group includes ${requiredSubjects.join(', ')} — you meet the subject requirement` });
        } else {
          others.push({ exam, reason: `Requires ${missing.join(', ')}, which is not in your group` });
        }
      } else if (affinity && affinity.streams.includes(group.streamCategory)) {
        recommended.push({ exam, reason: `Well suited for ${STREAM_LABELS[group.streamCategory]} students` });
      } else {
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
          streamLabel: STREAM_LABELS[group.streamCategory],
        },
        groupNotSet: false,
        recommended,
        others,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/competitive-exams/recommendations]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to compute recommendations' });
  }
});

// ─── GET /api/competitive-exams/:id ──────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.competitiveExam.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Exam not found' });
    return res.json({ success: true, data: item });
  } catch (err: any) {
    console.error('[GET /api/competitive-exams/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch exam' });
  }
});

// ─── POST /api/competitive-exams ─────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      examName, category, conductedBy, registrationDeadline, examDate,
      status, eligibility, website, studentsEnrolled, studentsCleared,
      schoolId, teacherId, targetClass, class: classParam, syllabus
    } = req.body;

    if (!examName || !category || !conductedBy || !registrationDeadline || !examDate) {
      return res.status(400).json({
        success: false,
        error: 'examName, category, conductedBy, registrationDeadline, and examDate are required',
      });
    }

    const created = await prisma.competitiveExam.create({
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
        targetClass: targetClass || classParam || 'All',
        syllabus: syllabus || null
      }
    });

    return res.status(201).json({
      success: true,
      data: created,
      message: `"${examName}" added to Competitive Exams`,
    });
  } catch (err: any) {
    console.error('[POST /api/competitive-exams]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create exam' });
  }
});

// ─── PUT /api/competitive-exams/:id ──────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.competitiveExam.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Exam not found' });

    const {
      examName, category, conductedBy, registrationDeadline, examDate,
      status, eligibility, website, studentsEnrolled, studentsCleared, syllabus,
      schoolId, teacherId, targetClass, class: classParam
    } = req.body;

    // Handle NEET Prep alignment if this is a NEET exam
    const isNeet = existing.examName.toLowerCase().includes('neet') || (examName && examName.toLowerCase().includes('neet'));
    
    if (isNeet && syllabus !== undefined) {
      try {
        const oldSyllabus = (existing.syllabus as any) || [];
        const newSyllabus = (syllabus as any) || [];

        // Flatten chapters for easier lookup: map id -> { subject, name }
        const oldChaptersMap = new Map<string, { subject: string; name: string }>();
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

        const newChaptersMap = new Map<string, { subject: string; name: string }>();
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
            await prisma.nEETChapter.deleteMany({
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
            await prisma.nEETChapter.updateMany({
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
      } catch (syncErr: any) {
        console.error('[NEET Syllabus Sync Error]', syncErr.message);
      }
    }

    const updated = await prisma.competitiveExam.update({
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
        schoolId: schoolId !== undefined ? schoolId : undefined,
        teacherId: teacherId !== undefined ? teacherId : undefined,
        targetClass: (targetClass || classParam) !== undefined ? (targetClass || classParam) : undefined,
        syllabus: syllabus !== undefined ? syllabus : undefined
      }
    });

    return res.json({ success: true, data: updated, message: `"${existing.examName}" updated` });
  } catch (err: any) {
    console.error('[PUT /api/competitive-exams/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update exam' });
  }
});

// ─── DELETE /api/competitive-exams/:id ───────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.competitiveExam.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Exam not found' });

    await prisma.competitiveExam.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: `"${existing.examName}" deleted` });
  } catch (err: any) {
    console.error('[DELETE /api/competitive-exams/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete exam' });
  }
});

// ─── POST /api/competitive-exams/upload-syllabus-pdf ──────────────
router.post('/upload-syllabus-pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    let uploadsDir = path.join(__dirname, '../../uploads');
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    } catch {
      uploadsDir = path.join(os.tmpdir(), 'uploads');
      try {
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      } catch {}
    }

    const fileExt = path.extname(req.file.originalname) || '.pdf';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);

    return res.json({
      success: true,
      url: `/uploads/${fileName}`,
      name: req.file.originalname
    });
  } catch (err: any) {
    console.error('[POST /api/competitive-exams/upload-syllabus-pdf]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to upload syllabus PDF' });
  }
});

export default router;
