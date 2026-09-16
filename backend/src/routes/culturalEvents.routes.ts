import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// GET all cultural events
router.get('/', async (req: Request, res: Response) => {
  try {
    let { schoolId } = req.query;
    if (!schoolId && req.user?.schoolId && req.user?.role !== 'SUPERADMIN') {
      schoolId = req.user.schoolId;
    }
    const events = await prisma.culturalEvent.findMany({
      where: schoolId ? { schoolId: schoolId as string } : undefined,
      orderBy: { eventDate: 'asc' }
    });
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Failed to fetch cultural events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cultural events' });
  }
});

// POST a new cultural event
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, eventDate, location, description, status, schoolId } = req.body;
    const newEvent = await prisma.culturalEvent.create({
      data: {
        id: randomUUID(),
        title,
        eventDate: new Date(eventDate),
        location,
        description,
        status: status || 'Upcoming',
        schoolId
      }
    });
    res.status(201).json({ success: true, data: newEvent });
  } catch (error) {
    console.error('Failed to create cultural event:', error);
    res.status(500).json({ success: false, error: 'Failed to create cultural event' });
  }
});

// PUT update a cultural event
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, eventDate, location, description, status } = req.body;
    
    const updatedEvent = await prisma.culturalEvent.update({
      where: { id },
      data: {
        title,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        location,
        description,
        status,
        updatedAt: new Date()
      }
    });
    res.json({ success: true, data: updatedEvent });
  } catch (error) {
    console.error('Failed to update cultural event:', error);
    res.status(500).json({ success: false, error: 'Failed to update cultural event' });
  }
});

// DELETE a cultural event
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.culturalEvent.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Cultural event deleted successfully' });
  } catch (error) {
    console.error('Failed to delete cultural event:', error);
    res.status(500).json({ success: false, error: 'Failed to delete cultural event' });
  }
});

// GET registrations for cultural events
router.get('/registrations/all', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    const registrations = await (prisma as any).culturalRegistration.findMany({
      where: schoolId ? { schoolId: schoolId as string } : undefined,
      orderBy: { registeredAt: 'desc' }
    });
    res.json({ success: true, data: registrations });
  } catch (error) {
    console.error('Failed to fetch cultural registrations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch registrations' });
  }
});

// POST a student/class registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { eventId, eventTitle, participantName, class: className, count, type, schoolId, studentId } = req.body;
    
    let targetEventId = eventId;
    if (eventId) {
      const existing = await prisma.culturalEvent.findUnique({ where: { id: eventId } }).catch(() => null);
      if (!existing && eventTitle) {
        const byTitle = await prisma.culturalEvent.findFirst({
          where: { title: { equals: eventTitle, mode: 'insensitive' } }
        }).catch(() => null);
        if (byTitle) targetEventId = byTitle.id;
      }
    }

    const registration = await (prisma as any).culturalRegistration.create({
      data: {
        id: randomUUID(),
        eventId: targetEventId,
        eventTitle: eventTitle || "Cultural Event",
        participantName: participantName || "Student",
        class: className || "Class All",
        count: count ? parseInt(count) : 1,
        type: type || "individual",
        schoolId,
        studentId
      }
    });

    res.status(201).json({ success: true, data: registration });
  } catch (error) {
    console.error('Failed to create registration:', error);
    res.status(500).json({ success: false, error: 'Failed to register' });
  }
});

// DELETE a registration
router.delete('/register/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).culturalRegistration.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Registration cancelled' });
  } catch (error) {
    console.error('Failed to delete registration:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel registration' });
  }
});

export default router;
