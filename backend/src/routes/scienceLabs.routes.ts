import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// MOCK SEED DATA FOR VIRTUAL LABS (fallback if database table is empty)
const DEFAULT_LABS: any[] = [
  {
    id: "physics-lab",
    name: "Physics Lab",
    icon: "Atom",
    description: "Verify Ohm's law, study projectile motion, and construct circuits in our sandbox environment.",
    experiments: [
      {
        id: "ohms-law",
        title: "Ohm's Law Verification",
        grade: "Grade 10",
        medium: "English",
        difficulty: "Medium",
        materialsNeeded: ["Resistor", "Ammeter", "Voltmeter", "Battery", "Switch"],
        safetyGuide: ["Ensure current does not exceed 2A to prevent heat damage.", "Disconnect power before changing components."],
        steps: [
          "Connect the battery, resistor, ammeter, switch, and rheostat in series.",
          "Connect the voltmeter in parallel across the resistor.",
          "Close the switch and adjust rheostat to vary current.",
          "Record voltmeter and ammeter readings to verify V = I * R."
        ],
        simulationConfig: { maxVoltage: 12, standardResistance: 5 }
      },
      {
        id: "pendulum",
        title: "Simple Pendulum Experiment",
        grade: "Grade 9",
        medium: "Tamil & English",
        difficulty: "Easy",
        materialsNeeded: ["Stand", "Thread", "Metal Bob", "Stopwatch", "Scale"],
        safetyGuide: ["Avoid pushing the bob with high force to maintain small angle oscillations."],
        steps: [
          "Measure thread length to 100cm and tie the bob to the stand.",
          "Displace the bob slightly and let it oscillate.",
          "Time 20 oscillations using the stopwatch.",
          "Calculate Time Period T = Total Time / 20."
        ],
        simulationConfig: { gravity: 9.8 }
      }
    ]
  },
  {
    id: "chemistry-lab",
    name: "Chemistry Lab",
    icon: "Flask",
    description: "Simulate acid-base titrations, examine crystal lattices, and run chemical flame tests safely.",
    experiments: [
      {
        id: "titration",
        title: "Acid-Base Titration",
        grade: "Grade 11",
        medium: "English",
        difficulty: "Hard",
        materialsNeeded: ["Burette", "Conical Flask", "Pipette", "Phenolphthalein Indicator", "NaOH", "HCl"],
        safetyGuide: ["HCl is corrosive; handle with extreme care.", "Wear virtual safety goggles during mixing."],
        steps: [
          "Fill the burette with 0.1M Sodium Hydroxide (Base).",
          "Pipette 20mL of 0.1M Hydrochloric Acid into the conical flask.",
          "Add 2-3 drops of Phenolphthalein indicator to the flask.",
          "Slowly release base dropwise while swirling until a persistent light pink endpoint occurs."
        ],
        simulationConfig: { baseMolarity: 0.1, acidVolume: 20 }
      }
    ]
  }
];

// 1. Get virtual labs and experiments
router.get("/labs", async (req: Request, res: Response) => {
  try {
    const dbLabs = await prisma.virtualLab.findMany({
      include: { experiments: true }
    });

    if (dbLabs.length > 0) {
      return res.status(200).json({ success: true, data: dbLabs });
    }

    // Return mock fallback
    return res.status(200).json({ success: true, data: DEFAULT_LABS });
  } catch (err: any) {
    console.error("Error reading labs:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Log student lab experiment attempts
router.post("/experiments/:id/attempt", async (req: Request, res: Response) => {
  const { id } = req.params; // experiment id
  const { studentId, timeSpentSec, completed, score, findings } = req.body;

  try {
    // Check if student exists
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ success: false, error: "Student record not found." });
    }

    // Try to find if experiment is in DB, if not use mock UUID placeholder
    let dbExperiment = await prisma.labExperiment.findUnique({ where: { id } });
    if (!dbExperiment) {
      // Find fallback config
      const mockExp = DEFAULT_LABS.flatMap(l => l.experiments).find((e: any) => e.id === id) as any;
      if (mockExp) {
        // Create experiment & lab dynamically in DB
        let dbLab = await prisma.virtualLab.findFirst({ where: { name: mockExp.id.includes("ohms") ? "Physics Lab" : "Chemistry Lab" } });
        if (!dbLab) {
          dbLab = await prisma.virtualLab.create({
            data: {
              name: mockExp.id.includes("ohms") ? "Physics Lab" : "Chemistry Lab",
              icon: mockExp.id.includes("ohms") ? "Atom" : "Flask",
              description: "Auto-generated Virtual Laboratory"
            }
          });
        }

        dbExperiment = await prisma.labExperiment.create({
          data: {
            id: mockExp.id,
            labId: dbLab.id,
            title: mockExp.title,
            grade: mockExp.grade,
            medium: mockExp.medium,
            difficulty: mockExp.difficulty,
            materialsNeeded: mockExp.materialsNeeded,
            safetyGuide: mockExp.safetyGuide,
            steps: mockExp.steps,
            simulationConfig: mockExp.simulationConfig,
            narrationUrls: { en: "", ta: "" }
          }
        });
      }
    }

    const attempt = await prisma.studentExperimentAttempt.create({
      data: {
        studentId,
        experimentId: dbExperiment ? dbExperiment.id : id,
        timeSpentSec: Number(timeSpentSec) || 0,
        completed: Boolean(completed),
        score: score !== undefined ? Number(score) : null,
        findings: findings || ""
      }
    });

    return res.status(200).json({ success: true, data: attempt });
  } catch (err: any) {
    console.error("Error creating attempt:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get textbook books list
router.get("/books", async (req: Request, res: Response) => {
  const { grade, medium } = req.query;
  try {
    const filters: any = {};
    if (grade) filters.grade = String(grade);
    if (medium) filters.medium = String(medium);

    const dbBooks = await prisma.scienceBook.findMany({
      where: filters,
      include: { chapters: true }
    });

    return res.status(200).json({ success: true, data: dbBooks });
  } catch (err: any) {
    console.error("Error retrieving science books:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get STEM project catalog
router.get("/projects", async (req: Request, res: Response) => {
  try {
    const dbProjects = await prisma.scienceProject.findMany({
      include: { submissions: true }
    });
    return res.status(200).json({ success: true, data: dbProjects });
  } catch (err: any) {
    console.error("Error retrieving science projects:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
