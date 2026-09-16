import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { requireMinRole } from '../middleware/auth.middleware';

// PET portal — student fitness records (body measurements, fitness
// assessment, physical activity, health indicators).
//
// All endpoints require at least the PET/TEACHER tier: these records contain
// student health data and are maintained by physical-education staff.
// Records are scoped to the caller's school when the token carries one.

const router = Router();

router.use(requireMinRole('PET'));

// Only these body fields are ever written to the table.
const WRITABLE_STRING_FIELDS = [
  'schoolId', 'studentId', 'name', 'class', 'sport', 'status', 'lastAssessed',
  'activityLevel', 'bloodGroup', 'vision', 'lastCheckup', 'healthNotes', 'mentalHealth',
] as const;
const WRITABLE_NUMBER_FIELDS = [
  'heightCm', 'weightKg', 'endurance', 'strength', 'flexibility', 'speed',
  'weeklyActivityHrs', 'restingHeartRate',
] as const;

function pickWritable(body: any): Record<string, string | number> {
  const data: Record<string, string | number> = {};
  for (const key of WRITABLE_STRING_FIELDS) {
    if (typeof body[key] === 'string') data[key] = body[key];
  }
  for (const key of WRITABLE_NUMBER_FIELDS) {
    if (body[key] !== undefined && body[key] !== null && !Number.isNaN(Number(body[key]))) {
      data[key] = Number(body[key]);
    }
  }
  return data;
}

function schoolScope(req: Request) {
  // SUPERADMIN (and staff tokens without a school) see everything.
  return req.user?.schoolId ? { schoolId: req.user.schoolId } : {};
}

// GET /api/pet/fitness-records — list records for the caller's school
router.get('/', async (req: Request, res: Response) => {
  try {
    const records = await prisma.petFitnessRecord.findMany({
      where: schoolScope(req),
      orderBy: [{ class: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Error fetching PET fitness records:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/pet/fitness-records — create one record
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = pickWritable(req.body);
    if (!data.name || typeof data.name !== 'string') {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    if (!data.schoolId && req.user?.schoolId) data.schoolId = req.user.schoolId;
    const record = await prisma.petFitnessRecord.create({ data: data as any });
    res.json({ success: true, data: record });
  } catch (err) {
    console.error('Error creating PET fitness record:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/pet/fitness-records/bulk — create many (Add by Class)
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'records must be a non-empty array' });
    }
    const rows = records
      .map((r: any) => pickWritable(r))
      .filter((r) => r.name);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'every record needs a name' });
    }
    for (const row of rows) {
      if (!row.schoolId && req.user?.schoolId) row.schoolId = req.user.schoolId;
    }
    const created = await prisma.$transaction(
      rows.map((row) => prisma.petFitnessRecord.create({ data: row as any }))
    );
    res.json({ success: true, data: created });
  } catch (err) {
    console.error('Error bulk-creating PET fitness records:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/pet/fitness-records/:id — update one record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.petFitnessRecord.findFirst({
      where: { id, ...schoolScope(req) },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const data = pickWritable(req.body);
    delete data.schoolId; // scope is fixed at creation
    const record = await prisma.petFitnessRecord.update({ where: { id }, data: data as any });
    res.json({ success: true, data: record });
  } catch (err) {
    console.error('Error updating PET fitness record:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/pet/fitness-records/:id — remove one record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.petFitnessRecord.findFirst({
      where: { id, ...schoolScope(req) },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    await prisma.petFitnessRecord.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting PET fitness record:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
