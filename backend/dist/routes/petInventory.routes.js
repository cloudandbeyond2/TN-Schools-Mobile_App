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
const prisma_1 = require("../config/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
// PET portal — sports equipment inventory & equipment requests.
//
// Availability is derived on the client (available = qty - issued - damaged);
// this API stores the raw counters. Request status transitions that move
// physical stock (issue / return / receive) adjust the linked inventory item
// in the same transaction so the counters can't drift.
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireMinRole)('PET'));
const ITEM_STRING_FIELDS = [
    'schoolId', 'item', 'category', 'condition', 'location', 'lastChecked', 'expiryDate', 'remarks',
];
const ITEM_NUMBER_FIELDS = ['qty', 'qtyIssued', 'qtyDamaged', 'minQty'];
const REQUEST_STRING_FIELDS = [
    'schoolId', 'type', 'item', 'itemId', 'requestedBy', 'purpose', 'date', 'neededBy', 'status', 'notes',
];
const REQUEST_NUMBER_FIELDS = ['qty'];
function pick(body, strings, numbers) {
    const data = {};
    for (const key of strings) {
        if (typeof body[key] === 'string')
            data[key] = body[key];
    }
    for (const key of numbers) {
        if (body[key] !== undefined && body[key] !== null && !Number.isNaN(Number(body[key]))) {
            data[key] = Number(body[key]);
        }
    }
    return data;
}
function schoolScope(req) {
    var _a;
    return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.schoolId) ? { schoolId: req.user.schoolId } : {};
}
function stampSchool(req, data) {
    var _a;
    if (!data.schoolId && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.schoolId))
        data.schoolId = req.user.schoolId;
    return data;
}
// ── Inventory items ─────────────────────────────────────────────────────────
// GET /api/pet/inventory/items
router.get('/items', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield prisma_1.prisma.petInventoryItem.findMany({
            where: schoolScope(req),
            orderBy: [{ category: 'asc' }, { item: 'asc' }],
        });
        res.json({ success: true, data: items });
    }
    catch (err) {
        console.error('Error fetching PET inventory:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/pet/inventory/items
router.post('/items', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = stampSchool(req, pick(req.body, ITEM_STRING_FIELDS, ITEM_NUMBER_FIELDS));
        if (!data.item)
            return res.status(400).json({ success: false, error: 'item is required' });
        const created = yield prisma_1.prisma.petInventoryItem.create({ data: data });
        res.json({ success: true, data: created });
    }
    catch (err) {
        console.error('Error creating PET inventory item:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/pet/inventory/items/bulk — import a stock list (e.g. defaults)
router.post('/items/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'items must be a non-empty array' });
        }
        const rows = items
            .map((i) => stampSchool(req, pick(i, ITEM_STRING_FIELDS, ITEM_NUMBER_FIELDS)))
            .filter((i) => i.item);
        if (rows.length === 0)
            return res.status(400).json({ success: false, error: 'every item needs a name' });
        const created = yield prisma_1.prisma.$transaction(rows.map((row) => prisma_1.prisma.petInventoryItem.create({ data: row })));
        res.json({ success: true, data: created });
    }
    catch (err) {
        console.error('Error bulk-creating PET inventory items:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/pet/inventory/items/:id
router.put('/items/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.petInventoryItem.findFirst({ where: Object.assign({ id }, schoolScope(req)) });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Item not found' });
        const data = pick(req.body, ITEM_STRING_FIELDS, ITEM_NUMBER_FIELDS);
        delete data.schoolId;
        const updated = yield prisma_1.prisma.petInventoryItem.update({ where: { id }, data: data });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('Error updating PET inventory item:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/pet/inventory/items/:id
router.delete('/items/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.petInventoryItem.findFirst({ where: Object.assign({ id }, schoolScope(req)) });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Item not found' });
        yield prisma_1.prisma.petInventoryItem.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting PET inventory item:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ── Equipment requests ──────────────────────────────────────────────────────
const VALID_TRANSITIONS = {
    Pending: ['Approved', 'Rejected'],
    Approved: ['Issued', 'Received', 'Rejected'],
    Issued: ['Returned'],
};
// GET /api/pet/inventory/requests
router.get('/requests', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requests = yield prisma_1.prisma.petEquipmentRequest.findMany({
            where: schoolScope(req),
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: requests });
    }
    catch (err) {
        console.error('Error fetching PET equipment requests:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/pet/inventory/requests
router.post('/requests', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = stampSchool(req, pick(req.body, REQUEST_STRING_FIELDS, REQUEST_NUMBER_FIELDS));
        if (!data.item)
            return res.status(400).json({ success: false, error: 'item is required' });
        if (!data.qty || Number(data.qty) < 1)
            data.qty = 1;
        data.status = 'Pending'; // requests always start pending
        const created = yield prisma_1.prisma.petEquipmentRequest.create({ data: data });
        res.json({ success: true, data: created });
    }
    catch (err) {
        console.error('Error creating PET equipment request:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/pet/inventory/requests/:id — edit fields and/or advance status.
// Stock-moving transitions update the linked item atomically:
//   Approved -> Issued   : item.qtyIssued += qty
//   Issued   -> Returned : item.qtyIssued -= qty
//   Approved -> Received : item.qty      += qty (purchase restock)
router.put('/requests/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.petEquipmentRequest.findFirst({ where: Object.assign({ id }, schoolScope(req)) });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Request not found' });
        const data = pick(req.body, REQUEST_STRING_FIELDS, REQUEST_NUMBER_FIELDS);
        delete data.schoolId;
        const newStatus = typeof data.status === 'string' ? data.status : undefined;
        if (newStatus && newStatus !== existing.status) {
            const allowed = VALID_TRANSITIONS[existing.status] || [];
            if (!allowed.includes(newStatus)) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot move request from '${existing.status}' to '${newStatus}'`,
                });
            }
        }
        const ops = [prisma_1.prisma.petEquipmentRequest.update({ where: { id }, data: data })];
        if (newStatus && newStatus !== existing.status && existing.itemId) {
            const item = yield prisma_1.prisma.petInventoryItem.findUnique({ where: { id: existing.itemId } });
            if (item) {
                if (newStatus === 'Issued' && existing.type === 'Issue') {
                    ops.push(prisma_1.prisma.petInventoryItem.update({
                        where: { id: item.id },
                        data: { qtyIssued: item.qtyIssued + existing.qty },
                    }));
                }
                else if (newStatus === 'Returned' && existing.type === 'Issue') {
                    ops.push(prisma_1.prisma.petInventoryItem.update({
                        where: { id: item.id },
                        data: { qtyIssued: Math.max(0, item.qtyIssued - existing.qty) },
                    }));
                }
                else if (newStatus === 'Received' && existing.type === 'Purchase') {
                    ops.push(prisma_1.prisma.petInventoryItem.update({
                        where: { id: item.id },
                        data: { qty: item.qty + existing.qty },
                    }));
                }
            }
        }
        const [updated] = yield prisma_1.prisma.$transaction(ops);
        res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('Error updating PET equipment request:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/pet/inventory/requests/:id
router.delete('/requests/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.petEquipmentRequest.findFirst({ where: Object.assign({ id }, schoolScope(req)) });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Request not found' });
        yield prisma_1.prisma.petEquipmentRequest.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting PET equipment request:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
