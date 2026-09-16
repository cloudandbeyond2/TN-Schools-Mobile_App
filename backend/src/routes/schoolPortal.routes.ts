import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { createDefaultPortal } from './school.routes';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { UPLOAD_LIMITS, documentFileFilter } from '../utils/uploads';

import os from 'os';

// Reuse the same disk-storage / uploads convention as the rest of the API.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = path.join(__dirname, '../../uploads');
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      dir = path.join(os.tmpdir(), 'uploads');
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: UPLOAD_LIMITS, fileFilter: documentFileFilter });

const router = Router();

/* ─────────────────────────────────────────────────────────────
 * PUBLIC: GET /api/school-portal/public/:dise
 * Aggregate payload that powers the public school landing page.
 * ───────────────────────────────────────────────────────────── */
router.get('/public/:dise', async (req: Request, res: Response) => {
  try {
    const school = await prisma.school.findUnique({
      where: { dise: req.params.dise },
      include: {
        portal: { include: { gallery: { orderBy: { order: 'asc' } } } },
        _count: { select: { students: true, teachers: true } },
      },
    });

    if (!school) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }

    // Auto-heal: a school created before this feature existed gets a portal on first view.
    let portal = school.portal;
    if (!portal) {
      await createDefaultPortal(school.id);
      portal = await prisma.schoolPortal.findUnique({
        where: { schoolId: school.id },
        include: { gallery: { orderBy: { order: 'asc' } } },
      });
    }

    if (portal && portal.isPublished === false) {
      return res.status(404).json({ success: false, error: 'This school portal is not published yet.' });
    }

    const [classes, celebrations, culturalEvents, teachers, classCount, staffCount, studentGroupCounts] = await Promise.all([
      prisma.classRoom.findMany({
        where: { schoolId: school.id, isActive: true },
        orderBy: { className: 'asc' },
      }),
      prisma.celebration.findMany({
        where: {
          OR: [
            { schoolId: school.id },
            { schoolId: null },
          ]
        },
        orderBy: { date: 'desc' },
        take: 6,
      }),
      prisma.culturalEvent.findMany({
        where: { schoolId: school.id },
        orderBy: { eventDate: 'desc' },
        take: 6,
      }),
      prisma.headmasterStaff.findMany({
        where: { schoolId: school.id },
        orderBy: { name: 'asc' },
        take: 12,
        select: { id: true, name: true, subject: true, performance: true },
      }),
      prisma.classRoom.count({ where: { schoolId: school.id } }),
      prisma.headmasterStaff.count({ where: { schoolId: school.id } }),
      prisma.student.groupBy({
        by: ['class', 'section'],
        where: { schoolId: school.id },
        _count: { id: true }
      }),
    ]);

    // Merge the two event sources into a single, normalised list.
    const events = [
      ...celebrations.map((c) => ({
        id: c.id,
        title: c.title,
        date: c.date,
        description: c.description,
        type: c.type,
        location: null as string | null,
      })),
      ...culturalEvents.map((c) => ({
        id: c.id,
        title: c.title,
        date: c.eventDate,
        description: c.description,
        type: 'CULTURAL',
        location: c.location,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);

    const uniqueClassesMap = new Map();
    for (const c of classes) {
      const key = `${c.className}-${c.section}`;
      if (!uniqueClassesMap.has(key)) {
        uniqueClassesMap.set(key, c);
      }
    }
    const uniqueClasses = Array.from(uniqueClassesMap.values()).slice(0, 12);

    const enrichedClasses = uniqueClasses.map(c => {
      const match = studentGroupCounts.find(sc => sc.class === c.className && sc.section === c.section);
      return {
        ...c,
        subject: 'General', // override subject since it's a combined class card
        totalStudents: match ? match._count.id : 0
      };
    });

    res.json({
      success: true,
      data: {
        school: {
          id: school.id,
          dise: school.dise,
          name: school.name,
          address: school.address,
          district: school.district,
          block: school.block,
          mediumOfInstruction: school.mediumOfInstruction,
          schoolType: school.schoolType,
          headmasterName: school.headmasterName,
        },
        portal,
        stats: {
          studentCount: school._count.students,
          // HeadmasterStaff is the roster this system actually populates; fall back to the
          // relational Teacher count if no staff records exist yet.
          teacherCount: staffCount || school._count.teachers,
          classCount,
        },
        events,
        teachers,
        classes: enrichedClasses,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ─────────────────────────────────────────────────────────────
 * HEADMASTER: GET /api/school-portal/:schoolId — editable config
 * ───────────────────────────────────────────────────────────── */
router.get('/:schoolId', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, dise: true, name: true },
    });
    if (!school) {
      return res.status(404).json({ success: false, error: 'School not found' });
    }

    let portal = await prisma.schoolPortal.findUnique({
      where: { schoolId },
      include: { gallery: { orderBy: { order: 'asc' } } },
    });
    if (!portal) {
      await createDefaultPortal(schoolId);
      portal = await prisma.schoolPortal.findUnique({
        where: { schoolId },
        include: { gallery: { orderBy: { order: 'asc' } } },
      });
    }

    res.json({ success: true, data: { school, portal } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ─────────────────────────────────────────────────────────────
 * HEADMASTER: PUT /api/school-portal/:schoolId — update text config
 * ───────────────────────────────────────────────────────────── */
router.put('/:schoolId', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { tagline, about, primaryColor, showStudentLogin, showParentLogin, isPublished } = req.body;

    await createDefaultPortal(schoolId); // ensure it exists before updating
    const portal = await prisma.schoolPortal.update({
      where: { schoolId },
      data: {
        ...(tagline !== undefined && { tagline }),
        ...(about !== undefined && { about }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(showStudentLogin !== undefined && { showStudentLogin: Boolean(showStudentLogin) }),
        ...(showParentLogin !== undefined && { showParentLogin: Boolean(showParentLogin) }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
      },
      include: { gallery: { orderBy: { order: 'asc' } } },
    });
    res.json({ success: true, data: portal });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ─────────────────────────────────────────────────────────────
 * HEADMASTER: POST /api/school-portal/:schoolId/banner — upload banner
 * ───────────────────────────────────────────────────────────── */
router.post('/:schoolId/banner', upload.single('banner'), async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No banner file uploaded (field name: banner)' });
    }
    await createDefaultPortal(schoolId);
    const bannerUrl = `/uploads/${req.file.filename}`;
    const portal = await prisma.schoolPortal.update({
      where: { schoolId },
      data: { bannerUrl },
      include: { gallery: { orderBy: { order: 'asc' } } },
    });
    res.json({ success: true, data: portal });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ─────────────────────────────────────────────────────────────
 * HEADMASTER: POST /api/school-portal/:schoolId/gallery — upload/replace image
 * Body (multipart): image file + optional `order` to overwrite that slot.
 * ───────────────────────────────────────────────────────────── */
router.post('/:schoolId/gallery', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    await createDefaultPortal(schoolId);
    const portal = await prisma.schoolPortal.findUnique({ where: { schoolId } });
    if (!portal) {
      return res.status(404).json({ success: false, error: 'Portal not found' });
    }

    const caption = req.body.caption || null;
    const orderRaw = req.body.order;
    const order = orderRaw !== undefined && orderRaw !== '' ? parseInt(orderRaw, 10) : undefined;
    const imageId = req.body.imageId; // support updating by image ID directly

    // 1. If we are updating an existing image by ID (and optionally changing the file/caption)
    if (imageId) {
      const existing = await prisma.schoolGalleryImage.findUnique({ where: { id: imageId } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Image not found' });
      }
      const updated = await prisma.schoolGalleryImage.update({
        where: { id: imageId },
        data: {
          ...(req.file && { imageUrl: `/uploads/${req.file.filename}` }),
          ...(caption !== undefined && { caption }),
        },
      });
      return res.json({ success: true, data: updated });
    }
    
    // 2. If we are updating by order slot
    if (order !== undefined && !Number.isNaN(order)) {
      const existing = await prisma.schoolGalleryImage.findFirst({
        where: { portalId: portal.id, order },
      });
      if (existing) {
        const updated = await prisma.schoolGalleryImage.update({
          where: { id: existing.id },
          data: {
            ...(req.file && { imageUrl: `/uploads/${req.file.filename}` }),
            caption: caption ?? existing.caption,
          },
        });
        return res.json({ success: true, data: updated });
      }
    }

    // 3. New upload (requires file)
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded (field name: image)' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    const count = await prisma.schoolGalleryImage.count({ where: { portalId: portal.id } });
    const created = await prisma.schoolGalleryImage.create({
      data: {
        portalId: portal.id,
        imageUrl,
        caption,
        order: order !== undefined && !Number.isNaN(order) ? order : count,
      },
    });
    res.json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ─────────────────────────────────────────────────────────────
 * HEADMASTER: DELETE /api/school-portal/:schoolId/gallery/:imageId
 * ───────────────────────────────────────────────────────────── */
router.delete('/:schoolId/gallery/:imageId', async (req: Request, res: Response) => {
  try {
    await prisma.schoolGalleryImage.delete({ where: { id: req.params.imageId } });
    res.json({ success: true, message: 'Gallery image removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
