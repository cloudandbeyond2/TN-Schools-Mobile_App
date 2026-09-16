import { Router, Request, Response } from 'express';
import { ManagedPage } from '../models/mongo';
import { requireRole } from '../middleware/auth.middleware';

const router = Router();

// GET / stays public (PortalLayout fetches it pre-render); all mutations
// are superadmin-only.
const superadminOnly = requireRole(['SUPERADMIN']);

// POST /api/pages/sync — Upsert all portal pages from catalog
router.post('/sync', superadminOnly, async (req: Request, res: Response) => {
  try {
    const { pages } = req.body;
    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ success: false, error: 'pages array is required' });
    }

    const deduped = new Map<string, (typeof pages)[number]>();
    for (const page of pages) {
      if (!page?.route) continue;
      deduped.set(page.route, page);
    }

    const ops = Array.from(deduped.values()).map((page) => ({
      updateOne: {
        filter: { route: page.route },
        update: {
          $set: {
            title: page.title,
            icon: page.icon,
            roles: page.roles || [],
            portal: page.portal || 'STUDENT',
          },
          $setOnInsert: {
            isEnabled: page.isEnabled ?? true,
            description: page.description,
          },
        },
        upsert: true,
      },
    }));

    const result = ops.length > 0 ? await ManagedPage.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };
    const created = result.upsertedCount ?? 0;
    const updated = result.modifiedCount ?? 0;

    const allPages = await ManagedPage.find().sort({ portal: 1, title: 1 });
    res.json({ success: true, created, updated, count: allPages.length, data: allPages });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/pages/bulk — Bulk enable/disable by portal or ids
router.put('/bulk', superadminOnly, async (req: Request, res: Response) => {
  try {
    const { portal, ids, isEnabled } = req.body;
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isEnabled boolean is required' });
    }

    let filter: Record<string, unknown> = {};
    if (ids && Array.isArray(ids) && ids.length > 0) {
      filter = { _id: { $in: ids } };
    } else if (portal) {
      filter = { portal };
    } else {
      return res.status(400).json({ success: false, error: 'portal or ids is required' });
    }

    const result = await ManagedPage.updateMany(filter, { $set: { isEnabled } });
    const pages = await ManagedPage.find().sort({ portal: 1, title: 1 });
    res.json({ success: true, modified: result.modifiedCount, data: pages });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/pages — List all pages (optional ?portal=TEACHER filter)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { portal } = req.query;
    const filter = portal ? { portal: String(portal) } : {};
    const pages = await ManagedPage.find(filter).sort({ portal: 1, title: 1 });
    res.json({ success: true, count: pages.length, data: pages });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/pages — Create dynamic page
router.post('/', superadminOnly, async (req: Request, res: Response) => {
  try {
    const { title, route, icon, roles, portal, isEnabled, description } = req.body;
    if (!title || !route || !icon) {
      return res.status(400).json({ success: false, error: 'title, route, and icon are required' });
    }

    const existing = await ManagedPage.findOne({ route });
    if (existing) {
      return res.status(400).json({ success: false, error: 'A page with this route already exists' });
    }

    const newPage = await ManagedPage.create({
      title,
      route,
      icon,
      roles: roles || [],
      portal: portal || 'STUDENT',
      isEnabled: isEnabled ?? true,
      description,
    });

    res.status(201).json({ success: true, data: newPage });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/pages/:id — Update dynamic page
router.put('/:id', superadminOnly, async (req: Request, res: Response) => {
  try {
    const { title, route, icon, roles, portal, isEnabled, description } = req.body;

    const page = await ManagedPage.findById(req.params.id);
    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    if (title !== undefined) page.title = title;
    if (route !== undefined) page.route = route;
    if (icon !== undefined) page.icon = icon;
    if (roles !== undefined) page.roles = roles;
    if (portal !== undefined) page.portal = portal;
    if (isEnabled !== undefined) page.isEnabled = isEnabled;
    if (description !== undefined) page.description = description;

    await page.save();
    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/pages/:id — Delete dynamic page
router.delete('/:id', superadminOnly, async (req: Request, res: Response) => {
  try {
    const page = await ManagedPage.findByIdAndDelete(req.params.id);
    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }
    res.json({ success: true, message: 'Page deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
