import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { randomUUID } from 'crypto';

const router = Router();

// ─── GET /api/digital-library?schoolId=&subject=&type=&class= ────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { schoolId, subject, type, class: cls, search } = req.query;

    const rows: any[] = await prisma.$queryRaw`
      SELECT r.*, u.name as "teacherName"
      FROM "DigitalLibraryResource" r
      LEFT JOIN "User" u ON r."teacherId" = u.id
      WHERE r."isActive" = true
        ${schoolId 
          ? prisma.$queryRaw`AND (r."schoolId" = ${String(schoolId)} OR r."schoolId" IS NULL)` 
          : prisma.$queryRaw`AND r."schoolId" IS NULL`
        }
        ${subject ? prisma.$queryRaw`AND r.subject = ${String(subject)}` : prisma.$queryRaw``}
        ${type ? prisma.$queryRaw`AND r.type = ${String(type)}` : prisma.$queryRaw``}
        ${cls ? prisma.$queryRaw`AND r.class = ${String(cls)}` : prisma.$queryRaw``}
        ${search ? prisma.$queryRaw`AND (r.title ILIKE ${'%' + String(search) + '%'} OR r.description ILIKE ${'%' + String(search) + '%'})` : prisma.$queryRaw``}
      ORDER BY r."uploadDate" DESC
    `;

    return res.json({ success: true, data: rows, count: rows.length });
  } catch (err: any) {
    console.error('[GET /api/digital-library]', err.message);
    // Fall back to Prisma ORM on raw query error
    try {
      const where: any = { isActive: true };
      const conditions: any[] = [];

      if (req.query.schoolId) {
        conditions.push({
          OR: [
            { schoolId: String(req.query.schoolId) },
            { schoolId: null }
          ]
        });
      } else {
        conditions.push({
          schoolId: null
        });
      }
      if (req.query.subject)  where.subject  = String(req.query.subject);
      if (req.query.type)     where.type      = String(req.query.type);
      if (req.query.class)    where.class     = String(req.query.class);
      if (req.query.search) {
        conditions.push({
          OR: [
            { title: { contains: String(req.query.search), mode: 'insensitive' } },
            { description: { contains: String(req.query.search), mode: 'insensitive' } },
          ]
        });
      }

      if (conditions.length > 0) {
        where.AND = conditions;
      }

      const data = await prisma.digitalLibraryResource.findMany({
        where,
        orderBy: { uploadDate: 'desc' },
      });

      const teacherIds = Array.from(new Set(data.map(item => item.teacherId).filter(Boolean)));
      const teacherMap = new Map<string, string>();
      if (teacherIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: teacherIds as string[] } },
          select: { id: true, name: true }
        });
        users.forEach(u => {
          teacherMap.set(u.id, u.name);
        });
      }

      const dataWithTeacher = data.map(item => ({
        ...item,
        teacherName: item.teacherId ? teacherMap.get(item.teacherId) : undefined
      }));

      return res.json({ success: true, data: dataWithTeacher, count: dataWithTeacher.length });
    } catch (e2: any) {
      console.error('[GET /api/digital-library] Fallback failed:', e2.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch resources' });
    }
  }
});

// ─── GET /api/digital-library/:id ────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.digitalLibraryResource.findUnique({
      where: { id: req.params.id },
    });
    if (!item) return res.status(404).json({ success: false, error: 'Resource not found' });
    // bump view count
    await prisma.digitalLibraryResource.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } },
    });
    return res.json({ success: true, data: item });
  } catch (err: any) {
    console.error('[GET /api/digital-library/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch resource' });
  }
});

// ─── POST /api/digital-library ───────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, type, subject, class: cls, size, description, tags, fileUrl, aiContent, schoolId, teacherId } = req.body;

    if (!title || !type || !subject || !cls) {
      return res.status(400).json({
        success: false,
        error: 'title, type, subject, and class are required',
      });
    }

    const id  = randomUUID();
    const now = new Date();
    const tagsArr = Array.isArray(tags) ? tags : (tags ? [tags] : []);

    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO "DigitalLibraryResource"
        (id, title, type, subject, class, size, description, tags, "fileUrl", "aiContent",
         "uploadDate", downloads, views, "schoolId", "teacherId", "isActive", "createdAt", "updatedAt")
      VALUES
        (${id}, ${title}, ${type}, ${subject}, ${String(cls)},
         ${size || 'N/A'}, ${description || null}, ${tagsArr}, ${fileUrl || null}, ${aiContent || null},
         ${now}, 0, 0, ${schoolId || null}, ${teacherId || null}, true, ${now}, ${now})
      RETURNING *
    `;

    return res.status(201).json({
      success: true,
      data: rows[0],
      message: `"${title}" added to Digital Library`,
    });
  } catch (err: any) {
    console.error('[POST /api/digital-library]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to add resource' });
  }
});

// ─── PUT /api/digital-library/:id ────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.$queryRaw`SELECT * FROM "DigitalLibraryResource" WHERE id = ${req.params.id}`;
    if (!existing || (existing as any[]).length === 0) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    const curr = (existing as any[])[0];
    const { title, type, subject, class: cls, size, description, tags, fileUrl, aiContent, isActive, downloads } = req.body;
    const now = new Date();
    const tagsArr = tags !== undefined ? (Array.isArray(tags) ? tags : [tags]) : curr.tags;

    const rows: any[] = await prisma.$queryRaw`
      UPDATE "DigitalLibraryResource"
      SET
        title       = ${title       ?? curr.title},
        type        = ${type        ?? curr.type},
        subject     = ${subject     ?? curr.subject},
        class       = ${cls         ?? curr.class},
        size        = ${size        ?? curr.size},
        description = ${description ?? curr.description},
        tags        = ${tagsArr},
        "fileUrl"   = ${fileUrl     ?? curr.fileUrl},
        "aiContent" = ${aiContent   ?? curr.aiContent},
        "isActive"  = ${isActive    !== undefined ? Boolean(isActive) : curr.isActive},
        downloads   = ${downloads   !== undefined ? Number(downloads) : curr.downloads},
        "updatedAt" = ${now}
      WHERE id = ${req.params.id}
      RETURNING *
    `;

    return res.json({ success: true, data: rows[0], message: 'Resource updated' });
  } catch (err: any) {
    console.error('[PUT /api/digital-library/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update resource' });
  }
});

// ─── DELETE /api/digital-library/:id ─────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.digitalLibraryResource.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Resource not found' });

    await prisma.digitalLibraryResource.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: `"${existing.title}" deleted` });
  } catch (err: any) {
    console.error('[DELETE /api/digital-library/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete resource' });
  }
});

export default router;
