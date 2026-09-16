import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

const queryIncludes = {
  skills: true,
  projects: true,
  achievements: true,
  student: {
    include: {
      school: true,
      clubMembers: {
        include: {
          club: true
        }
      },
      sportsProfile: {
        include: {
          teams: true,
          stats: true,
          events: true
        }
      },
      socialActivities: true,
      marks: {
        take: 15,
        orderBy: { createdAt: 'desc' as const }
      },
      attendance: {
        take: 100
      },
      scholarships: true,
      labAttempts: {
        include: {
          experiment: true
        }
      },
      readingProgress: {
        include: {
          chapter: true
        }
      },
      projectSubmissions: {
        include: {
          project: true
        }
      },
      schoolPressActivities: true,
      parentLinks: {
        include: {
          parent: true
        }
      }
    }
  }
};

// GET /api/portfolio/:studentId
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    let portfolio: any = await prisma.portfolio.findUnique({
      where: { studentId },
      include: queryIncludes as any
    });

    // If studentId is not a direct portfolio ID, try searching by Student EMIS, Roll Number, or Name
    if (!portfolio) {
      const studentMatch = await prisma.student.findFirst({
        where: {
          OR: [
            { id: studentId },
            { emisNumber: studentId },
            { rollNumber: studentId },
            { user: { name: { contains: studentId, mode: 'insensitive' } } }
          ]
        }
      });
      if (studentMatch) {
        portfolio = await prisma.portfolio.findUnique({
          where: { studentId: studentMatch.id },
          include: queryIncludes as any
        });
      }
    }

    // If portfolio doesn't exist but student exists, initialize one automatically
    if (!portfolio && studentId !== 'demo-student') {
      const studentExists = await prisma.student.findFirst({
        where: {
          OR: [
            { id: studentId },
            { emisNumber: studentId },
            { rollNumber: studentId },
            { user: { name: { contains: studentId, mode: 'insensitive' } } }
          ]
        }
      });
      if (studentExists) {
        portfolio = await prisma.portfolio.create({
          data: {
            studentId: studentExists.id,
            bio: JSON.stringify({
              bioText: "",
              strengths: [],
              areasOfGrowth: [],
              termGoals: [],
              leadershipRoles: [],
              vocationalSkills: [],
              languageFluency: {},
              careerGoal: "",
              subjectInterests: [],
              talentPrep: [],
              communicationRole: "",
              teacherEndorsement: "",
              teacherName: "",
              parentEndorsement: "",
              parentName: ""
            }),
            stream: "General"
          },
          include: queryIncludes as any
        });
      }
    }

    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: portfolio.student.userId }
    });

    const student = portfolio.student as any;
    const parentLinkUser = student.parentLinks?.[0]?.parent?.user?.name;
    const dynamicParentName = student.parentName || student.fatherName || student.motherName || parentLinkUser || "";

    // Parse the JSON bio to extract SWOT, leadership, vocational, and language skills
    let bioData = {
      bioText: portfolio.bio || "",
      strengths: [] as string[],
      areasOfGrowth: [] as string[],
      termGoals: [] as string[],
      leadershipRoles: [] as string[],
      vocationalSkills: [] as string[],
      languageFluency: {} as Record<string, string>,
      careerGoal: "",
      subjectInterests: [] as string[],
      talentPrep: [] as string[],
      communicationRole: "",
      teacherEndorsement: "",
      teacherName: "",
      parentEndorsement: "",
      parentName: dynamicParentName
    };

    if (portfolio.bio) {
      try {
        if (portfolio.bio.trim().startsWith('{')) {
          const parsed = JSON.parse(portfolio.bio);
          const cleanParentName = parsed.parentName || dynamicParentName;
          bioData = {
            bioText: parsed.bioText || "",
            strengths: parsed.strengths || [],
            areasOfGrowth: parsed.areasOfGrowth || [],
            termGoals: parsed.termGoals || [],
            leadershipRoles: Array.isArray(parsed.leadershipRoles) ? parsed.leadershipRoles : [],
            vocationalSkills: parsed.vocationalSkills || [],
            languageFluency: parsed.languageFluency || {},
            careerGoal: parsed.careerGoal || "",
            subjectInterests: parsed.subjectInterests || [],
            talentPrep: parsed.talentPrep || [],
            communicationRole: parsed.communicationRole || "",
            teacherEndorsement: parsed.teacherEndorsement || "",
            teacherName: parsed.teacherName || "",
            parentEndorsement: parsed.parentEndorsement || "",
            parentName: cleanParentName
          };
        } else {
          bioData.bioText = portfolio.bio;
        }
      } catch (e) {
        console.error("Error parsing portfolio bio JSON:", e);
      }
    }

    // Calculate attendance percentage
    const attendanceRecords = portfolio.student.attendance || [];
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((r: any) => r.status === 'PRESENT').length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0; // Default to 92 if no records

    // Format student record integrations
    const formattedData = {
      id: portfolio.id,
      studentId: portfolio.studentId,
      profile: {
        name: user?.name || "Student",
        email: user?.email || "",
        class: portfolio.student.class,
        section: portfolio.student.section,
        stream: portfolio.stream || "General",
        rollNumber: portfolio.student.rollNumber || "N/A",
        emisNumber: portfolio.student.emisNumber || "N/A",
        schoolName: portfolio.student.school.name,
        bio: bioData.bioText,
        strengths: bioData.strengths,
        areasOfGrowth: bioData.areasOfGrowth,
        termGoals: bioData.termGoals,
        leadershipRoles: bioData.leadershipRoles,
        vocationalSkills: bioData.vocationalSkills,
        languageFluency: bioData.languageFluency,
        careerGoal: bioData.careerGoal,
        subjectInterests: bioData.subjectInterests,
        talentPrep: bioData.talentPrep,
        communicationRole: bioData.communicationRole,
        teacherEndorsement: bioData.teacherEndorsement,
        teacherName: bioData.teacherName,
        parentEndorsement: bioData.parentEndorsement,
        parentName: bioData.parentName,
        projectsCount: portfolio.projects.length,
        awardsCount: portfolio.achievements.length,
        attendanceRate
      },
      skills: portfolio.skills,
      projects: portfolio.projects,
      achievements: portfolio.achievements,
      clubs: portfolio.student.clubMembers.map((cm: any) => ({
        name: cm.club.name,
        role: cm.role,
        category: cm.club.category,
        icon: cm.club.icon,
        themeColor: cm.club.themeColor,
        themeBg: cm.club.themeBg
      })),
      sports: portfolio.student.sportsProfile ? {
        teams: portfolio.student.sportsProfile.teams,
        stats: portfolio.student.sportsProfile.stats,
        events: portfolio.student.sportsProfile.events
      } : null,
      socialActivities: portfolio.student.socialActivities,
      marksSummary: portfolio.student.marks.map((m: any) => ({
        subject: m.subject,
        examName: m.examType,
        marksObtained: m.scored,
        maxMarks: m.maxMarks,
        remarks: m.grade
      })),
      scholarships: portfolio.student.scholarships.map((s: any) => ({
        name: s.scheme,
        amount: s.amount,
        status: s.status,
        academicYear: s.createdAt.getFullYear().toString()
      })),
      labAttempts: portfolio.student.labAttempts.map((la: any) => ({
        experimentTitle: la.experiment.title,
        completed: la.completed,
        score: la.score,
        date: la.createdAt
      })),
      readingProgress: portfolio.student.readingProgress.map((rp: any) => ({
        chapterTitle: rp.chapter.title,
        pagesRead: rp.pagesRead,
        completed: rp.completed
      })),
      schoolPress: portfolio.student.schoolPressActivities.map((sp: any) => ({
        activityType: "Press Article",
        description: sp.description,
        points: sp.isApproved ? 20 : 5,
        date: sp.createdAt
      }))
    };

    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/portfolio — Create or update portfolio details (bio, stream, SWOT, extra fields)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, bio, stream, strengths, areasOfGrowth, termGoals, leadershipRoles, vocationalSkills, languageFluency, languages, careerGoal, subjectInterests, talentPrep, communicationRole, teacherEndorsement, teacherName, parentEndorsement, parentName } = req.body;
    
    // Find existing portfolio to merge bio JSON cleanly
    const existing = await prisma.portfolio.findUnique({ where: { studentId } });
    let existingBioObj: any = {};
    if (existing?.bio && existing.bio.trim().startsWith('{')) {
      try { existingBioObj = JSON.parse(existing.bio); } catch {}
    }

    const mergedBio = JSON.stringify({
      bioText: bio !== undefined ? bio : (existingBioObj.bioText || ""),
      strengths: strengths !== undefined ? strengths : (existingBioObj.strengths || []),
      areasOfGrowth: areasOfGrowth !== undefined ? areasOfGrowth : (existingBioObj.areasOfGrowth || []),
      termGoals: termGoals !== undefined ? termGoals : (existingBioObj.termGoals || []),
      leadershipRoles: leadershipRoles !== undefined ? leadershipRoles : (existingBioObj.leadershipRoles || []),
      vocationalSkills: vocationalSkills !== undefined ? vocationalSkills : (existingBioObj.vocationalSkills || []),
      languageFluency: languageFluency !== undefined ? languageFluency : (existingBioObj.languageFluency || {}),
      languages: languages !== undefined ? languages : (existingBioObj.languages || []),
      careerGoal: careerGoal !== undefined ? careerGoal : (existingBioObj.careerGoal || ""),
      subjectInterests: subjectInterests !== undefined ? subjectInterests : (existingBioObj.subjectInterests || []),
      talentPrep: talentPrep !== undefined ? talentPrep : (existingBioObj.talentPrep || []),
      communicationRole: communicationRole !== undefined ? communicationRole : (existingBioObj.communicationRole || ""),
      teacherEndorsement: teacherEndorsement !== undefined ? teacherEndorsement : (existingBioObj.teacherEndorsement || ""),
      teacherName: teacherName !== undefined ? teacherName : (existingBioObj.teacherName || ""),
      parentEndorsement: parentEndorsement !== undefined ? parentEndorsement : (existingBioObj.parentEndorsement || ""),
      parentName: parentName !== undefined ? parentName : (existingBioObj.parentName || "")
    });

    const portfolio = await prisma.portfolio.upsert({
      where: { studentId },
      update: { bio: mergedBio, stream },
      create: { studentId, bio: mergedBio, stream }
    });

    res.json({ success: true, data: portfolio });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/portfolio/:studentId/skills — Add or update a portfolio skill
router.post('/:studentId/skills', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { name, level, color } = req.body;

    let portfolio = await prisma.portfolio.findFirst({
      where: {
        OR: [
          { studentId },
          { student: { id: studentId } },
          { student: { emisNumber: studentId } },
          { student: { rollNumber: studentId } },
          { student: { user: { name: { contains: studentId, mode: 'insensitive' } } } }
        ]
      }
    });

    if (!portfolio) {
      const studentMatch = await prisma.student.findFirst({
        where: {
          OR: [
            { id: studentId },
            { emisNumber: studentId },
            { rollNumber: studentId },
            { user: { name: { contains: studentId, mode: 'insensitive' } } }
          ]
        }
      });
      if (studentMatch) {
        portfolio = await prisma.portfolio.create({
          data: { studentId: studentMatch.id, bio: JSON.stringify({ bioText: "Welcome to my digital portfolio!" }), stream: "General" }
        });
      }
    }

    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }

    const newSkill = await prisma.portfolioSkill.create({
      data: {
        portfolioId: portfolio.id,
        name: name || "General Competency",
        level: parseInt(level) || 75,
        color: color || "from-indigo-500 to-purple-500"
      }
    });

    res.json({ success: true, data: newSkill });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/portfolio/:studentId/skills/:skillId — Remove a portfolio skill
router.delete('/:studentId/skills/:skillId', async (req: Request, res: Response) => {
  try {
    const { skillId } = req.params;

    await prisma.portfolioSkill.delete({
      where: { id: skillId }
    });

    res.json({ success: true, message: 'Skill deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/portfolio/:studentId/projects — Add or update a portfolio project
router.post('/:studentId/projects', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { title, category, date, image, tags, description } = req.body;

    let portfolio = await prisma.portfolio.findFirst({
      where: {
        OR: [
          { studentId },
          { student: { id: studentId } },
          { student: { emisNumber: studentId } },
          { student: { rollNumber: studentId } },
          { student: { user: { name: { contains: studentId, mode: 'insensitive' } } } }
        ]
      }
    });

    if (!portfolio) {
      const studentMatch = await prisma.student.findFirst({
        where: {
          OR: [
            { id: studentId },
            { emisNumber: studentId },
            { rollNumber: studentId },
            { user: { name: { contains: studentId, mode: 'insensitive' } } }
          ]
        }
      });
      if (studentMatch) {
        portfolio = await prisma.portfolio.create({
          data: { studentId: studentMatch.id, bio: JSON.stringify({ bioText: "Welcome to my digital portfolio!" }), stream: "General" }
        });
      }
    }

    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }

    const newProject = await prisma.portfolioProject.create({
      data: {
        portfolioId: portfolio.id,
        title: title || "New Project",
        category: category || "Science & Tech",
        date: date || new Date().getFullYear().toString(),
        image: image || "code",
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : ["Science"]),
        description: description || ""
      }
    });

    res.json({ success: true, data: newProject });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/portfolio/:studentId/projects/:projectId — Remove a portfolio project
router.delete('/:studentId/projects/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    await prisma.portfolioProject.delete({
      where: { id: projectId }
    });

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/portfolio/:studentId/achievements — Add or update a portfolio achievement
router.post('/:studentId/achievements', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { title, year, icon, color, bg } = req.body;

    const portfolio = await prisma.portfolio.findUnique({ where: { studentId } });
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }

    const newAchievement = await prisma.portfolioAchievement.create({
      data: {
        portfolioId: portfolio.id,
        title,
        year,
        icon,
        color,
        bg
      }
    });

    res.json({ success: true, data: newAchievement });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/portfolio/:studentId/achievements/:achievementId — Remove a portfolio achievement
router.delete('/:studentId/achievements/:achievementId', async (req: Request, res: Response) => {
  try {
    const { achievementId } = req.params;

    await prisma.portfolioAchievement.delete({
      where: { id: achievementId }
    });

    res.json({ success: true, message: 'Achievement deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
