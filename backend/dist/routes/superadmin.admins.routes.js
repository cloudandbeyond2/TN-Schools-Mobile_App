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
const password_1 = require("../utils/password");
const auth_middleware_1 = require("../middleware/auth.middleware");
// Superadmin account management. Everything here is superadmin-only.
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireRole)(['SUPERADMIN']));
// Never return passwordHash
const SAFE_ADMIN_SELECT = {
    id: true,
    name: true,
    email: true,
    mobile: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
};
// GET /api/superadmin/admins — list all superadmin users
router.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admins = yield prisma_1.prisma.user.findMany({
            where: { role: 'SUPERADMIN' },
            orderBy: { createdAt: 'asc' },
            select: SAFE_ADMIN_SELECT,
        });
        res.json({ success: true, count: admins.length, data: admins });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/superadmin/admins — create a superadmin user
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, mobile, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
        }
        if (String(password).length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }
        const existing = yield prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ success: false, error: 'User with this email already exists' });
        }
        if (mobile) {
            const existingMobile = yield prisma_1.prisma.user.findUnique({ where: { mobile } });
            if (existingMobile) {
                return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
            }
        }
        const admin = yield prisma_1.prisma.user.create({
            data: {
                name,
                email,
                mobile: mobile || null,
                role: 'SUPERADMIN',
                passwordHash: yield (0, password_1.hashPassword)(password),
            },
            select: SAFE_ADMIN_SELECT,
        });
        res.status(201).json({ success: true, data: admin });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/superadmin/admins/:id/password — change password.
// Changing your own password requires the current password.
router.put('/:id/password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || String(newPassword).length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }
        const target = yield prisma_1.prisma.user.findUnique({ where: { id } });
        if (!target || target.role !== 'SUPERADMIN') {
            return res.status(404).json({ success: false, error: 'Superadmin account not found' });
        }
        if (id === ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
            const ok = yield (0, password_1.verifyPassword)(currentPassword || '', target.passwordHash);
            if (!ok) {
                return res.status(400).json({ success: false, error: 'Current password is incorrect' });
            }
        }
        yield prisma_1.prisma.user.update({
            where: { id },
            data: { passwordHash: yield (0, password_1.hashPassword)(newPassword) },
        });
        res.json({ success: true, message: 'Password updated successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/superadmin/admins/:id — edit name/email/mobile or activate/deactivate.
// Refuses to deactivate yourself or the last active superadmin.
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { name, email, mobile, isActive } = req.body;
        const target = yield prisma_1.prisma.user.findUnique({ where: { id } });
        if (!target || target.role !== 'SUPERADMIN') {
            return res.status(404).json({ success: false, error: 'Superadmin account not found' });
        }
        if (isActive === false) {
            if (id === ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)) {
                return res.status(400).json({ success: false, error: 'You cannot deactivate your own account' });
            }
            const activeCount = yield prisma_1.prisma.user.count({ where: { role: 'SUPERADMIN', isActive: true } });
            if (target.isActive && activeCount <= 1) {
                return res.status(400).json({ success: false, error: 'Cannot deactivate the last active superadmin' });
            }
        }
        if (email && email !== target.email) {
            const dup = yield prisma_1.prisma.user.findUnique({ where: { email } });
            if (dup) {
                return res.status(400).json({ success: false, error: 'User with this email already exists' });
            }
        }
        if (mobile && mobile !== target.mobile) {
            const dup = yield prisma_1.prisma.user.findUnique({ where: { mobile } });
            if (dup) {
                return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
            }
        }
        const updated = yield prisma_1.prisma.user.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                email: email !== undefined ? email : undefined,
                mobile: mobile !== undefined ? (mobile || null) : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            },
            select: SAFE_ADMIN_SELECT,
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
