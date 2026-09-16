import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use((req: Request, res: Response, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return authenticate(req, res, next);
});

// Helper to resolve all potential IDs for a teacher (User.id and HeadmasterStaff.id)
async function getTeacherIds(teacherId: string) {
  const ids: string[] = [teacherId];
  
  // 1. If teacherId is a User.id, let's find the HeadmasterStaff by email
  const user = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { email: true }
  });
  if (user && user.email) {
    const staff = await prisma.headmasterStaff.findFirst({
      where: { email: user.email },
      select: { id: true }
    });
    if (staff) ids.push(staff.id);
  }

  // 2. If teacherId is a HeadmasterStaff.id, let's find the User by email
  const staff = await prisma.headmasterStaff.findUnique({
    where: { id: teacherId },
    select: { email: true }
  });
  if (staff && staff.email) {
    const matchedUser = await prisma.user.findFirst({
      where: { email: staff.email },
      select: { id: true }
    });
    if (matchedUser) ids.push(matchedUser.id);
  }

  return ids;
}

// Helper to resolve all potential School IDs (UUID and DISE code)
async function resolveSchoolIds(schoolIdStr: string): Promise<string[]> {
  if (!schoolIdStr) return [];
  const ids: string[] = [schoolIdStr];
  try {
    const schoolObj = await prisma.school.findFirst({
      where: { OR: [{ id: schoolIdStr }, { dise: schoolIdStr }] },
      select: { id: true, dise: true }
    });
    if (schoolObj) {
      if (schoolObj.id && !ids.includes(schoolObj.id)) ids.push(schoolObj.id);
      if (schoolObj.dise && !ids.includes(schoolObj.dise)) ids.push(schoolObj.dise);
    }
  } catch (err) {
    console.error('[resolveSchoolIds Error]', err);
  }
  return ids;
}

// Helper to get canonical primary School.id for PostgreSQL foreign key operations
async function getCanonicalSchoolId(schoolIdStr: string): Promise<string> {
  if (!schoolIdStr) return schoolIdStr;
  try {
    const schoolObj = await prisma.school.findFirst({
      where: { OR: [{ id: schoolIdStr }, { dise: schoolIdStr }] },
      select: { id: true }
    });
    if (schoolObj) return schoolObj.id;
  } catch {}
  return schoolIdStr;
}

// 1. GET /api/timetable — Fetch timetable slots
router.get('/', async (req: Request, res: Response) => {
  try {
    const { schoolId, class: className, section, dayOfWeek } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    const schoolIds = await resolveSchoolIds(String(schoolId));
    const whereClause: any = { schoolId: { in: schoolIds } };

    if (className && String(className) !== "All") {
      const clsStr = String(className).trim();
      const numericOnly = clsStr.match(/\d+/)?.[0];
      if (numericOnly) {
        whereClause.class = { contains: numericOnly, mode: 'insensitive' };
      } else {
        whereClause.class = { contains: clsStr, mode: 'insensitive' };
      }
    }

    if (section && String(section) !== "All") {
      const secStr = String(section).trim();
      whereClause.OR = [
        { section: { equals: secStr, mode: 'insensitive' } },
        { section: { equals: 'All', mode: 'insensitive' } },
        { class: { contains: secStr, mode: 'insensitive' } }
      ];
    }

    if (dayOfWeek !== undefined && dayOfWeek !== null && String(dayOfWeek) !== "") {
      whereClause.dayOfWeek = parseInt(String(dayOfWeek));
    }

    const timetable = await prisma.timetable.findMany({
      where: whereClause,
      orderBy: [
        { dayOfWeek: 'asc' },
        { period: 'asc' }
      ]
    });

    res.json({ success: true, count: timetable.length, data: timetable });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 2. GET /api/timetable/teacher/:teacherId — Fetch schedule for a specific teacher
router.get('/teacher/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const teacherIds = await getTeacherIds(teacherId);

    const timetable = await prisma.timetable.findMany({
      where: {
        teacherId: { in: teacherIds }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { period: 'asc' }
      ]
    });

    res.json({ success: true, count: timetable.length, data: timetable });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 3. POST /api/timetable — Create weekly timetable slot with Conflict Checking
router.post('/', async (req: Request, res: Response) => {
  try {
    const { schoolId, class: className, section, dayOfWeek, period, subject, teacherId, startTime, endTime } = req.body;
    
    if (!schoolId || !className || !section || !dayOfWeek || !period || !subject || !startTime || !endTime) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const canonicalSchoolId = await getCanonicalSchoolId(String(schoolId));
    const schoolIds = await resolveSchoolIds(canonicalSchoolId);

    // --- Production Conflict Checks ---
    if (teacherId) {
      const teacherIds = await getTeacherIds(teacherId);
      
      // Check if this teacher is already scheduled elsewhere in the same period on this day
      const conflict = await prisma.timetable.findFirst({
        where: {
          schoolId: { in: schoolIds },
          dayOfWeek: parseInt(dayOfWeek),
          period: parseInt(period),
          teacherId: { in: teacherIds }
        }
      });

      if (conflict && (conflict.class !== String(className) || conflict.section !== String(section))) {
        return res.status(400).json({
          success: false,
          error: `Teacher conflict: This teacher is already scheduled to teach Class ${conflict.class}${conflict.section} (${conflict.subject}) in Period ${period} on this day.`
        });
      }
    }

    const slot = await prisma.timetable.upsert({
      where: {
        schoolId_class_section_dayOfWeek_period: {
          schoolId: canonicalSchoolId,
          class: String(className),
          section: String(section),
          dayOfWeek: parseInt(dayOfWeek),
          period: parseInt(period),
        }
      },
      update: {
        subject,
        teacherId: teacherId || null,
        startTime,
        endTime,
      },
      create: {
        schoolId: canonicalSchoolId,
        class: String(className),
        section: String(section),
        dayOfWeek: parseInt(dayOfWeek),
        period: parseInt(period),
        subject,
        teacherId: teacherId || null,
        startTime,
        endTime,
      }
    });

    res.json({ success: true, message: 'Timetable slot saved successfully', data: slot });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 4. PUT /api/timetable/:id — Update weekly timetable slot with Conflict Checking
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, teacherId, startTime, endTime, class: className, section, dayOfWeek, period, schoolId } = req.body;

    const parsedDayOfWeek = dayOfWeek ? parseInt(dayOfWeek) : undefined;
    const parsedPeriod = period ? parseInt(period) : undefined;

    // --- Production Conflict Checks ---
    if (teacherId && schoolId && parsedDayOfWeek && parsedPeriod) {
      const teacherIds = await getTeacherIds(teacherId);
      const conflict = await prisma.timetable.findFirst({
        where: {
          schoolId,
          dayOfWeek: parsedDayOfWeek,
          period: parsedPeriod,
          teacherId: { in: teacherIds },
          id: { not: id } // Exclude current record
        }
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          error: `Teacher conflict: This teacher is already scheduled to teach Class ${conflict.class}${conflict.section} (${conflict.subject}) in Period ${parsedPeriod} on this day.`
        });
      }
    }

    const slot = await prisma.timetable.update({
      where: { id },
      data: {
        subject,
        teacherId: teacherId !== undefined ? teacherId : undefined,
        startTime,
        endTime,
        class: className,
        section,
        dayOfWeek: parsedDayOfWeek,
        period: parsedPeriod,
      }
    });

    res.json({ success: true, message: 'Timetable slot updated successfully', data: slot });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 5. DELETE /api/timetable/:id — Delete weekly timetable slot
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.timetable.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Timetable slot deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 6. GET /api/timetable/teachers — Fetch teachers in a school for selection with availability context
router.get('/teachers', async (req: Request, res: Response) => {
  try {
    const { schoolId, dayOfWeek, period } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    const staff = await prisma.headmasterStaff.findMany({
      where: { schoolId: String(schoolId) },
      orderBy: { name: 'asc' },
    });

    // If dayOfWeek and period are provided, check which teachers are busy
    if (dayOfWeek && period) {
      const busySlots = await prisma.timetable.findMany({
        where: {
          schoolId: String(schoolId),
          dayOfWeek: parseInt(String(dayOfWeek)),
          period: parseInt(String(period))
        },
        select: {
          teacherId: true,
          class: true,
          section: true
        }
      });

      const formattedStaff = staff.map(s => {
        const busy = busySlots.find(slot => slot.teacherId === s.id || slot.teacherId === s.userId);
        return {
          ...s,
          isBusy: !!busy,
          busyWithClass: busy ? `${busy.class}${busy.section}` : null
        };
      });

      return res.json({ success: true, count: formattedStaff.length, data: formattedStaff });
    }

    res.json({ success: true, count: staff.length, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 7. POST /api/timetable/proxy — Create/update proxy assignment with Conflict Check
router.post('/proxy', async (req: Request, res: Response) => {
  try {
    const { schoolId, date, period, timetableId, absentTeacherId, proxyTeacherId, notes } = req.body;

    if (!schoolId || !date || !period || !timetableId || !absentTeacherId || !proxyTeacherId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const parsedDate = new Date(date + 'T00:00:00Z');
    const dayOfWeek = parsedDate.getDay(); // 0 = Sun, 1 = Mon...

    const proxyTeacherIds = await getTeacherIds(proxyTeacherId);

    // --- Production Proxy Conflict Checks ---
    // A. Check if substitute has a regular class scheduled during this period today
    const regularConflict = await prisma.timetable.findFirst({
      where: {
        schoolId,
        dayOfWeek,
        period: parseInt(period),
        teacherId: { in: proxyTeacherIds }
      }
    });

    // B. Check if substitute is already covering another proxy during this period today
    const proxyConflict = await prisma.proxyAssignment.findFirst({
      where: {
        schoolId,
        date: parsedDate,
        period: parseInt(period),
        proxyTeacherId: { in: proxyTeacherIds },
        timetableId: { not: timetableId }
      },
      include: {
        timetable: true
      }
    });

    if (regularConflict || proxyConflict) {
      const conflictingClass = regularConflict 
        ? `Class ${regularConflict.class}${regularConflict.section} (Regular Schedule)` 
        : `Class ${proxyConflict?.timetable?.class}${proxyConflict?.timetable?.section} (Other Proxy Duty)`;

      return res.status(400).json({
        success: false,
        error: `Conflict: Substitute teacher is already busy teaching ${conflictingClass} during Period ${period} today.`
      });
    }

    const proxy = await prisma.proxyAssignment.upsert({
      where: {
        schoolId_date_period_timetableId: {
          schoolId,
          date: parsedDate,
          period: parseInt(period),
          timetableId,
        }
      },
      update: {
        absentTeacherId,
        proxyTeacherId,
        notes: notes || null,
      },
      create: {
        schoolId,
        date: parsedDate,
        period: parseInt(period),
        timetableId,
        absentTeacherId,
        proxyTeacherId,
        notes: notes || null,
      }
    });

    res.json({ success: true, message: 'Proxy assignment confirmed successfully', data: proxy });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 8. GET /api/timetable/proxy — Fetch proxy assignments for a school on a specific date
router.get('/proxy', async (req: Request, res: Response) => {
  try {
    const { schoolId, date } = req.query;
    if (!schoolId || !date) {
      return res.status(400).json({ success: false, error: 'schoolId and date are required' });
    }

    const parsedDate = new Date(String(date) + 'T00:00:00Z');

    const proxies = await prisma.proxyAssignment.findMany({
      where: {
        schoolId: String(schoolId),
        date: parsedDate
      },
      include: {
        timetable: true
      }
    });

    res.json({ success: true, count: proxies.length, data: proxies });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 9. GET /api/timetable/proxy/teacher/:teacherId — Fetch proxy duties (substituting/absent) for a teacher today
router.get('/proxy/teacher/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { date } = req.query;

    const teacherIds = await getTeacherIds(teacherId);
    
    const whereClause: any = {
      OR: [
        { proxyTeacherId: { in: teacherIds } },
        { absentTeacherId: { in: teacherIds } }
      ]
    };

    if (date) {
      whereClause.date = new Date(String(date) + 'T00:00:00Z');
    }

    const proxies = await prisma.proxyAssignment.findMany({
      where: whereClause,
      include: {
        timetable: true,
        school: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    res.json({ success: true, count: proxies.length, data: proxies });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
