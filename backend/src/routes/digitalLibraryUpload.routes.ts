import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import multer from 'multer';
import { UPLOAD_LIMITS, documentFileFilter } from '../utils/uploads';
import { uploadBuffer } from '../services/storage.service';
import { authenticate, verifyRequestAsync } from '../middleware/auth.middleware';

// Files buffer in memory and go through the storage service, which routes to
// the superadmin-configured provider (local disk / S3 / custom server).
const upload = multer({ storage: multer.memoryStorage(), limits: UPLOAD_LIMITS, fileFilter: documentFileFilter });

const router = Router();
router.use((req: Request, res: Response, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return authenticate(req, res, next);
});

// GET /api/digital-library-upload
// Fetch approved resources for students (can be combined with main API in frontend)
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      req.user = (await verifyRequestAsync(req)) || undefined;
    }
    let { schoolId, subject, type, class: cls, search } = req.query;
    if (!schoolId && req.user?.schoolId && req.user?.role !== 'SUPERADMIN') {
      schoolId = req.user.schoolId;
    }

    const where: any = { approvalStatus: 'APPROVED' };
    const conditions: any[] = [];

    if (schoolId) {
      conditions.push({
        OR: [
          { schoolId: String(schoolId) },
          { schoolId: null } // Global resources
        ]
      });
    }

    if (subject) where.subject = String(subject);
    if (type) where.type = String(type);
    if (cls) where.class = String(cls);
    if (search) {
      conditions.push({
        OR: [
          { title: { contains: String(search), mode: 'insensitive' } },
          { description: { contains: String(search), mode: 'insensitive' } },
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const data = await prisma.digitalLibraryUpload.findMany({
      where,
      orderBy: { uploadDate: 'desc' },
    });

    return res.json({ success: true, data, count: data.length });
  } catch (err: any) {
    console.error('[GET /api/digital-library-upload]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch resources' });
  }
});

// GET /api/digital-library-upload/pending
// Fetch pending resources for a specific school (For Headmaster)
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId required' });

    const data = await prisma.digitalLibraryUpload.findMany({
      where: {
        schoolId: String(schoolId),
        approvalStatus: 'PENDING'
      },
      orderBy: { uploadDate: 'desc' },
    });

    return res.json({ success: true, data, count: data.length });
  } catch (err: any) {
    console.error('[GET /api/digital-library-upload/pending]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch pending resources' });
  }
});

// GET /api/digital-library-upload/school/:schoolId
// Fetch all resources (approved and pending) for a school (For Headmaster Management)
router.get('/school/:schoolId', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const data = await prisma.digitalLibraryUpload.findMany({
      where: { schoolId: String(schoolId) },
      orderBy: { uploadDate: 'desc' },
    });

    return res.json({ success: true, data, count: data.length });
  } catch (err: any) {
    console.error('[GET /api/digital-library-upload/school]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch school resources' });
  }
});

// POST /api/digital-library-upload
// Upload a new resource (Super Admin, Headmaster, Teacher)
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { title, type, subject, class: cls, description, schoolId, role, userId, tags } = req.body;
    let { fileUrl } = req.body;

    if (req.file) {
      const uploaded = await uploadBuffer({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: 'digital-library',
      });
      fileUrl = uploaded.url;
    }

    if (!title || !type || !subject || !cls || !role || !userId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const isGlobal = !schoolId || String(schoolId).toLowerCase() === 'global';

    // Headmaster uploads are auto-approved for their school.
    let approvalStatus = 'PENDING';
    if (role === 'HEADMASTER') {
      approvalStatus = 'APPROVED';
    }

    let normalizedTags: string[] = [];
    if (tags) {
      try {
        normalizedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch {
        normalizedTags = [String(tags)];
      }
    }

    if (isGlobal && role === 'SUPER_ADMIN') {
      const allSchools = await prisma.school.findMany({ select: { id: true } });
      
      if (allSchools.length === 0) {
        return res.status(400).json({ success: false, error: 'No schools found in the system to assign to.' });
      }

      const uploadsToCreate = allSchools.map(school => ({
        title: String(title),
        type: String(type),
        subject: String(subject),
        class: String(cls),
        description: description ? String(description) : null,
        fileUrl: fileUrl ? String(fileUrl) : null,
        tags: normalizedTags,
        schoolId: school.id,
        uploadedByRole: String(role),
        uploadedById: String(userId),
        approvalStatus: 'PENDING'
      }));
      
      const result = await prisma.digitalLibraryUpload.createMany({
        data: uploadsToCreate
      });
      
      return res.status(201).json({ success: true, count: result.count, message: 'Resource sent to all Headmasters for approval' });
    } else {
      const normalizedSchoolId = !isGlobal ? String(schoolId) : null;
      
      const newUpload = await prisma.digitalLibraryUpload.create({
        data: {
          title: String(title),
          type: String(type),
          subject: String(subject),
          class: String(cls),
          description: description ? String(description) : null,
          fileUrl: fileUrl ? String(fileUrl) : null,
          tags: normalizedTags,
          schoolId: normalizedSchoolId,
          uploadedByRole: String(role),
          uploadedById: String(userId),
          approvalStatus
        }
      });
      
      return res.status(201).json({ success: true, data: newUpload, message: 'Resource uploaded successfully' });
    }
  } catch (err: any) {
    console.error('[POST /api/digital-library-upload]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/digital-library-upload/:id/approve
// Approve or Reject a resource (Headmaster)
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const updated = await prisma.digitalLibraryUpload.update({
      where: { id },
      data: { approvalStatus: status }
    });

    return res.json({ success: true, data: updated, message: `Resource ${status.toLowerCase()} successfully` });
  } catch (err: any) {
    console.error('[PUT /api/digital-library-upload/:id/approve]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update resource status' });
  }
});

// PUT /api/digital-library-upload/:id
// Update an existing resource
router.put('/:id', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, type, subject, class: cls, description } = req.body;
    let { fileUrl } = req.body;

    if (req.file) {
      const uploaded = await uploadBuffer({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: 'digital-library',
      });
      fileUrl = uploaded.url;
    }

    const updatedData: any = {};
    if (title) updatedData.title = String(title);
    if (type) updatedData.type = String(type);
    if (subject) updatedData.subject = String(subject);
    if (cls) updatedData.class = String(cls);
    if (description !== undefined) updatedData.description = description ? String(description) : null;
    if (fileUrl !== undefined) updatedData.fileUrl = fileUrl ? String(fileUrl) : null;

    // Reset approvalStatus to PENDING if a teacher or user edits their resource
    updatedData.approvalStatus = 'PENDING';

    const updated = await prisma.digitalLibraryUpload.update({
      where: { id },
      data: updatedData
    });

    return res.json({ success: true, data: updated, message: 'Resource updated successfully' });
  } catch (err: any) {
    console.error('[PUT /api/digital-library-upload/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update resource' });
  }
});

// DELETE /api/digital-library-upload/:id
// Delete a resource
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.digitalLibraryUpload.delete({
      where: { id }
    });
    return res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (err: any) {
    console.error('[DELETE /api/digital-library-upload/:id]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete resource' });
  }
});

export default router;
