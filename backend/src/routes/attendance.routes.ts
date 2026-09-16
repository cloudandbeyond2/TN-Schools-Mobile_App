import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendMockSMS, getStudentParents } from '../utils/sms';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// POST /api/attendance — Bulk mark attendance (supports updates via delete-and-recreate transaction)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { records, notifySMS } = req.body; // Array of { studentId, schoolId, date, status, method, period, subject }, notifySMS toggle
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'records array is required' });
    }

    const firstRecord = records[0];
    const dateVal = new Date(firstRecord.date);
    dateVal.setHours(0, 0, 0, 0);
    const nextDate = new Date(dateVal);
    nextDate.setDate(nextDate.getDate() + 1);

    const periodVal = firstRecord.period !== undefined ? Number(firstRecord.period) : 0;

    const studentIds = records.map(r => r.studentId);

    // Run delete existing & create new as a single transaction to update attendance
    const result = await prisma.$transaction([
      prisma.attendance.deleteMany({
        where: {
          studentId: { in: studentIds },
          date: { gte: dateVal, lt: nextDate },
          period: periodVal,
        },
      }),
      prisma.attendance.createMany({
        data: records.map(r => ({
          studentId: r.studentId,
          schoolId: r.schoolId,
          date: new Date(r.date),
          status: r.status,
          method: r.method || 'Manual',
          period: r.period !== undefined ? Number(r.period) : 0,
          subject: r.subject || 'General',
        })),
      }),
    ]);

    // Dispatch SMS Notifications for absent students if enabled
    if (notifySMS) {
      const absentRecords = records.filter(r => r.status === 'ABSENT');
      for (const record of absentRecords) {
        try {
          const studentId = record.studentId;
          const parents = await getStudentParents(studentId);
          if (parents.length > 0) {
            const student = await prisma.student.findUnique({
              where: { id: studentId },
              include: { user: true, school: true },
            });
            const studentName = student?.user?.name || 'Your child';
            const schoolName = student?.school?.name || 'School';
            const formattedDate = new Date(record.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            const smsMessage = `Attendance Alert: ${studentName} was marked ABSENT at ${schoolName} on ${formattedDate}.`;

            for (const parent of parents) {
              // 1. Trigger SMS
              await sendMockSMS(parent.phone, smsMessage);

              // 2. Log Notification in DB for parent portal alerts feed
              if (parent.userId) {
                await prisma.notification.create({
                  data: {
                    userId: parent.userId,
                    studentId: studentId,
                    type: 'ATTENDANCE_ALERT',
                    title: 'Student Absence Notice',
                    message: smsMessage,
                  },
                });
              }
            }
          }
        } catch (smsErr) {
          console.error(`Error sending absence notification for student ${record.studentId}:`, smsErr);
        }
      }
    }

    // Check for monthly attendance drops below threshold (75%)
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      for (const studentId of studentIds) {
        const monthlyRecords = await prisma.attendance.findMany({
          where: {
            studentId,
            date: { gte: startOfMonth, lte: endOfMonth }
          }
        });

        if (monthlyRecords.length >= 3) {
          const presentCount = monthlyRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
          const rate = (presentCount / monthlyRecords.length) * 100;

          if (rate < 75) {
            const student = await prisma.student.findUnique({
              where: { id: studentId },
              include: { user: true }
            });

            const parents = await getStudentParents(studentId);
            for (const parent of parents) {
              if (parent.userId) {
                const existingAlert = await prisma.notification.findFirst({
                  where: {
                    userId: parent.userId,
                    studentId,
                    type: 'LOW_ATTENDANCE_ALERT',
                    createdAt: { gte: startOfMonth, lte: endOfMonth }
                  }
                });

                if (!existingAlert) {
                  const alertMsg = `Attendance Warning: Your child ${student?.user?.name || 'child'} has low attendance (${Math.round(rate)}%) for this month. Please ensure they attend school regularly.`;
                  await sendMockSMS(parent.phone, alertMsg);
                  await prisma.notification.create({
                    data: {
                      userId: parent.userId,
                      studentId,
                      type: 'LOW_ATTENDANCE_ALERT',
                      title: 'Low Monthly Attendance Warning',
                      message: alertMsg
                    }
                  });
                }
              }
            }
          }
        }
      }
    } catch (checkErr) {
      console.error('Error checking monthly low attendance threshold:', checkErr);
    }

    res.status(201).json({ success: true, created: result[1].count });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/attendance/class-date — Load saved attendance for a class on a specific date
router.get('/class-date', async (req: Request, res: Response) => {
  try {
    const { schoolId, class: cls, section, date, period } = req.query;
    if (!schoolId || !cls || !section || !date) {
      return res.status(400).json({ success: false, error: 'schoolId, class, section, and date are required' });
    }

    const targetDate = new Date(String(date));
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const periodVal = period !== undefined ? Number(period) : 0;

    const records = await prisma.attendance.findMany({
      where: {
        schoolId: String(schoolId),
        date: { gte: targetDate, lt: nextDate },
        period: periodVal,
        student: {
          class: String(cls),
          section: String(section),
        },
      },
      select: {
        studentId: true,
        status: true,
      },
    });

    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Helper function to calculate start (Monday) and end (Friday) dates for current/last week
function getWeekRange(week: 'current' | 'last') {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sun, 1 = Mon ...
  // Find Monday of the current week
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  if (week === 'last') {
    monday.setDate(monday.getDate() - 7);
  }

  const Friday = new Date(monday);
  Friday.setDate(monday.getDate() + 4);
  Friday.setHours(23, 59, 59, 999);

  return { start: monday, end: Friday };
}

// GET /api/attendance/weekly — Get student attendance for a class filtered by current/last week
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const { schoolId, class: cls, section, week } = req.query;
    if (!schoolId || !cls || !section) {
      return res.status(400).json({ success: false, error: 'schoolId, class, and section are required' });
    }

    const selectedWeek = week === 'last' ? 'last' : 'current';
    const { start, end } = getWeekRange(selectedWeek);

    // Fetch all students in the class
    const students = await prisma.student.findMany({
      where: {
        schoolId: String(schoolId),
        class: String(cls),
        section: String(section),
      },
      select: {
        id: true,
        rollNumber: true,
        user: { select: { name: true } },
      },
      orderBy: { rollNumber: 'asc' },
    });

    const studentIds = students.map(s => s.id);

    // Fetch attendance for these students in the date range
    const attendance = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        date: { gte: start, lte: end },
      },
      select: {
        studentId: true,
        date: true,
        status: true,
      },
    });

    res.json({
      success: true,
      weekRange: { start, end },
      students: students.map(s => {
        const studentAttendance = attendance.filter(a => a.studentId === s.id);
        return {
          id: s.id,
          name: s.user?.name || 'Unknown',
          rollNo: s.rollNumber || '',
          records: studentAttendance.map(a => ({
            date: a.date.toISOString().split('T')[0],
            dayOfWeek: new Date(a.date).getDay(), // 1=Mon, 2=Tue ... 5=Fri
            status: a.status,
          })),
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/attendance/:studentId — Get student attendance
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const attendance = await prisma.attendance.findMany({
      where: {
        studentId: req.params.studentId,
        date: {
          ...(from ? { gte: new Date(String(from)) } : {}),
          ...(to ? { lte: new Date(String(to)) } : {}),
        },
      },
      orderBy: { date: 'desc' },
    });
    // Compute %
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    res.json({ success: true, percentage, total, present, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/attendance/school/:schoolId/stats — Comprehensive statistics for dashboard
router.get('/school/:schoolId/stats', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(String(date)) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get all students in this school
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: { user: true },
    });

    const totalStudents = students.length;

    // Get attendance records on target date
    const targetRecords = await prisma.attendance.findMany({
      where: {
        schoolId,
        date: { gte: targetDate, lt: nextDate }
      },
      include: {
        student: { include: { user: true } }
      }
    });

    const presentCount = targetRecords.filter(r => r.status === 'PRESENT').length;
    const absentCount = targetRecords.filter(r => r.status === 'ABSENT').length;
    const lateCount = targetRecords.filter(r => r.status === 'LATE').length;
    const leaveCount = targetRecords.filter(r => r.status === 'LEAVE').length;

    const totalMarked = targetRecords.length;
    const unmarkedCount = Math.max(0, totalStudents - totalMarked);

    const attendancePct = totalStudents > 0
      ? Math.round(((presentCount + lateCount) / totalStudents) * 100 * 10) / 10
      : 0;

    // Classwise stats
    const byClass: Record<string, { total: number; present: number; absent: number; late: number; leave: number; marked: number }> = {};

    // Initialize for all classes present in school's student list
    for (const student of students) {
      const clsName = student.class ? `Class ${student.class}${student.section || ''}` : 'Unassigned';
      if (!byClass[clsName]) {
        byClass[clsName] = { total: 0, present: 0, absent: 0, late: 0, leave: 0, marked: 0 };
      }
      byClass[clsName].total += 1;
    }

    // Accumulate records
    for (const record of targetRecords) {
      const clsName = record.student?.class ? `Class ${record.student.class}${record.student.section || ''}` : 'Unassigned';
      if (!byClass[clsName]) {
        byClass[clsName] = { total: 0, present: 0, absent: 0, late: 0, leave: 0, marked: 0 };
      }
      byClass[clsName].marked += 1;
      if (record.status === 'PRESENT') byClass[clsName].present += 1;
      else if (record.status === 'ABSENT') byClass[clsName].absent += 1;
      else if (record.status === 'LATE') byClass[clsName].late += 1;
      else if (record.status === 'LEAVE') byClass[clsName].leave += 1;
    }

    const classWise = Object.entries(byClass).map(([className, counts]) => {
      const pct = counts.total > 0
        ? Math.round(((counts.present + counts.late) / counts.total) * 100 * 10) / 10
        : 0;
      return {
        className,
        ...counts,
        percentage: pct
      };
    });

    // Late logs
    const lateLogs = targetRecords
      .filter(r => r.status === 'LATE')
      .map(r => ({
        id: r.id,
        studentId: r.studentId,
        name: r.student?.user?.name || 'Unknown',
        rollNumber: r.student?.rollNumber || 'N/A',
        class: r.student?.class || 'N/A',
        section: r.student?.section || 'N/A',
        status: r.status,
        time: r.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }));

    // Absence Alerts (low attendance or consecutive absences in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttendance = await prisma.attendance.findMany({
      where: {
        schoolId,
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'desc' }
    });

    const studentAttMap: Record<string, typeof recentAttendance> = {};
    for (const r of recentAttendance) {
      if (!studentAttMap[r.studentId]) {
        studentAttMap[r.studentId] = [];
      }
      studentAttMap[r.studentId].push(r);
    }

    const alerts = [];
    for (const s of students) {
      const records = studentAttMap[s.id] || [];
      const total = records.length;
      if (total === 0) continue;

      const present = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
      const pct = (present / total) * 100;

      let consecutiveAbsent = 0;
      for (const r of records) {
        if (r.status === 'ABSENT') consecutiveAbsent++;
        else break;
      }

      if (pct < 75 || consecutiveAbsent >= 3) {
        alerts.push({
          studentId: s.id,
          name: s.user?.name || 'Unknown',
          rollNumber: s.rollNumber || 'N/A',
          class: s.class || 'N/A',
          section: s.section || 'N/A',
          attendancePct: Math.round(pct),
          consecutiveDaysAbsent: consecutiveAbsent,
          phone: s.phoneNumber || s.parentMobile || 'N/A'
        });
      }
    }

    // Monthly trends (last 6 months ending at targetDate)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetDate.getFullYear(), targetDate.getMonth() - i, 1);
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const totalM = await prisma.attendance.count({
        where: {
          schoolId,
          date: { gte: firstDay, lte: lastDay }
        }
      });

      const presM = await prisma.attendance.count({
        where: {
          schoolId,
          date: { gte: firstDay, lte: lastDay },
          status: { in: ['PRESENT', 'LATE'] }
        }
      });

      const pct = totalM > 0 ? (presM / totalM) * 100 : 0; // 0 if no records exist

      monthlyTrends.push({
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        percentage: Math.round(pct)
      });
    }

    // Daily trends (selected date's month)
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const dailyRecords = await prisma.attendance.findMany({
      where: {
        schoolId,
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      select: {
        date: true,
        status: true
      }
    });

    const dailyGroup: Record<string, { total: number; present: number }> = {};
    for (const r of dailyRecords) {
      const dateStr = r.date.toISOString().split('T')[0];
      if (!dailyGroup[dateStr]) {
        dailyGroup[dateStr] = { total: 0, present: 0 };
      }
      dailyGroup[dateStr].total++;
      if (r.status === 'PRESENT' || r.status === 'LATE') {
        dailyGroup[dateStr].present++;
      }
    }

    const dailyTrends = Object.entries(dailyGroup)
      .map(([dateStr, counts]) => ({
        date: dateStr,
        percentage: Math.round((counts.present / counts.total) * 100)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fallback daily trends if none exists for the target month
    if (dailyTrends.length === 0) {
      // Leave empty so calendar displays "No logs logged" grey boxes for dates with no entries
    }

    // Map all students to their attendance status on target date
    const dailyLogs = students.map(s => {
      const record = targetRecords.find(r => r.studentId === s.id);
      return {
        studentId: s.id,
        name: s.user?.name || 'Unknown',
        rollNumber: s.rollNumber || 'N/A',
        class: s.class || 'N/A',
        section: s.section || 'N/A',
        status: record ? record.status : 'UNMARKED'
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalStudents,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          leave: leaveCount,
          unmarked: unmarkedCount,
          percentage: attendancePct
        },
        classWise,
        lateLogs,
        alerts,
        monthlyTrends,
        dailyTrends,
        dailyLogs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/attendance/school/:schoolId/today — School-level attendance for today
router.get('/school/:schoolId/today', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await prisma.attendance.groupBy({
      by: ['status'],
      where: { schoolId: req.params.schoolId, date: { gte: today, lt: tomorrow } },
      _count: { status: true },
    });

    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
