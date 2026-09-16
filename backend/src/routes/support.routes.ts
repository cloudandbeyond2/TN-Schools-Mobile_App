import { Router, Request, Response } from 'express';
import { SupportRequest } from '../models/mongo';
import { authenticate, getAuthUser, hasPermission } from '../middleware/auth.middleware';

const router = Router();

const CATEGORIES = [
  'Login or account access',
  'AI learning tools',
  'Digital library / labs',
  'Attendance or marks',
  'Technical / performance issue',
  'Data & privacy',
  'Other',
];

// POST /api/support
// Public + role-aware: anyone can raise a request; if a valid token is present
// we capture who submitted it. Keeps the help page working even when signed out.
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, contact, category, message } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required.' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }

    const cleanCategory =
      typeof category === 'string' && CATEGORIES.includes(category) ? category : 'Other';

    const auth = await getAuthUser(req);

    const doc = await SupportRequest.create({
      name: name.trim().slice(0, 120),
      contact: typeof contact === 'string' ? contact.trim().slice(0, 160) : undefined,
      category: cleanCategory,
      message: message.trim().slice(0, 4000),
      userId: auth?.id,
      role: auth?.role,
      schoolId: auth?.schoolId ?? undefined,
      status: 'open',
    });

    return res.status(201).json({
      success: true,
      data: {
        id: doc._id.toString(),
        ticketRef: `TN-${doc._id.toString().slice(-6).toUpperCase()}`,
        category: doc.category,
        status: doc.status,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error('[POST /api/support]', err);
    return res.status(500).json({ success: false, error: 'Could not submit your request. Please try again.' });
  }
});

// GET /api/support  — admin listing (SUPERADMIN / COMMISSIONER and above)
// Query: ?status=open&category=...&limit=100
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!hasPermission(user.role, 'COMMISSIONER')) {
      return res.status(403).json({ success: false, error: 'Not authorised to view support requests.' });
    }

    const { status, category } = req.query;
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);

    const query: any = {};
    if (status && typeof status === 'string') query.status = status;
    if (category && typeof category === 'string') query.category = category;

    const items = await SupportRequest.find(query).sort({ createdAt: -1 }).limit(limit);

    return res.json({
      success: true,
      data: items.map((d: any) => ({
        id: d._id.toString(),
        ticketRef: `TN-${d._id.toString().slice(-6).toUpperCase()}`,
        name: d.name,
        contact: d.contact || '',
        category: d.category,
        message: d.message,
        role: d.role || 'Guest',
        schoolId: d.schoolId || '',
        status: d.status,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    console.error('[GET /api/support]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/support/:id/status — admin updates ticket status
router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!hasPermission(user.role, 'COMMISSIONER')) {
      return res.status(403).json({ success: false, error: 'Not authorised to update support requests.' });
    }

    const { status } = req.body || {};
    const allowed = ['open', 'in_progress', 'resolved', 'closed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }

    const updated = await SupportRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Request not found.' });

    return res.json({ success: true, data: { id: updated._id.toString(), status: updated.status } });
  } catch (err) {
    console.error('[PATCH /api/support/:id/status]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
