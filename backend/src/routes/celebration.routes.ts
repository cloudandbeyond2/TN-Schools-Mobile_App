import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

// GET /api/celebrations - Fetch all celebrations and holidays for a school
router.get('/', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId query parameter is required' });
    }
    const celebrations = await prisma.celebration.findMany({
      where: {
        OR: [
          { schoolId: String(schoolId) },
          { schoolId: null },
        ]
      },
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, count: celebrations.length, data: celebrations });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/celebrations - Create a celebration/holiday
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, date, description, type, schoolId } = req.body;
    if (!title || !date || !type || !schoolId) {
      return res.status(400).json({ success: false, error: 'title, date, type, and schoolId are required' });
    }
    const celebration = await prisma.celebration.create({
      data: {
        title,
        date: new Date(date),
        description: description || null,
        type,
        schoolId,
      },
    });
    res.status(201).json({ success: true, data: celebration });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/celebrations/:id - Update celebration/holiday
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, date, description, type } = req.body;
    const celebration = await prisma.celebration.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(description !== undefined && { description: description || null }),
        ...(type !== undefined && { type }),
      },
    });
    res.json({ success: true, data: celebration });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/celebrations/:id - Delete celebration/holiday
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.celebration.delete({
      where: { id },
    });
    res.json({ success: true, message: 'Celebration/holiday deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
