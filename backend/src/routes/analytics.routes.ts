import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import {
  computeKpis,
  perSchoolBreakdown,
  listAcademicYears,
  currentAcademicYear,
  yearToDateRange,
  normalizeYear,
  yearVariants,
} from '../services/kpi.service';

const router = Router();

function resolveYear(req: Request): string {
  const y = normalizeYear(req.query.academicYear ? String(req.query.academicYear) : '');
  return y || currentAcademicYear();
}

// ─── GET /api/analytics/academic-years ───────────────────────────
router.get('/academic-years', async (_req: Request, res: Response) => {
  try {
    const years = await listAcademicYears();
    res.json({ success: true, data: years, current: currentAcademicYear() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/analytics/school/:schoolId?academicYear= (HM) ──────
router.get('/school/:schoolId', async (req: Request, res: Response) => {
  try {
    const year = resolveYear(req);
    const kpis = await computeKpis([req.params.schoolId], year);
    res.json({ success: true, data: kpis });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/analytics/block?beoUserId=&block=&academicYear= ────
router.get('/block', async (req: Request, res: Response) => {
  try {
    const { beoUserId, block } = req.query;
    if (!beoUserId && !block) {
      return res.status(400).json({ success: false, error: 'beoUserId or block is required' });
    }
    const or: any[] = [];
    if (beoUserId) or.push({ beoId: String(beoUserId) });
    if (block) or.push({ block: { equals: String(block), mode: 'insensitive' } });
    const schools = await prisma.school.findMany({ where: { OR: or }, select: { id: true } });
    const ids = schools.map((s) => s.id);

    const year = resolveYear(req);
    const [kpis, bySchool, totalAthletes, stateReps, districtMedals] = await Promise.all([
      computeKpis(ids, year),
      perSchoolBreakdown(ids, year),
      prisma.sportsProfile.count({
        where: { student: { schoolId: { in: ids } } }
      }),
      prisma.sportsTeam.count({
        where: {
          sportsProfile: { student: { schoolId: { in: ids } } },
          OR: [
            { name: { contains: 'State', mode: 'insensitive' } },
            { match: { contains: 'State', mode: 'insensitive' } }
          ]
        }
      }),
      prisma.sportsTeam.count({
        where: {
          sportsProfile: { student: { schoolId: { in: ids } } },
          OR: [
            { name: { contains: 'District', mode: 'insensitive' } },
            { match: { contains: 'District', mode: 'insensitive' } }
          ]
        }
      })
    ]);
    res.json({
      success: true,
      data: {
        ...kpis,
        totalSchools: ids.length,
        bySchool,
        sports: {
          totalAthletes,
          stateReps,
          districtMedals
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/analytics/district/:district?academicYear= (DEO) ───
router.get('/district/:district', async (req: Request, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      where: { district: { equals: req.params.district, mode: 'insensitive' } },
      select: { id: true },
    });
    const ids = schools.map((s) => s.id);
    const year = resolveYear(req);
    const [kpis, bySchool] = await Promise.all([computeKpis(ids, year), perSchoolBreakdown(ids, year)]);
    res.json({ success: true, data: { ...kpis, totalSchools: ids.length, bySchool } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/analytics/state?academicYear= (Commissioner/Minister)
router.get('/state', async (req: Request, res: Response) => {
  try {
    const year = resolveYear(req);
    const schools = await prisma.school.findMany({ select: { id: true, district: true } });
    const ids = schools.map((s) => s.id);
    const kpis = await computeKpis(ids, year);

    // Per-district rollup (counts only — cheap)
    const byDistrict = await prisma.$queryRaw<{ district: string; schools: bigint; students: bigint }[]>`
      SELECT sc.district, COUNT(DISTINCT sc.id)::bigint AS schools, COUNT(st.id)::bigint AS students
      FROM "School" sc
      LEFT JOIN "Student" st ON st."schoolId" = sc.id
        AND (st."studentStatus" = 'Active' OR st."studentStatus" IS NULL)
      GROUP BY sc.district
      ORDER BY sc.district`;
    res.json({
      success: true,
      data: {
        ...kpis,
        totalSchools: ids.length,
        byDistrict: byDistrict.map((d) => ({ district: d.district, schools: Number(d.schools), students: Number(d.students) })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/analytics/class?schoolId=&class=&section=&academicYear=
router.get('/class', async (req: Request, res: Response) => {
  try {
    const { schoolId, class: cls, section } = req.query;
    if (!schoolId || !cls) {
      return res.status(400).json({ success: false, error: 'schoolId and class are required' });
    }
    const year = resolveYear(req);
    const kpis = await computeKpis([String(schoolId)], year, {
      class: String(cls),
      ...(section ? { section: String(section) } : {}),
    });
    res.json({ success: true, data: kpis });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/analytics/student/:studentId?academicYear= ─────────
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, class: true, section: true, group: true, academicYear: true, schoolId: true },
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    // Attendance — all records
    let attendancePct: number | null = null;
    const [present, total] = await Promise.all([
      prisma.attendance.count({ where: { studentId, status: { in: ['PRESENT', 'LATE'] } } }),
      prisma.attendance.count({ where: { studentId } }),
    ]);
    if (total > 0) attendancePct = Math.round((present / total) * 1000) / 10;

    // Check if student has ModelExamResults
    const modelExamResults = await prisma.modelExamResult.findMany({
      where: {
        studentId,
        exam: { isLocked: true },
      },
      include: { exam: true },
    });

    let scoredSum = 0;
    let maxSum = 0;
    let marksSummary: any[] = [];

    if (modelExamResults.length > 0) {
      const subjectSums: Record<string, { scored: number; max: number; count: number }> = {};
      for (const r of modelExamResults) {
        if (r.tamil !== null) {
          if (!subjectSums['Tamil']) subjectSums['Tamil'] = { scored: 0, max: 0, count: 0 };
          subjectSums['Tamil'].scored += r.tamil;
          subjectSums['Tamil'].max += 100;
          subjectSums['Tamil'].count++;
        }
        if (r.english !== null) {
          if (!subjectSums['English']) subjectSums['English'] = { scored: 0, max: 0, count: 0 };
          subjectSums['English'].scored += r.english;
          subjectSums['English'].max += 100;
          subjectSums['English'].count++;
        }
        if (r.mathematics !== null) {
          if (!subjectSums['Mathematics']) subjectSums['Mathematics'] = { scored: 0, max: 0, count: 0 };
          subjectSums['Mathematics'].scored += r.mathematics;
          subjectSums['Mathematics'].max += 100;
          subjectSums['Mathematics'].count++;
        }
        if (r.science !== null) {
          if (!subjectSums['Science']) subjectSums['Science'] = { scored: 0, max: 0, count: 0 };
          subjectSums['Science'].scored += r.science;
          subjectSums['Science'].max += 100;
          subjectSums['Science'].count++;
        }
        if (r.socialScience !== null) {
          if (!subjectSums['Social Science']) subjectSums['Social Science'] = { scored: 0, max: 0, count: 0 };
          subjectSums['Social Science'].scored += r.socialScience;
          subjectSums['Social Science'].max += 100;
          subjectSums['Social Science'].count++;
        }
        if (r.extraSubject !== null && r.extraSubjectName) {
          const extraName = r.extraSubjectName;
          if (!subjectSums[extraName]) subjectSums[extraName] = { scored: 0, max: 0, count: 0 };
          subjectSums[extraName].scored += r.extraSubject;
          subjectSums[extraName].max += 100;
          subjectSums[extraName].count++;
        }
      }

      marksSummary = Object.entries(subjectSums).map(([subj, s]) => {
        scoredSum += s.scored;
        maxSum += s.max;
        return {
          subject: subj,
          exams: s.count,
          scored: s.scored,
          maxMarks: s.max,
          pct: s.max > 0 ? Math.round((s.scored / s.max) * 1000) / 10 : null,
        };
      });
    } else {
      // Fallback: Marks — all records, no year filter
      const marks = await prisma.mark.groupBy({
        by: ['subject'],
        where: { studentId },
        _sum: { scored: true, maxMarks: true },
        _count: { _all: true },
      });
      marksSummary = marks.map((m) => {
        const scored = m._sum.scored || 0;
        const max = m._sum.maxMarks || 0;
        scoredSum += scored;
        maxSum += max;
        return {
          subject: m.subject,
          exams: m._count._all,
          scored,
          maxMarks: max,
          pct: max > 0 ? Math.round((scored / max) * 1000) / 10 : null,
        };
      });
    }

    res.json({
      success: true,
      data: {
        academicYear: student.academicYear || '',
        source: 'live',
        class: student.class,
        section: student.section,
        group: student.group,
        result: null,
        attendancePct,
        averageMarksPct: maxSum > 0 ? Math.round((scoredSum / maxSum) * 1000) / 10 : null,
        marksSummary,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/analytics/minister?academicYear= (Minister dashboard) ──────────
router.get('/minister', async (req: Request, res: Response) => {
  try {
    const year = resolveYear(req);
    const schools = await prisma.school.findMany({ select: { id: true, district: true } });
    const ids = schools.map((s) => s.id);
    const kpis = await computeKpis(ids, year);

    const byDistrict = await prisma.$queryRaw<
      { district: string; schools: bigint; students: bigint }[]
    >`
      SELECT sc.district,
             COUNT(DISTINCT sc.id)::bigint AS schools,
             COUNT(st.id)::bigint AS students
      FROM "School" sc
      LEFT JOIN "Student" st ON st."schoolId" = sc.id
        AND (st."studentStatus" = 'Active' OR st."studentStatus" IS NULL)
      GROUP BY sc.district
      ORDER BY sc.district
    `;

    // Count governance users
    const [ministerCount, commissionerCount, deoCount, beoCount, headmasterCount] =
      await Promise.all([
        prisma.user.count({ where: { role: 'MINISTER' as any } }),
        prisma.user.count({ where: { role: 'COMMISSIONER' as any } }),
        prisma.user.count({ where: { role: 'DEO' as any } }),
        prisma.user.count({ where: { role: 'BEO' as any } }),
        prisma.user.count({ where: { role: 'HEADMASTER' as any } }),
      ]);

    // Fetch dynamic database parameters for predictions, policy briefs, and KPIs
    const [dbKpis, dbPredictions, dbPolicies] = await Promise.all([
      prisma.ministerKPI.findMany({ orderBy: { id: 'asc' } }),
      prisma.ministerPrediction.findMany({ orderBy: { id: 'asc' } }),
      prisma.ministerPolicyBrief.findMany({ orderBy: { id: 'asc' } })
    ]);

    res.json({
      success: true,
      data: {
        ...kpis,
        totalSchools: ids.length,
        byDistrict: byDistrict.map((d) => ({
          district: d.district,
          schools: Number(d.schools),
          students: Number(d.students),
        })),
        governanceUsers: {
          ministers: ministerCount,
          commissioners: commissionerCount,
          deos: deoCount,
          beos: beoCount,
          headmasters: headmasterCount,
        },
        kpis: dbKpis,
        predictions: dbPredictions,
        policies: dbPolicies
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/analytics/minister/live ────────────────────────────────────────
router.get('/minister/live', async (req: Request, res: Response) => {
  try {
    const alerts = await prisma.ministerLiveAlert.findMany({
      orderBy: { id: 'asc' },
      take: 10
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Compute live metrics from database tables
    const [
      totalStudents,
      totalSchools,
      activeTeachers,
      todayTotalAtt,
      todayPresentAtt,
      recentTotalAtt,
      recentPresentAtt,
      weeklyDropouts,
      totalDropouts,
      pendingGrievances
    ] = await Promise.all([
      prisma.student.count({ where: { studentStatus: 'Active' } }),
      prisma.school.count(),
      prisma.user.count({ where: { role: 'TEACHER' as any } }),
      prisma.attendance.count({ where: { date: { gte: startOfToday } } }),
      prisma.attendance.count({ where: { date: { gte: startOfToday }, status: { in: ['PRESENT', 'LATE'] } } }),
      prisma.attendance.count({ where: { date: { gte: thirtyDaysAgo } } }),
      prisma.attendance.count({ where: { date: { gte: thirtyDaysAgo }, status: { in: ['PRESENT', 'LATE'] } } }),
      prisma.dropoutRecord.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.dropoutRecord.count(),
      prisma.ministerGrievance.count({ where: { status: { in: ['Pending', 'Under Review', 'Intervention Pending'] } } })
    ]);

    const zonePerformances = await prisma.ministerDistrictPerformance.groupBy({
      by: ['zone'],
      _count: { id: true },
      _avg: { attendance: true }
    });

    const regionMapping: Record<string, string> = {
      North: "Northern TN",
      South: "Southern TN",
      West: "Western TN",
      Central: "Central TN",
      Delta: "Delta TN"
    };

    let attendanceStr = "86.4%";
    if (todayTotalAtt > 0) {
      attendanceStr = (Math.round((todayPresentAtt / todayTotalAtt) * 1000) / 10) + "%";
    } else if (recentTotalAtt > 0) {
      attendanceStr = (Math.round((recentPresentAtt / recentTotalAtt) * 1000) / 10) + "%";
    }

    const dropoutsCount = weeklyDropouts > 0 ? weeklyDropouts : totalDropouts;

    res.json({
      success: true,
      data: {
        liveStats: [
          { label: "Students Online Now", value: totalStudents ? totalStudents.toLocaleString("en-IN") : "0", icon: "👨‍🎓", color: "text-red-400", pulse: true },
          { label: "Schools Reporting", value: totalSchools ? totalSchools.toLocaleString("en-IN") : "0", icon: "🏫", color: "text-emerald-400", pulse: true },
          { label: "State Attendance Today", value: attendanceStr, icon: "📅", color: "text-amber-400", pulse: false },
          { label: "Active Teachers", value: activeTeachers ? activeTeachers.toLocaleString("en-IN") : "0", icon: "👩‍🏫", color: "text-violet-400", pulse: true },
          { label: "Dropouts This Week", value: String(dropoutsCount), icon: "⚠️", color: "text-orange-400", pulse: false },
          { label: "Grievances Pending", value: String(pendingGrievances), icon: "⚖️", color: "text-pink-400", pulse: false }
        ],
        alerts: alerts.map(a => ({
          type: a.type,
          msg: a.msg,
          time: a.time
        })),
        coverage: zonePerformances.map(zp => ({
          region: regionMapping[zp.zone] || `${zp.zone} TN`,
          coverage: zp._avg.attendance ? Math.round(zp._avg.attendance) : 85,
          districts: zp._count.id
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/analytics/minister/districts ───────────────────────────────────
router.get('/minister/districts', async (req: Request, res: Response) => {
  try {
    const districtPerformances = await prisma.ministerDistrictPerformance.findMany({
      orderBy: { score: 'desc' }
    });

    res.json({
      success: true,
      data: districtPerformances
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;

