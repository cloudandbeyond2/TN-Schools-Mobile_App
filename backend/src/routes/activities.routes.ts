import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

// GET /api/activities — Fetch all clubs and events
router.get('/', async (req: Request, res: Response) => {
  try {
    const { schoolId, studentId } = req.query;

    let clubs = await prisma.club.findMany({
      where: schoolId ? { schoolId: String(schoolId) } : undefined,
      orderBy: { name: 'asc' }
    });

    if (clubs.length === 0 && schoolId) {
      const sId = String(schoolId);
      const defaultClubs = [
        { schoolId: sId, name: "Junior Red Cross (JRC)", category: "Jrc", icon: "fi fi-rr-heart", themeColor: "text-rose-500", themeBg: "bg-rose-500/10 border-rose-500/20", themeTagBg: "bg-rose-500/20" },
        { schoolId: sId, name: "National Cadet Corps (NCC)", category: "Ncc", icon: "fi fi-rr-star", themeColor: "text-blue-500", themeBg: "bg-blue-500/10 border-blue-500/20", themeTagBg: "bg-blue-500/20" },
        { schoolId: sId, name: "National Green Corps (Eco Club)", category: "Green Corps", icon: "fi fi-rr-leaf", themeColor: "text-emerald-500", themeBg: "bg-emerald-500/10 border-emerald-500/20", themeTagBg: "bg-emerald-500/20" },
        { schoolId: sId, name: "National Service Scheme (NSS)", category: "Nss", icon: "fi fi-rr-heart", themeColor: "text-red-500", themeBg: "bg-red-500/10 border-red-500/20", themeTagBg: "bg-red-500/20" },
        { schoolId: sId, name: "Scouts & Guides", category: "Scouts & Guides", icon: "fi fi-rr-star", themeColor: "text-amber-500", themeBg: "bg-amber-500/10 border-amber-500/20", themeTagBg: "bg-amber-500/20" },
        { schoolId: sId, name: "Sports Club", category: "Sports", icon: "fi fi-rr-star", themeColor: "text-orange-500", themeBg: "bg-orange-500/10 border-orange-500/20", themeTagBg: "bg-orange-500/20" },
        { schoolId: sId, name: "Red Ribbon Club (RRC)", category: "Academics", icon: "fi fi-rr-star", themeColor: "text-red-500", themeBg: "bg-red-500/10 border-red-500/20", themeTagBg: "bg-red-500/20" },
        { schoolId: sId, name: "Road Safety Patrol (RSP)", category: "Academics", icon: "fi fi-rr-star", themeColor: "text-blue-500", themeBg: "bg-blue-500/10 border-blue-500/20", themeTagBg: "bg-blue-500/20" }
      ];

      await prisma.club.createMany({
        data: defaultClubs
      });

      clubs = await prisma.club.findMany({
        where: { schoolId: sId },
        orderBy: { name: 'asc' }
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayStr = `${startOfToday.getFullYear()}-${String(startOfToday.getMonth() + 1).padStart(2, '0')}-${String(startOfToday.getDate()).padStart(2, '0')}`;

    // Fetch actual sports events logged by the PET teacher
    const petEvents = await prisma.petSportsEvent.findMany({
      where: {
        ...(schoolId ? { schoolId: String(schoolId) } : {}),
        date: { gte: todayStr }
      },
      orderBy: { date: 'asc' },
    });

    const events = petEvents.map(pe => {
      let icon = "fi fi-rr-star";
      const s = pe.sport.toLowerCase();
      if (s.includes("chess")) icon = "fi fi-rr-chess-knight";
      else if (s.includes("badminton") || s.includes("tennis") || s.includes("ball")) icon = "fi fi-rr-basketball";
      else if (s.includes("athletics") || s.includes("run") || pe.name.toLowerCase().includes("sports day")) icon = "fi fi-rr-running";
      
      let themeColor = "text-blue-500";
      if (pe.kind.toLowerCase().includes("competition") || pe.kind.toLowerCase().includes("championship")) {
        themeColor = "text-amber-500";
      }

      return {
        id: pe.id,
        title: pe.name,
        type: `${pe.sport} (${pe.level})`,
        icon,
        themeColor,
        eventDate: pe.date
      };
    });

    // Fetch club events created by teachers
    const clubEvents = await prisma.clubEvent.findMany({
      where: {
        ...(schoolId ? { schoolId: String(schoolId) } : {}),
        eventDate: { gte: startOfToday }
      },
      orderBy: { eventDate: 'asc' },
      include: { club: true }
    });

    const formattedClubEvents = clubEvents.map(ce => ({
      id: ce.id,
      title: ce.title,
      type: ce.type,
      icon: ce.icon || "fi fi-rr-star",
      themeColor: ce.themeColor || "text-blue-500",
      eventDate: ce.eventDate,
      clubName: ce.club?.name
    }));

    const allEvents = [...events, ...formattedClubEvents].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());


    let formattedMyClubs: any[] = [];
    if (studentId && studentId !== 'undefined') {
      const myClubs = await prisma.clubMember.findMany({
        where: { studentId: String(studentId) },
        include: { club: true }
      });
      formattedMyClubs = myClubs.map(member => ({
        name: member.club.name,
        role: member.role,
        icon: member.club.icon,
        color: member.club.themeColor,
        nextEvent: "See details in club page" 
      }));
    }

    res.json({ success: true, data: { discoverClubs: clubs, upcomingEvents: allEvents, myClubs: formattedMyClubs } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/activities/all-members — Fetch all club members for a school
router.get('/all-members', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: "schoolId is required" });
    }

    const members = await prisma.clubMember.findMany({
      where: { club: { schoolId: String(schoolId) } },
      include: { 
        club: true,
        student: { include: { user: { select: { name: true } } } } 
      },
      orderBy: { joinedAt: 'asc' }
    });

    const formatted = members.map(m => ({
      id: m.id,
      studentId: m.studentId,
      name: m.student.user?.name || 'Student',
      class: m.student.class,
      section: m.student.section,
      role: m.role,
      joinedAt: m.joinedAt,
      clubName: m.club.name,
      clubCategory: m.club.category
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/activities/student/:studentId — Fetch clubs for a specific student
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;

    const myClubs = await prisma.clubMember.findMany({
      where: { studentId },
      include: {
        club: true
      }
    });

    // Transform the data to match the frontend shape
    const formattedMyClubs = myClubs.map(member => ({
      name: member.club.name,
      role: member.role,
      icon: member.club.icon,
      color: member.club.themeColor,
      nextEvent: "See details in club page" // Placeholder since we didn't add events per club yet
    }));

    res.json({ success: true, data: { myClubs: formattedMyClubs } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/activities/clubs — Create a new club (Headmaster)
router.post('/clubs', async (req: Request, res: Response) => {
  try {
    const { name, category, icon, themeColor, themeBg, themeTagBg, description, sponsor, meetingTime, schoolId } = req.body;
    
    const club = await prisma.club.create({
      data: {
        name,
        category,
        icon,
        themeColor,
        themeBg,
        themeTagBg,
        description,
        sponsor,
        meetingTime,
        schoolId
      }
    });
    
    res.json({ success: true, data: club });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/activities/events — Create a new event (Teacher/Sponsor)
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { title, eventDate, type, icon, themeColor, clubId, schoolId } = req.body;
    
    let actualSchoolId = schoolId;
    if (!actualSchoolId && clubId) {
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (club && club.schoolId) {
        actualSchoolId = club.schoolId;
      }
    }

    const event = await prisma.clubEvent.create({
      data: {
        title,
        eventDate: new Date(eventDate),
        type,
        icon,
        themeColor,
        clubId,
        schoolId: actualSchoolId
      }
    });
    
    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/activities/clubs/:id — Delete a club (PET/Headmaster)
router.delete('/clubs/:id', async (req: Request, res: Response) => {
  try {
    await prisma.club.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Club deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/activities/club/:id — Fetch a single club details
router.get('/club/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { eventDate: 'asc' }
        },
        _count: {
          select: { members: true }
        }
      }
    });

    if (!club) {
      return res.status(404).json({ success: false, error: 'Club not found' });
    }

    res.json({ success: true, data: club });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/activities/club/:id/members — List club members with student details (PET/Headmaster)
router.get('/club/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const members = await prisma.clubMember.findMany({
      where: { clubId: id },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { joinedAt: 'asc' }
    });

    const formatted = members.map(m => ({
      id: m.id,
      studentId: m.studentId,
      name: m.student.user?.name || 'Student',
      class: m.student.class,
      section: m.student.section,
      role: m.role,
      joinedAt: m.joinedAt
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/activities/club/:id/membership/:studentId — Check if student is already a member
router.get('/club/:id/membership/:studentId', async (req: Request, res: Response) => {
  try {
    const { id, studentId } = req.params;
    const member = await prisma.clubMember.findUnique({
      where: { clubId_studentId: { clubId: id, studentId } }
    });
    res.json({ success: true, isMember: !!member, data: member });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/activities/join — Student joins a club
router.post('/join', async (req: Request, res: Response) => {
  try {
    const { clubId, studentId } = req.body;
    if (!clubId || !studentId) {
      return res.status(400).json({ success: false, error: 'clubId and studentId are required' });
    }

    // Check if already a member
    const existing = await prisma.clubMember.findUnique({
      where: { clubId_studentId: { clubId, studentId } }
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Already a member of this club' });
    }

    const member = await prisma.clubMember.create({
      data: { clubId, studentId, role: 'Member' }
    });

    res.json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/activities/leave — Student leaves a club
router.delete('/leave', async (req: Request, res: Response) => {
  try {
    const { clubId, studentId } = req.body;
    await prisma.clubMember.delete({
      where: { clubId_studentId: { clubId, studentId } }
    });
    res.json({ success: true, message: 'Left club successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/activities/members/:id — Remove a student from a club (Teacher/Headmaster)
router.delete('/members/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.clubMember.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
