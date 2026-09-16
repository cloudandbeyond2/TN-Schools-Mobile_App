import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { requireRole } from '../middleware/auth.middleware';

// Superadmin account management. Everything here is superadmin-only.
const router = Router();

router.use(requireRole(['SUPERADMIN']));

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
} as const;

// GET /api/superadmin/admins — list all superadmin users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'SUPERADMIN' },
      orderBy: { createdAt: 'asc' },
      select: SAFE_ADMIN_SELECT,
    });
    res.json({ success: true, count: admins.length, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/superadmin/admins — create a superadmin user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, mobile, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }
    if (mobile) {
      const existingMobile = await prisma.user.findUnique({ where: { mobile } });
      if (existingMobile) {
        return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
      }
    }

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        mobile: mobile || null,
        role: 'SUPERADMIN',
        passwordHash: await hashPassword(password),
      },
      select: SAFE_ADMIN_SELECT,
    });
    res.status(201).json({ success: true, data: admin });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/superadmin/admins/:id/password — change password.
// Changing your own password requires the current password.
router.put('/:id/password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'SUPERADMIN') {
      return res.status(404).json({ success: false, error: 'Superadmin account not found' });
    }

    if (id === req.user?.id) {
      const ok = await verifyPassword(currentPassword || '', target.passwordHash);
      if (!ok) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect' });
      }
    }

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/superadmin/admins/:id — edit name/email/mobile or activate/deactivate.
// Refuses to deactivate yourself or the last active superadmin.
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, isActive } = req.body;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'SUPERADMIN') {
      return res.status(404).json({ success: false, error: 'Superadmin account not found' });
    }

    if (isActive === false) {
      if (id === req.user?.id) {
        return res.status(400).json({ success: false, error: 'You cannot deactivate your own account' });
      }
      const activeCount = await prisma.user.count({ where: { role: 'SUPERADMIN', isActive: true } });
      if (target.isActive && activeCount <= 1) {
        return res.status(400).json({ success: false, error: 'Cannot deactivate the last active superadmin' });
      }
    }

    if (email && email !== target.email) {
      const dup = await prisma.user.findUnique({ where: { email } });
      if (dup) {
        return res.status(400).json({ success: false, error: 'User with this email already exists' });
      }
    }
    if (mobile && mobile !== target.mobile) {
      const dup = await prisma.user.findUnique({ where: { mobile } });
      if (dup) {
        return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
      }
    }

    const updated = await prisma.user.update({
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
