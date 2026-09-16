import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// Helper to sync teacher taught subjects to HeadmasterStaff and User tables
async function syncTeacherSubject(teacherId: string | null) {
  if (!teacherId) return;
  try {
    let email: string | null = null;
    let userId: string | null = null;
    let staffId: string | null = null;

    const user = await prisma.user.findUnique({ where: { id: teacherId } });
    if (user) {
      userId = user.id;
      email = user.email;
    } else {
      const staff = await prisma.headmasterStaff.findUnique({ where: { id: teacherId } });
      if (staff) {
        staffId = staff.id;
        email = staff.email;
      }
    }

    if (!staffId && email) {
      const matchedStaff = await prisma.headmasterStaff.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
      });
      if (matchedStaff) staffId = matchedStaff.id;
    }
    if (!userId && email) {
      const matchedUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
      });
      if (matchedUser) userId = matchedUser.id;
    }

    const tIds = Array.from(new Set([teacherId, userId, staffId].filter(Boolean))) as string[];
    const classRooms = await prisma.classRoom.findMany({
      where: { teacherId: { in: tIds } },
      select: { subject: true }
    });

    if (classRooms.length > 0) {
      const uniqueSubjects = Array.from(new Set(classRooms.map(c => c.subject).filter(Boolean)));
      if (uniqueSubjects.length > 0) {
        const combinedSubject = uniqueSubjects.join(", ");

        if (staffId) {
          await prisma.headmasterStaff.update({
            where: { id: staffId },
            data: { subject: combinedSubject }
          });
        }
      }
    }
  } catch (err) {
    console.error("Error syncing teacher subject:", err);
  }
}

// ─── GET /api/classes?schoolId=&teacherId= ──────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { schoolId, teacherId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    let classRooms: any[] = [];
    if (teacherId) {
      const teacherIds: string[] = [String(teacherId)];

      // 1. If teacherId is a User.id, let's find the HeadmasterStaff by email
      const user = await prisma.user.findUnique({
        where: { id: String(teacherId) },
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

      // 2. If teacherId is a HeadmasterStaff.id, let's find the User by email
      const staff = await prisma.headmasterStaff.findUnique({
        where: { id: String(teacherId) },
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

      classRooms = await prisma.classRoom.findMany({
        where: {
          schoolId: String(schoolId),
          teacherId: { in: teacherIds }
        },
        orderBy: [
          { className: 'asc' },
          { section: 'asc' }
        ]
      });
    } else {
      classRooms = await prisma.classRoom.findMany({
        where: {
          schoolId: String(schoolId)
        },
        orderBy: [
          { className: 'asc' },
          { section: 'asc' }
        ]
      });
    }

    return res.json({ success: true, data: classRooms, count: classRooms.length });
  } catch (err: any) {
    console.error('[GET /api/classes]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch classes' });
  }
});

// ─── GET /api/classes/:id ────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM "ClassRoom" WHERE id = ${id} LIMIT 1
    `;
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    console.error('[GET /api/classes/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch class' });
  }
});

// ─── POST /api/classes ───────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      schoolId, teacherId, className, section, subject,
      academicYear, roomNumber, schedule, totalStudents, description,
    } = req.body;

    if (!schoolId || !className || !section || !subject) {
      return res.status(400).json({
        success: false,
        error: 'schoolId, className, section, and subject are required',
      });
    }

    // Check duplicate
    const existing: any[] = await prisma.$queryRaw`
      SELECT id FROM "ClassRoom"
      WHERE "schoolId" = ${schoolId}
        AND "className" = ${String(className)}
        AND section = ${String(section).toUpperCase()}
        AND subject = ${subject}
      LIMIT 1
    `;
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Class ${className}${section} - ${subject} already exists for this school`,
      });
    }

    const id       = randomUUID();
    const now      = new Date();
    const secUp    = String(section).toUpperCase();
    const year     = academicYear || '2024-25';
    const room     = roomNumber   || null;
    const sched    = schedule     || null;
    const total    = parseInt(totalStudents) || 0;
    const desc     = description  || null;
    const teacher  = teacherId    || null;

    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO "ClassRoom"
        (id, "schoolId", "teacherId", "className", section, subject, "academicYear",
         "roomNumber", schedule, "totalStudents", description, "isActive", "createdAt", "updatedAt")
      VALUES
        (${id}, ${schoolId}, ${teacher}, ${String(className)}, ${secUp}, ${subject}, ${year},
         ${room}, ${sched}, ${total}, ${desc}, true, ${now}, ${now})
      RETURNING *
    `;

    // Automatically sync subject to HeadmasterStaff and User records
    if (teacher) {
      syncTeacherSubject(teacher);
    }

    return res.status(201).json({
      success: true,
      data: rows[0],
      message: `Class ${className}${secUp} - ${subject} created successfully`,
    });
  } catch (err: any) {
    console.error('[POST /api/classes]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create class' });
  }
});

// ─── PUT /api/classes/:id ────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing: any[] = await prisma.$queryRaw`
      SELECT * FROM "ClassRoom" WHERE id = ${id} LIMIT 1
    `;
    if (!existing.length) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const cur = existing[0];
    const {
      className, section, subject, academicYear,
      roomNumber, schedule, totalStudents, description, isActive, teacherId,
    } = req.body;

    const now      = new Date();
    const clsName  = className     !== undefined ? String(className)                 : cur.className;
    const secUp    = section       !== undefined ? String(section).toUpperCase()     : cur.section;
    const subj     = subject       !== undefined ? subject                           : cur.subject;
    const year     = academicYear  !== undefined ? academicYear                      : cur.academicYear;
    const room     = roomNumber    !== undefined ? roomNumber                        : cur.roomNumber;
    const sched    = schedule      !== undefined ? schedule                          : cur.schedule;
    const total    = totalStudents !== undefined ? parseInt(totalStudents)           : cur.totalStudents;
    const desc     = description   !== undefined ? description                       : cur.description;
    const active   = isActive      !== undefined ? Boolean(isActive)                : cur.isActive;
    const teacher  = teacherId     !== undefined ? teacherId                        : cur.teacherId;

    const rows: any[] = await prisma.$queryRaw`
      UPDATE "ClassRoom"
      SET "className" = ${clsName}, section = ${secUp}, subject = ${subj},
          "academicYear" = ${year}, "roomNumber" = ${room}, schedule = ${sched},
          "totalStudents" = ${total}, description = ${desc}, "isActive" = ${active},
          "teacherId" = ${teacher}, "updatedAt" = ${now}
      WHERE id = ${id}
      RETURNING *
    `;

    if (teacher) {
      syncTeacherSubject(teacher);
    }

    return res.json({
      success: true,
      data: rows[0],
      message: `Class ${clsName}${secUp} updated successfully`,
    });
  } catch (err: any) {
    console.error('[PUT /api/classes/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update class' });
  }
});

// ─── DELETE /api/classes/:id ─────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing: any[] = await prisma.$queryRaw`
      SELECT * FROM "ClassRoom" WHERE id = ${id} LIMIT 1
    `;
    if (!existing.length) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const cur = existing[0];
    await prisma.$queryRaw`DELETE FROM "ClassRoom" WHERE id = ${id}`;

    return res.json({
      success: true,
      message: `Class ${cur.className}${cur.section} - ${cur.subject} deleted successfully`,
    });
  } catch (err: any) {
    console.error('[DELETE /api/classes/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete class' });
  }
});

export default router;
