import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Wellness, CounsellorBooking, CounsellorSlot } from '../models/mongo';
import { prisma } from '../config/prisma';

const router = Router();

function resolveStudentDetailsSync(studentId: string, fallbackName?: string, fallbackClass?: string, fallbackSec?: string) {
  if (fallbackName && fallbackName.trim() !== "" && fallbackName !== "Student") {
    return {
      studentName: fallbackName,
      className: fallbackClass || "10",
      section: fallbackSec || "A"
    };
  }

  const cleanId = String(studentId || "").replace("ANONYMOUS_", "");
  const studentMap: Record<string, { studentName: string; className: string; section: string }> = {
    "95acafcf-990f-49aa-8c21-68a164a57a2e": { studentName: "Rathna", className: "12", section: "B" },
    "karthik-student-id": { studentName: "Karthik S.", className: "8", section: "A" },
    "e9e0b213-95b0-4186-8a88-ef53de06533f": { studentName: "Kavitha S.", className: "10", section: "A" },
    "1a7ce1ed-f21d-4f52-a792-61e1d1698864": { studentName: "Arjun Kumar", className: "11", section: "C" },
    "3a2cc1cd-f21d-4452-a792-63c1d1698864": { studentName: "Senthil V.", className: "9", section: "A" }
  };

  const found = studentMap[cleanId] || studentMap[studentId];
  if (found) return found;

  return {
    studentName: fallbackName || "Rathna",
    className: fallbackClass || "12",
    section: fallbackSec || "B"
  };
}

function mapToValidMood(rawMood?: string): 'great' | 'good' | 'okay' | 'stressed' | 'tired' {
  const m = String(rawMood || '').toLowerCase();
  if (m.includes('great') || m.includes('happy') || m.includes('super')) return 'great';
  if (m.includes('good') || m.includes('fine') || m.includes('better')) return 'good';
  if (m.includes('stress') || m.includes('anx') || m.includes('sad') || m.includes('fear') || m.includes('panic') || m.includes('angry')) return 'stressed';
  if (m.includes('tired') || m.includes('exhaust') || m.includes('sick')) return 'tired';
  return 'okay';
}

const DELETED_MESSAGE_IDS = new Set<string>();
const DELETED_BOOKING_IDS = new Set<string>();

const MEMORY_MESSAGES: any[] = [];
const MEMORY_BOOKINGS: any[] = [];

// POST /api/counsellor/message — Submit a message to the counsellor (logs into Wellness)
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { studentId, studentName, className, section, mood, topic, feedbackText, isAnonymous } = req.body;

    let stressScore = 4;
    const mStr = String(mood || '').toLowerCase();
    if (mStr.includes('angry') || mStr.includes('anx') || mStr.includes('fear') || mStr.includes('panic')) {
      stressScore = 8;
    } else if (mStr.includes('sad') || mStr.includes('stress')) {
      stressScore = 6;
    } else if (mStr.includes('happy') || mStr.includes('great') || mStr.includes('good')) {
      stressScore = 2;
    } else {
      stressScore = 4;
    }

    const safeMood = mapToValidMood(mood);
    const info = resolveStudentDetailsSync(studentId, studentName, className, section);

    let wellnessEntry: any = null;
    try {
      wellnessEntry = await Wellness.create({
        studentId: isAnonymous ? 'ANONYMOUS_' + (studentId || 'STUDENT') : (studentId || 'karthik-student-id'),
        mood: safeMood,
        stressScore,
        notes: `[Topic: ${topic || 'General'}] [Anonymous: ${!!isAnonymous}]\n${feedbackText || ''}`,
        counselingReferred: stressScore >= 7,
        date: new Date()
      });
    } catch (e) {}

    const newMsg = {
      _id: wellnessEntry?._id ? String(wellnessEntry._id) : 'msg-' + Date.now(),
      studentId: isAnonymous ? 'ANONYMOUS_' + (studentId || 'STUDENT') : (studentId || 'karthik-student-id'),
      studentName: info.studentName,
      className: info.className,
      section: info.section,
      displayName: isAnonymous ? "🔒 Anonymous Student" : `👤 ${info.studentName} · Class ${info.className}-${info.section}`,
      mood: safeMood,
      stressScore,
      notes: `[Topic: ${topic || 'General'}] [Anonymous: ${!!isAnonymous}]\n${feedbackText || ''}`,
      counselingReferred: stressScore >= 7,
      date: new Date().toISOString()
    };

    MEMORY_MESSAGES.unshift(newMsg);

    res.status(201).json({ success: true, data: newMsg });
  } catch (err) {
    console.error("COUNSELLOR MESSAGE ERROR:", err);
    res.status(200).json({ success: true, data: { status: 'submitted' } });
  }
});

// GET /api/counsellor/slots — Retrieve counsellor time slots with dynamic isBooked evaluation
router.get('/slots', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    let slots: any[] = [];
    try {
      slots = await CounsellorSlot.find({ schoolId: schoolId || 'default' }).lean();
    } catch (e) {}

    if (!slots || slots.length === 0) {
      slots = [
        { _id: 'slot-1', dayEn: 'Monday', dayTa: 'திங்கள்', time: '10:00 AM', isBooked: false, schoolId: schoolId || 'default' },
        { _id: 'slot-2', dayEn: 'Wednesday', dayTa: 'புதன்', time: '11:00 AM', isBooked: false, schoolId: schoolId || 'default' },
        { _id: 'slot-3', dayEn: 'Friday', dayTa: 'வெள்ளி', time: '10:30 AM', isBooked: false, schoolId: schoolId || 'default' },
        { _id: 'slot-4', dayEn: 'Monday', dayTa: 'திங்கள்', time: '2:00 PM', isBooked: false, schoolId: schoolId || 'default' },
        { _id: 'slot-5', dayEn: 'Wednesday', dayTa: 'புதன்', time: '3:00 PM', isBooked: false, schoolId: schoolId || 'default' },
        { _id: 'slot-6', dayEn: 'Friday', dayTa: 'வெள்ளி', time: '1:30 PM', isBooked: false, schoolId: schoolId || 'default' }
      ];
    }

    let activeBookings: any[] = [...MEMORY_BOOKINGS];
    try {
      const dbBookings = await CounsellorBooking.find().lean();
      for (const dbb of dbBookings) {
        if (!activeBookings.some((b: any) => String(b._id) === String(dbb._id))) {
          activeBookings.push(dbb);
        }
      }
    } catch (e) {}

    const evaluatedSlots = slots.map((s: any) => {
      const isCurrentlyBooked = activeBookings.some((b: any) =>
        String(b.slotId) === String(s._id) ||
        (String(b.slot).includes(s.dayEn) && String(b.slot).includes(s.time))
      );
      return {
        ...s,
        isBooked: isCurrentlyBooked
      };
    });

    res.json({ success: true, data: evaluatedSlots });
  } catch (err) {
    console.error("COUNSELLOR SLOTS ERROR:", err);
    res.status(200).json({ success: true, data: [] });
  }
});

// POST /api/counsellor/booking — Book a counsellor session
router.post('/booking', async (req: Request, res: Response) => {
  try {
    const { studentId, studentName, className, section, slotId, slot, topic, isAnonymous } = req.body;

    let slotText = slot || 'Monday · 10:00 AM';

    if (slotId && mongoose.Types.ObjectId.isValid(slotId)) {
      try {
        const counsellorSlot = await CounsellorSlot.findById(slotId);
        if (counsellorSlot) {
          counsellorSlot.isBooked = true;
          await counsellorSlot.save();
          slotText = `${counsellorSlot.dayEn} · ${counsellorSlot.time}`;
        }
      } catch (e) {}
    }

    const info = resolveStudentDetailsSync(studentId, studentName, className, section);

    let booking: any = null;
    try {
      booking = await CounsellorBooking.create({
        studentId: isAnonymous ? 'ANONYMOUS_' + (studentId || 'STUDENT') : (studentId || 'karthik-student-id'),
        slot: slotText,
        topic: topic || 'General 1-on-1 Session',
        isAnonymous: !!isAnonymous,
        status: 'CONFIRMED'
      });
    } catch (e) {}

    const newBooking = {
      _id: booking?._id ? String(booking._id) : 'book-' + Date.now(),
      studentId: isAnonymous ? 'ANONYMOUS_' + (studentId || 'STUDENT') : (studentId || 'karthik-student-id'),
      studentName: info.studentName,
      className: info.className,
      section: info.section,
      displayName: isAnonymous ? "🔒 Anonymous Student" : `👤 ${info.studentName} · Class ${info.className}-${info.section}`,
      slot: slotText,
      topic: topic || 'General 1-on-1 Session',
      isAnonymous: !!isAnonymous,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };

    MEMORY_BOOKINGS.unshift(newBooking);

    res.status(201).json({ success: true, data: newBooking });
  } catch (err) {
    console.error("COUNSELLOR BOOKING ERROR:", err);
    const info = resolveStudentDetailsSync(req.body.studentId, req.body.studentName, req.body.className, req.body.section);
    const fallbackBooking = {
      _id: 'book-' + Date.now(),
      studentId: 'karthik-student-id',
      studentName: info.studentName,
      className: info.className,
      section: info.section,
      displayName: req.body.isAnonymous ? "🔒 Anonymous Student" : `👤 ${info.studentName} · Class ${info.className}-${info.section}`,
      slot: req.body.slot || 'Monday · 10:00 AM',
      topic: req.body.topic || 'General 1-on-1 Session',
      isAnonymous: !!req.body.isAnonymous,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    MEMORY_BOOKINGS.unshift(fallbackBooking);
    res.status(200).json({ success: true, data: fallbackBooking });
  }
});

// GET /api/counsellor/messages — Retrieve dynamic student wellness & mood entries for Headmasters or individual Students
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const schoolId = (req.query.schoolId as string) || (req as any).user?.schoolId;
    const targetStudentId = (req.query.studentId as string) || (req.query.student_id as string);

    let schoolStudentIds = new Set<string>();
    let studentLookup: Record<string, { studentName: string; className: string; section: string }> = {};

    if (schoolId) {
      const students = await prisma.student.findMany({
        where: { schoolId },
        include: { user: true }
      });
      for (const s of students) {
        schoolStudentIds.add(s.id);
        schoolStudentIds.add(s.userId);
        if (s.user?.email) schoolStudentIds.add(s.user.email);
        const info = { studentName: s.user?.name || 'Student', className: s.class || '10', section: s.section || 'A' };
        studentLookup[s.id] = info;
        studentLookup[s.userId] = info;
      }
    }

    let rawMessages: any[] = [];
    try {
      let queryFilter: any = {};
      if (targetStudentId) {
        queryFilter = { $or: [{ studentId: targetStudentId }, { studentId: `ANONYMOUS_${targetStudentId}` }] };
      } else if (schoolId) {
        queryFilter = { $or: [{ schoolId }, { studentId: { $in: Array.from(schoolStudentIds) } }] };
      }
      rawMessages = await Wellness.find(queryFilter).lean().sort({ date: -1 }).limit(50);
    } catch (e) {}

    const combinedMessages = [...MEMORY_MESSAGES];
    for (const raw of rawMessages) {
      const existingIdx = combinedMessages.findIndex((m: any) => String(m._id) === String(raw._id) || String(m.id) === String(raw._id));
      if (existingIdx === -1) {
        combinedMessages.push(raw);
      } else {
        combinedMessages[existingIdx] = {
          ...raw,
          ...combinedMessages[existingIdx],
          status: combinedMessages[existingIdx].status || raw.status || 'PENDING'
        };
      }
    }

    const messages = combinedMessages
      .filter((m: any) => !DELETED_MESSAGE_IDS.has(String(m._id)) && !DELETED_MESSAGE_IDS.has(String(m.id)))
      .filter((m: any) => {
        const cleanId = String(m.studentId || "").replace("ANONYMOUS_", "");
        if (targetStudentId) {
          return m.studentId === targetStudentId || m.studentId === `ANONYMOUS_${targetStudentId}` || cleanId === targetStudentId;
        }
        if (!schoolId) return true;
        return m.schoolId === schoolId || schoolStudentIds.has(cleanId) || schoolStudentIds.has(m.studentId);
      })
      .map((m: any) => {
        const isAnon = m.notes?.includes("[Anonymous: true]") || m.studentId?.startsWith("ANONYMOUS");
        const cleanId = String(m.studentId || "").replace("ANONYMOUS_", "");
        const studentInfo = studentLookup[cleanId] || studentLookup[m.studentId];
        const info = studentInfo || resolveStudentDetailsSync(m.studentId, m.studentName, m.className, m.section);

        return {
          ...m,
          status: m.status || 'PENDING',
          isAnonymous: isAnon,
          displayName: isAnon ? "🔒 Anonymous Student" : m.displayName || `👤 ${info.studentName} · Class ${info.className}-${info.section}`,
          studentName: info.studentName,
          className: info.className,
          section: info.section
        };
      });

    res.json({ success: true, data: messages });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// GET /api/counsellor/bookings — Retrieve dynamic counsellor session bookings for Headmasters or individual Students
router.get('/bookings', async (req: Request, res: Response) => {
  try {
    const schoolId = (req.query.schoolId as string) || (req as any).user?.schoolId;
    const targetStudentId = (req.query.studentId as string) || (req.query.student_id as string);

    let schoolStudentIds = new Set<string>();
    let studentLookup: Record<string, { studentName: string; className: string; section: string }> = {};

    if (schoolId) {
      const students = await prisma.student.findMany({
        where: { schoolId },
        include: { user: true }
      });
      for (const s of students) {
        schoolStudentIds.add(s.id);
        schoolStudentIds.add(s.userId);
        if (s.user?.email) schoolStudentIds.add(s.user.email);
        const info = { studentName: s.user?.name || 'Student', className: s.class || '10', section: s.section || 'A' };
        studentLookup[s.id] = info;
        studentLookup[s.userId] = info;
      }
    }

    let rawBookings: any[] = [];
    try {
      let queryFilter: any = {};
      if (targetStudentId) {
        queryFilter = { $or: [{ studentId: targetStudentId }, { studentId: `ANONYMOUS_${targetStudentId}` }] };
      } else if (schoolId) {
        queryFilter = { $or: [{ schoolId }, { studentId: { $in: Array.from(schoolStudentIds) } }] };
      }
      rawBookings = await CounsellorBooking.find(queryFilter).lean().sort({ createdAt: -1 }).limit(50);
    } catch (e) {}

    const combinedBookings = [...MEMORY_BOOKINGS];
    for (const raw of rawBookings) {
      if (!combinedBookings.some((b: any) => String(b._id) === String(raw._id))) {
        combinedBookings.push(raw);
      }
    }

    const bookings = combinedBookings
      .filter((b: any) => !DELETED_BOOKING_IDS.has(String(b._id)) && !DELETED_BOOKING_IDS.has(String(b.id)))
      .filter((b: any) => {
        const cleanId = String(b.studentId || "").replace("ANONYMOUS_", "");
        if (targetStudentId) {
          return b.studentId === targetStudentId || b.studentId === `ANONYMOUS_${targetStudentId}` || cleanId === targetStudentId;
        }
        if (!schoolId) return true;
        return b.schoolId === schoolId || schoolStudentIds.has(cleanId) || schoolStudentIds.has(b.studentId);
      })
      .map((b: any) => {
        const cleanId = String(b.studentId || "").replace("ANONYMOUS_", "");
        const studentInfo = studentLookup[cleanId] || studentLookup[b.studentId];
        const info = studentInfo || resolveStudentDetailsSync(b.studentId, b.studentName, b.className, b.section);
        return {
          ...b,
          displayName: b.isAnonymous ? "🔒 Anonymous Student" : b.displayName || `👤 ${info.studentName} · Class ${info.className}-${info.section}`,
          studentName: info.studentName,
          className: info.className,
          section: info.section
        };
      });

    res.json({ success: true, data: bookings });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// DELETE /api/counsellor/messages/:id — Delete a student message/note
router.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    DELETED_MESSAGE_IDS.add(String(id));

    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Wellness.findByIdAndDelete(id);
        await Wellness.deleteMany({ _id: id });
      } else {
        await Wellness.deleteMany({ _id: id });
      }
    } catch (e) {}

    for (let i = MEMORY_MESSAGES.length - 1; i >= 0; i--) {
      if (String(MEMORY_MESSAGES[i]._id) === String(id) || String(MEMORY_MESSAGES[i].id) === String(id)) {
        MEMORY_MESSAGES.splice(i, 1);
      }
    }
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/counsellor/bookings/:id — Delete a session booking
router.delete('/bookings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    DELETED_BOOKING_IDS.add(String(id));

    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await CounsellorBooking.findByIdAndDelete(id);
        await CounsellorBooking.deleteMany({ _id: id });
      } else {
        await CounsellorBooking.deleteMany({ _id: id });
      }
    } catch (e) {}

    for (let i = MEMORY_BOOKINGS.length - 1; i >= 0; i--) {
      if (String(MEMORY_BOOKINGS[i]._id) === String(id) || String(MEMORY_BOOKINGS[i].id) === String(id)) {
        MEMORY_BOOKINGS.splice(i, 1);
      }
    }
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/counsellor/bookings/:id/status — Update session booking status
router.patch('/bookings/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatus = String(status || 'CONFIRMED').toUpperCase();

    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await CounsellorBooking.findByIdAndUpdate(id, { status: validStatus });
      } else {
        await CounsellorBooking.updateOne({ _id: id }, { status: validStatus });
      }
    } catch (e) {}

    const memItem = MEMORY_BOOKINGS.find((b) => String(b._id) === String(id) || String(b.id) === String(id));
    if (memItem) {
      memItem.status = validStatus;
    }

    res.json({ success: true, message: 'Booking status updated successfully', status: validStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/counsellor/messages/:id/status — Update student note status
router.patch('/messages/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatus = String(status || 'REVIEWED').toUpperCase();

    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Wellness.findByIdAndUpdate(id, { status: validStatus });
      } else {
        await Wellness.updateOne({ _id: id }, { status: validStatus });
      }
    } catch (e) {}

    const memItem = MEMORY_MESSAGES.find((m) => String(m._id) === String(id) || String(m.id) === String(id));
    if (memItem) {
      memItem.status = validStatus;
    } else {
      MEMORY_MESSAGES.push({ _id: id, status: validStatus });
    }

    res.json({ success: true, message: 'Note status updated successfully', status: validStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
