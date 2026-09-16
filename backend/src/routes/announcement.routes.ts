import { Router, Request, Response } from 'express';
import { Announcement as MongoAnnouncement } from '../models/mongo';
import { prisma } from '../config/prisma';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /api/announcements
// Authenticated route: queries Prisma & Mongo announcements scoped by schoolId or global (schoolId: null)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const userSchoolId = req.user?.schoolId;

    // Prisma query with tenant scoping (schoolId matches user's school OR is null/global state)
    const prismaWhere: any = {};
    if (userSchoolId && req.user?.role !== 'SUPERADMIN') {
      prismaWhere.OR = [
        { schoolId: userSchoolId },
        { schoolId: null }
      ];
    }

    const prismaAnnouncements = await prisma.announcement.findMany({
      where: prismaWhere,
      orderBy: { createdAt: 'desc' }
    });

    const formattedPrisma = prismaAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      priority: a.pinned ? 'high' : 'info',
      target: a.target,
      createdBy: a.sender || 'School Admin',
      createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
      expiresAt: '',
      status: 'active',
      views: 0,
      schoolId: a.schoolId,
    }));

    // Mongo query fallback
    let mongoQuery: any = { status: { $ne: 'expired' } };
    if (userSchoolId && req.user?.role !== 'SUPERADMIN') {
      mongoQuery.$or = [
        { schoolId: userSchoolId },
        { schoolId: { $exists: false } },
        { schoolId: null }
      ];
    }

    const mongoAnnouncements = await MongoAnnouncement.find(mongoQuery).sort({ createdAt: -1 });

    const formattedMongo = mongoAnnouncements.map((a: any) => ({
      id: a._id.toString(),
      title: a.title,
      body: a.body,
      priority: a.priority,
      target: a.target,
      createdBy: a.createdBy || 'Super Admin',
      createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      status: a.status,
      views: a.views || 0,
      schoolId: a.schoolId,
    }));

    // Combine and deduplicate
    const combined = [...formattedPrisma, ...formattedMongo];

    return res.json({ success: true, data: combined });
  } catch (err) {
    console.error('[GET /api/announcements]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/announcements
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, body, priority, target, expiresAt } = req.body;
    const userSchoolId = req.user?.schoolId;
    const senderName = req.user?.name || req.user?.role || 'School Admin';

    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'Title and Body are required' });
    }

    // Save in Prisma
    const newPrismaAnnouncement = await prisma.announcement.create({
      data: {
        title,
        body,
        target: target || 'All',
        pinned: priority === 'high',
        schoolId: userSchoolId || null,
        sender: senderName,
        senderId: req.user?.id,
      }
    });

    // Also sync to Mongo for backward compatibility
    const announcement = await MongoAnnouncement.create({
      title,
      body,
      priority: priority || 'info',
      target: target || 'All',
      createdBy: senderName,
      schoolId: userSchoolId || undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      status: 'active',
      views: 0,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newPrismaAnnouncement.id,
        title: newPrismaAnnouncement.title,
        body: newPrismaAnnouncement.body,
        priority: priority || 'info',
        target: newPrismaAnnouncement.target,
        createdBy: newPrismaAnnouncement.sender,
        createdAt: new Date(newPrismaAnnouncement.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        expiresAt: expiresAt ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        status: 'active',
        views: 0,
        schoolId: newPrismaAnnouncement.schoolId,
      }
    });
  } catch (err) {
    console.error('[POST /api/announcements]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/announcements/:id/expire
router.put('/:id/expire', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await MongoAnnouncement.findByIdAndUpdate(id, { status: 'expired' }, { new: true });
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await MongoAnnouncement.findByIdAndDelete(id);
    await prisma.announcement.deleteMany({ where: { id } });
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;

