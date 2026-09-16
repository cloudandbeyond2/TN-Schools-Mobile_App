import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { resolveUserId } from "../config/userResolver";
import { callGemini } from "./ai.routes";
import { authenticate } from "../middleware/auth.middleware";

import multer from "multer";
import path from "path";
import fs from "fs";

import os from "os";

const router = Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = path.join(__dirname, "../../uploads");
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      dir = path.join(os.tmpdir(), "uploads");
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 0. Upload a file for activities
router.post("/upload", upload.single("file"), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// Helper to create notifications
async function createSafeNotification(userId: string, message: string) {
  try {
    const resolvedId = await resolveUserId(userId);
    if (!resolvedId) {
      console.warn(`[createSafeNotification] Could not resolve userId ${userId}.`);
      return;
    }
    await prisma.notification.create({
      data: {
        userId: resolvedId,
        message,
      }
    });
  } catch (err) {
    console.error(`[createSafeNotification] Failed to create notification:`, err);
  }
}

// 1. Get all social activities for a specific student by User ID
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const activities = await prisma.socialActivity.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
    });

    res.json({ success: true, data: activities });
  } catch (error) {
    console.error("Error fetching social activities:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. Get school-wide activities (for teachers and headmasters)
router.get("/school/:schoolId", async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { class: cls, section, status } = req.query;

    const activities = await prisma.socialActivity.findMany({
      where: {
        student: {
          schoolId,
          ...(cls ? { class: String(cls) } : {}),
          ...(section ? { section: String(section) } : {}),
        },
        ...(status ? { status: String(status) } : {}),
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: activities });
  } catch (err) {
    console.error("Error fetching school activities:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 3. Create a new social activity log
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      type,
      activityName,
      description,
      hours,
      date,
      location,
      photoUrl,
      certificateUrl,
      aiReflection,
      teacherInChargeId,
    } = req.body;

    if (!userId || !type || !activityName || !hours) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const hrsNum = parseInt(hours, 10);
    const pointsCalculated = hrsNum * 10; // 10 points per hour

    const newActivity = await prisma.socialActivity.create({
      data: {
        studentId: student.id,
        activityType: type,
        activityName,
        description,
        hours: hrsNum,
        points: pointsCalculated,
        date: date ? new Date(date) : new Date(),
        location,
        photoUrl,
        certificateUrl,
        aiReflection: aiReflection ? JSON.stringify(aiReflection) : null,
        teacherInChargeId,
        status: "Pending",
      },
    });

    // Notify teacher in charge if specified
    if (teacherInChargeId) {
      await createSafeNotification(
        teacherInChargeId,
        `Student ${student.user.name} logged a new activity: "${activityName}" for your verification.`
      );
    }

    res.status(201).json({ success: true, data: newActivity });
  } catch (error) {
    console.error("Error creating social activity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. Generate AI Reflection with Gemini
router.post("/generate-reflection", async (req: Request, res: Response) => {
  try {
    const { type, activityName, description, hours, location } = req.body;

    if (!description || !activityName) {
      return res.status(400).json({ success: false, message: "Missing activity details" });
    }

    const prompt = `
You are an AI Social Responsibility Advisor for Tamil Nadu Government Schools.
The student has logged the following extracurricular activity:
- Category: ${type}
- Name: ${activityName}
- Hours Spent: ${hours} hours
- Location: ${location || "Community / School"}
- Description: ${description}

Analyze this activity and generate a concise reflection containing assessment values.
You must output a valid JSON object ONLY. No markdown wrapping (like \`\`\`json), no trailing spaces.
The JSON object must have exactly these keys:
{
  "skillsLearned": "List of 2-3 specific skills learned.",
  "leadership": "A short sentence on how they showed initiative or leadership (if any).",
  "teamwork": "How they collaborated or worked with others.",
  "communication": "How they communicated with group members or community.",
  "empathy": "Empathy and kindness demonstrated during the work.",
  "socialResponsibility": "The broader impact on their community.",
  "environmentalAwareness": "Impact on environment or sustainability (especially for tree planting, environmental, cleanup, recycling categories)."
}
Keep each key's value under 25 words. Make it encouraging and suitable for a school student.
`;

    const rawReply = await callGemini(prompt, true);
    
    let reflectionObj;
    try {
      reflectionObj = typeof rawReply === "string" ? JSON.parse(rawReply) : rawReply;
    } catch (e) {
      // Fallback if parsing fails
      reflectionObj = {
        skillsLearned: "Teamwork, environmental care, and planning.",
        leadership: "Demonstrated initiative in executing the logged task.",
        teamwork: "Cooperated with peers to achieve a positive outcome.",
        communication: "Exchanged feedback to coordinate tasks effectively.",
        empathy: "Showed care for the community and surroundings.",
        socialResponsibility: "Contributed towards community development.",
        environmentalAwareness: type === "Environmental" || type === "Tree Plantation" ? "Deepened understanding of preservation." : "Contributed to overall cleanliness."
      };
    }

    res.json({ success: true, reflection: reflectionObj });
  } catch (err) {
    console.error("AI Reflection failed:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 5. Verify Social Activity (Approve / Reject by Teacher)
router.put("/:id/verify", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rating, teacherRemarks, verifiedBy } = req.body;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const activity = await prisma.socialActivity.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });

    if (!activity) {
      return res.status(404).json({ success: false, message: "Activity log not found" });
    }

    const updated = await prisma.socialActivity.update({
      where: { id },
      data: {
        status,
        rating: rating ? parseInt(rating, 10) : null,
        teacherRemarks,
        verifiedBy,
      }
    });

    // Notify Student
    if (activity.student.userId) {
      const msg = `Your social activity "${activity.activityName}" has been ${status.toLowerCase()} by the teacher. Check your dashboard for remarks.`;
      await createSafeNotification(activity.student.userId, msg);
    }

    // Badge Progression Auto-Check
    if (status === "Approved") {
      // Calculate total approved hours for the student
      const aggregate = (await prisma.socialActivity.aggregate({
        where: {
          studentId: activity.studentId,
          status: "Approved"
        },
        _sum: {
          hours: true,
          points: true,
        }
      })) as any;

      const totalHours = aggregate._sum?.hours || 0;
      const totalPoints = aggregate._sum?.points || 0;

      // Badges milestones mapping
      const badgesToAward: string[] = [];
      if (totalHours >= 2) badgesToAward.push("Young Changemaker");
      if (totalHours >= 5) badgesToAward.push("Health Volunteer");
      if (totalHours >= 10) badgesToAward.push("Water Saver");
      if (totalHours >= 15) badgesToAward.push("Green Warrior");
      if (totalHours >= 20) badgesToAward.push("Community Hero");
      if (totalHours >= 30) badgesToAward.push("Eco Champion");
      if (totalHours >= 45) badgesToAward.push("Social Leader");
      if (totalHours >= 60) badgesToAward.push("School Ambassador");

      // Insert any badges not already awarded
      for (const badgeName of badgesToAward) {
        const existingBadge = await prisma.studentBadge.findFirst({
          where: {
            studentId: activity.studentId,
            badge: badgeName
          }
        });

        if (!existingBadge) {
          await prisma.studentBadge.create({
            data: {
              studentId: activity.studentId,
              studentName: activity.student.user.name,
              classSection: `${activity.student.class || ""}${activity.student.section || ""}`,
              badge: badgeName,
              remark: `Awarded automatically for completing community service milestones.`,
              awardedById: verifiedBy || "System"
            }
          });

          // Notify student about badge
          if (activity.student.userId) {
            await createSafeNotification(
              activity.student.userId,
              `Congratulations! You unlocked the "${badgeName}" achievement badge!`
            );
          }
        }
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error verifying activity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 6. Get School/Class Analytics (Headmaster and Teacher)
router.get("/analytics/:schoolId", async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    // Total approved hours and activities in school
    const aggregates = (await prisma.socialActivity.aggregate({
      where: {
        student: { schoolId },
        status: "Approved"
      },
      _sum: { hours: true, points: true },
      _count: { id: true }
    })) as any;

    // Category-wise contribution hours
    const rawCategories = (await prisma.socialActivity.groupBy({
      by: ["activityType"],
      where: {
        student: { schoolId },
        status: "Approved"
      },
      _sum: { hours: true },
      _count: { id: true }
    } as any)) as any[];

    const categoryStats = rawCategories.map(c => ({
      category: c.activityType,
      hours: c._sum?.hours || 0,
      count: c._count?.id || c._count?._all || 0
    }));

    // Class-wise contribution hours leaderboard
    const rawClassLeaderboard = (await prisma.socialActivity.groupBy({
      by: ["studentId"],
      where: {
        student: { schoolId },
        status: "Approved"
      },
      _sum: { hours: true },
    } as any)) as any[];

    // Map student IDs back to their classes for aggregating class-level stats
    const studentIds = rawClassLeaderboard.map(r => r.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, class: true, section: true }
    });

    const classMap: Record<string, number> = {};
    rawClassLeaderboard.forEach(item => {
      const stud = students.find(s => s.id === item.studentId);
      if (stud) {
        const key = `Class ${stud.class || "Unknown"}-${stud.section || ""}`;
        classMap[key] = (classMap[key] || 0) + (item._sum?.hours || 0);
      }
    });

    const classLeaderboard = Object.entries(classMap).map(([className, hours]) => ({
      class: className,
      hours
    })).sort((a, b) => b.hours - a.hours);

    // Pending approvals count
    const pendingCount = await prisma.socialActivity.count({
      where: {
        student: { schoolId },
        status: "Pending"
      }
    });

    // Top Active Students list
    const topStudentsRaw = (await prisma.socialActivity.groupBy({
      by: ["studentId"],
      where: {
        student: { schoolId },
        status: "Approved"
      },
      _sum: { hours: true },
      orderBy: {
        _sum: { hours: "desc" }
      },
      take: 5
    } as any)) as any[];

    const activeStudentsList = await prisma.student.findMany({
      where: { id: { in: topStudentsRaw.map(t => t.studentId) } },
      include: { user: { select: { name: true } } }
    });

    const topActiveStudents = topStudentsRaw.map(item => {
      const stud = activeStudentsList.find(s => s.id === item.studentId);
      return {
        name: stud?.user.name || "Student",
        class: `${stud?.class || ""}-${stud?.section || ""}`,
        hours: item._sum?.hours || 0
      };
    });

    res.json({
      success: true,
      data: {
        totalHours: aggregates._sum?.hours || 0,
        totalPoints: aggregates._sum?.points || 0,
        totalActivities: aggregates._count?.id || aggregates._count?._all || 0,
        pendingApprovals: pendingCount,
        categoryStats,
        classLeaderboard,
        topActiveStudents
      }
    });
  } catch (err) {
    console.error("Analytics fetch failed:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 7. AI Suggestions for Community Activities using Gemini
router.post("/suggestions", async (req: Request, res: Response) => {
  try {
    const { studentClass, interests } = req.body;

    const classNum = parseInt(studentClass || "8", 10);
    const ageGroup = classNum >= 11 ? "Higher Secondary (16-18 years)" : classNum >= 9 ? "High School (14-16 years)" : "Middle School (11-14 years)";

    const prompt = `
You are an AI community service recommender for a Tamil Nadu Government School student.
Target Student Profile:
- Class/Grade: Class ${studentClass} (${ageGroup})
- User Interests: ${interests || "Nature, helping seniors, sports, teaching, art"}

Suggest 3 highly relevant and safe local community service or social responsibility activities that this student can participate in.
The activities should be appropriate for Tamil Nadu, cost-effective, and safe for school children.
You must return a valid JSON array ONLY. No markdown wrapping (like \`\`\`json), no trailing spaces.
The JSON array should contain exactly 3 objects, structured like:
[
  {
    "activityName": "Name of the suggested activity",
    "category": "One of: Environmental Activities, Community Service, Swachh Bharat, Health & Wellness, Tree Plantation, Education Support, Water Conservation, School Volunteer Service",
    "hours": "Expected hours (e.g. 2, 4, 6)",
    "description": "Brief 1-2 sentence description detailing how the student can execute this in their village or school.",
    "skills": "Key skills they will gain (e.g., Empathy, Teamwork, Leadership)"
  }
]
`;

    const rawReply = await callGemini(prompt, true);
    
    let suggestionsArray;
    try {
      suggestionsArray = typeof rawReply === "string" ? JSON.parse(rawReply) : rawReply;
    } catch (e) {
      // Fallback array
      suggestionsArray = [
        {
          activityName: "School Garden Beautification",
          category: "Tree Plantation",
          hours: "3",
          description: "Help plant flowers and vegetable saplings in the school compound to promote green cover.",
          skills: "Environmental Care, Teamwork"
        },
        {
          activityName: "Classroom Peer Tutoring",
          category: "Education Support (Teaching Juniors)",
          hours: "4",
          description: "Mentor Class 6 students who need assistance with math puzzles or science diagrams after school.",
          skills: "Leadership, Communication"
        },
        {
          activityName: "Plastic-Free Corridor Campaign",
          category: "Recycling & Waste Management",
          hours: "2",
          description: "Set up separate bins for plastic collection and educate classmates on simple recycling habits.",
          skills: "Social Responsibility, Organization"
        }
      ];
    }

    res.json({ success: true, suggestions: suggestionsArray });
  } catch (err) {
    console.error("Suggestions failed, returning fallback list:", err);
    const fallback = [
      {
        activityName: "School Garden Beautification",
        category: "Tree Plantation",
        hours: "3",
        description: "Help plant flowers and vegetable saplings in the school compound to promote green cover.",
        skills: "Environmental Care, Teamwork"
      },
      {
        activityName: "Classroom Peer Tutoring",
        category: "Education Support (Teaching Juniors)",
        hours: "4",
        description: "Mentor Class 6 students who need assistance with math puzzles or science diagrams after school.",
        skills: "Leadership, Communication"
      },
      {
        activityName: "Plastic-Free Corridor Campaign",
        category: "Recycling & Waste Management",
        hours: "2",
        description: "Set up separate bins for plastic collection and educate classmates on simple recycling habits.",
        skills: "Social Responsibility, Organization"
      }
    ];
    res.json({ success: true, suggestions: fallback });
  }
});

// 8. Delete a social activity log
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const activity = await prisma.socialActivity.findUnique({
      where: { id },
    });

    if (!activity) {
      return res.status(404).json({ success: false, message: "Activity log not found" });
    }

    await prisma.socialActivity.delete({
      where: { id },
    });

    res.json({ success: true, message: "Activity log deleted successfully" });
  } catch (error) {
    console.error("Error deleting social activity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
