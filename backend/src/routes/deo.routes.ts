import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { computeKpis, currentAcademicYear } from '../services/kpi.service';

const router = Router();

// ─── 1. INFRASTRUCTURE ENDPOINTS ──────────────────────────────────────

// GET /api/deo/infrastructure - Fetch infrastructure projects
router.get('/infrastructure', async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    const where: any = {};
    if (district) {
      where.district = String(district);
    }
    const projects = await prisma.ministerInfrastructureProject.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/deo/infrastructure - Create an infrastructure project
router.post('/infrastructure', async (req: Request, res: Response) => {
  try {
    const { school, block, type, budget, completion, deadline, status, district } = req.body;
    if (!school || !district) {
      return res.status(400).json({ success: false, error: 'School name and district are required.' });
    }

    const project = await prisma.ministerInfrastructureProject.create({
      data: {
        id: `infra-${Math.random().toString(36).substr(2, 9)}`,
        name: school,
        district,
        type: type || 'General Repair',
        budget: budget || '₹5L',
        completion: completion !== undefined ? Number(completion) : 0,
        deadline: deadline || '2025',
        status: status || 'Planned',
        updatedAt: new Date()
      }
    });

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── 2. GRIEVANCES ENDPOINTS ──────────────────────────────────────────

// GET /api/deo/grievances - Fetch grievances
router.get('/grievances', async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    const where: any = {};
    if (district) {
      const distStr = String(district).trim();
      if (distStr.toLowerCase() === 'trichy' || distStr.toLowerCase() === 'tiruchirappalli') {
        where.OR = [
          { district: { equals: 'Trichy', mode: 'insensitive' } },
          { district: { equals: 'Tiruchirappalli', mode: 'insensitive' } }
        ];
      } else {
        where.district = { equals: distStr, mode: 'insensitive' };
      }
    }
    const grievances = await prisma.ministerGrievance.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: grievances });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/deo/grievances - Create or update a grievance log
router.post('/grievances', async (req: Request, res: Response) => {
  try {
    const { id, petitioner, district, category, filed, status, escalation, ministerAction } = req.body;

    if (id) {
      const updated = await prisma.ministerGrievance.update({
        where: { id },
        data: {
          status: status || 'Resolved',
          updatedAt: new Date()
        }
      });
      return res.json({ success: true, data: updated });
    }

    if (!petitioner || !district) {
      return res.status(400).json({ success: false, error: 'Petitioner and district are required.' });
    }

    const grievance = await prisma.ministerGrievance.create({
      data: {
        id: `grievance-${Math.random().toString(36).substr(2, 9)}`,
        petitioner,
        district,
        category: category || 'General',
        filed: filed || new Date().toISOString().split('T')[0],
        status: status || 'Pending',
        escalation: escalation || 'L1',
        ministerAction: ministerAction || 'Under Review',
        updatedAt: new Date()
      }
    });

    res.status(201).json({ success: true, data: grievance });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/deo/grievances - Delete a grievance record
router.delete('/grievances', async (req: Request, res: Response) => {
  try {
    const id = (req.query.id || req.body?.id) as string;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Grievance ID is required for deletion.' });
    }
    await prisma.ministerGrievance.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Grievance deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── 3. CIRCULARS ENDPOINTS ───────────────────────────────────────────

// GET /api/deo/circulars - Fetch circular announcements
router.get('/circulars', async (req: Request, res: Response) => {
  try {
    const circulars = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: circulars });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/deo/circulars - Log/Create circular announcement
router.post('/circulars', async (req: Request, res: Response) => {
  try {
    const { title, body, target, date } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'Title and body are required.' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body,
        target: target || 'All',
        sender: 'District Education Officer',
        date: date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        pinned: false,
        readReceipts: '0/0 read'
      }
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── 4. TEACHERS DIRECTORY ENDPOINT ───────────────────────────────────

// GET /api/deo/teachers - Retrieve all teachers under the district
router.get('/teachers', async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    const where: any = {};
    if (district) {
      where.school = { district: String(district) };
    }
    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            mobile: true,
          }
        },
        school: {
          select: {
            name: true,
            block: true,
            district: true,
          }
        }
      }
    });

    const formatted = teachers.map((t: any) => ({
      id: t.id,
      name: t.user?.name || 'N/A',
      email: t.user?.email || 'N/A',
      mobile: t.user?.mobile || 'N/A',
      school: t.school?.name || 'N/A',
      block: t.school?.block || 'N/A',
      subject: t.subjects && t.subjects.length > 0 ? t.subjects[0] : 'General',
      status: 'Active'
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── 5. SCHOLARSHIP LOGS ENDPOINT ──────────────────────────────────────

// GET /api/deo/scholarships - Fetch scholarships records
router.get('/scholarships', async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    const where: any = {};
    if (district) {
      where.student = { school: { district: String(district) } };
    }

    const list = await prisma.scholarship.findMany({
      where,
      include: {
        student: {
          select: {
            user: {
              select: {
                name: true,
              }
            },
            school: {
              select: {
                name: true,
                block: true,
              }
            }
          }
        }
      },
      orderBy: { appliedDate: 'desc' }
    });

    const formatted = list.map((s: any) => ({
      id: s.id,
      studentName: s.student?.user?.name || 'Student',
      school: s.student?.school?.name || 'N/A',
      block: s.student?.school?.block || 'N/A',
      scheme: s.scheme,
      amount: `₹${s.amount.toLocaleString()}`,
      date: s.appliedDate ? new Date(s.appliedDate).toISOString().split('T')[0] : 'N/A',
      status: s.status === 'PENDING' ? 'Intervention Pending' : s.status === 'APPROVED' ? 'Counselled' : s.status === 'DISBURSED' ? 'Re-enrolled' : 'Dropped'
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── 6. WELFARE SCHEMES ENDPOINT ───────────────────────────────────────

// GET /api/deo/schemes - Fetch active welfare schemes
router.get('/schemes', async (req: Request, res: Response) => {
  try {
    const [minSchemes, scholSchemes] = await Promise.all([
      prisma.ministerScheme.findMany(),
      prisma.scholarshipScheme.findMany()
    ]);

    const formatted = [
      ...minSchemes.map((m: any) => ({
        id: m.id,
        name: m.name,
        ministry: m.ministry,
        budget: m.budget,
        beneficiaries: m.beneficiaries,
        progress: m.progress,
        status: m.status
      })),
      ...scholSchemes.map((s: any) => ({
        id: s.id,
        name: s.name,
        ministry: 'Welfare Department',
        budget: s.amountText,
        beneficiaries: 'Eligible Students',
        progress: 100,
        status: 'Active'
      }))
    ];

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── 7. PERFORMANCE & RANKINGS ENDPOINT ─────────────────────────────────

// GET /api/deo/performance - Aggregate performance details by block
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    if (!district) {
      return res.status(400).json({ success: false, error: 'District is required.' });
    }

    const schools = await prisma.school.findMany({
      where: { district: String(district) },
      include: {
        _count: {
          select: { students: true }
        },
        teachers: true
      }
    });

    const blockNames = Array.from(new Set(schools.map(s => s.block).filter(Boolean))) as string[];
    const currYear = currentAcademicYear();

    const blocksData = await Promise.all(blockNames.map(async (bname, idx) => {
      const schoolsInBlock = schools.filter(s => s.block === bname);
      const schoolIds = schoolsInBlock.map(s => s.id);
      const studentCount = schoolsInBlock.reduce((sum, s) => sum + s._count.students, 0);
      const teacherCount = schoolsInBlock.reduce((sum, s) => sum + s.teachers.length, 0);

      const kpiOverall = await computeKpis(schoolIds, currYear);
      const kpi10 = await computeKpis(schoolIds, currYear, { class: '10th' });
      const kpi12 = await computeKpis(schoolIds, currYear, { class: '12th' });

      const attendance = kpiOverall.attendancePct !== null ? Math.round(kpiOverall.attendancePct) : 88;
      const pass10 = kpi10.marks.passPct !== null ? Math.round(kpi10.marks.passPct) : (kpiOverall.marks.passPct !== null ? Math.round(kpiOverall.marks.passPct) : 85);
      const pass12 = kpi12.marks.passPct !== null ? Math.round(kpi12.marks.passPct) : (kpiOverall.marks.passPct !== null ? Math.round(kpiOverall.marks.passPct) : 82);

      return {
        name: bname,
        schools: schoolsInBlock.length,
        students: studentCount,
        teachers: teacherCount || 5,
        attendance,
        pass10,
        pass12,
        overall: Math.round((attendance + pass10 + pass12) / 3),
        rank: idx + 1
      };
    }));

    // Sort by overall descending
    blocksData.sort((a, b) => b.overall - a.overall);
    blocksData.forEach((b, idx) => {
      b.rank = idx + 1;
    });

    res.json({ success: true, data: blocksData });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/deo/rankings - Return schools ranked by composite metrics
router.get('/rankings', async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    if (!district) {
      return res.status(400).json({ success: false, error: 'District is required.' });
    }
    const schools = await prisma.school.findMany({
      where: { district: String(district) },
      include: {
        _count: {
          select: { students: true }
        }
      }
    });

    const currYear = currentAcademicYear();

    const ranked = await Promise.all(schools.map(async (s: any) => {
      const kpiOverall = await computeKpis([s.id], currYear);
      const kpi10 = await computeKpis([s.id], currYear, { class: '10th' });
      const kpi12 = await computeKpis([s.id], currYear, { class: '12th' });

      const pass10 = kpi10.marks.passPct !== null ? Math.round(kpi10.marks.passPct) : (kpiOverall.marks.passPct !== null ? Math.round(kpiOverall.marks.passPct) : 85);
      const pass12 = kpi12.marks.passPct !== null ? Math.round(kpi12.marks.passPct) : (kpiOverall.marks.passPct !== null ? Math.round(kpiOverall.marks.passPct) : 82);
      const composite = Math.round((pass10 + pass12) / 2 * 10) / 10;

      return {
        name: s.name,
        block: s.block || 'District Block',
        students: s._count.students || 0,
        pass10,
        pass12,
        composite
      };
    }));

    // Sort by composite descending
    ranked.sort((a, b) => b.composite - a.composite);
    const result = ranked.map((s, idx) => ({ ...s, rank: idx + 1 }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── 8. DROPOUTS ENDPOINTS ────────────────────────────────────────────

// GET /api/deo/dropouts - Retrieve dropout records
router.get('/dropouts', async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    const where: any = {};
    if (district) {
      where.district = String(district);
    }
    const dropouts = await prisma.dropoutRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: dropouts });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/deo/dropouts - Log a new dropout record
router.post('/dropouts', async (req: Request, res: Response) => {
  try {
    const { studentName, school, block, class: className, reason, date, status, district } = req.body;
    if (!studentName || !school || !district) {
      return res.status(400).json({ success: false, error: 'Student name, school, and district are required.' });
    }

    const newRecord = await prisma.dropoutRecord.create({
      data: {
        studentName,
        school,
        block: block || 'Coimbatore Block',
        class: className || '8th',
        reason: reason || 'Economic',
        date: date || new Date().toISOString().split('T')[0],
        status: status || 'Intervention Pending',
        district,
      }
    });

    res.status(201).json({ success: true, data: newRecord });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/deo/sports - Retrieve sports excellence stats for the district
router.get('/sports', async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    if (!district) {
      return res.status(400).json({ success: false, error: 'District is required.' });
    }

    const schools = await prisma.school.findMany({
      where: { district: { equals: String(district), mode: 'insensitive' } },
      select: { id: true }
    });
    const schoolIds = schools.map(s => s.id);

    const [stateChampions, avgFitness] = await Promise.all([
      prisma.sportsTeam.count({
        where: {
          sportsProfile: { student: { schoolId: { in: schoolIds } } },
          OR: [
            { name: { contains: 'State', mode: 'insensitive' } },
            { match: { contains: 'State', mode: 'insensitive' } }
          ]
        }
      }),
      prisma.sportsFitnessStat.aggregate({
        where: {
          sportsProfile: { student: { schoolId: { in: schoolIds } } },
          label: { contains: 'Fitness', mode: 'insensitive' }
        },
        _avg: { score: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        stateChampions: stateChampions || 18,
        avgFitness: avgFitness._avg.score ? Math.round(avgFitness._avg.score) : 88
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;

