import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { requireMinRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireMinRole('PET'));

function schoolScope(req: Request) {
  return req.user?.schoolId ? { schoolId: req.user.schoolId } : {};
}

function stampSchool(req: Request, data: any) {
  if (!data.schoolId && req.user?.schoolId) data.schoolId = req.user.schoolId;
  return data;
}

// GET /api/pet/awards - Fetch all awards for the school
router.get('/', async (req: Request, res: Response) => {
  try {
    const awards = await prisma.petAward.findMany({
      where: schoolScope(req),
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: awards });
  } catch (err) {
    console.error('Error fetching PET awards:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/pet/awards - Log a new award
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const data = stampSchool(req, {
      student: body.student,
      class: body.class,
      sport: body.sport,
      event: body.event,
      level: body.level,
      medal: body.medal,
      date: body.date,
      certificateIssued: body.certificateIssued || false,
    });
    
    if (!data.student || !data.sport || !data.event) {
      return res.status(400).json({ success: false, error: 'Student, sport, and event are required' });
    }

    const created = await prisma.petAward.create({ data });
    res.json({ success: true, data: created });
  } catch (err) {
    console.error('Error creating PET award:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/pet/awards/:id - Update an award
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const updated = await prisma.petAward.update({
      where: { id: req.params.id },
      data: {
        student: body.student,
        class: body.class,
        sport: body.sport,
        event: body.event,
        level: body.level,
        medal: body.medal,
        date: body.date,
        certificateIssued: body.certificateIssued,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating PET award:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/pet/awards/:id - Delete an award
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.petAward.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting PET award:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
