import { Router, Request, Response } from 'express';
import { LibraryProgress } from '../models/mongo';

const router = Router();

// ─── POST /api/digital-library/progress ─────────────────────────────
// Save or update reading progress
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      resourceId,
      resourceTitle,
      subject,
      type,
      lastChapter,
      progressPercent,
      timeSpentSeconds
    } = req.body;

    if (!studentId || !resourceId) {
      return res.status(400).json({ success: false, error: 'studentId and resourceId are required' });
    }

    // Upsert reading progress record
    const progress = await LibraryProgress.findOneAndUpdate(
      { studentId, resourceId },
      {
        $set: {
          resourceTitle,
          subject,
          type,
          lastChapter,
          lastOpenedAt: new Date()
        },
        $max: {
          progressPercent: progressPercent || 0
        },
        $inc: {
          timeSpentSeconds: timeSpentSeconds || 0
        }
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: progress });
  } catch (err) {
    console.error('[POST /api/digital-library/progress]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/digital-library/progress ──────────────────────────────
// Get reading progress for a student
router.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required' });
    }

    const progressList = await LibraryProgress.find({ studentId: String(studentId) })
      .sort({ lastOpenedAt: -1 })
      .exec();

    res.json({ success: true, data: progressList });
  } catch (err) {
    console.error('[GET /api/digital-library/progress]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/digital-library/progress/today ───────────────────────
// Get stats of reading progress updated today
router.get('/today', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required' });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Fetch resources accessed/updated today
    const list = await LibraryProgress.find({
      studentId: String(studentId),
      updatedAt: { $gte: startOfToday }
    }).exec();

    // Sum time spent on resources accessed today
    const totalSeconds = list.reduce((sum, item) => sum + (item.timeSpentSeconds || 0), 0);
    const completedCount = list.filter(item => item.progressPercent >= 100).length;

    res.json({
      success: true,
      data: {
        totalTimeSpentMinutes: Math.round(totalSeconds / 60),
        activeCount: list.length,
        completedCount,
        recentResources: list.slice(0, 5).map(item => ({
          resourceId: item.resourceId,
          resourceTitle: item.resourceTitle,
          subject: item.subject,
          type: item.type,
          lastChapter: item.lastChapter,
          progressPercent: item.progressPercent,
          updatedAt: item.updatedAt
        }))
      }
    });
  } catch (err) {
    console.error('[GET /api/digital-library/progress/today]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
