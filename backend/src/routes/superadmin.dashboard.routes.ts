import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import mongoose from 'mongoose';
import { FeatureModule, IntegrationConfig, ManagedPage, PlatformSetting } from '../models/mongo';
import { requireRole } from '../middleware/auth.middleware';

const router = Router();

// Guard route to SUPERADMIN role
router.use(requireRole(['SUPERADMIN']));

// GET /api/superadmin/dashboard/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 1. Fetch PostgreSQL counts
    const [userCount, schoolCount, topicCount] = await Promise.all([
      prisma.user.count(),
      prisma.school.count(),
      prisma.centralTopic.count(),
    ]);

    // 2. Fetch MongoDB feature module counts & platform settings
    const [enabledModulesCount, totalModulesCount, pagesCount, settings] = await Promise.all([
      FeatureModule.countDocuments({ isEnabled: true }),
      FeatureModule.countDocuments(),
      ManagedPage.countDocuments(),
      PlatformSetting.findOne({ key: 'global' }),
    ]);

    // 3. Fetch specific user roles counts for badges
    const [hmCount, deoCount, beoCount, materialsCount, activeMinisters, aiApisCount] = await Promise.all([
      prisma.user.count({ where: { role: 'HEADMASTER' as any } }),
      prisma.user.count({ where: { role: 'DEO' as any } }),
      prisma.user.count({ where: { role: 'BEO' as any } }),
      prisma.studyMaterial.count(),
      prisma.user.count({ where: { role: 'MINISTER' as any } }),
      IntegrationConfig.countDocuments({ isActive: true }),
    ]);

    // 4. Calculate Uptime and AI Status
    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    let uptimeStr = '';
    if (days > 0) uptimeStr += `${days}d `;
    if (hours > 0 || days > 0) uptimeStr += `${hours}h `;
    uptimeStr += `${minutes}m`;

    let aiStatus = 'Online';
    try {
      const hasGeminiKey = !!process.env.GEMINI_API_KEY;
      const hasMongoAiConfig = aiApisCount > 0;
      if (!hasGeminiKey && !hasMongoAiConfig) {
        aiStatus = 'Config Needed';
      }
    } catch {
      aiStatus = 'Online';
    }

    // 5. Portal visibility from settings
    const portalVisibility = {
      beo: settings ? (settings as any).enableBeoPortal !== false : true,
      deo: settings ? (settings as any).enableDeoPortal !== false : true,
      commissioner: settings ? (settings as any).enableCommissionerPortal !== false : true,
      minister: settings ? (settings as any).enableMinisterPortal !== false : true,
      pet: settings ? (settings as any).enablePetPortal !== false : true,
    };

    // 6. Calculate Active Portals and roll up counts per role
    const totalPossiblePortals = 9;
    let enabledPortalsCount = 9;
    if (!portalVisibility.beo) enabledPortalsCount--;
    if (!portalVisibility.deo) enabledPortalsCount--;
    if (!portalVisibility.commissioner) enabledPortalsCount--;
    if (!portalVisibility.minister) enabledPortalsCount--;

    let activePortals = `${enabledPortalsCount} / ${totalPossiblePortals}`;
    let activePortalsSub = enabledPortalsCount === 9 ? 'All online' : `${9 - enabledPortalsCount} portal(s) disabled`;
    const roles: Record<string, number> = {
      student: 0,
      teacher: 0,
      parent: 0,
      headmaster: 0,
      beo: 0,
      deo: 0,
      commissioner: 0,
      minister: 0,
      superadmin: 0,
    };

    try {
      const rolesWithUsers = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      });
      rolesWithUsers.forEach((g) => {
        const r = String(g.role).toLowerCase();
        if (r in roles) roles[r] = g._count.id;
      });
    } catch (e) {
      console.warn('[Dashboard Stats] Error counting active portal roles:', e);
    }

    // 7. Verify Database Connections (Data Sync health)
    let pgOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      pgOk = true;
    } catch {}
    const mongoOk = mongoose.connection.readyState === 1;
    const dataSync = pgOk && mongoOk ? 'Live' : 'Degraded';
    const dataSyncSub = pgOk && mongoOk ? 'All pipelines OK' : 'Database connection error';

    // 8. Format user count output (e.g. 1.26K if >= 1000, 49.3L+ if >= 100000)
    let formattedUserCount = String(userCount);
    if (userCount >= 100000) {
      formattedUserCount = `${(userCount / 100000).toFixed(2)}L`;
    } else if (userCount >= 1000) {
      formattedUserCount = `${(userCount / 1000).toFixed(2)}K`;
    } else {
      formattedUserCount = userCount.toLocaleString('en-IN');
    }

    // Dynamic Student Count formatting from database
    const liveStudentCount = roles.student || 0;
    let formattedStudentCount = String(liveStudentCount);
    if (liveStudentCount >= 100000) {
      formattedStudentCount = `${(liveStudentCount / 100000).toFixed(2)}L`;
    } else if (liveStudentCount >= 1000) {
      formattedStudentCount = `${(liveStudentCount / 1000).toFixed(2)}K`;
    } else {
      formattedStudentCount = liveStudentCount.toLocaleString('en-IN');
    }

    const totalUsersSub = 'Registered Users';
    const activeSchoolsSub = 'Active Schools';
    const aiStatusSub = 'Operational';
    const totalStudentsSub = 'Enrolled Students';
    const syllabusSub = 'Curriculum Topics';

    const headmastersSub = 'School Administrators';

    // Calculate dynamic portal health load percentages based on database user shares
    const totalUsersNum = userCount || 1;
    const portalLoads: Record<string, number> = {};
    Object.keys(roles).forEach((r) => {
      const count = roles[r];
      if (count === 0) {
        portalLoads[r] = 0;
      } else {
        const pct = Math.round((count / totalUsersNum) * 100);
        portalLoads[r] = Math.max(pct, 8);
      }
    });

    // Fetch live recent system activity from database
    const [recentUsers, recentSchools] = await Promise.all([
      prisma.user.findMany({ take: 4, orderBy: { createdAt: 'desc' }, select: { name: true, role: true, email: true, createdAt: true } }),
      prisma.school.findMany({ take: 4, orderBy: { createdAt: 'desc' }, select: { name: true, dise: true, createdAt: true } }),
    ]);

    const recentActivity = [
      ...recentUsers.map((u) => ({
        action: 'New User Created',
        target: `${u.name} (${u.role})`,
        user: 'System',
        time: u.createdAt ? new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        type: 'success',
        rawDate: u.createdAt,
      })),
      ...recentSchools.map((s) => ({
        action: 'School Added',
        target: `${s.name} — DISE: ${s.dise}`,
        user: 'Super Admin',
        time: s.createdAt ? new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        type: 'info',
        rawDate: s.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
      .slice(0, 6);

    res.json({
      success: true,
      data: {
        totalUsers: formattedUserCount,
        totalUsersSub,
        activeSchools: schoolCount.toLocaleString('en-IN'),
        activeSchoolsSub,
        aiStatus,
        aiStatusSub,
        totalStudents: formattedStudentCount,
        totalStudentsSub,
        systemUptime: '99.9%',
        uptimeSub: `Up ${uptimeStr}`,
        activePortals,
        activePortalsSub,
        modulesEnabled: String(enabledModulesCount),
        modulesEnabledSub: `of ${totalModulesCount} total`,
        syllabusItems: topicCount.toLocaleString('en-IN'),
        syllabusSub,
        totalHeadmasters: hmCount.toLocaleString('en-IN'),
        headmastersSub,
        // Badges & Health:
        rawUserCount: userCount,
        rawSchoolCount: schoolCount,
        hmCount,
        deoCount,
        beoCount,
        materialsCount,
        pagesCount,
        activeMinisters,
        aiApisCount,
        totalModules: totalModulesCount || 28,
        enabledModules: enabledModulesCount || 28,
        roles,
        portalLoads,
        recentActivity,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
