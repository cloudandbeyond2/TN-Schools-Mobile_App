"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const uploads_1 = require("../utils/uploads");
const storage_service_1 = require("../services/storage.service");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Files buffer in memory and go through the storage service, which routes to
// the superadmin-configured provider (local disk / S3 / custom server).
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: uploads_1.UPLOAD_LIMITS, fileFilter: uploads_1.documentFileFilter });
// Reads require any logged-in user; content management requires headmaster and above.
router.use(auth_middleware_1.authenticate);
router.post("/upload", (0, auth_middleware_1.requireMinRole)("HEADMASTER"), upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const { url } = yield (0, storage_service_1.uploadBuffer)({
            buffer: req.file.buffer,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            folder: "academics",
        });
        res.json({ url });
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}));
// --- Subjects ---
// List all subjects
router.get("/subjects", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { class: className, status } = req.query;
        const where = {};
        if (className) {
            where.OR = [
                { class: String(className) },
                { class: null },
                { class: "" }
            ];
        }
        if (status) {
            where.status = String(status);
        }
        const subjects = yield prisma.academicSubject.findMany({
            where,
            orderBy: { name: "asc" },
        });
        res.json(subjects);
    }
    catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
// Create a subject
router.post("/subjects", (0, auth_middleware_1.requireMinRole)("HEADMASTER"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, color, icon, class: className, section, subjectCode, medium, description, status } = req.body;
        if (!name)
            return res.status(400).json({ error: "Name is required" });
        const subject = yield prisma.academicSubject.create({
            data: { name, color, icon, class: className, section, subjectCode, medium, description, status },
        });
        res.status(201).json(subject);
    }
    catch (error) {
        console.error("Error creating subject:", error);
        if (error.code === "P2002") {
            return res.status(400).json({ error: "Subject with this name already exists" });
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
// Update a subject
router.put("/subjects/:id", (0, auth_middleware_1.requireMinRole)("HEADMASTER"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, color, icon, class: className, section, subjectCode, medium, description, status } = req.body;
        const subject = yield prisma.academicSubject.update({
            where: { id },
            data: { name, color, icon, class: className, section, subjectCode, medium, description, status },
        });
        res.json(subject);
    }
    catch (error) {
        console.error("Error updating subject:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
// Delete a subject
router.delete("/subjects/:id", (0, auth_middleware_1.requireMinRole)("HEADMASTER"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.academicSubject.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error("Error deleting subject:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
// --- Resources ---
// List resources (optionally filter by category, subject, and class)
router.get("/resources", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, subjectId, class: className, status } = req.query;
        const where = {};
        if (category)
            where.category = String(category);
        if (subjectId)
            where.subjectId = String(subjectId);
        if (className) {
            where.OR = [
                { class: String(className) },
                { class: null },
                { class: "" }
            ];
        }
        if (status) {
            where.status = String(status);
        }
        const resources = yield prisma.academicResource.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { subject: true },
        });
        res.json(resources);
    }
    catch (error) {
        console.error("Error fetching resources:", error.message, error.stack);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}));
// Create a resource
router.post("/resources", (0, auth_middleware_1.requireMinRole)("HEADMASTER"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, subjectId, category, type, url, meta, description, addedBy, isNew, popular, class: className, section, group, term, chapterNumber, topicName, learningOutcomes, medium, bookVersion, publisher, language, coverImage, materialType, downloadAllowed, chapter, lessonTitle, youtubeUrl, videoDuration, thumbnail, contentType, author, isbn, status } = req.body;
        if (!title || !subjectId || !category || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const resource = yield prisma.academicResource.create({
            data: {
                title, subjectId, category, type, url, meta, description, addedBy, isNew, popular,
                class: className, section, group, term, chapterNumber, topicName, learningOutcomes,
                medium, bookVersion, publisher, language, coverImage, materialType, downloadAllowed,
                chapter, lessonTitle, youtubeUrl, videoDuration, thumbnail, contentType, author, isbn, status
            },
            include: { subject: true },
        });
        res.status(201).json(resource);
    }
    catch (error) {
        console.error("Error creating resource:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
// Update a resource
router.put("/resources/:id", (0, auth_middleware_1.requireMinRole)("HEADMASTER"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, subjectId, category, type, url, meta, description, addedBy, isNew, popular, class: className, section, group, term, chapterNumber, topicName, learningOutcomes, medium, bookVersion, publisher, language, coverImage, materialType, downloadAllowed, chapter, lessonTitle, youtubeUrl, videoDuration, thumbnail, contentType, author, isbn, status } = req.body;
        const resource = yield prisma.academicResource.update({
            where: { id },
            data: {
                title, subjectId, category, type, url, meta, description, addedBy, isNew, popular,
                class: className, section, group, term, chapterNumber, topicName, learningOutcomes,
                medium, bookVersion, publisher, language, coverImage, materialType, downloadAllowed,
                chapter, lessonTitle, youtubeUrl, videoDuration, thumbnail, contentType, author, isbn, status
            },
            include: { subject: true },
        });
        res.json(resource);
    }
    catch (error) {
        console.error("Error updating resource:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
// Delete a resource
router.delete("/resources/:id", (0, auth_middleware_1.requireMinRole)("HEADMASTER"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.academicResource.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error("Error deleting resource:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
exports.default = router;
