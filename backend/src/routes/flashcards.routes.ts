import { Router, Request, Response } from 'express';
import { FlashcardBookmark } from '../models/mongo';

const router = Router();

// ─── POST /api/digital-library/flashcards/bookmark ──────────────────
// Toggle bookmark on a flashcard
router.post('/bookmark', async (req: Request, res: Response) => {
  try {
    const { studentId, resourceId, flashcardId, front, back } = req.body;

    if (!studentId || !resourceId || !flashcardId) {
      return res.status(400).json({ success: false, error: 'studentId, resourceId, and flashcardId are required' });
    }

    const existing = await FlashcardBookmark.findOne({ studentId, resourceId, flashcardId });
    if (existing) {
      // Toggle off: Unbookmark
      await FlashcardBookmark.deleteOne({ _id: existing._id });
      return res.json({ success: true, bookmarked: false, message: 'Flashcard unbookmarked' });
    } else {
      // Toggle on: Bookmark
      const bookmark = await FlashcardBookmark.create({
        studentId,
        resourceId,
        flashcardId,
        front,
        back
      });
      return res.json({ success: true, bookmarked: true, data: bookmark, message: 'Flashcard bookmarked' });
    }
  } catch (err) {
    console.error('[POST /api/digital-library/flashcards/bookmark]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/digital-library/flashcards/bookmarks ──────────────────
// Get all bookmarked flashcards for a student
router.get('/bookmarks', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required' });
    }

    const bookmarks = await FlashcardBookmark.find({ studentId: String(studentId) })
      .sort({ createdAt: -1 })
      .exec();

    res.json({ success: true, data: bookmarks });
  } catch (err) {
    console.error('[GET /api/digital-library/flashcards/bookmarks]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
