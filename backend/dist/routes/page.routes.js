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
// GET / stays public (PortalLayout fetches it pre-render); all mutations
// are superadmin-only.
const superadminOnly = (0, auth_middleware_1.requireRole)(['SUPERADMIN']);
// POST /api/pages/sync — Upsert all portal pages from catalog
router.post('/sync', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { pages } = req.body;
        if (!Array.isArray(pages) || pages.length === 0) {
            return res.status(400).json({ success: false, error: 'pages array is required' });
        }
        const deduped = new Map();
        for (const page of pages) {
            if (!(page === null || page === void 0 ? void 0 : page.route))
                continue;
            deduped.set(page.route, page);
        }
        const ops = Array.from(deduped.values()).map((page) => {
            var _a;
            return ({
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
                            isEnabled: (_a = page.isEnabled) !== null && _a !== void 0 ? _a : true,
                            description: page.description,
                        },
                    },
                    upsert: true,
                },
            });
        });
        const result = ops.length > 0 ? yield mongo_1.ManagedPage.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };
        const created = (_a = result.upsertedCount) !== null && _a !== void 0 ? _a : 0;
        const updated = (_b = result.modifiedCount) !== null && _b !== void 0 ? _b : 0;
        const allPages = yield mongo_1.ManagedPage.find().sort({ portal: 1, title: 1 });
        res.json({ success: true, created, updated, count: allPages.length, data: allPages });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/pages/bulk — Bulk enable/disable by portal or ids
router.put('/bulk', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { portal, ids, isEnabled } = req.body;
        if (typeof isEnabled !== 'boolean') {
            return res.status(400).json({ success: false, error: 'isEnabled boolean is required' });
        }
        let filter = {};
        if (ids && Array.isArray(ids) && ids.length > 0) {
            filter = { _id: { $in: ids } };
        }
        else if (portal) {
            filter = { portal };
        }
        else {
            return res.status(400).json({ success: false, error: 'portal or ids is required' });
        }
        const result = yield mongo_1.ManagedPage.updateMany(filter, { $set: { isEnabled } });
        const pages = yield mongo_1.ManagedPage.find().sort({ portal: 1, title: 1 });
        res.json({ success: true, modified: result.modifiedCount, data: pages });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/pages — List all pages (optional ?portal=TEACHER filter)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { portal } = req.query;
        const filter = portal ? { portal: String(portal) } : {};
        const pages = yield mongo_1.ManagedPage.find(filter).sort({ portal: 1, title: 1 });
        res.json({ success: true, count: pages.length, data: pages });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/pages — Create dynamic page
router.post('/', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, route, icon, roles, portal, isEnabled, description } = req.body;
        if (!title || !route || !icon) {
            return res.status(400).json({ success: false, error: 'title, route, and icon are required' });
        }
        const existing = yield mongo_1.ManagedPage.findOne({ route });
        if (existing) {
            return res.status(400).json({ success: false, error: 'A page with this route already exists' });
        }
        const newPage = yield mongo_1.ManagedPage.create({
            title,
            route,
            icon,
            roles: roles || [],
            portal: portal || 'STUDENT',
            isEnabled: isEnabled !== null && isEnabled !== void 0 ? isEnabled : true,
            description,
        });
        res.status(201).json({ success: true, data: newPage });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/pages/:id — Update dynamic page
router.put('/:id', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, route, icon, roles, portal, isEnabled, description } = req.body;
        const page = yield mongo_1.ManagedPage.findById(req.params.id);
        if (!page) {
            return res.status(404).json({ success: false, error: 'Page not found' });
        }
        if (title !== undefined)
            page.title = title;
        if (route !== undefined)
            page.route = route;
        if (icon !== undefined)
            page.icon = icon;
        if (roles !== undefined)
            page.roles = roles;
        if (portal !== undefined)
            page.portal = portal;
        if (isEnabled !== undefined)
            page.isEnabled = isEnabled;
        if (description !== undefined)
            page.description = description;
        yield page.save();
        res.json({ success: true, data: page });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/pages/:id — Delete dynamic page
router.delete('/:id', superadminOnly, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = yield mongo_1.ManagedPage.findByIdAndDelete(req.params.id);
        if (!page) {
            return res.status(404).json({ success: false, error: 'Page not found' });
        }
        res.json({ success: true, message: 'Page deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
