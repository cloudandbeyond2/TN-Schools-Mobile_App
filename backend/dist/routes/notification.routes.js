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
const crypto_1 = require("crypto");
const userResolver_1 = require("../config/userResolver");
const router = (0, express_1.Router)();
// ─── GET /api/notifications?userId=[userId] ──────────────────────
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId is required' });
        }
        const resolvedId = yield (0, userResolver_1.resolveUserId)(String(userId));
        if (!resolvedId) {
            return res.json({ success: true, data: [] });
        }
        const notifications = yield prisma_1.prisma.$queryRaw `
      SELECT id, "userId", message, "read", "createdAt"
      FROM "Notification"
      WHERE "userId" = ${resolvedId}
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;
        return res.json({ success: true, data: notifications });
    }
    catch (err) {
        console.error('[GET /api/notifications]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── POST /api/notifications ─────────────────────────────────────
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ success: false, error: 'userId and message are required' });
        }
        const resolvedId = yield (0, userResolver_1.resolveUserId)(String(userId));
        if (!resolvedId) {
            return res.status(400).json({ success: false, error: 'Could not resolve userId to a PostgreSQL User' });
        }
        const id = (0, crypto_1.randomUUID)();
        const now = new Date();
        const rows = yield prisma_1.prisma.$queryRaw `
      INSERT INTO "Notification" (id, "userId", message, "read", "createdAt")
      VALUES (${id}, ${resolvedId}, ${message}, false, ${now})
      RETURNING *
    `;
        return res.status(201).json({ success: true, data: rows[0] });
    }
    catch (err) {
        console.error('[POST /api/notifications]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── PUT /api/notifications/read-all ─────────────────────────────
router.put('/read-all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId is required' });
        }
        const resolvedId = yield (0, userResolver_1.resolveUserId)(String(userId));
        if (!resolvedId) {
            return res.status(400).json({ success: false, error: 'Could not resolve userId to a PostgreSQL User' });
        }
        yield prisma_1.prisma.$queryRaw `
      UPDATE "Notification"
      SET "read" = true
      WHERE "userId" = ${resolvedId} AND "read" = false
    `;
        return res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (err) {
        console.error('[PUT /api/notifications/read-all]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── PUT /api/notifications/:id/read ─────────────────────────────
router.put('/:id/read', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const rows = yield prisma_1.prisma.$queryRaw `
      UPDATE "Notification"
      SET "read" = true
      WHERE id = ${id}
      RETURNING *
    `;
        if (!rows.length) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }
        return res.json({ success: true, data: rows[0] });
    }
    catch (err) {
        console.error('[PUT /api/notifications/:id/read]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── DELETE /api/notifications/:id ────────────────────────────────
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.$queryRaw `DELETE FROM "Notification" WHERE id = ${id}`;
        return res.json({ success: true, message: 'Notification deleted' });
    }
    catch (err) {
        console.error('[DELETE /api/notifications/:id]', err);
        return res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
