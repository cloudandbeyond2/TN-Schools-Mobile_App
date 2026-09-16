import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { requireMinRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireMinRole('PET'));

function schoolScope(req: Request) {
  return req.user?.schoolId ? { schoolId: req.user.schoolId } : {};
}

function stampSchool(req: Request, data: any) {
  if (!data.schoolId && req.user?.schoolId) data.schoolId = req.user.schoolId;
  return data;
}

// GET /api/pet/sports-conducted - Fetch all sports events for the school
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await prisma.petSportsEvent.findMany({
      where: schoolScope(req),
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Error fetching PET sports events:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/pet/sports-conducted - Log a new sports event
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const data = stampSchool(req, {
      name: body.name,
      kind: body.kind,
      sport: body.sport,
      level: body.level,
      date: body.date,
      venue: body.venue,
      participants: Number(body.participants) || 0,
      status: body.status,
      result: body.result || "",
      notes: body.notes || "",
      targetClasses: body.targetClasses || "All Classes",
      ageGroup: body.ageGroup || "Open",
    });
    
    if (!data.name) {
      return res.status(400).json({ success: false, error: 'Event name is required' });
    }

    const created = await prisma.petSportsEvent.create({ data });

    // Asynchronously dispatch notifications to parents of target students
    if (created.schoolId) {
      const studentIds = req.body.studentIds;
      Promise.resolve().then(async () => {
        try {
          let students;
          if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
            students = await prisma.student.findMany({
              where: { id: { in: studentIds } },
              select: { id: true, parentMobile: true, userId: true }
            });
          } else {
            let targetClassesList: string[] = [];
            if (created.targetClasses === "Class 6-8") {
              targetClassesList = ['6', '7', '8', '06', '07', '08'];
            } else if (created.targetClasses === "Class 9-10") {
              targetClassesList = ['9', '10', '09', '10'];
            } else if (created.targetClasses === "Class 11-12") {
              targetClassesList = ['11', '12'];
            }

            students = await prisma.student.findMany({
              where: {
                schoolId: created.schoolId || undefined,
                class: targetClassesList.length > 0 ? { in: targetClassesList } : undefined,
              },
              select: { id: true, parentMobile: true, userId: true }
            });
          }

          // 1. Dispatch Parent Notifications & Student Notifications
          for (const student of students) {
            // Student notification
            if (student.userId) {
              await prisma.notification.create({
                data: {
                  userId: student.userId,
                  message: `New sports ${created.kind.toLowerCase()} scheduled: "${created.name}" (${created.sport}) on ${created.date} at ${created.venue}.`,
                  read: false
                }
              });
            }

            // Parent notification
            const links = await prisma.parentStudentLink.findMany({
              where: { studentId: student.id },
              include: { parent: true }
            });

            const parentUsers = new Map<string, string>(); // userId -> parentId
            links.forEach(l => {
              if (l.parent?.userId) parentUsers.set(l.parent.userId, l.parent.id);
            });

            if (parentUsers.size === 0 && student.parentMobile) {
              const parent = await prisma.headmasterParent.findFirst({
                where: { phone: student.parentMobile }
              });
              if (parent && parent.userId) {
                parentUsers.set(parent.userId, parent.id);
              }
            }

            for (const [userId, parentId] of parentUsers.entries()) {
              await prisma.notification.create({
                data: {
                  userId,
                  studentId: student.id,
                  type: 'SPORTS_ALERT',
                  title: `New Sports ${created.kind} Scheduled`,
                  message: `A new ${created.kind.toLowerCase()} "${created.name}" (${created.sport}) is scheduled for ${created.targetClasses} on ${created.date} at ${created.venue}.`,
                }
              });
            }
          }

          // 2. Dispatch Headmaster Notification
          const hmUser = await prisma.user.findFirst({
            where: {
              schoolId: created.schoolId,
              role: 'HEADMASTER'
            }
          });
          if (hmUser) {
            await prisma.notification.create({
              data: {
                userId: hmUser.id,
                message: `New school sports ${created.kind.toLowerCase()} logged: "${created.name}" (${created.sport}) scheduled for ${created.targetClasses} on ${created.date}.`,
                read: false
              }
            });
          }

          console.log(`Dispatched notifications for sports event "${created.name}" to HM, ${students.length} students, and parents`);
        } catch (err) {
          console.error('Error dispatching notifications for sports event:', err);
        }
      });
    }

    res.json({ success: true, data: created });
  } catch (err) {
    console.error('Error creating PET sports event:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/pet/sports-conducted/bulk - Bulk import events
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, error: 'events must be a non-empty array' });
    }

    const rows = events.map((e: any) => stampSchool(req, {
      name: e.name,
      kind: e.kind,
      sport: e.sport,
      level: e.level,
      date: e.date,
      venue: e.venue,
      participants: Number(e.participants) || 0,
      status: e.status,
      result: e.result || "",
      notes: e.notes || "",
      targetClasses: e.targetClasses || "All Classes",
      ageGroup: e.ageGroup || "Open",
    })).filter(row => row.name);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'no valid events provided' });
    }

    const created = await prisma.$transaction(
      rows.map((row) => prisma.petSportsEvent.create({ data: row }))
    );
    res.json({ success: true, data: created });
  } catch (err) {
    console.error('Error bulk-creating PET sports events:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/pet/sports-conducted/:id - Update an event
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.petSportsEvent.findFirst({ where: { id, ...schoolScope(req) } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const body = req.body;
    const data = {
      name: body.name,
      kind: body.kind,
      sport: body.sport,
      level: body.level,
      date: body.date,
      venue: body.venue,
      participants: Number(body.participants) || 0,
      status: body.status,
      result: body.result || "",
      notes: body.notes || "",
      targetClasses: body.targetClasses || "All Classes",
      ageGroup: body.ageGroup || "Open",
    };

    const updated = await prisma.petSportsEvent.update({
      where: { id },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating PET sports event:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/pet/sports-conducted/:id - Delete an event
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.petSportsEvent.findFirst({ where: { id, ...schoolScope(req) } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    await prisma.petSportsEvent.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting PET sports event:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
