import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { randomUUID } from 'crypto';
import { resolveUserId } from '../config/userResolver';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use((req: Request, res: Response, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return authenticate(req, res, next);
});

// ─── GET /api/notifications?userId=[userId] ──────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const targetUserId = (req.user?.role !== 'SUPERADMIN' ? req.user?.id : (req.query.userId as string)) || (req.query.userId as string) || req.user?.id;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const resolvedId = await resolveUserId(String(targetUserId));
    if (!resolvedId) {
      return res.json({ success: true, data: [] });
    }

    const notifications: any[] = await prisma.$queryRaw`
      SELECT id, "userId", message, "read", "createdAt"
      FROM "Notification"
      WHERE "userId" = ${resolvedId}
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;

    return res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('[GET /api/notifications]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── POST /api/notifications ─────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ success: false, error: 'userId and message are required' });
    }

    const resolvedId = await resolveUserId(String(userId));
    if (!resolvedId) {
      return res.status(400).json({ success: false, error: 'Could not resolve userId to a PostgreSQL User' });
    }

    const id  = randomUUID();
    const now = new Date();

    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO "Notification" (id, "userId", message, "read", "createdAt")
      VALUES (${id}, ${resolvedId}, ${message}, false, ${now})
      RETURNING *
    `;

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[POST /api/notifications]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── PUT /api/notifications/read-all ─────────────────────────────
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const resolvedId = await resolveUserId(String(userId));
    if (!resolvedId) {
      return res.status(400).json({ success: false, error: 'Could not resolve userId to a PostgreSQL User' });
    }

    await prisma.$queryRaw`
      UPDATE "Notification"
      SET "read" = true
      WHERE "userId" = ${resolvedId} AND "read" = false
    `;

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[PUT /api/notifications/read-all]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── PUT /api/notifications/:id/read ─────────────────────────────
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rows: any[] = await prisma.$queryRaw`
      UPDATE "Notification"
      SET "read" = true
      WHERE id = ${id}
      RETURNING *
    `;

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[PUT /api/notifications/:id/read]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── DELETE /api/notifications/:id ────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.$queryRaw`DELETE FROM "Notification" WHERE id = ${id}`;

    return res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('[DELETE /api/notifications/:id]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
