// import { Router, Request, Response } from 'express';
// import { Wellness } from '../models/mongo';

// const router = Router();

// // POST /api/wellness — Log mood entry
// router.post('/', async (req: Request, res: Response) => {
//   try {
//     const entry = await Wellness.create(req.body);
//     res.status(201).json({ success: true, data: entry });
//   } catch (err) {
//     res.status(500).json({ success: false, error: String(err) });
//   }
// });

// // GET /api/wellness/:studentId — Get wellness history
// router.get('/:studentId', async (req: Request, res: Response) => {
//   try {
//     const entries = await Wellness.find({ studentId: req.params.studentId })
//       .sort({ date: -1 })
//       .limit(30);
//     res.json({ success: true, data: entries });
//   } catch (err) {
//     res.status(500).json({ success: false, error: String(err) });
//   }
// });

// export default router;


import { Router, Request, Response } from 'express';
import { Wellness } from '../models/mongo';

const router = Router();



// POST /api/wellness — Log mood and/or journal notes (upserts today's entry)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, mood, stressScore, notes } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required' });
    }
console.log("WELLNESS REQUEST BODY:", req.body);

const existing = await Wellness.findOne({
  studentId,
});
    if (existing) {
      // Merge in whatever new fields were sent (mood click OR journal save)
      if (mood !== undefined) existing.mood = mood;
      if (stressScore !== undefined) existing.stressScore = stressScore;
      if (notes !== undefined) existing.notes = notes;
      if (stressScore !== undefined) existing.counselingReferred = stressScore >= 8;

      await existing.save();
      return res.json({ success: true, data: existing });
    }

    // No entry today yet — mood is required to create one
    if (!mood || stressScore === undefined) {
      return res.status(400).json({
        success: false,
        error: 'mood and stressScore are required for a new entry',
      });
    }

    const entry = await Wellness.create({
      studentId,
      mood,
      stressScore,
      notes,
      counselingReferred: stressScore >= 8,
      date: new Date(),
    });

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
  console.error("WELLNESS POST ERROR:", err);

  res.status(500).json({
    success: false,
    error: String(err)
  });
}
});

// GET /api/wellness/:studentId — Get wellness history
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const entries = await Wellness.find({ studentId: req.params.studentId })
      .sort({ date: -1 })
      .limit(30);
    res.json({ success: true, data: entries });
  } catch (err) {
  console.error("WELLNESS GET ERROR:", err);

  res.status(500).json({
    success: false,
    error: String(err)
  });
}
});

export default router;