import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const STORE_DIR = path.join(__dirname, '../../store');

// Default initial milestones if no file exists
const DEFAULT_MILESTONES = [
  { id: 1, year: "1955", title: "School Founding Year", details: "GHS Coimbatore established in a single-room thatch roof hut with 15 students and 1 teacher.", icon: "🏫" },
  { id: 2, year: "1972", title: "High School Roster Status", details: "Formally recognized by Tamil Nadu State Education Department as a government High School (Class 6-10).", icon: "📐" },
  { id: 3, year: "1991", title: "Science Lab Wing Built", details: "First brick-and-mortar wing built for laboratory experimentation with basic glassware.", icon: "🔬" },
  { id: 4, year: "2011", title: "Computer Lab Center", details: "Inaugurated our first computer laboratory with 15 donated desktops and basic typing tutor sessions.", icon: "💻" },
  { id: 5, year: "2022", title: "AI Smart Classrooms Setup", details: "Installation of the first smart screen boards and tablets for interactive digital learning models.", icon: "🤖" },
];

function getFilePath(schoolId: string) {
  return path.join(STORE_DIR, `history_${schoolId}.json`);
}

// GET /api/headmaster/history?schoolId=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }

    const filepath = getFilePath(schoolId as string);
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, JSON.stringify(DEFAULT_MILESTONES, null, 2));
    }

    const data = fs.readFileSync(filepath, 'utf8');
    res.json({ success: true, data: JSON.parse(data) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/history
router.post('/', async (req: Request, res: Response) => {
  try {
    const { schoolId, year, title, details, icon } = req.body;
    if (!schoolId || !year || !title || !details) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const filepath = getFilePath(schoolId);
    let milestones = [];
    if (fs.existsSync(filepath)) {
      milestones = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } else {
      milestones = [...DEFAULT_MILESTONES];
    }

    const newMilestone = {
      id: Date.now(),
      year: String(year),
      title,
      details,
      icon: icon || "📜"
    };

    milestones.push(newMilestone);
    milestones.sort((a: any, b: any) => Number(a.year) - Number(b.year));

    fs.writeFileSync(filepath, JSON.stringify(milestones, null, 2));
    res.json({ success: true, data: newMilestone });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/history/:id?schoolId=...
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    const filepath = getFilePath(schoolId as string);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: 'History file not found' });
    }

    let milestones = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const initialLength = milestones.length;
    milestones = milestones.filter((ms: any) => String(ms.id) !== String(id));

    if (milestones.length === initialLength) {
      return res.status(404).json({ success: false, error: 'Milestone not found' });
    }

    fs.writeFileSync(filepath, JSON.stringify(milestones, null, 2));
    res.json({ success: true, message: 'Milestone removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/history/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { schoolId, year, title, details, icon } = req.body;
    if (!schoolId || !year || !title || !details) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const filepath = getFilePath(schoolId);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: 'History file not found' });
    }

    const milestones = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const index = milestones.findIndex((ms: any) => String(ms.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Milestone not found' });
    }

    milestones[index] = {
      ...milestones[index],
      year: String(year),
      title,
      details,
      icon: icon || milestones[index].icon || "📜"
    };

    milestones.sort((a: any, b: any) => Number(a.year) - Number(b.year));

    fs.writeFileSync(filepath, JSON.stringify(milestones, null, 2));
    res.json({ success: true, data: milestones[index] });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
