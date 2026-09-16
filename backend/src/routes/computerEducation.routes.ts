import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { randomUUID } from 'crypto';

const router = Router();

// GET all computer education modules
router.get('/', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    const modules = await prisma.computerEducation.findMany({
      where: schoolId ? { schoolId: schoolId as string } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: modules });
  } catch (error) {
    console.error('Failed to fetch computer education modules:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch computer education modules' });
  }
});

// POST a new module
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, moduleType, description, gradeLevel, schoolId } = req.body;
    const newModule = await prisma.computerEducation.create({
      data: {
        id: randomUUID(),
        title,
        moduleType: moduleType || 'Basic',
        description: description || 'A computer education module.',
        gradeLevel: gradeLevel || 'All',
        schoolId
      }
    });
    res.status(201).json({ success: true, data: newModule });
  } catch (error) {
    console.error('Failed to create computer education module:', error);
    res.status(500).json({ success: false, error: 'Failed to create computer education module' });
  }
});

// PUT update a module
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, moduleType, description, gradeLevel } = req.body;
    
    const updatedModule = await prisma.computerEducation.update({
      where: { id },
      data: {
        title,
        moduleType,
        description,
        gradeLevel,
        updatedAt: new Date()
      }
    });
    res.json({ success: true, data: updatedModule });
  } catch (error) {
    console.error('Failed to update computer education module:', error);
    res.status(500).json({ success: false, error: 'Failed to update computer education module' });
  }
});

// DELETE a module
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.computerEducation.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Failed to delete computer education module:', error);
    res.status(500).json({ success: false, error: 'Failed to delete computer education module' });
  }
});

export default router;
