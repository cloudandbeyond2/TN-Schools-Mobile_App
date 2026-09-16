import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 1. GET /api/stories - Fetch all storybooks with student's progress
router.get('/', async (req: Request, res: Response) => {
  try {
    const studentId = req.query.studentId as string;

    // Fetch all books with chapters count
    const books = await prisma.storyBook.findMany({
      include: {
        chapters: {
          select: { id: true }
        }
      }
    });

    // If studentId is provided, resolve progress
    let progressList: any[] = [];
    if (studentId) {
      // Find direct student first
      let student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        // Fallback: check if userId
        const studentByUserId = await prisma.student.findFirst({
          where: { userId: studentId }
        });
        if (studentByUserId) {
          student = studentByUserId;
        }
      }

      if (student) {
        progressList = await prisma.studentStoryProgress.findMany({
          where: { studentId: student.id }
        });
      }
    }

    const data = books.map(book => {
      const prog = progressList.find(p => p.storyBookId === book.id);
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        genre: book.genre,
        cover: book.cover,
        color: book.color,
        language: book.language,
        moral: book.moral,
        xpReward: book.xpReward,
        gradeLevel: book.gradeLevel,
        progress: prog ? prog.progress : 0,
        completed: prog ? prog.completed : false,
        currentChapter: prog ? prog.currentChapter : 1,
        currentPage: prog ? prog.currentPage : 1,
        totalChapters: book.chapters.length

      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching storybooks:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 2. GET /api/stories/:id - Fetch full details for a storybook + pages
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.query.studentId as string;

    const book = await prisma.storyBook.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          include: {
            pages: {
              orderBy: { pageNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!book) {
      return res.status(404).json({ success: false, error: 'Storybook not found' });
    }

    // Resolve student progress
    let progress = null;
    if (studentId) {
      let student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        const studentByUserId = await prisma.student.findFirst({
          where: { userId: studentId }
        });
        if (studentByUserId) {
          student = studentByUserId;
        }
      }

      if (student) {
        progress = await prisma.studentStoryProgress.findUnique({
          where: {
            studentId_storyBookId: {
              studentId: student.id,
              storyBookId: id
            }
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        id: book.id,
        title: book.title,
        author: book.author,
        genre: book.genre,
        cover: book.cover,
        color: book.color,
        language: book.language,
        moral: book.moral,
        xpReward: book.xpReward,
        gradeLevel: book.gradeLevel,
        chapters: book.chapters,
        progress: progress ? {

          completed: progress.completed,
          progress: progress.progress,
          currentChapter: progress.currentChapter,
          currentPage: progress.currentPage
        } : {
          completed: false,
          progress: 0,
          currentChapter: 1,
          currentPage: 1
        }
      }
    });
  } catch (err) {
    console.error('Error fetching story details:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 3. POST /api/stories/progress - Update reading progress & award XP
router.post('/progress', async (req: Request, res: Response) => {
  try {
    const { studentId, storyBookId, currentChapter, currentPage, completed, progressPercent } = req.body;

    if (!studentId || !storyBookId) {
      return res.status(400).json({ success: false, error: 'studentId and storyBookId are required' });
    }

    // Resolve student
    let student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      const studentByUserId = await prisma.student.findFirst({
        where: { userId: studentId }
      });
      if (studentByUserId) {
        student = studentByUserId;
      }
    }

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Get storybook to reward XP
    const book = await prisma.storyBook.findUnique({ where: { id: storyBookId } });
    if (!book) {
      return res.status(404).json({ success: false, error: 'Storybook not found' });
    }

    // Upsert progress
    const oldProgress = await prisma.studentStoryProgress.findUnique({
      where: {
        studentId_storyBookId: {
          studentId: student.id,
          storyBookId
        }
      }
    });

    const isNewlyCompleted = completed && (!oldProgress || !oldProgress.completed);

    const progressRecord = await prisma.studentStoryProgress.upsert({
      where: {
        studentId_storyBookId: {
          studentId: student.id,
          storyBookId
        }
      },
      update: {
        currentChapter: Number(currentChapter) || 1,
        currentPage: Number(currentPage) || 1,
        completed: completed || false,
        progress: Number(progressPercent) || 0
      },
      create: {
        studentId: student.id,
        storyBookId,
        currentChapter: Number(currentChapter) || 1,
        currentPage: Number(currentPage) || 1,
        completed: completed || false,
        progress: Number(progressPercent) || 0
      }
    });

    // If student newly completed the story, reward XP
    if (isNewlyCompleted) {
      const xpReward = book.xpReward || 50;
      


      // Create completion notification
      await prisma.notification.create({
        data: {
          userId: student.userId,
          message: `Congratulations! You finished reading "${book.title}" and earned +${xpReward} XP! 📚✨`,
          read: false
        }
      });
    }

    res.json({ success: true, data: progressRecord });
  } catch (err) {
    console.error('Error saving story progress:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
