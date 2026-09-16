import { Router, Request, Response } from 'express';
import { LearningMaterial } from '../models/mongo';

const router = Router();

// GET /api/materials
router.get('/', async (req: Request, res: Response) => {
  try {
    const items = await LearningMaterial.find().sort({ createdAt: -1 });
    const formatted = items.map((m: any) => ({
      id: m._id.toString(),
      title: m.title,
      type: m.type,
      subject: m.subject,
      class: m.class,
      chapter: m.chapter || '—',
      portal: m.portal || 'Student',
      size: m.size || '1.5 MB',
      uploadedBy: m.uploadedBy || 'Super Admin',
      date: m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
      status: m.status || 'active',
      aiTagged: !!m.aiTagged,
      fileUrl: m.fileUrl || '',
    }));
    return res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('[GET /api/materials]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/materials
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, type, subject, class: className, chapter, portal } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    const created = await LearningMaterial.create({
      title,
      type: type || 'PDF',
      subject: subject || 'General',
      class: className || 'Class 10',
      chapter: chapter || '—',
      portal: portal || 'Student',
      size: '1.5 MB',
      uploadedBy: 'Super Admin',
      status: 'active',
      aiTagged: false,
    });
    return res.status(201).json({
      success: true,
      data: {
        id: created._id.toString(),
        title: created.title,
        type: created.type,
        subject: created.subject,
        class: created.class,
        chapter: created.chapter,
        portal: created.portal,
        size: created.size,
        uploadedBy: created.uploadedBy,
        date: new Date(created.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: created.status,
        aiTagged: created.aiTagged,
      },
    });
  } catch (err) {
    console.error('[POST /api/materials]', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/materials/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updated = await LearningMaterial.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Material not found' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/materials/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await LearningMaterial.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
