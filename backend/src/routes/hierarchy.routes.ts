import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';
import { requireMinRole } from '../middleware/auth.middleware';

const router = Router();

const SAFE_USER_SELECT = {
  id: true, name: true, email: true, mobile: true,
  role: true, isActive: true, schoolId: true,
  district: true, block: true, assignedRegion: true,
  createdAt: true, updatedAt: true,
} as const;

// ─── GET /api/hierarchy/users?role= ─────────────────────────────────────────
// List all users of a given role (for Super Admin management panels)
router.get('/users', requireMinRole('BEO'), async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const where = role ? { role: String(role) as any } : {};
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: SAFE_USER_SELECT,
    });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/hierarchy/beo/:userId ─────────────────────────────────────────
// Returns the schools under a BEO's block
router.get('/beo/:userId', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, block: true, role: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'BEO user not found' });

    const whereClause: any = {};
    if (user.block) {
      whereClause.OR = [
        { beoId: user.id },
        { block: { equals: user.block, mode: 'insensitive' } },
      ];
    } else {
      whereClause.beoId = user.id;
    }

    const schools = await prisma.school.findMany({
      where: whereClause,
      include: { _count: { select: { students: true, teachers: true } } },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: { user, schools, totalSchools: schools.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/hierarchy/deo/:userId ─────────────────────────────────────────
// Returns BEOs and schools under a DEO's district
router.get('/deo/:userId', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, district: true, role: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'DEO user not found' });

    const districtFilter = user.district
      ? { district: { equals: user.district, mode: 'insensitive' as const } }
      : { deoId: user.id };

    const [schools, beos] = await Promise.all([
      prisma.school.findMany({
        where: districtFilter,
        include: { _count: { select: { students: true, teachers: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: { role: 'BEO' as any, ...(user.district ? { district: user.district } : {}) },
        select: SAFE_USER_SELECT,
      }),
    ]);

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
        user, 
        district: user.district, 
        schools, 
        beos, 
        totalSchools: schools.length,
        sports: {
          stateChampions: stateChampions || 18,
          avgFitness: avgFitness._avg.score ? Math.round(avgFitness._avg.score) : 88
        }
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/hierarchy/commissioner/:userId ─────────────────────────────────
// Returns DEOs and district summary under a Commissioner
router.get('/commissioner/:userId', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, assignedRegion: true, role: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'Commissioner user not found' });

    const deos = await prisma.user.findMany({
      where: { role: 'DEO' as any },
      select: SAFE_USER_SELECT,
      orderBy: { name: 'asc' },
    });

    // Get district breakdown from schools
    const districtStats = await prisma.$queryRaw<
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

    res.json({
      success: true,
      data: {
        user,
        deos,
        districtStats: districtStats.map((d) => ({
          district: d.district,
          schools: Number(d.schools),
          students: Number(d.students),
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/hierarchy/minister/:userId ─────────────────────────────────────
// Returns commissioners under a Minister
router.get('/minister/:userId', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, role: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'Minister user not found' });

    const commissioners = await prisma.user.findMany({
      where: { role: 'COMMISSIONER' as any },
      select: SAFE_USER_SELECT,
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: { user, commissioners } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── POST /api/hierarchy/assign ─────────────────────────────────────────────
// Super Admin: assign role + scope to a user
// Body: { userId, role, district?, block?, assignedRegion?, schoolIds? }
router.post('/assign', requireMinRole('SUPERADMIN'), async (req: Request, res: Response) => {
  try {
    const { userId, role, district, block, assignedRegion, schoolIds } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ success: false, error: 'userId and role are required' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role as any,
        ...(district !== undefined ? { district } : {}),
        ...(block !== undefined ? { block } : {}),
        ...(assignedRegion !== undefined ? { assignedRegion } : {}),
      },
      select: SAFE_USER_SELECT,
    });

    // If schoolIds are provided, link schools to this BEO/DEO
    if (Array.isArray(schoolIds) && schoolIds.length > 0) {
      const updateField = role === 'BEO' ? { beoId: userId } : role === 'DEO' ? { deoId: userId } : null;
      if (updateField) {
        await prisma.school.updateMany({
          where: { id: { in: schoolIds } },
          data: updateField,
        });
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── POST /api/hierarchy/create-officer ─────────────────────────────────────
// Super Admin / DEO: create a new governance-level user
// Body: { name, email, mobile?, password, role, district?, block?, assignedRegion? }
router.post('/create-officer', requireMinRole('DEO'), async (req: Request, res: Response) => {
  try {
    const { name, email, mobile, password, role, district, block, assignedRegion } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ success: false, error: 'name, email, role, and password are required' });
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    if (mobile) {
      const mobileDuplicate = await prisma.user.findUnique({
        where: { mobile },
      });
      if (mobileDuplicate) {
        return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        mobile: mobile || null,
        role: role as any,
        passwordHash: await hashPassword(password),
        district: district || null,
        block: block || null,
        assignedRegion: assignedRegion || null,
      },
      select: SAFE_USER_SELECT,
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── PUT /api/hierarchy/block ────────────────────────────────────────────────
// Update a block name (updates all schools and BEOs assigned to that block)
router.put('/block', requireMinRole('DEO'), async (req: Request, res: Response) => {
  try {
    const { oldBlockName, newBlockName, district } = req.body;
    if (!oldBlockName || !newBlockName) {
      return res.status(400).json({ success: false, error: 'oldBlockName and newBlockName are required' });
    }

    const whereClause: any = district 
      ? { block: { equals: oldBlockName, mode: 'insensitive' as const }, district: { equals: district, mode: 'insensitive' as const } }
      : { block: { equals: oldBlockName, mode: 'insensitive' as const } };

    const whereClauseUser: any = district
      ? { block: { equals: oldBlockName, mode: 'insensitive' as const }, district: { equals: district, mode: 'insensitive' as const } }
      : { block: { equals: oldBlockName, mode: 'insensitive' as const } };

    await Promise.all([
      prisma.school.updateMany({
        where: whereClause,
        data: { block: newBlockName },
      }),
      prisma.user.updateMany({
        where: { role: 'BEO', ...whereClauseUser },
        data: { block: newBlockName },
      })
    ]);

    res.json({ success: true, message: 'Block updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── DELETE /api/hierarchy/block ─────────────────────────────────────────────
// Dissociate a block (sets block = null for all schools and BEOs under that block name)
router.delete('/block', requireMinRole('DEO'), async (req: Request, res: Response) => {
  try {
    const { blockName, district } = req.body;
    if (!blockName) {
      return res.status(400).json({ success: false, error: 'blockName is required' });
    }

    const whereClause: any = district
      ? { block: { equals: blockName, mode: 'insensitive' as const }, district: { equals: district, mode: 'insensitive' as const } }
      : { block: { equals: blockName, mode: 'insensitive' as const } };

    const whereClauseUser: any = district
      ? { block: { equals: blockName, mode: 'insensitive' as const }, district: { equals: district, mode: 'insensitive' as const } }
      : { block: { equals: blockName, mode: 'insensitive' as const } };

    await Promise.all([
      prisma.school.updateMany({
        where: whereClause,
        data: { block: "" },
      }),
      prisma.user.updateMany({
        where: { role: 'BEO', ...whereClauseUser },
        data: { block: null },
      })
    ]);

    res.json({ success: true, message: 'Block deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/hierarchy/beo/:userId/resource-reports ─────────────────────────
// Returns all resource reports sent to BEO from schools in the BEO's block
// Optional query params: ?status=&priority=&category=
router.get('/beo/:userId/resource-reports', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, block: true, role: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'BEO user not found' });

    // Find all school IDs under this BEO's block
    const whereClause: any = {};
    if (user.block) {
      whereClause.OR = [
        { beoId: user.id },
        { block: { equals: user.block, mode: 'insensitive' } },
      ];
    } else {
      whereClause.beoId = user.id;
    }

    const schools = await prisma.school.findMany({
      where: whereClause,
      select: { id: true, name: true, district: true, block: true },
    });

    const schoolIds = schools.map((s: { id: string }) => s.id);
    const schoolMap: Record<string, { name: string; district: string; block: string | null }> = {};
    schools.forEach((s: { id: string; name: string; district: string; block: string | null }) => {
      schoolMap[s.id] = { name: s.name, district: s.district, block: s.block };
    });

    // Build report filter
    const { status, priority, category } = req.query;
    const reportWhere: any = {
      recipientRole: 'BEO',
      schoolId: { in: schoolIds },
    };
    if (status && String(status) !== 'All') reportWhere.status = String(status);
    if (priority && String(priority) !== 'All') reportWhere.priority = String(priority);
    if (category && String(category) !== 'All') reportWhere.category = String(category);

    const reports = await prisma.resourceReport.findMany({
      where: reportWhere,
      orderBy: [{ createdAt: 'desc' }],
    });

    // Attach school info to each report
    const enriched = reports.map((r: any) => ({
      ...r,
      schoolName: schoolMap[r.schoolId]?.name || 'Unknown School',
      schoolDistrict: schoolMap[r.schoolId]?.district || '',
      schoolBlock: schoolMap[r.schoolId]?.block || '',
    }));

    // Summary KPIs
    const urgentCount = reports.filter((r: any) => r.priority === 'Urgent').length;
    const openCount = reports.filter((r: any) => r.status !== 'Resolved').length;
    const resolvedCount = reports.filter((r: any) => r.status === 'Resolved').length;
    const criticalAlerts = reports.filter((r: any) => r.reportType === 'Critical Alert').length;

    res.json({
      success: true,
      count: reports.length,
      data: enriched,
      summary: {
        totalReports: reports.length,
        urgentCount,
        openCount,
        resolvedCount,
        criticalAlerts,
        totalSchools: schools.length,
        schoolsReporting: [...new Set(reports.map((r: any) => r.schoolId))].length,
      },
    });
  } catch (err) {
    console.error('[beo resource-reports GET]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── PATCH /api/hierarchy/beo/:userId/resource-reports/:reportId ──────────────
// BEO updates the status of a report (Acknowledged / In Progress / Resolved)
router.patch('/beo/:userId/resource-reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;
    const VALID_STATUSES = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
    if (!status || !VALID_STATUSES.includes(String(status))) {
      return res.status(400).json({ success: false, error: 'status must be one of: ' + VALID_STATUSES.join(', ') });
    }
    const existing = await prisma.resourceReport.findUnique({ where: { id: reportId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Report not found.' });

    const updated = await prisma.resourceReport.update({
      where: { id: reportId },
      data: { status: String(status) },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[beo resource-reports PATCH]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;


// ═══════════════════════════════════════════════════════════════════════════════
// DEO — Resource Reports (recipientRole = 'DEO', scoped to their district)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/hierarchy/deo/:userId/resource-reports
router.get('/deo/:userId/resource-reports', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, district: true, role: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'DEO user not found' });

    // Find all schools in this DEO's district
    const whereClause: any = {};
    if (user.district) {
      whereClause.OR = [
        { deoId: user.id },
        { district: { equals: user.district, mode: 'insensitive' } },
      ];
    } else {
      whereClause.deoId = user.id;
    }

    const schools = await prisma.school.findMany({
      where: whereClause,
      select: { id: true, name: true, district: true, block: true },
    });

    const schoolIds = schools.map((s: { id: string }) => s.id);
    const schoolMap: Record<string, { name: string; district: string; block: string | null }> = {};
    schools.forEach((s: { id: string; name: string; district: string; block: string | null }) => {
      schoolMap[s.id] = { name: s.name, district: s.district, block: s.block };
    });

    const { status, priority, category } = req.query;
    const reportWhere: any = {
      recipientRole: 'DEO',
      schoolId: { in: schoolIds },
    };
    if (status && String(status) !== 'All') reportWhere.status = String(status);
    if (priority && String(priority) !== 'All') reportWhere.priority = String(priority);
    if (category && String(category) !== 'All') reportWhere.category = String(category);

    const reports = await prisma.resourceReport.findMany({
      where: reportWhere,
      orderBy: [{ createdAt: 'desc' }],
    });

    const enriched = reports.map((r: any) => ({
      ...r,
      schoolName: schoolMap[r.schoolId]?.name || 'Unknown School',
      schoolDistrict: schoolMap[r.schoolId]?.district || '',
      schoolBlock: schoolMap[r.schoolId]?.block || '',
    }));

    res.json({
      success: true,
      count: reports.length,
      data: enriched,
      summary: {
        totalReports: reports.length,
        urgentCount: reports.filter((r: any) => r.priority === 'Urgent').length,
        openCount: reports.filter((r: any) => r.status !== 'Resolved').length,
        resolvedCount: reports.filter((r: any) => r.status === 'Resolved').length,
        criticalAlerts: reports.filter((r: any) => r.reportType === 'Critical Alert').length,
        totalSchools: schools.length,
        schoolsReporting: [...new Set(reports.map((r: any) => r.schoolId))].length,
      },
    });
  } catch (err) {
    console.error('[deo resource-reports GET]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/hierarchy/deo/:userId/resource-reports/:reportId
router.patch('/deo/:userId/resource-reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;
    const VALID = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
    if (!status || !VALID.includes(String(status))) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    const existing = await prisma.resourceReport.findUnique({ where: { id: reportId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Report not found.' });
    const updated = await prisma.resourceReport.update({ where: { id: reportId }, data: { status: String(status) } });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[deo resource-reports PATCH]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONER — Resource Reports (recipientRole = 'Commissioner', all schools)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/hierarchy/commissioner/:userId/resource-reports
router.get('/commissioner/:userId/resource-reports', async (req: Request, res: Response) => {
  try {
    const { status, priority, category, district } = req.query;
    const reportWhere: any = { recipientRole: 'Commissioner' };
    if (status && String(status) !== 'All') reportWhere.status = String(status);
    if (priority && String(priority) !== 'All') reportWhere.priority = String(priority);
    if (category && String(category) !== 'All') reportWhere.category = String(category);

    // Optionally filter by district via school join
    let schoolIds: string[] | undefined;
    if (district && String(district) !== 'All') {
      const schools = await prisma.school.findMany({
        where: { district: { equals: String(district), mode: 'insensitive' } },
        select: { id: true },
      });
      schoolIds = schools.map((s: { id: string }) => s.id);
      reportWhere.schoolId = { in: schoolIds };
    }

    const reports = await prisma.resourceReport.findMany({
      where: reportWhere,
      orderBy: [{ createdAt: 'desc' }],
    });

    // Enrich with school info
    const uniqueSchoolIds = [...new Set(reports.map((r: any) => r.schoolId))];
    const schools = await prisma.school.findMany({
      where: { id: { in: uniqueSchoolIds } },
      select: { id: true, name: true, district: true, block: true },
    });
    const schoolMap: Record<string, { name: string; district: string; block: string | null }> = {};
    schools.forEach((s: { id: string; name: string; district: string; block: string | null }) => {
      schoolMap[s.id] = { name: s.name, district: s.district, block: s.block };
    });

    const enriched = reports.map((r: any) => ({
      ...r,
      schoolName: schoolMap[r.schoolId]?.name || 'Unknown School',
      schoolDistrict: schoolMap[r.schoolId]?.district || '',
      schoolBlock: schoolMap[r.schoolId]?.block || '',
    }));

    // District-level breakdown
    const byDistrict: Record<string, number> = {};
    enriched.forEach((r: any) => {
      byDistrict[r.schoolDistrict] = (byDistrict[r.schoolDistrict] || 0) + 1;
    });

    res.json({
      success: true,
      count: reports.length,
      data: enriched,
      summary: {
        totalReports: reports.length,
        urgentCount: reports.filter((r: any) => r.priority === 'Urgent').length,
        openCount: reports.filter((r: any) => r.status !== 'Resolved').length,
        resolvedCount: reports.filter((r: any) => r.status === 'Resolved').length,
        criticalAlerts: reports.filter((r: any) => r.reportType === 'Critical Alert').length,
        schoolsReporting: uniqueSchoolIds.length,
        byDistrict,
      },
    });
  } catch (err) {
    console.error('[commissioner resource-reports GET]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/hierarchy/commissioner/:userId/resource-reports/:reportId
router.patch('/commissioner/:userId/resource-reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;
    const VALID = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
    if (!status || !VALID.includes(String(status))) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    const existing = await prisma.resourceReport.findUnique({ where: { id: reportId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Report not found.' });
    const updated = await prisma.resourceReport.update({ where: { id: reportId }, data: { status: String(status) } });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[commissioner resource-reports PATCH]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// MINISTER — Resource Reports (recipientRole = 'Minister', state-wide)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/hierarchy/minister/:userId/resource-reports
router.get('/minister/:userId/resource-reports', async (req: Request, res: Response) => {
  try {
    const { status, priority, category, district } = req.query;
    const reportWhere: any = { recipientRole: 'Minister' };
    if (status && String(status) !== 'All') reportWhere.status = String(status);
    if (priority && String(priority) !== 'All') reportWhere.priority = String(priority);
    if (category && String(category) !== 'All') reportWhere.category = String(category);

    if (district && String(district) !== 'All') {
      const schools = await prisma.school.findMany({
        where: { district: { equals: String(district), mode: 'insensitive' } },
        select: { id: true },
      });
      reportWhere.schoolId = { in: schools.map((s: { id: string }) => s.id) };
    }

    const reports = await prisma.resourceReport.findMany({
      where: reportWhere,
      orderBy: [{ createdAt: 'desc' }],
    });

    const uniqueSchoolIds = [...new Set(reports.map((r: any) => r.schoolId))];
    const schools = await prisma.school.findMany({
      where: { id: { in: uniqueSchoolIds } },
      select: { id: true, name: true, district: true, block: true },
    });
    const schoolMap: Record<string, { name: string; district: string; block: string | null }> = {};
    schools.forEach((s: { id: string; name: string; district: string; block: string | null }) => {
      schoolMap[s.id] = { name: s.name, district: s.district, block: s.block };
    });

    const enriched = reports.map((r: any) => ({
      ...r,
      schoolName: schoolMap[r.schoolId]?.name || 'Unknown School',
      schoolDistrict: schoolMap[r.schoolId]?.district || '',
      schoolBlock: schoolMap[r.schoolId]?.block || '',
    }));

    const byDistrict: Record<string, number> = {};
    enriched.forEach((r: any) => {
      byDistrict[r.schoolDistrict] = (byDistrict[r.schoolDistrict] || 0) + 1;
    });

    res.json({
      success: true,
      count: reports.length,
      data: enriched,
      summary: {
        totalReports: reports.length,
        urgentCount: reports.filter((r: any) => r.priority === 'Urgent').length,
        openCount: reports.filter((r: any) => r.status !== 'Resolved').length,
        resolvedCount: reports.filter((r: any) => r.status === 'Resolved').length,
        criticalAlerts: reports.filter((r: any) => r.reportType === 'Critical Alert').length,
        schoolsReporting: uniqueSchoolIds.length,
        byDistrict,
      },
    });
  } catch (err) {
    console.error('[minister resource-reports GET]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/hierarchy/minister/:userId/resource-reports/:reportId
router.patch('/minister/:userId/resource-reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;
    const VALID = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
    if (!status || !VALID.includes(String(status))) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    const existing = await prisma.resourceReport.findUnique({ where: { id: reportId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Report not found.' });
    const updated = await prisma.resourceReport.update({ where: { id: reportId }, data: { status: String(status) } });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[minister resource-reports PATCH]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});
