import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { resolveUserId } from '../config/userResolver';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { getGeminiApiKey } from '../services/aiConfig.service';
import { sendMockSMS, getStudentParents } from '../utils/sms';
import multer from 'multer';
import { UPLOAD_LIMITS, documentFileFilter } from '../utils/uploads';
import { uploadBuffer } from '../services/storage.service';

import { authenticate } from '../middleware/auth.middleware';

const upload = multer({ storage: multer.memoryStorage(), limits: UPLOAD_LIMITS, fileFilter: documentFileFilter });

const router = Router();
router.use(authenticate);

async function createSafeNotification(userId: string, message: string) {
  try {
    const resolvedId = await resolveUserId(userId);
    if (!resolvedId) {
      console.warn(`[createSafeNotification] Could not resolve userId ${userId} to a PostgreSQL User. Skipping notification.`);
      return;
    }
    await prisma.notification.create({
      data: {
        userId: resolvedId,
        message,
      }
    });
  } catch (err) {
    console.error(`[createSafeNotification] Failed to create notification for user ${userId}:`, err);
  }
}

async function dispatchSchoolPressNotification(studentId: string, description: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { name: true } } }
    });
    const studentName = student?.user?.name || "your child";

    const links = await prisma.parentStudentLink.findMany({
      where: { studentId },
      include: { parent: true }
    });

    for (const link of links) {
      if (link.parent?.userId) {
        await prisma.notification.create({
          data: {
            userId: link.parent.userId,
            studentId: studentId,
            type: 'general',
            title: 'School Press Activity Published',
            message: `${studentName} has a new activity published in School Press: "${description}"`,
          }
        });
      }
    }
  } catch (err) {
    console.error('Error dispatching school press parent notification:', err);
  }
}



// =========================================================================
// 1. Study Materials
// =========================================================================

// GET /api/teacher/subjects/:userId
router.get('/subjects/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const teacher = await prisma.teacher.findUnique({
      where: { userId }
    });
    
    if (!teacher) {
      // Fallback: If no teacher record found, just return an empty array or defaults
      return res.json({ success: true, data: [] });
    }
    
    res.json({ success: true, data: teacher.subjects || [] });
  } catch (err: any) {
    console.error('Error fetching teacher subjects:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/teacher/materials
router.get('/materials', async (req: Request, res: Response) => {
  try {
    const { schoolId, category } = req.query;
    const materials = await prisma.studyMaterial.findMany({
      where: {
        ...(schoolId ? { schoolId: String(schoolId) } : {}),
        ...(category && category !== 'All' ? { category: String(category) } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: materials });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/materials
router.post('/materials', async (req: Request, res: Response) => {
  try {
    const { title, category, classSection, format, size, schoolId, userId, fileData } = req.body;
    if (!title || !category || !classSection) {
      return res.status(400).json({ success: false, error: 'title, category, and classSection are required' });
    }
    const material = await prisma.studyMaterial.create({
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
      await createSafeNotification(userId, `Uploaded new study material "${title}" for ${classSection}`);
    }
    res.status(201).json({ success: true, data: material });
  } catch (err) {
    console.error('Error in POST /materials:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/teacher/materials/download/:id
router.get('/materials/download/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const material = await prisma.studyMaterial.findUnique({ where: { id } });
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
    } else {
      // Fallback to local disk file for backwards compatibility
      const filePath = path.join(__dirname, '../../store', `${material.id}.${material.format.toLowerCase()}`);
      if (fs.existsSync(filePath)) {
        return res.download(filePath, `${material.title}.${material.format.toLowerCase()}`);
      }
      return res.status(404).json({ success: false, error: 'File content not found in database or disk' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/teacher/materials/:id
router.delete('/materials/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const material = await prisma.studyMaterial.findUnique({ where: { id } });
    if (material) {
      // Clean up local disk file if it exists (for backwards compatibility)
      const filePath = path.join(__dirname, '../../store', `${material.id}.${material.format.toLowerCase()}`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error(`Failed to delete file on disk for material ${id}:`, unlinkErr);
        }
      }
    }
    await prisma.studyMaterial.delete({ where: { id } });
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/teacher/list — Fetch staff from HeadmasterStaff table for dropdowns
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;

    const staff = await prisma.headmasterStaff.findMany({
      where: schoolId ? { schoolId: String(schoolId) } : { id: 'none' },
      select: { id: true, name: true, subject: true },
      orderBy: { name: 'asc' },
    });

    const mapped = staff.map(s => ({
      id: s.id,
      name: `${s.name} (${s.subject})`,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 2. Announcements
// =========================================================================

// GET /api/teacher/announcements
router.get('/announcements', async (req: Request, res: Response) => {
  try {
    const { schoolId, pinned } = req.query;
    const announcements = await prisma.announcement.findMany({
      where: {
        ...(schoolId ? { schoolId: String(schoolId) } : {}),
        ...(pinned !== undefined ? { pinned: pinned === 'true' } : {}),
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/announcements
router.post('/announcements', async (req: Request, res: Response) => {
  try {
    const { title, body, target, sender, pinned, schoolId, userId, sendSMS } = req.body;
    if (!title || !body || !target) {
      return res.status(400).json({ success: false, error: 'title, body, and target are required' });
    }
    const announcement = await prisma.announcement.create({
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
      await createSafeNotification(userId, `Posted new announcement: "${title}"`);
    }

    // SMS notice broadcasting to parents if checked
    if (sendSMS) {
      try {
        let studentsList: any[] = [];
        const classMatch = target.match(/^Class\s+(\d+)([a-zA-Z]+)\s+Parents$/i);

        if (classMatch) {
          const clsName = classMatch[1];
          const secLetter = classMatch[2].toUpperCase();
          studentsList = await prisma.student.findMany({
            where: {
              schoolId: schoolId || undefined,
              class: clsName,
              section: secLetter,
            }
          });
        } else if (target === 'All Parents taught by me' && userId) {
          const teacher = await prisma.teacher.findUnique({
            where: { userId },
          });
          const classrooms = await prisma.classRoom.findMany({
            where: {
              schoolId: schoolId || undefined,
              teacherId: teacher?.id || userId,
            }
          });

          if (classrooms.length > 0) {
            studentsList = await prisma.student.findMany({
              where: {
                schoolId: schoolId || undefined,
                OR: classrooms.map(c => ({
                  class: c.className,
                  section: c.section,
                }))
              }
            });
          } else {
            studentsList = await prisma.student.findMany({
              where: { schoolId: schoolId || undefined }
            });
          }
        } else {
          studentsList = await prisma.student.findMany({
            where: { schoolId: schoolId || undefined }
          });
        }

        const smsMessage = `Notice: ${title} - ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`;
        const processedPhones = new Set<string>();

        for (const student of studentsList) {
          const parents = await getStudentParents(student.id);
          for (const parent of parents) {
            if (parent.phone && !processedPhones.has(parent.phone)) {
              processedPhones.add(parent.phone);
              // 1. Deliver mock SMS
              await sendMockSMS(parent.phone, smsMessage);

              // 2. Add DB notification record
              if (parent.userId) {
                await prisma.notification.create({
                  data: {
                    userId: parent.userId,
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
      } catch (smsErr) {
        console.error('Error dispatching notice SMS:', smsErr);
      }
    }

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/teacher/announcements/:id
router.delete('/announcements/:id', async (req: Request, res: Response) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 3. Homework & Submissions
// =========================================================================

// GET /api/teacher/homework
router.get('/homework', async (req: Request, res: Response) => {
  try {
    const { schoolId, status } = req.query;
    const homeworkList = await prisma.homework.findMany({
      where: {
        ...(schoolId ? { schoolId: String(schoolId) } : {}),
        ...(status ? { status: String(status) } : {}),
      },
      include: {
        submissions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: homeworkList });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/homework
router.post('/homework', async (req: Request, res: Response) => {
  try {
    const { title, className, dueDate, status, description, schoolId, userId } = req.body;
    if (!title || !className || !dueDate) {
      return res.status(400).json({ success: false, error: 'title, className, and dueDate are required' });
    }

    const homework = await prisma.homework.create({
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
      await createSafeNotification(userId, `Assigned new homework "${title}" for ${className}`);
    }

    // Automatically seed submissions for all students in the class
    // We parse class number from className, e.g. "10A - Mathematics" -> class "10", section "A"
    const classMatch = className.match(/(\d+)\s*([A-Za-z])/);
    if (classMatch && schoolId) {
      const clsNum = classMatch[1];
      const secLetter = classMatch[2].toUpperCase();

      const students = await prisma.student.findMany({
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

        await prisma.homeworkSubmission.createMany({
          data: subRecords,
        });

        // Send notifications to each student and their parents
        for (const s of students) {
          if (s.userId) {
            await createSafeNotification(s.userId, `New Homework: "${title}" has been assigned for your class. Due Date: ${dueDate}`);
          }

          try {
            const parents = await getStudentParents(s.id);
            for (const parent of parents) {
              if (parent.userId) {
                await prisma.notification.create({
                  data: {
                    userId: parent.userId,
                    studentId: s.id,
                    type: 'HOMEWORK_ALERT',
                    title: 'New Homework Assigned',
                    message: `New homework "${title}" has been assigned to your child ${s.user.name}. Due Date: ${dueDate}`,
                  },
                });
              }
            }
          } catch (parentErr) {
            console.error(`Error notifying parents for student ${s.id}:`, parentErr);
          }
        }
      }
    }

    const updatedHw = await prisma.homework.findUnique({
      where: { id: homework.id },
      include: { submissions: true },
    });

    res.status(201).json({ success: true, data: updatedHw });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/teacher/homework/:id/submissions
router.get('/homework/:id/submissions', async (req: Request, res: Response) => {
  try {
    const submissions = await prisma.homeworkSubmission.findMany({
      where: { homeworkId: req.params.id },
      orderBy: { rollNo: 'asc' },
    });
    res.json({ success: true, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/teacher/homework/submissions/:subId
router.put('/homework/submissions/:subId', async (req: Request, res: Response) => {
  try {
    const { score, status, feedback } = req.body;
    const existing = await prisma.homeworkSubmission.findUnique({ where: { id: req.params.subId } });
    
    // Preserve existing date if already set, otherwise record timestamp when graded/submitted
    const currentDate = 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const finalDate = (existing?.date && existing.date !== '—') ? existing.date : currentDate;

    const submission = await prisma.homeworkSubmission.update({
      where: { id: req.params.subId },
      data: {
        score,
        status: status || 'graded',
        feedback,
        date: finalDate,
      },
    });
    res.json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/teacher/homework/:id
router.delete('/homework/:id', async (req: Request, res: Response) => {
  try {
    await prisma.homework.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Homework deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 4. AI Evaluations
// =========================================================================

// GET /api/teacher/evaluations
router.get('/evaluations', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    const evaluations = await prisma.evaluationSubmission.findMany({
      where: schoolId ? { schoolId: String(schoolId) } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: evaluations });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/teacher/evaluations/:id
router.put('/evaluations/:id', async (req: Request, res: Response) => {
  try {
    const { score, status, ocrContent } = req.body;
    const updated = await prisma.evaluationSubmission.update({
      where: { id: req.params.id },
      data: {
        score,
        status,
        ocrContent: ocrContent || undefined,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 5. Science Labs Manager
// =========================================================================

// GET /api/teacher/labs
router.get('/labs', async (req: Request, res: Response) => {
  try {
    const { schoolId, gradeLevel, section } = req.query;

    const andConditions: any[] = [];

    // Filter by school if provided (teacher view or same-school student)
    if (schoolId) {
      andConditions.push({ schoolId: String(schoolId) });
    }

    if (gradeLevel) {
      if (schoolId) {
        // Same-school query: include null-gradeLevel (school-specific items) + exact class match
        andConditions.push({
          OR: [
            { gradeLevel: null },
            { gradeLevel: '' },
            { gradeLevel: { equals: String(gradeLevel), mode: 'insensitive' } },
          ],
        });
      } else {
        // Cross-school query (student at different school): ONLY exact gradeLevel match
        // Do NOT include null-gradeLevel to prevent junk from other schools leaking in
        andConditions.push({
          gradeLevel: { equals: String(gradeLevel), mode: 'insensitive' },
        });
      }
    }

    if (section) {
      andConditions.push({
        OR: [
          { classSection: { contains: String(section), mode: 'insensitive' } },
          { section: { contains: String(section), mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const labs = await prisma.labEquipment.findMany({
      where: andConditions.length === 1 ? andConditions[0] : { AND: andConditions },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: labs });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/teacher/labs/:id
router.get('/labs/:id', async (req: Request, res: Response) => {
  try {
    const lab = await prisma.labEquipment.findUnique({
      where: { id: req.params.id },
    });
    if (!lab) {
      return res.status(404).json({ success: false, error: 'Lab item not found' });
    }
    res.json({ success: true, data: lab });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/labs/generate-content
router.post('/labs/generate-content', async (req: Request, res: Response) => {
  const { name, gradeLevel } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Experiment name is required' });
  }

  const prompt = `
You are an expert Chemistry Teacher for Tamil Nadu State Board (higher secondary curriculum).
Generate the detailed laboratory practical guidelines and structured content for a chemistry experiment.

Experiment Name: ${name}
Grade Level: ${gradeLevel || 'Class 11 / Class 12'}

Also identify:
- chapter: The Tamil Nadu State Board Chemistry chapter name this experiment belongs to (e.g., "Volumetric Analysis", "Chemical Equilibrium", "Electrochemistry", "Organic Chemistry", etc.)
- category: The best matching category from this list only: "Volumetric Analysis", "Qualitative Analysis", "Organic Compound Analysis", "Inorganic Compound Analysis", "Preparation of Compounds", "Chemical Reactions", "Identification Tests", "Other"

Your output MUST be structured JSON matching the requested schema. Provide clear, accurate, and easy-to-understand content tailored for government school students.
  `;

  const EXPERIMENT_GEN_SCHEMA = {
    type: 'OBJECT',
    properties: {
      chapter: { type: 'STRING' },
      category: { type: 'STRING' },
      aim: { type: 'STRING' },
      theory: { type: 'STRING' },
      apparatus: { type: 'ARRAY', items: { type: 'STRING' } },
      chemicals: { type: 'ARRAY', items: { type: 'STRING' } },
      procedure: { type: 'ARRAY', items: { type: 'STRING' } },
      observation: { type: 'STRING' },
      calculation: { type: 'STRING' },
      result: { type: 'STRING' },
      safetyPrecautions: { type: 'STRING' }
    },
    required: ['chapter', 'category', 'aim', 'theory', 'apparatus', 'chemicals', 'procedure', 'observation', 'calculation', 'result', 'safetyPrecautions']
  };

  try {
    const { callGemini } = require('./ai.routes');
    const data = await callGemini(prompt, true, EXPERIMENT_GEN_SCHEMA);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error generating experiment content:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/teacher/labs/upload
router.post('/labs/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const uploaded = await uploadBuffer({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: 'chemistry-lab',
    });
    res.json({ success: true, url: uploaded.url });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/teacher/labs
router.post('/labs', async (req: Request, res: Response) => {
  try {
    const {
      name,
      classSection,
      status,
      date,
      safetyCheck,
      schoolId,
      userId,
      classRoomId,
      location,
      count,
      subject,
      gradeLevel,
      section,
      chapter,
      category,
      aim,
      theory,
      apparatus,
      chemicals,
      procedure,
      observation,
      calculation,
      result,
      safetyPrecautions,
      imageUrl
    } = req.body;

    const lab = await prisma.labEquipment.create({
      data: {
        name,
        classSection: classSection || '',
        status: status || 'scheduled',
        date: date || '',
        safetyCheck: safetyCheck !== undefined ? !!safetyCheck : true,
        schoolId: schoolId || null,
        classRoomId: classRoomId || null,
        location: location || 'N/A',
        count: count !== undefined ? Number(count) : 1,
        // Practicals fields
        subject: subject || 'Chemistry',
        gradeLevel: gradeLevel || null,
        section: section || null,
        chapter: chapter || null,
        category: category || null,
        aim: aim || null,
        theory: theory || null,
        apparatus: apparatus || null,
        chemicals: chemicals || null,
        procedure: procedure || null,
        observation: observation || null,
        calculation: calculation || null,
        result: result || null,
        safetyPrecautions: safetyPrecautions || null,
        imageUrl: imageUrl || null
      },
    });
    if (userId) {
      await createSafeNotification(userId, `Scheduled new science lab "${name}" for ${classSection}`);
    }
    res.status(201).json({ success: true, data: lab });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/teacher/labs/:id
router.put('/labs/:id', async (req: Request, res: Response) => {
  try {
    const lab = await prisma.labEquipment.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: lab });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/teacher/labs/:id
router.delete('/labs/:id', async (req: Request, res: Response) => {
  try {
    await prisma.labEquipment.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Lab equipment deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 6. Leave Requests
// =========================================================================

// GET /api/teacher/leave
router.get('/leave', async (req: Request, res: Response) => {
  try {
    const { schoolId, userId } = req.query;
    
    let staffIdFilter: any = undefined;
    if (userId) {
      const staff = await prisma.headmasterStaff.findFirst({
        where: { userId: String(userId) }
      });
      if (staff) {
        staffIdFilter = staff.id;
      } else {
        staffIdFilter = String(userId);
      }
    }

    
const leaves = await prisma.leaveRequest.findMany({
      where: {
        ...(schoolId ? { schoolId: String(schoolId) } : {}),
        ...(userId ? {
          OR: [
            ...(staffIdFilter ? [{ staffId: staffIdFilter }] : []),
            { studentId: { not: null } }
          ]
        } : {})
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: leaves });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/leave
router.post('/leave', async (req: Request, res: Response) => {
  try {

    const { type, duration, reason, studentName, studentId, schoolId, userId, staffId } = req.body;

    let finalStudentName = studentName || 'Unknown';
    if (studentId && !studentName) {
      const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: true } });
      if (student && student.user) {
        finalStudentName = student.user.name || 'Unknown';
      }
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        type,
        duration,
        reason,
        studentName: finalStudentName,
        studentId: studentId || null,
        staffId: staffId || null,  // Audit: who submitted the leave
        status: 'Pending',
        schoolId: schoolId || null,
      } as any,
    });
    if (userId) {
      await createSafeNotification(userId, `Submitted leave request (${type}) for ${duration}`);
    }
    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 7. AI Lesson Planner
// =========================================================================

// GET /api/teacher/lessons
router.get('/lessons', async (req: Request, res: Response) => {
  try {
    const { schoolId, subject, grade } = req.query;
    const lessons = await prisma.lessonPlan.findMany({
      where: {
        ...(schoolId ? { schoolId: String(schoolId) } : {}),
        ...(subject ? { subject: { equals: String(subject), mode: 'insensitive' } } : {}),
        ...(grade ? { grade: { equals: String(grade), mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: lessons });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/teacher/lessons/:id
router.get('/lessons/:id', async (req: Request, res: Response) => {
  try {
    const lesson = await prisma.lessonPlan.findUnique({
      where: { id: req.params.id },
    });
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Lesson plan not found' });
    }
    res.json({ success: true, data: lesson });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/lessons
router.post('/lessons', async (req: Request, res: Response) => {
  try {
    const { syllabus, grade, subject, topic, duration, planData, schoolId, userId, section } = req.body;
    const lesson = await prisma.lessonPlan.create({
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
      await createSafeNotification(userId, `Generated AI Lesson Plan for "${topic}" (Grade ${grade})`);
    }
    res.status(201).json({ success: true, data: lesson });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/teacher/lessons/:id
router.put('/lessons/:id', async (req: Request, res: Response) => {
  try {
    const { syllabus, grade, subject, topic, duration, planData } = req.body;
    const lesson = await prisma.lessonPlan.update({
      where: { id: req.params.id },
      data: {
        ...(syllabus !== undefined ? { syllabus } : {}),
        ...(grade !== undefined ? { grade } : {}),
        ...(subject !== undefined ? { subject } : {}),
        ...(topic !== undefined ? { topic } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(planData !== undefined ? { planData } : {}),
      },
    });
    res.json({ success: true, data: lesson });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/teacher/lessons/:id
router.delete('/lessons/:id', async (req: Request, res: Response) => {
  try {
    await prisma.lessonPlan.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Lesson plan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/teacher/lessons/:id/publish — publish/unpublish a lesson to students.
// Derives className from the grade (e.g. "Grade 10" -> "10") so students in that
// class + subject see it on their AI Lessons board.
// Accepts optional `section` ("A"|"B"|"C"|"D"|"All") to restrict to one section;
// omitting it or passing "All" sets section = null (visible to all sections).
router.put('/lessons/:id/publish', async (req: Request, res: Response) => {
  try {
    const { isPublished, section } = req.body;
    const existing = await prisma.lessonPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lesson plan not found' });
    }
    const className = (String(existing.grade || '').match(/\d+/) || [])[0] || null;
    const resolvedSection = section && section !== 'All' ? section : null;
    const lesson = await prisma.lessonPlan.update({
      where: { id: req.params.id },
      data: {
        isPublished: !!isPublished,
        publishedAt: isPublished ? new Date() : null,
        className,
        section: resolvedSection,
      },
    });
    res.json({ success: true, data: lesson });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 8. Question Bank CRUD
// =========================================================================

// GET /api/teacher/questions
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const { grade, subject, topic, difficulty, schoolId } = req.query;
    const questions = await prisma.question.findMany({
      where: {
        ...(schoolId ? { schoolId: String(schoolId) } : {}),
        ...(grade ? { grade: String(grade) } : {}),
        ...(subject ? { subject: String(subject) } : {}),
        ...(topic ? { topic: { contains: String(topic), mode: 'insensitive' } } : {}),
        ...(difficulty ? { difficulty: String(difficulty) } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: questions });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/questions
router.post('/questions', async (req: Request, res: Response) => {
  try {
    const { questions, schoolId, userId } = req.body; // Array of questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'questions array is required' });
    }

    const records = questions.map((q: any) => ({
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

    await prisma.question.createMany({ data: records });
    if (userId) {
      await createSafeNotification(userId, `Added ${questions.length} question(s) to the Question Bank for ${records[0]?.subject || 'Science'}`);
    }
    res.status(201).json({ success: true, count: records.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/teacher/questions/:id
router.put('/questions/:id', async (req: Request, res: Response) => {
  try {
    const question = await prisma.question.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: question });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/teacher/questions/:id
router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 9. Student Badges (Engagement)
// =========================================================================

// GET /api/teacher/badges
router.get('/badges', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    let where: any = undefined;
    if (schoolId) {
      const students = await prisma.student.findMany({
        where: { schoolId: String(schoolId) },
        select: { id: true },
      });
      where = { studentId: { in: students.map(s => s.id) } };
    }
    const badges = await prisma.studentBadge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: badges });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/badges
router.post('/badges', async (req: Request, res: Response) => {
  try {
    const { studentId, studentName, classSection, badge, remark, userId } = req.body;
    if (!studentId || !studentName || !badge) {
      return res.status(400).json({ success: false, error: 'studentId, studentName, and badge are required' });
    }
    const record = await prisma.studentBadge.create({
      data: {
        studentId,
        studentName,
        classSection,
        badge,
        remark,
      },
    });
    if (userId) {
      await createSafeNotification(userId, `Awarded "${badge}" badge to ${studentName} (${classSection})`);
    }
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 10. Scholarships verification
// =========================================================================

// GET /api/teacher/scholarships
router.get('/scholarships', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    const scholarships = await prisma.scholarship.findMany({
      where: schoolId ? { student: { schoolId: String(schoolId) } } : undefined,
      include: {
        student: {
          include: { user: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: scholarships });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/teacher/scholarships/:id
router.put('/scholarships/:id', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const updated = await prisma.scholarship.update({
      where: { id: req.params.id },
      data: {
        status,
        approvedDate: status === 'APPROVED' ? new Date() : undefined,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});
// POST /api/teacher/scholarships
router.post('/scholarships', async (req: Request, res: Response) => {
  try {
    const { studentId, scheme, amount } = req.body;
    const newScholarship = await prisma.scholarship.create({
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
  } catch (err) {
    console.error('Error creating scholarship:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/teacher/scholarships/:id
router.delete('/scholarships/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await prisma.scholarship.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, data: deleted });
  } catch (err) {
    console.error('Error deleting scholarship:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 11. Parent-Teacher Messages (persisted to DB via Message model)
// =========================================================================

// Helper to resolve parentId from User ID to HeadmasterParent ID if needed
async function resolveParentId(idStr: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: idStr }
  });
  if (user && user.role === 'PARENT') {
    const hmParent = await prisma.headmasterParent.findFirst({
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
}

// Helper to resolve teacherId from User ID, HeadmasterStaff ID, or Teacher ID to canonical Teacher ID if needed
async function resolveTeacherId(idStr: string): Promise<string> {
  // 1. Try to find by Teacher ID or Teacher's User ID
  let teacher = await prisma.teacher.findFirst({
    where: {
      OR: [
        { id: idStr },
        { userId: idStr }
      ]
    }
  });
  if (teacher) {
    return teacher.id;
  }

  // 2. Try to find if idStr is a HeadmasterStaff ID
  const staff = await prisma.headmasterStaff.findUnique({
    where: { id: idStr }
  });

  if (staff) {
    const conditions = [];
    if (staff.userId) conditions.push({ userId: staff.userId });
    if (staff.email) conditions.push({ user: { email: staff.email } });
    
    if (conditions.length > 0) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: conditions
        }
      });
      if (teacher) {
        return teacher.id;
      }
    }
    return staff.id;
  }

  return idStr;
}

// GET /api/teacher/messages/:parentId
router.get('/messages/:parentId', async (req: Request, res: Response) => {
  try {
    const { parentId } = req.params;
    const { teacherId } = req.query;
    const resolvedParentId = await resolveParentId(parentId);
    const resolvedTeacherId = teacherId ? await resolveTeacherId(String(teacherId)) : null;

    const msgs = await prisma.message.findMany({
      where: { 
        parentId: resolvedParentId,
        ...(resolvedTeacherId ? { teacherId: resolvedTeacherId } : {})
      },
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/messages
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const { parentId, sender, text, schoolId, teacherId } = req.body;
    if (!parentId || !sender || !text) {
      return res.status(400).json({ success: false, error: 'parentId, sender, and text are required' });
    }
    const resolvedParentId = await resolveParentId(parentId);
    const resolvedTeacherId = teacherId ? await resolveTeacherId(String(teacherId)) : null;

    const msg = await prisma.message.create({
      data: { 
        parentId: resolvedParentId, 
        teacherId: resolvedTeacherId,
        sender, 
        text, 
        schoolId: schoolId || null 
      },
    });
    const newMsg = {
      id: msg.id,
      sender: msg.sender,
      text: msg.text,
      time: msg.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    res.status(201).json({ success: true, data: newMsg });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/teacher/analytics/class
router.get('/analytics/class', async (req: Request, res: Response) => {
  try {
    const { schoolId, class: cls, section } = req.query;

    if (!schoolId || !cls || !section) {
      // Fallback to original query if any parameters are missing
      const students = await prisma.student.findMany({
        where: {
          ...(schoolId ? { schoolId: String(schoolId) } : {}),
          ...(cls ? { class: String(cls) } : {}),
          ...(section ? { section: String(section) } : {}),
        },
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
    const students = await prisma.$queryRaw<any[]>`
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
  } catch (err) {
    console.error('Error fetching optimized class analytics:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/teacher/profile/:userId
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // 1. Try to find in User + Teacher tables
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacher: {
          include: { school: { select: { name: true } } }
        },
        school: { select: { name: true } }
      }
    });

    if (user) {
      let staffObj = await prisma.headmasterStaff.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { email: { equals: user.email || '', mode: 'insensitive' } }
          ]
        }
      });

      let isClassTeacher = false;
      let assignedClass = "";
      let assignedSection = "";
      if (staffObj?.address) {
        try {
          const meta = JSON.parse(staffObj.address);
          isClassTeacher = !!meta.isClassTeacher || meta.workAllocation === "Class Teacher";
          assignedClass = meta.assignedClass || "";
          assignedSection = meta.assignedSection || "";
        } catch (e) {}
      }

      let subjectVal = staffObj?.subject || user.teacher?.subjects?.join(', ') || 'General';

      // Query taught subjects from ClassRoom
      const tIds = [user.id];
      if (staffObj) tIds.push(staffObj.id);

      const taughtClasses = await prisma.classRoom.findMany({
        where: { teacherId: { in: tIds } },
        select: { subject: true }
      });

      if (taughtClasses.length > 0) {
        const uniqueSubjs = Array.from(new Set(taughtClasses.map(c => c.subject).filter(Boolean)));
        if (uniqueSubjs.length > 0) {
          subjectVal = uniqueSubjs.join(", ");
        }
      }

      return res.json({
        success: true,
        type: 'user',
        data: {
          id: user.id,
          name: user.name,
          email: user.email || '',
          phone: user.mobile || staffObj?.phone || '',
          role: user.role,
          schoolId: user.schoolId || user.teacher?.schoolId || staffObj?.schoolId || '',
          schoolName: user.school?.name || user.teacher?.school?.name || 'Tamil Nadu School',
          emisId: staffObj?.emisId || user.teacher?.employeeId || user.emisId || 'N/A',
          subjects: [subjectVal],
          subject: subjectVal,
          isClassTeacher,
          assignedClass,
          assignedSection,
          qualification: user.teacher?.qualification || 'N/A',
          joiningDate: user.teacher?.joiningDate ? user.teacher.joiningDate.toISOString().split('T')[0] : '',
          address: staffObj?.address || user.teacher?.address || '',
          gender: staffObj?.gender || user.teacher?.gender || '',
          dob: staffObj?.dob || (user.teacher?.dob ? user.teacher.dob.toISOString().split('T')[0] : '')
        }
      });
    }

    // 2. Try to find in HeadmasterStaff table
    const staff = await prisma.headmasterStaff.findFirst({
      where: {
        OR: [
          { id: userId },
          { emisId: userId }
        ]
      }
    });

    if (staff) {
      let schoolName = 'Tamil Nadu School';
      if (staff.schoolId) {
        const school = await prisma.school.findUnique({
          where: { id: staff.schoolId },
          select: { name: true }
        });
        if (school) schoolName = school.name;
      }

      let isClassTeacher = false;
      let assignedClass = "";
      let assignedSection = "";
      if (staff.address) {
        try {
          const meta = JSON.parse(staff.address);
          isClassTeacher = !!meta.isClassTeacher || meta.workAllocation === "Class Teacher";
          assignedClass = meta.assignedClass || "";
          assignedSection = meta.assignedSection || "";
        } catch (e) {}
      }

      let subjectVal = staff.subject || 'General';
      const staffClasses = await prisma.classRoom.findMany({
        where: { teacherId: staff.id },
        select: { subject: true }
      });
      if (staffClasses.length > 0) {
        const uniqueSubjs = Array.from(new Set(staffClasses.map(c => c.subject).filter(Boolean)));
        if (uniqueSubjs.length > 0) {
          subjectVal = uniqueSubjs.join(", ");
        }
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
          subjects: [subjectVal],
          subject: subjectVal,
          isClassTeacher,
          assignedClass,
          assignedSection,
          qualification: 'N/A',
          joiningDate: staff.createdAt ? staff.createdAt.toISOString().split('T')[0] : '',
          address: staff.address || '',
          gender: staff.gender || '',
          dob: staff.dob ? staff.dob.toISOString().split('T')[0] : ''
        }
      });
    }

    return res.status(404).json({ success: false, error: 'Profile not found' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/teacher/profile/:userId
router.put('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, subjects, qualification, joiningDate } = req.body;

    // 1. Try to find in User
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          email: email || null,
          mobile: phone || null,
        }
      });

      const teacher = await prisma.teacher.findUnique({
        where: { userId }
      });

      if (teacher) {
        await prisma.teacher.update({
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
      } else if (user.schoolId) {
        await prisma.teacher.create({
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
    const staff = await prisma.headmasterStaff.findUnique({
      where: { id: userId }
    });

    if (staff) {
      await prisma.headmasterStaff.update({
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// =========================================================================
// 8. School Press
// =========================================================================

// GET /api/teacher/school-press
router.get('/school-press', async (req: Request, res: Response) => {
  try {
    const { teacherId, schoolId, class: studentClass, approvedOnly, studentId } = req.query;
    
    let whereClause: any = {};

    if (approvedOnly === 'true' && studentId) {
      whereClause = {
        OR: [
          {
            isApproved: true,
            ...(teacherId ? { teacherId: String(teacherId) } : {}),
            ...(schoolId || studentClass ? {
              student: {
                ...(schoolId ? { schoolId: String(schoolId) } : {}),
                ...(studentClass ? { class: String(studentClass) } : {})
              }
            } : {})
          },
          {
            studentId: String(studentId)
          }
        ]
      };
    } else {
      whereClause = {
        ...(approvedOnly === 'true' ? { isApproved: true } : {}),
        ...(teacherId ? { teacherId: String(teacherId) } : {}),
        ...(studentId ? { studentId: String(studentId) } : {}),
        ...(schoolId || studentClass ? {
          student: {
            ...(schoolId ? { schoolId: String(schoolId) } : {}),
            ...(studentClass ? { class: String(studentClass) } : {})
          }
        } : {})
      };
    }

    const activities = await (prisma as any).schoolPressActivity.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, user: { select: { name: true } }, class: true, section: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/teacher/school-press
router.post('/school-press', async (req: Request, res: Response) => {
  try {
    const { studentId, teacherId, description, photos } = req.body;
    if (!studentId || !description) {
      return res.status(400).json({ success: false, error: 'Student ID and description are required' });
    }
    const isApproved = teacherId ? true : false;
    const newActivity = await (prisma as any).schoolPressActivity.create({
      data: {
        studentId,
        teacherId,
        description,
        photos: photos || [],
        isApproved
      }
    });

    if (isApproved) {
      await dispatchSchoolPressNotification(studentId, description);
    }

    res.json({ success: true, data: newActivity });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/teacher/school-press/:id/approve
router.put('/school-press/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const activity = await (prisma as any).schoolPressActivity.findUnique({
      where: { id }
    });

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    const updated = await (prisma as any).schoolPressActivity.update({
      where: { id },
      data: { isApproved: true }
    });

    if (!activity.isApproved) {
      await dispatchSchoolPressNotification(activity.studentId, activity.description);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/teacher/school-press/:id
router.delete('/school-press/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).schoolPressActivity.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});
// =========================================================================
// Risk Alerts
// =========================================================================

// GET /api/teacher/risk-alerts
router.get('/risk-alerts', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }
    const alerts = await (prisma as any).studentRiskAlert.findMany({
      where: { schoolId: String(schoolId) },
      include: {
        student: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/teacher/risk-alerts
router.post('/risk-alerts', async (req: Request, res: Response) => {
  try {
    const { studentId, schoolId, riskLevel, issue, attendance, lastScore } = req.body;
    const alert = await (prisma as any).studentRiskAlert.create({
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
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/teacher/risk-alerts/:id
router.put('/risk-alerts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { riskLevel, issue, attendance, lastScore, notified, notificationMessage } = req.body;
    
    const data: any = {};
    if (riskLevel !== undefined) data.riskLevel = riskLevel;
    if (issue !== undefined) data.issue = issue;
    if (attendance !== undefined) data.attendance = Number(attendance) || 0;
    if (lastScore !== undefined) data.lastScore = Number(lastScore) || 0;
    if (notified !== undefined) data.notified = notified;
    if (notificationMessage !== undefined) data.notificationMessage = notificationMessage;

    const alert = await (prisma as any).studentRiskAlert.update({
      where: { id },
      data
    });
    res.json({ success: true, data: alert });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/teacher/risk-alerts/:id
router.delete('/risk-alerts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).studentRiskAlert.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// Maths Formulas
// =========================================================================

// GET /api/teacher/maths-formulas
router.get('/maths-formulas', async (req: Request, res: Response) => {
  try {
    const { publishedOnly, standard, term } = req.query;
    const where: any = {};
    if (publishedOnly === 'true' || publishedOnly === '1') {
      where.isPublished = true;
    }
    if (standard && typeof standard === 'string') {
      where.standard = standard;
    }
    if (term && typeof term === 'string' && term !== 'all') {
      where.term = term;
    }

    const formulas = await (prisma as any).mathsFormula.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: formulas });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/teacher/maths-formulas
router.post('/maths-formulas', async (req: Request, res: Response) => {
  try {
    const { titleEn, titleTa, formula, category, categoryNameEn, categoryNameTa, standard, term, popular, isPublished, bg, mnemonicPrompt, mnemonicText } = req.body;
    const formulaData: any = {
      titleEn,
      titleTa,
      formula,
      category,
      categoryNameEn,
      categoryNameTa,
      standard,
      term,
      popular: popular || false,
      isPublished: isPublished !== undefined ? isPublished : true,
      bg: bg || "from-blue-400 to-indigo-500",
      mnemonicPrompt,
      mnemonicText
    };
    let newFormula;
    try {
      newFormula = await (prisma as any).mathsFormula.create({ data: formulaData });
    } catch (insertErr) {
      delete formulaData.isPublished;
      newFormula = await (prisma as any).mathsFormula.create({ data: formulaData });
    }
    res.status(201).json({ success: true, data: newFormula });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/teacher/maths-formulas/:id
router.put('/maths-formulas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await (prisma as any).mathsFormula.update({
      where: { id },
      data: req.body
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/teacher/maths-formulas/:id/toggle-publish
router.patch('/maths-formulas/:id/toggle-publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await (prisma as any).mathsFormula.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Formula not found' });
    }
    const updated = await (prisma as any).mathsFormula.update({
      where: { id },
      data: { isPublished: !existing.isPublished }
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/teacher/maths-formulas/publish-bulk
router.post('/maths-formulas/publish-bulk', async (req: Request, res: Response) => {
  try {
    const { standard, term, isPublished = true } = req.body;
    const where: any = {};
    if (standard) where.standard = String(standard);
    if (term && term !== 'all') where.term = String(term);

    const result = await (prisma as any).mathsFormula.updateMany({
      where,
      data: { isPublished: Boolean(isPublished) }
    });
    res.json({ success: true, count: result.count, isPublished: Boolean(isPublished) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/teacher/maths-formulas/:id
router.delete('/maths-formulas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).mathsFormula.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const FORMULA_LIST_GEN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    formulas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          titleEn: { type: 'STRING' },
          titleTa: { type: 'STRING' },
          formula: { type: 'STRING' },
          category: { type: 'STRING' },
          categoryNameEn: { type: 'STRING' },
          categoryNameTa: { type: 'STRING' },
          mnemonicText: { type: 'STRING' },
          mnemonicPrompt: { type: 'STRING' },
          bg: { type: 'STRING' }
        },
        required: ['titleEn', 'titleTa', 'formula', 'category', 'categoryNameEn', 'categoryNameTa', 'mnemonicText', 'mnemonicPrompt']
      }
    }
  },
  required: ['formulas']
};

// POST /api/teacher/maths-formulas/generate-by-unit
router.post('/maths-formulas/generate-by-unit', async (req: Request, res: Response) => {
  try {
    const { unitTitle, standard = "6", term = "1", extraContext = "", isPublished = true } = req.body;
    if (!unitTitle || typeof unitTitle !== 'string') {
      return res.status(400).json({ success: false, error: 'Unit title is required' });
    }

    const { callGemini } = require('./ai.routes');
    const prompt = `You are a master Tamil Nadu State Board (Samacheer Kalvi) Mathematics Curriculum Specialist.
Generate all standard mathematical formulas, theorems, definitions, and equations taught in the Mathematics unit titled "${unitTitle.trim()}" for Standard ${standard}, Term ${term}.
${extraContext ? `Additional Context / Uploaded Text: ${extraContext}` : ''}

For each formula, provide:
1. titleEn: Concise title in English (e.g. "Area of a Circle", "Pythagoras Theorem").
2. titleTa: Precise translation of title in Tamil (e.g. "வட்டத்தின் பரப்பளவு").
3. formula: Clear mathematical notation formula string using clean math symbols (e.g. "A = ½ × h × (a + b)", "A = ½ d₁ d₂", "A = π r²", "a² + b² = c²"). Avoid raw LaTeX backslashes like \\frac or \\times.
4. category: A short lowercase category slug (e.g. "measurements", "geometry", "algebra", "trigonometry", "numbers", "statistics").
5. categoryNameEn: English category name (e.g. "Measurements", "Geometry", "Algebra").
6. categoryNameTa: Tamil category name (e.g. "அளவைகள்", "வடிவியல்", "இயற்கணிதம்").
7. mnemonicText: A fun, easy-to-remember memory trick for students to recall this formula.
8. mnemonicPrompt: A visual prompt description for AI image generation (e.g., "A colorful circle with radius marked").
9. bg: Tailwind CSS background gradient class (e.g., "from-emerald-400 to-teal-600", "from-blue-400 to-indigo-500", "from-purple-400 to-pink-500", "from-amber-400 to-orange-500").

Return between 3 to 8 formulas for this unit.`;

    const result = await callGemini(prompt, true, FORMULA_LIST_GEN_SCHEMA, 8096, 60000);
    const generatedFormulas = result?.formulas || [];

    const createdRecords = [];
    for (const item of generatedFormulas) {
      const formulaData: any = {
        titleEn: item.titleEn,
        titleTa: item.titleTa,
        formula: item.formula,
        category: item.category,
        categoryNameEn: item.categoryNameEn,
        categoryNameTa: item.categoryNameTa,
        standard: String(standard),
        term: String(term),
        popular: false,
        isPublished: Boolean(isPublished),
        bg: item.bg || "from-blue-400 to-indigo-500",
        mnemonicPrompt: item.mnemonicPrompt || "",
        mnemonicText: item.mnemonicText || ""
      };

      let created;
      try {
        created = await (prisma as any).mathsFormula.create({ data: formulaData });
      } catch (insertErr) {
        delete formulaData.isPublished;
        created = await (prisma as any).mathsFormula.create({ data: formulaData });
      }
      createdRecords.push(created);
    }

    res.status(201).json({ success: true, count: createdRecords.length, data: createdRecords });
  } catch (err: any) {
    console.error('Error generating unit formulas:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate formulas for unit' });
  }
});

// =========================================================================
// Science Fact Management (Teacher & Student Shared)
// =========================================================================

const SCIENCE_FACT_FILE = path.join(__dirname, '../../data/science_fact_today.json');

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

const SCIENCE_FACT_CLASSES_FILE = path.join(__dirname, '../../data/science_fact_by_class.json');

function getStoredFact(targetClass?: string, classNum?: string) {
  try {
    const dir = path.dirname(SCIENCE_FACT_CLASSES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (targetClass && fs.existsSync(SCIENCE_FACT_CLASSES_FILE)) {
      const rawMap = fs.readFileSync(SCIENCE_FACT_CLASSES_FILE, 'utf8');
      const classMap: Record<string, any> = JSON.parse(rawMap);

      const normClass = targetClass.trim();
      if (classMap[normClass]) return classMap[normClass];

      // Fuzzy matching by class substring or class number (e.g. "Class 7-B" vs "7")
      for (const [key, fact] of Object.entries(classMap)) {
        if (
          key.toLowerCase().includes(normClass.toLowerCase()) ||
          normClass.toLowerCase().includes(key.toLowerCase()) ||
          (classNum && key.includes(classNum))
        ) {
          return fact;
        }
      }
    }

    if (fs.existsSync(SCIENCE_FACT_FILE)) {
      const raw = fs.readFileSync(SCIENCE_FACT_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading science fact file:', e);
  }
  return DEFAULT_SCIENCE_FACTS[0];
}

function saveStoredFact(factData: any) {
  try {
    const dir = path.dirname(SCIENCE_FACT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Save as latest global fallback
    fs.writeFileSync(SCIENCE_FACT_FILE, JSON.stringify(factData, null, 2), 'utf8');

    // Save under class key in science_fact_by_class.json
    if (factData.targetClass) {
      let classMap: Record<string, any> = {};
      if (fs.existsSync(SCIENCE_FACT_CLASSES_FILE)) {
        try {
          classMap = JSON.parse(fs.readFileSync(SCIENCE_FACT_CLASSES_FILE, 'utf8'));
        } catch (err) {}
      }
      classMap[factData.targetClass] = factData;
      fs.writeFileSync(SCIENCE_FACT_CLASSES_FILE, JSON.stringify(classMap, null, 2), 'utf8');
    }
  } catch (e) {
    console.error('Error writing science fact file:', e);
  }
}

async function generateScienceFactWithAI(promptTopic?: string): Promise<any> {
  try {
    const apiKey = await getGeminiApiKey();
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

    return await new Promise((resolve) => {
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

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const bodyStr = Buffer.concat(chunks).toString('utf8');
            const parsed = JSON.parse(bodyStr);
            const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
              const factObj = JSON.parse(cleanJson);
              resolve(factObj);
              return;
            }
          } catch (e) {
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
  } catch (err) {
    console.error('[generateScienceFactWithAI error]', err);
    return null;
  }
}

// GET /api/teacher/science-fact/today
router.get('/science-fact/today', (req: Request, res: Response) => {
  const { targetClass, classNum } = req.query || {};
  const currentFact = getStoredFact(targetClass ? String(targetClass) : undefined, classNum ? String(classNum) : undefined);
  res.json({ success: true, data: currentFact, allTopics: DEFAULT_SCIENCE_FACTS });
});

// POST /api/teacher/science-fact/generate — Teacher triggers AI science fact generation!
router.post('/science-fact/generate', async (req: Request, res: Response) => {
  try {
    const { teacherName, targetClass, topicId, promptTopic } = req.body || {};

    let factPayload: any = null;
    let isAiGenerated = false;

    const searchTerm = (promptTopic || topicId || '').toLowerCase().trim();

    // 1. Try Gemini AI generation first
    const aiResult = await generateScienceFactWithAI(searchTerm || undefined);
    if (aiResult && aiResult.title && aiResult.scienceFact) {
      factPayload = aiResult;
      isAiGenerated = true;
    } else {
      // 2. Keyword & ID matching fallback
      const matchedFact = DEFAULT_SCIENCE_FACTS.find((f) => 
        f.id === topicId ||
        f.title.toLowerCase().includes(searchTerm) ||
        f.category.toLowerCase().includes(searchTerm) ||
        ((searchTerm.includes('volcano') || searchTerm.includes('valcano') || searchTerm.includes('magma') || searchTerm.includes('lava')) && f.id === 'fact-volcano')
      );

      if (matchedFact) {
        factPayload = matchedFact;
      } else {
        const current = getStoredFact();
        const currentIdx = DEFAULT_SCIENCE_FACTS.findIndex((f) => f.id === current.id);
        const nextIdx = (currentIdx + 1) % DEFAULT_SCIENCE_FACTS.length;
        factPayload = DEFAULT_SCIENCE_FACTS[nextIdx];
      }
    }

    const newTodayFact = {
      ...factPayload,
      id: `fact-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      generatedBy: isAiGenerated
        ? `${teacherName || 'Mrs. Sumathi Devi'} (Generated by AI Science Assistant)`
        : (teacherName || 'Mrs. Sumathi Devi (Science Teacher)'),
      targetClass: targetClass || 'Class 7-B',
      isAiGenerated,
    };

    saveStoredFact(newTodayFact);

    res.json({
      success: true,
      message: isAiGenerated
        ? 'AI generated & published new Science Fact for students!'
        : 'Science Fact updated & published for students!',
      data: newTodayFact,
      isAiGenerated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/teacher/science-fact/publish — Teacher manually customizes & publishes fact
router.post('/science-fact/publish', async (req: Request, res: Response) => {
  try {
    const customFact = req.body;
    if (!customFact.title || !customFact.scienceFact) {
      return res.status(400).json({ success: false, error: 'title and scienceFact are required' });
    }

    const factToPublish = {
      ...customFact,
      id: customFact.id || `fact-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      generatedBy: customFact.generatedBy || 'Mrs. Sumathi Devi',
      targetClass: customFact.targetClass || 'Class 7-B',
    };

    saveStoredFact(factToPublish);

    res.json({
      success: true,
      message: 'Custom Science Fact published successfully!',
      data: factToPublish
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

