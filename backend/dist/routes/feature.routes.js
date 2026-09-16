"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongo_1 = require("../models/mongo");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Route prefix per portal, used to expand a module's per-portal disable
// into concrete frontend routes. SUPERADMIN is exempt from gating entirely.
const PORTAL_PREFIX = {
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
const superadminOnly = (0, auth_middleware_1.requireRole)(['SUPERADMIN']);
function portalsToObject(portals) {
    if (portals instanceof Map)
        return Object.fromEntries(portals);
    if (portals && typeof portals === 'object')
        return portals;
    return {};
}
// GET /api/features/effective — public: PortalLayout fetches this pre-render
// (same trust level as GET /api/pages today). Unions ManagedPage and
// FeatureModule disables into one route set.
router.get('/effective', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [disabledPages, modules, settings] = yield Promise.all([
            mongo_1.ManagedPage.find({ isEnabled: false }).select('route'),
            mongo_1.FeatureModule.find(),
            mongo_1.PlatformSetting.findOne({ key: 'global' }),
        ]);
        const disabledRoutes = new Set(disabledPages.map((p) => p.route));
        const disabledFeatureKeys = [];
        const aiGloballyOff = settings ? settings.enableAiFeatures === false : false;
        for (const mod of modules) {
            const disabledByAiSwitch = aiGloballyOff && mod.category === 'AI & Learning';
            if (!mod.isEnabled || disabledByAiSwitch) {
                disabledFeatureKeys.push(mod.key);
                for (const route of mod.routes)
                    disabledRoutes.add(route);
                continue;
            }
            const portals = portalsToObject(mod.portals);
            for (const [portal, enabled] of Object.entries(portals)) {
                if (enabled !== false)
                    continue;
                const prefix = PORTAL_PREFIX[portal];
                if (!prefix)
                    continue;
                for (const route of mod.routes) {
                    if (route === prefix || route.startsWith(prefix + '/'))
                        disabledRoutes.add(route);
                }
            }
        }
        res.json({
            success: true,
            data: {
                disabledRoutes: Array.from(disabledRoutes),
                disabledFeatureKeys,
                maintenanceMode: settings ? settings.maintenanceMode === true : false,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/features — list all (optional ?kind=FEATURE|MODULE)
router.get('/', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { kind } = req.query;
        const filter = kind ? { kind: String(kind) } : {};
        const items = yield mongo_1.FeatureModule.find(filter).sort({ category: 1, name: 1 });
        res.json({ success: true, count: items.length, data: items });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/features/sync — bulk upsert from catalog; preserves isEnabled and
// portals on existing docs (same shape as POST /api/pages/sync).
router.post('/sync', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'items array is required' });
        }
        const deduped = new Map();
        for (const item of items) {
            if (!(item === null || item === void 0 ? void 0 : item.key))
                continue;
            deduped.set(item.key, item);
        }
        const ops = Array.from(deduped.values()).map((item) => {
            var _a;
            return ({
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
                            isEnabled: (_a = item.isEnabled) !== null && _a !== void 0 ? _a : true,
                            portals: item.portals || {},
                        },
                    },
                    upsert: true,
                },
            });
        });
        const result = ops.length > 0 ? yield mongo_1.FeatureModule.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };
        const all = yield mongo_1.FeatureModule.find().sort({ category: 1, name: 1 });
        res.json({
            success: true,
            created: (_a = result.upsertedCount) !== null && _a !== void 0 ? _a : 0,
            updated: (_b = result.modifiedCount) !== null && _b !== void 0 ? _b : 0,
            count: all.length,
            data: all,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/features — create one (modules page "Add Module" modal)
router.post('/', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { key, name, icon, description, category, kind, routes, portals, isEnabled } = req.body;
        if (!key || !name) {
            return res.status(400).json({ success: false, error: 'key and name are required' });
        }
        const existing = yield mongo_1.FeatureModule.findOne({ key });
        if (existing) {
            return res.status(400).json({ success: false, error: 'A feature/module with this key already exists' });
        }
        const created = yield mongo_1.FeatureModule.create({
            key,
            name,
            icon,
            description,
            category,
            kind: kind || 'MODULE',
            routes: routes || [],
            portals: portals || {},
            isEnabled: isEnabled !== null && isEnabled !== void 0 ? isEnabled : true,
            updatedBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.name) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id),
        });
        res.status(201).json({ success: true, data: created });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/features/bulk — { keys: string[], isEnabled: boolean }
router.put('/bulk', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { keys, isEnabled } = req.body;
        if (!Array.isArray(keys) || keys.length === 0 || typeof isEnabled !== 'boolean') {
            return res.status(400).json({ success: false, error: 'keys array and isEnabled boolean are required' });
        }
        const result = yield mongo_1.FeatureModule.updateMany({ key: { $in: keys } }, { $set: { isEnabled } });
        const all = yield mongo_1.FeatureModule.find().sort({ category: 1, name: 1 });
        res.json({ success: true, modified: result.modifiedCount, data: all });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/features/:key — update master switch, per-portal flags, or metadata.
// portals in the body is a partial merge: { portals: { STUDENT: false } } only
// touches portals.STUDENT.
router.put('/:key', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { name, icon, description, category, kind, routes, portals, isEnabled } = req.body;
        const $set = { updatedBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.name) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) };
        if (name !== undefined)
            $set.name = name;
        if (icon !== undefined)
            $set.icon = icon;
        if (description !== undefined)
            $set.description = description;
        if (category !== undefined)
            $set.category = category;
        if (kind !== undefined)
            $set.kind = kind;
        if (routes !== undefined)
            $set.routes = routes;
        if (isEnabled !== undefined)
            $set.isEnabled = isEnabled;
        if (portals && typeof portals === 'object') {
            for (const [portal, enabled] of Object.entries(portals)) {
                $set[`portals.${portal}`] = enabled === true;
            }
        }
        const updated = yield mongo_1.FeatureModule.findOneAndUpdate({ key: req.params.key }, { $set }, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Feature/module not found' });
        }
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/features/:key
router.delete('/:key', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield mongo_1.FeatureModule.findOneAndDelete({ key: req.params.key });
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Feature/module not found' });
        }
        res.json({ success: true, message: 'Deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
