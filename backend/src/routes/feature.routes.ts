import { Router, Request, Response } from 'express';
import { FeatureModule, ManagedPage, PlatformSetting } from '../models/mongo';
import { requireRole } from '../middleware/auth.middleware';

const router = Router();

// Route prefix per portal, used to expand a module's per-portal disable
// into concrete frontend routes. SUPERADMIN is exempt from gating entirely.
const PORTAL_PREFIX: Record<string, string> = {
  STUDENT: '/student',
  TEACHER: '/teacher',
  PARENT: '/parent',
  PET: '/pet',
  HEADMASTER: '/headmaster',
  BEO: '/block-education-officer',
  DEO: '/district-education-officer',
  COMMISSIONER: '/commissioner',
  MINISTER: '/minister',
};

const superadminOnly = requireRole(['SUPERADMIN']);

function portalsToObject(portals: unknown): Record<string, boolean> {
  if (portals instanceof Map) return Object.fromEntries(portals);
  if (portals && typeof portals === 'object') return portals as Record<string, boolean>;
  return {};
}

// GET /api/features/effective — public: PortalLayout fetches this pre-render
// (same trust level as GET /api/pages today). Unions ManagedPage and
// FeatureModule disables into one route set.
router.get('/effective', async (_req: Request, res: Response) => {
  try {
    const [disabledPages, modules, settings] = await Promise.all([
      ManagedPage.find({ isEnabled: false }).select('route'),
      FeatureModule.find(),
      PlatformSetting.findOne({ key: 'global' }),
    ]);

    const disabledRoutes = new Set<string>(disabledPages.map((p: { route: string }) => p.route));
    const disabledFeatureKeys: string[] = [];
    const aiGloballyOff = settings ? settings.enableAiFeatures === false : false;

    // Portal-level master switches
    const portalVisibility = {
      beo: settings ? settings.enableBeoPortal !== false : true,
      deo: settings ? settings.enableDeoPortal !== false : true,
      commissioner: settings ? settings.enableCommissionerPortal !== false : true,
      minister: settings ? settings.enableMinisterPortal !== false : true,
      pet: settings ? settings.enablePetPortal !== false : true,
    };

    if (!portalVisibility.beo) {
      disabledRoutes.add('/block-education-officer');
      disabledRoutes.add('/super-admin/beos');
      disabledRoutes.add('/district-education-officer/beos');
    }
    if (!portalVisibility.deo) {
      disabledRoutes.add('/district-education-officer');
      disabledRoutes.add('/super-admin/deos');
      disabledRoutes.add('/commissioner/deos');
    }
    if (!portalVisibility.commissioner) {
      disabledRoutes.add('/commissioner');
      disabledRoutes.add('/super-admin/commissioners');
      disabledRoutes.add('/minister/commissioners');
    }
    if (!portalVisibility.minister) {
      disabledRoutes.add('/minister');
      disabledRoutes.add('/super-admin/ministers');
    }
    if (!portalVisibility.pet) {
      disabledRoutes.add('/pet');
      disabledRoutes.add('/student/sports');
    }

    for (const mod of modules) {
      const disabledByAiSwitch = aiGloballyOff && mod.category === 'AI & Learning';
      if (!mod.isEnabled || disabledByAiSwitch) {
        disabledFeatureKeys.push(mod.key);
        for (const route of mod.routes) disabledRoutes.add(route);
        continue;
      }
      const portals = portalsToObject(mod.portals);
      for (const [portal, enabled] of Object.entries(portals)) {
        if (enabled !== false) continue;
        const prefix = PORTAL_PREFIX[portal];
        if (!prefix) continue;
        for (const route of mod.routes) {
          if (route === prefix || route.startsWith(prefix + '/')) disabledRoutes.add(route);
        }
      }
    }

    res.json({
      success: true,
      data: {
        disabledRoutes: Array.from(disabledRoutes),
        disabledFeatureKeys,
        portalVisibility,
        maintenanceMode: settings ? settings.maintenanceMode === true : false,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/features — list all (optional ?kind=FEATURE|MODULE)
router.get('/', superadminOnly, async (req: Request, res: Response) => {
  try {
    const { kind } = req.query;
    const filter = kind ? { kind: String(kind) } : {};
    const items = await FeatureModule.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/features/sync — bulk upsert from catalog; preserves isEnabled and
// portals on existing docs (same shape as POST /api/pages/sync).
router.post('/sync', superadminOnly, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    const deduped = new Map<string, (typeof items)[number]>();
    for (const item of items) {
      if (!item?.key) continue;
      deduped.set(item.key, item);
    }

    const ops = Array.from(deduped.values()).map((item) => ({
      updateOne: {
        filter: { key: item.key },
        update: {
          $set: {
            name: item.name,
            icon: item.icon,
            description: item.description,
            category: item.category,
            kind: item.kind || 'MODULE',
            routes: item.routes || [],
          },
          $setOnInsert: {
            isEnabled: item.isEnabled ?? true,
            portals: item.portals || {},
          },
        },
        upsert: true,
      },
    }));

    const result = ops.length > 0 ? await FeatureModule.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };
    const all = await FeatureModule.find().sort({ category: 1, name: 1 });
    res.json({
      success: true,
      created: result.upsertedCount ?? 0,
      updated: result.modifiedCount ?? 0,
      count: all.length,
      data: all,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/features — create one (modules page "Add Module" modal)
router.post('/', superadminOnly, async (req: Request, res: Response) => {
  try {
    const { key, name, icon, description, category, kind, routes, portals, isEnabled } = req.body;
    if (!key || !name) {
      return res.status(400).json({ success: false, error: 'key and name are required' });
    }
    const existing = await FeatureModule.findOne({ key });
    if (existing) {
      return res.status(400).json({ success: false, error: 'A feature/module with this key already exists' });
    }
    const created = await FeatureModule.create({
      key,
      name,
      icon,
      description,
      category,
      kind: kind || 'MODULE',
      routes: routes || [],
      portals: portals || {},
      isEnabled: isEnabled ?? true,
      updatedBy: req.user?.name || req.user?.id,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/features/bulk — { keys: string[], isEnabled: boolean }
router.put('/bulk', superadminOnly, async (req: Request, res: Response) => {
  try {
    const { keys, isEnabled } = req.body;
    if (!Array.isArray(keys) || keys.length === 0 || typeof isEnabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'keys array and isEnabled boolean are required' });
    }
    const result = await FeatureModule.updateMany({ key: { $in: keys } }, { $set: { isEnabled } });
    const all = await FeatureModule.find().sort({ category: 1, name: 1 });
    res.json({ success: true, modified: result.modifiedCount, data: all });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/features/:key — update master switch, per-portal flags, or metadata.
// portals in the body is a partial merge: { portals: { STUDENT: false } } only
// touches portals.STUDENT.
router.put('/:key', superadminOnly, async (req: Request, res: Response) => {
  try {
    const { name, icon, description, category, kind, routes, portals, isEnabled } = req.body;

    const $set: Record<string, unknown> = { updatedBy: req.user?.name || req.user?.id };
    if (name !== undefined) $set.name = name;
    if (icon !== undefined) $set.icon = icon;
    if (description !== undefined) $set.description = description;
    if (category !== undefined) $set.category = category;
    if (kind !== undefined) $set.kind = kind;
    if (routes !== undefined) $set.routes = routes;
    if (isEnabled !== undefined) $set.isEnabled = isEnabled;
    if (portals && typeof portals === 'object') {
      for (const [portal, enabled] of Object.entries(portals)) {
        $set[`portals.${portal}`] = enabled === true;
      }
    }

    const updated = await FeatureModule.findOneAndUpdate(
      { key: req.params.key },
      { $set },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Feature/module not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/features/:key
router.delete('/:key', superadminOnly, async (req: Request, res: Response) => {
  try {
    const deleted = await FeatureModule.findOneAndDelete({ key: req.params.key });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Feature/module not found' });
    }
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
