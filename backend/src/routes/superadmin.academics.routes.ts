import { Router, Request, Response } from "express";
import https from "https";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { randomUUID } from "crypto";
import { authenticate, requireMinRole } from "../middleware/auth.middleware";
import { UPLOAD_LIMITS, documentFileFilter } from "../utils/uploads";
import { uploadBuffer } from "../services/storage.service";

const router = Router();
const prisma = new PrismaClient();

// Files buffer in memory and go through the storage service, which routes to
// the superadmin-configured provider (local disk / S3 / custom server).
const upload = multer({ storage: multer.memoryStorage(), limits: UPLOAD_LIMITS, fileFilter: documentFileFilter });

// Reads (GET requests) are public so students and the app can load syllabus and learning resources.
// Content mutations (POST, PUT, DELETE) require authentication.
router.use((req: Request, res: Response, next) => {
  if (req.method === "GET") {
    return next();
  }
  return authenticate(req, res, next);
});

router.post("/upload", requireMinRole("HEADMASTER"), (req: Request, res: Response, next: any) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size exceeds the 500 MB limit." });
      }
      return res.status(400).json({ error: err.message || "Failed to upload file." });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const { url } = await uploadBuffer({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: "academics",
    });
    res.json({ url });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Ensure AcademicClass and AcademicSection tables exist in PostgreSQL and seed defaults if empty
async function ensureAcademicTablesExist() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AcademicClass" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "board" TEXT DEFAULT 'State Board',
        "status" TEXT DEFAULT 'Active',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("name", "board")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AcademicSection" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "board" TEXT DEFAULT 'State Board',
        "status" TEXT DEFAULT 'Active',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("name", "board")
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "AcademicClass" ADD COLUMN IF NOT EXISTS "board" TEXT DEFAULT 'State Board';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "AcademicSection" ADD COLUMN IF NOT EXISTS "board" TEXT DEFAULT 'State Board';`);

    // Clean up old constraints and ensure composite constraints exist
    await prisma.$executeRawUnsafe(`
      DO $$ 
      DECLARE 
          cname text;
      BEGIN
          -- Drop single unique constraints on AcademicClass
          FOR cname IN (
              SELECT conname FROM pg_constraint 
              WHERE conrelid = '"AcademicClass"'::regclass AND contype = 'u' 
              AND array_length(conkey, 1) = 1
          ) LOOP
              EXECUTE 'ALTER TABLE "AcademicClass" DROP CONSTRAINT IF EXISTS "' || cname || '"';
          END LOOP;

          -- Drop single unique constraints on AcademicSection
          FOR cname IN (
              SELECT conname FROM pg_constraint 
              WHERE conrelid = '"AcademicSection"'::regclass AND contype = 'u' 
              AND array_length(conkey, 1) = 1
          ) LOOP
              EXECUTE 'ALTER TABLE "AcademicSection" DROP CONSTRAINT IF EXISTS "' || cname || '"';
          END LOOP;

          -- Add composite constraints if they don't exist
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AcademicClass_name_board_key') THEN
              ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_name_board_key" UNIQUE ("name", "board");
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AcademicSection_name_board_key') THEN
              ALTER TABLE "AcademicSection" ADD CONSTRAINT "AcademicSection_name_board_key" UNIQUE ("name", "board");
          END IF;
      END $$;
    `);

    // Drop legacy unique indexes explicitly (since dropping constraint doesn't always drop the index if it was created as a unique index)
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "AcademicClass_name_key";`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "AcademicSection_name_key";`);

    await prisma.$executeRawUnsafe(`ALTER TABLE "AcademicSubject" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "AcademicResource" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "AcademicSubject" ADD COLUMN IF NOT EXISTS "board" TEXT DEFAULT 'State Board';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "AcademicResource" ADD COLUMN IF NOT EXISTS "board" TEXT DEFAULT 'State Board';`);
    
    // Ensure default classes exist
    const classCount = await prisma.academicClass.count();
    if (classCount === 0) {
      const defaultClasses = Array.from({ length: 12 }, (_, i) => ({
        id: randomUUID(),
        name: `Class ${i + 1}`,
        board: "State Board",
        status: "Active",
      }));
      await prisma.academicClass.createMany({ data: defaultClasses });
    }

  } catch (e) {
    console.error("Error creating academic tables/columns:", e);
  }
}

// --- Classes ---
router.get("/classes", async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { board } = req.query;
    let classes: any[] = [];
    try {
      if ((prisma as any).academicClass) {
        const where: any = {};
        if (board && String(board).trim() && String(board).trim() !== "All") {
          where.OR = [
            { board: String(board).trim() },
            { board: "All" },
            { board: null },
            { board: "" },
          ];
        }
        classes = await (prisma as any).academicClass.findMany({
          where,
          orderBy: { name: "asc" },
        });
      } else {
        throw new Error("academicClass model not loaded");
      }
    } catch {
      if (board && String(board).trim() && String(board).trim() !== "All") {
        classes = await prisma.$queryRawUnsafe(
          `SELECT "id", "name", "status", "board" FROM "AcademicClass" WHERE "board" = $1 OR "board" = 'All' OR "board" IS NULL ORDER BY "name" ASC`,
          String(board).trim()
        );
      } else {
        classes = await prisma.$queryRawUnsafe(`SELECT "id", "name", "status", "board" FROM "AcademicClass" ORDER BY "name" ASC`);
      }
    }
    res.json(classes);
  } catch (error: any) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes", details: error.message });
  }
});

router.post("/classes", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { name, board } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Class name is required" });
    }
    const cleanName = String(name).trim();
    const cleanBoard = board && String(board).trim() !== "All" ? String(board).trim() : "State Board";
    const id = randomUUID();

    let result: any = null;
    try {
      if ((prisma as any).academicClass) {
        result = await (prisma as any).academicClass.upsert({
          where: { name_board: { name: cleanName, board: cleanBoard } },
          update: { updatedAt: new Date() },
          create: { id, name: cleanName, board: cleanBoard, status: "Active" },
        });
      } else {
        throw new Error("academicClass model not loaded");
      }
    } catch {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "AcademicClass" ("id", "name", "board", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, 'Active', NOW(), NOW()) ON CONFLICT ("name", "board") DO UPDATE SET "updatedAt" = NOW()`,
        id,
        cleanName,
        cleanBoard
      );
      result = { id, name: cleanName, board: cleanBoard, status: "Active" };
    }
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error creating class:", error);
    res.status(500).json({ error: "Failed to create class", details: error.message });
  }
});

router.delete("/classes/:id", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { id } = req.params;
    try {
      if ((prisma as any).academicClass) {
        await (prisma as any).academicClass.delete({ where: { id } });
      } else {
        throw new Error("academicClass model not loaded");
      }
    } catch {
      await prisma.$executeRawUnsafe(`DELETE FROM "AcademicClass" WHERE "id" = $1`, id);
    }
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting class:", error);
    res.status(500).json({ error: "Failed to delete class", details: error.message });
  }
});

router.put("/classes/:id", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { id } = req.params;
    const { name, board } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Class name is required" });
    }
    const cleanName = String(name).trim();
    const cleanBoard = board && String(board).trim() !== "All" ? String(board).trim() : undefined;
    let result: any = null;
    try {
      if ((prisma as any).academicClass) {
        result = await (prisma as any).academicClass.update({
          where: { id },
          data: { name: cleanName, ...(cleanBoard ? { board: cleanBoard } : {}), updatedAt: new Date() }
        });
      } else {
        throw new Error("academicClass model not loaded");
      }
    } catch {
      if (cleanBoard) {
        await prisma.$executeRawUnsafe(`UPDATE "AcademicClass" SET "name" = $1, "board" = $2, "updatedAt" = NOW() WHERE "id" = $3`, cleanName, cleanBoard, id);
        result = { id, name: cleanName, board: cleanBoard };
      } else {
        await prisma.$executeRawUnsafe(`UPDATE "AcademicClass" SET "name" = $1, "updatedAt" = NOW() WHERE "id" = $2`, cleanName, id);
        result = { id, name: cleanName };
      }
    }
    res.json(result);
  } catch (error: any) {
    console.error("Error updating class:", error);
    res.status(500).json({ error: "Failed to update class", details: error.message });
  }
});

// --- Sections ---
router.get("/sections", async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { board } = req.query;
    let sections: any[] = [];
    try {
      if ((prisma as any).academicSection) {
        const where: any = {};
        if (board && String(board).trim() && String(board).trim() !== "All") {
          where.OR = [
            { board: String(board).trim() },
            { board: "All" },
            { board: null },
            { board: "" },
          ];
        }
        sections = await (prisma as any).academicSection.findMany({
          where,
          orderBy: { name: "asc" },
        });
      } else {
        throw new Error("academicSection model not loaded");
      }
    } catch {
      if (board && String(board).trim() && String(board).trim() !== "All") {
        sections = await prisma.$queryRawUnsafe(
          `SELECT "id", "name", "status", "board" FROM "AcademicSection" WHERE "board" = $1 OR "board" = 'All' OR "board" IS NULL ORDER BY "name" ASC`,
          String(board).trim()
        );
      } else {
        sections = await prisma.$queryRawUnsafe(`SELECT "id", "name", "status", "board" FROM "AcademicSection" ORDER BY "name" ASC`);
      }
    }
    res.json(sections);
  } catch (error: any) {
    console.error("Error fetching sections:", error);
    res.status(500).json({ error: "Failed to fetch sections", details: error.message });
  }
});

router.post("/sections", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { name, board } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Section name is required" });
    }
    const cleanName = String(name).trim();
    const cleanBoard = board && String(board).trim() !== "All" ? String(board).trim() : "State Board";
    const id = randomUUID();

    let result: any = null;
    try {
      if ((prisma as any).academicSection) {
        result = await (prisma as any).academicSection.upsert({
          where: { name_board: { name: cleanName, board: cleanBoard } },
          update: { updatedAt: new Date() },
          create: { id, name: cleanName, board: cleanBoard, status: "Active" },
        });
      } else {
        throw new Error("academicSection model not loaded");
      }
    } catch {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "AcademicSection" ("id", "name", "board", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, 'Active', NOW(), NOW()) ON CONFLICT ("name", "board") DO UPDATE SET "updatedAt" = NOW()`,
        id,
        cleanName,
        cleanBoard
      );
      result = { id, name: cleanName, board: cleanBoard, status: "Active" };
    }
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error creating section:", error);
    res.status(500).json({ error: "Failed to create section", details: error.message });
  }
});

router.delete("/sections/:id", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { id } = req.params;
    try {
      if ((prisma as any).academicSection) {
        await (prisma as any).academicSection.delete({ where: { id } });
      } else {
        throw new Error("academicSection model not loaded");
      }
    } catch {
      await prisma.$executeRawUnsafe(`DELETE FROM "AcademicSection" WHERE "id" = $1`, id);
    }
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting section:", error);
    res.status(500).json({ error: "Failed to delete section", details: error.message });
  }
});

router.put("/sections/:id", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { id } = req.params;
    const { name, board } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Section name is required" });
    }
    const cleanName = String(name).trim();
    const cleanBoard = board && String(board).trim() !== "All" ? String(board).trim() : undefined;
    let result: any = null;
    try {
      if ((prisma as any).academicSection) {
        result = await (prisma as any).academicSection.update({
          where: { id },
          data: { name: cleanName, ...(cleanBoard ? { board: cleanBoard } : {}), updatedAt: new Date() }
        });
      } else {
        throw new Error("academicSection model not loaded");
      }
    } catch {
      if (cleanBoard) {
        await prisma.$executeRawUnsafe(`UPDATE "AcademicSection" SET "name" = $1, "board" = $2, "updatedAt" = NOW() WHERE "id" = $3`, cleanName, cleanBoard, id);
        result = { id, name: cleanName, board: cleanBoard };
      } else {
        await prisma.$executeRawUnsafe(`UPDATE "AcademicSection" SET "name" = $1, "updatedAt" = NOW() WHERE "id" = $2`, cleanName, id);
        result = { id, name: cleanName };
      }
    }
    res.json(result);
  } catch (error: any) {
    console.error("Error updating section:", error);
    res.status(500).json({ error: "Failed to update section", details: error.message });
  }
});

// --- Subjects ---

// List all subjects
router.get("/subjects", async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { class: className, status, schoolId, board } = req.query;
    const targetSchoolId = (schoolId as string) || req.user?.schoolId || null;

    const andConditions: any[] = [];

    if (className) {
      const clsStr = String(className).trim();
      const numMatch = clsStr.match(/\d+/)?.[0];
      const classVariants = Array.from(new Set([
        clsStr,
        clsStr.toLowerCase(),
        clsStr.toUpperCase(),
        `Class ${clsStr}`,
        `CLASS ${clsStr}`,
        numMatch || "",
        numMatch ? `Class ${numMatch}` : "",
        numMatch ? `CLASS ${numMatch}` : "",
      ])).filter(Boolean);

      andConditions.push({
        OR: classVariants.map(c => ({ class: c }))
      });
    }

    if (status) {
      const st = String(status).trim();
      andConditions.push({
        status: {
          in: Array.from(new Set([st, st.toLowerCase(), st.toUpperCase(), "Active", "Approved", "ACTIVE", "APPROVED"]))
        }
      });
    }

    if (targetSchoolId) {
      andConditions.push({
        OR: [
          { schoolId: targetSchoolId },
          { schoolId: null },
          { schoolId: "" }
        ]
      });
    }

    if (board && String(board).trim() && String(board).trim() !== "All") {
      andConditions.push({
        OR: [
          { board: String(board).trim() },
          { board: "All" },
          { board: null },
          { board: "" }
        ]
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const subjects = await prisma.academicSubject.findMany({
      where,
      orderBy: { name: "asc" },
    });
    res.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create or update a subject
router.post("/subjects", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { name, color, icon, class: className, section, subjectCode, medium, description, status, schoolId, board } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });

    const cleanName = String(name).trim();
    const cleanClass = className ? String(className).trim() : null;
    const targetSchoolId = schoolId || req.user?.schoolId || null;
    const cleanBoard = board ? String(board).trim() : "State Board";

    // Check if subject with this exact name, class and board already exists
    const existing = await prisma.academicSubject.findFirst({
      where: {
        name: cleanName,
        class: cleanClass,
        board: cleanBoard,
      },
    });

    if (existing) {
      // Update existing subject record for this class
      const updated = await prisma.academicSubject.update({
        where: { id: existing.id },
        data: {
          color: color || existing.color,
          icon: icon || existing.icon,
          section: section !== undefined ? section : existing.section,
          subjectCode: subjectCode || existing.subjectCode,
          medium: medium || existing.medium,
          description: description || existing.description,
          status: status || existing.status,
          board: cleanBoard,
          schoolId: targetSchoolId || (existing as any).schoolId,
        } as any,
      });
      return res.status(200).json(updated);
    }

    // Otherwise create new subject record
    const subject = await prisma.academicSubject.create({
      data: {
        name: cleanName,
        color,
        icon,
        class: cleanClass,
        section,
        subjectCode,
        medium,
        description,
        board: cleanBoard,
        schoolId: targetSchoolId,
        status: status || "Active",
      } as any,
    });
    return res.status(201).json(subject);
  } catch (error: any) {
    console.error("Error creating subject:", error);
    res.status(500).json({ error: "Failed to save subject", details: error.message });
  }
});

// Update a subject
router.put("/subjects/:id", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { id } = req.params;
    const { name, color, icon, class: className, section, subjectCode, medium, description, status, schoolId, board } = req.body;
    const targetSchoolId = schoolId || req.user?.schoolId || undefined;

    const subject = await prisma.academicSubject.update({
      where: { id },
      data: { 
        name, color, icon, class: className, section, subjectCode, medium, description, status,
        ...(board !== undefined ? { board: String(board).trim() } : {}),
        ...(targetSchoolId !== undefined ? { schoolId: targetSchoolId } : {})
      },
    });
    res.json(subject);
  } catch (error) {
    console.error("Error updating subject:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a subject
router.delete("/subjects/:id", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { id } = req.params;
    const { deleteAllNamed, board } = req.query;

    const target = await prisma.academicSubject.findUnique({ where: { id } });
    if (target && deleteAllNamed === "true") {
      await prisma.academicSubject.deleteMany({
        where: {
          name: target.name,
          ...(board && board !== "All" ? { board: String(board).trim() } : target.board ? { board: target.board } : {}),
        },
      });
    } else {
      await prisma.academicSubject.delete({
        where: { id },
      });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Resources ---

// List resources (optionally filter by category, subject, class, and schoolId)
router.get("/resources", async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { category, subjectId, class: className, status, schoolId, board } = req.query;
    const targetSchoolId = (schoolId as string) || req.user?.schoolId || null;

    const andConditions: any[] = [];

    if (category) {
      const catStr = String(category).trim();
      andConditions.push({
        category: {
          in: Array.from(new Set([catStr, catStr.toLowerCase(), catStr.toUpperCase()]))
        }
      });
    }

    if (subjectId) {
      andConditions.push({ subjectId: String(subjectId) });
    }

    if (className) {
      const clsStr = String(className).trim();
      const numMatch = clsStr.match(/\d+/)?.[0];
      const classVariants = Array.from(new Set([
        clsStr,
        clsStr.toLowerCase(),
        clsStr.toUpperCase(),
        `Class ${clsStr}`,
        `CLASS ${clsStr}`,
        numMatch || "",
        numMatch ? `Class ${numMatch}` : "",
        numMatch ? `CLASS ${numMatch}` : "",
      ])).filter(Boolean);

      const orConditions: any[] = classVariants.map(c => ({ class: c }));
      if (numMatch) {
        orConditions.push({ class: { contains: numMatch, mode: "insensitive" } });
      }
      andConditions.push({ OR: orConditions });
    }

    if (status) {
      const st = String(status).trim();
      andConditions.push({
        status: {
          in: Array.from(new Set([st, st.toLowerCase(), st.toUpperCase(), "Active", "Approved", "ACTIVE", "APPROVED"]))
        }
      });
    }

    if (targetSchoolId) {
      andConditions.push({
        OR: [
          { schoolId: targetSchoolId },
          { schoolId: null },
          { schoolId: "" }
        ]
      });
    }

    if (board && String(board).trim() && String(board).trim() !== "All") {
      andConditions.push({
        OR: [
          { board: String(board).trim() },
          { board: "All" },
          { board: null },
          { board: "" }
        ]
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const resources = await prisma.academicResource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { subject: true },
    });
    res.json(resources);
  } catch (error: any) {
    console.error("Error fetching resources:", error.message, error.stack);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Create a resource
router.post("/resources", requireMinRole("TEACHER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { 
      title, subjectId, category, type, url, meta, description, addedBy, isNew, popular, 
      class: className, section, group, term, chapterNumber, topicName, learningOutcomes, 
      medium, bookVersion, publisher, language, coverImage, materialType, downloadAllowed, 
      chapter, lessonTitle, youtubeUrl, videoDuration, thumbnail, contentType, author, isbn, status, schoolId, board
    } = req.body;
    
    if (!title || !subjectId || !category || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const targetSchoolId = schoolId || req.user?.schoolId || null;
    const cleanBoard = board ? String(board).trim() : "State Board";

    let finalSubjectId = subjectId;
    const existingSubject = await prisma.academicSubject.findUnique({ where: { id: subjectId } });
    if (!existingSubject) {
      const byName = await prisma.academicSubject.findFirst({
        where: {
          name: { equals: String(subjectId).trim(), mode: "insensitive" },
        },
      });
      if (byName) {
        finalSubjectId = byName.id;
      } else {
        const createdSub = await prisma.academicSubject.create({
          data: {
            name: String(subjectId).trim(),
            class: className ? String(className).trim() : null,
            board: cleanBoard,
            status: "Active",
          },
        });
        finalSubjectId = createdSub.id;
      }
    }

    const resource = await prisma.academicResource.create({
      data: {
        title, subjectId: finalSubjectId, category, type, url, meta, description, addedBy, isNew, popular, 
        class: className, section, group, term, chapterNumber, topicName, learningOutcomes, 
        medium, bookVersion, publisher, language, coverImage, materialType, downloadAllowed, 
        chapter, lessonTitle, youtubeUrl, videoDuration, thumbnail, contentType, author, isbn, status,
        board: cleanBoard,
        schoolId: targetSchoolId
      } as any,
      include: { subject: true },
    });
    res.status(201).json(resource);
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update a resource
router.put("/resources/:id", requireMinRole("TEACHER"), async (req: Request, res: Response) => {
  try {
    await ensureAcademicTablesExist();
    const { id } = req.params;
    const { 
      title, subjectId, category, type, url, meta, description, addedBy, isNew, popular, 
      class: className, section, group, term, chapterNumber, topicName, learningOutcomes, 
      medium, bookVersion, publisher, language, coverImage, materialType, downloadAllowed, 
      chapter, lessonTitle, youtubeUrl, videoDuration, thumbnail, contentType, author, isbn, status, schoolId, board
    } = req.body;

    const targetSchoolId = schoolId || req.user?.schoolId || undefined;
    const cleanBoard = board !== undefined ? String(board).trim() : undefined;

    let finalSubjectId = subjectId;
    if (subjectId) {
      const existingSubject = await prisma.academicSubject.findUnique({ where: { id: subjectId } });
      if (!existingSubject) {
        const byName = await prisma.academicSubject.findFirst({
          where: {
            name: { equals: String(subjectId).trim(), mode: "insensitive" },
          },
        });
        if (byName) {
          finalSubjectId = byName.id;
        } else {
          const createdSub = await prisma.academicSubject.create({
            data: {
              name: String(subjectId).trim(),
              class: className ? String(className).trim() : null,
              board: cleanBoard || "State Board",
              status: "Active",
            },
          });
          finalSubjectId = createdSub.id;
        }
      }
    }

    const resource = await prisma.academicResource.update({
      where: { id },
      data: {
        title, ...(finalSubjectId ? { subjectId: finalSubjectId } : {}), category, type, url, meta, description, addedBy, isNew, popular, 
        class: className, section, group, term, chapterNumber, topicName, learningOutcomes, 
        medium, bookVersion, publisher, language, coverImage, materialType, downloadAllowed, 
        chapter, lessonTitle, youtubeUrl, videoDuration, thumbnail, contentType, author, isbn, status,
        ...(cleanBoard !== undefined ? { board: cleanBoard } : {}),
        ...(targetSchoolId !== undefined ? { schoolId: targetSchoolId } : {})
      },
      include: { subject: true },
    });
    res.json(resource);
  } catch (error) {
    console.error("Error updating resource:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a resource
router.delete("/resources/:id", requireMinRole("TEACHER"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.academicResource.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- AI Parsing ---

async function callGeminiMultimodal(prompt: string, base64Image: string, mimeType: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Please add it to your environment.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

  let cleanBase64 = base64Image;
  if (base64Image.includes(';base64,')) {
    cleanBase64 = base64Image.split(';base64,')[1];
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType || 'image/png',
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192
    }
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-goog-api-key': apiKey,
      },
    };

    const req = https.request(url, options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`Gemini API error ${res.statusCode}: ${body}`));
          return;
        }
        try {
          const parsed = JSON.parse(body);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            reject(new Error('Empty content from Gemini.'));
            return;
          }
          resolve(JSON.parse(text));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${String(e)}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(60000, () => req.destroy(new Error('Gemini API timed out')));
    req.write(postData);
    req.end();
  });
}

router.post("/parse-syllabus-ai", requireMinRole("HEADMASTER"), async (req: Request, res: Response) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image base64 data is required." });
    }

    const prompt = `Analyze this syllabus image (which lists chapters/units and their sub-chapters/topics) and extract the entire structure. Return a JSON array of Units, where each unit has 'title' (string, e.g., 'Unit 1: Prose, Poem & Supplementary'), 'term' (string, e.g., 'Term 1' or 'Full Year' if not specified), and 'subtopics' (an array of strings representing the subtopics). Do not include any formatting, markdown, backticks, or code blocks. Return a raw JSON array: [ { "title": "Unit 1: Prose & Poetry", "term": "Term 1", "subtopics": [ "Prose: His First Flight", "Poem: Life" ] } ]`;
    
    console.log("Calling Gemini multimodal to parse syllabus screenshot for academics hub...");
    const parsedData = await callGeminiMultimodal(prompt, image, mimeType || 'image/png');
    
    if (!Array.isArray(parsedData)) {
      throw new Error("Invalid response format from AI. Expected JSON array.");
    }

    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("AI Syllabus Parser Error:", error);
    res.status(500).json({ error: error.message || "Failed to process syllabus image with AI" });
  }
});

export default router;
