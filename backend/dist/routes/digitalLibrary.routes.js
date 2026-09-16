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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
// ─── GET /api/digital-library?schoolId=&subject=&type=&class= ────
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, subject, type, class: cls, search } = req.query;
        const rows = yield prisma_1.prisma.$queryRaw `
      SELECT r.*, u.name as "teacherName"
      FROM "DigitalLibraryResource" r
      LEFT JOIN "User" u ON r."teacherId" = u.id
      WHERE r."isActive" = true
        ${schoolId
            ? prisma_1.prisma.$queryRaw `AND (r."schoolId" = ${String(schoolId)} OR r."schoolId" IS NULL)`
            : prisma_1.prisma.$queryRaw `AND r."schoolId" IS NULL`}
        ${subject ? prisma_1.prisma.$queryRaw `AND r.subject = ${String(subject)}` : prisma_1.prisma.$queryRaw ``}
        ${type ? prisma_1.prisma.$queryRaw `AND r.type = ${String(type)}` : prisma_1.prisma.$queryRaw ``}
        ${cls ? prisma_1.prisma.$queryRaw `AND r.class = ${String(cls)}` : prisma_1.prisma.$queryRaw ``}
        ${search ? prisma_1.prisma.$queryRaw `AND (r.title ILIKE ${'%' + String(search) + '%'} OR r.description ILIKE ${'%' + String(search) + '%'})` : prisma_1.prisma.$queryRaw ``}
      ORDER BY r."uploadDate" DESC
    `;
        return res.json({ success: true, data: rows, count: rows.length });
    }
    catch (err) {
        console.error('[GET /api/digital-library]', err.message);
        // Fall back to Prisma ORM on raw query error
        try {
            const where = { isActive: true };
            const conditions = [];
            if (req.query.schoolId) {
                conditions.push({
                    OR: [
                        { schoolId: String(req.query.schoolId) },
                        { schoolId: null }
                    ]
                });
            }
            else {
                conditions.push({
                    schoolId: null
                });
            }
            if (req.query.subject)
                where.subject = String(req.query.subject);
            if (req.query.type)
                where.type = String(req.query.type);
            if (req.query.class)
                where.class = String(req.query.class);
            if (req.query.search) {
                conditions.push({
                    OR: [
                        { title: { contains: String(req.query.search), mode: 'insensitive' } },
                        { description: { contains: String(req.query.search), mode: 'insensitive' } },
                    ]
                });
            }
            if (conditions.length > 0) {
                where.AND = conditions;
            }
            const data = yield prisma_1.prisma.digitalLibraryResource.findMany({
                where,
                orderBy: { uploadDate: 'desc' },
            });
            const teacherIds = Array.from(new Set(data.map(item => item.teacherId).filter(Boolean)));
            const teacherMap = new Map();
            if (teacherIds.length > 0) {
                const users = yield prisma_1.prisma.user.findMany({
                    where: { id: { in: teacherIds } },
                    select: { id: true, name: true }
                });
                users.forEach(u => {
                    teacherMap.set(u.id, u.name);
                });
            }
            const dataWithTeacher = data.map(item => (Object.assign(Object.assign({}, item), { teacherName: item.teacherId ? teacherMap.get(item.teacherId) : undefined })));
            return res.json({ success: true, data: dataWithTeacher, count: dataWithTeacher.length });
        }
        catch (e2) {
            console.error('[GET /api/digital-library] Fallback failed:', e2.message);
            return res.status(500).json({ success: false, error: 'Failed to fetch resources' });
        }
    }
}));
// ─── GET /api/digital-library/:id ────────────────────────────────
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield prisma_1.prisma.digitalLibraryResource.findUnique({
            where: { id: req.params.id },
        });
        if (!item)
            return res.status(404).json({ success: false, error: 'Resource not found' });
        // bump view count
        yield prisma_1.prisma.digitalLibraryResource.update({
            where: { id: req.params.id },
            data: { views: { increment: 1 } },
        });
        return res.json({ success: true, data: item });
    }
    catch (err) {
        console.error('[GET /api/digital-library/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch resource' });
    }
}));
// ─── POST /api/digital-library ───────────────────────────────────
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, type, subject, class: cls, size, description, tags, fileUrl, aiContent, schoolId, teacherId } = req.body;
        if (!title || !type || !subject || !cls) {
            return res.status(400).json({
                success: false,
                error: 'title, type, subject, and class are required',
            });
        }
        const id = (0, crypto_1.randomUUID)();
        const now = new Date();
        const tagsArr = Array.isArray(tags) ? tags : (tags ? [tags] : []);
        const rows = yield prisma_1.prisma.$queryRaw `
      INSERT INTO "DigitalLibraryResource"
        (id, title, type, subject, class, size, description, tags, "fileUrl", "aiContent",
         "uploadDate", downloads, views, "schoolId", "teacherId", "isActive", "createdAt", "updatedAt")
      VALUES
        (${id}, ${title}, ${type}, ${subject}, ${String(cls)},
         ${size || 'N/A'}, ${description || null}, ${tagsArr}, ${fileUrl || null}, ${aiContent || null},
         ${now}, 0, 0, ${schoolId || null}, ${teacherId || null}, true, ${now}, ${now})
      RETURNING *
    `;
        return res.status(201).json({
            success: true,
            data: rows[0],
            message: `"${title}" added to Digital Library`,
        });
    }
    catch (err) {
        console.error('[POST /api/digital-library]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to add resource' });
    }
}));
// ─── PUT /api/digital-library/:id ────────────────────────────────
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.prisma.$queryRaw `SELECT * FROM "DigitalLibraryResource" WHERE id = ${req.params.id}`;
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, error: 'Resource not found' });
        }
        const curr = existing[0];
        const { title, type, subject, class: cls, size, description, tags, fileUrl, aiContent, isActive, downloads } = req.body;
        const now = new Date();
        const tagsArr = tags !== undefined ? (Array.isArray(tags) ? tags : [tags]) : curr.tags;
        const rows = yield prisma_1.prisma.$queryRaw `
      UPDATE "DigitalLibraryResource"
      SET
        title       = ${title !== null && title !== void 0 ? title : curr.title},
        type        = ${type !== null && type !== void 0 ? type : curr.type},
        subject     = ${subject !== null && subject !== void 0 ? subject : curr.subject},
        class       = ${cls !== null && cls !== void 0 ? cls : curr.class},
        size        = ${size !== null && size !== void 0 ? size : curr.size},
        description = ${description !== null && description !== void 0 ? description : curr.description},
        tags        = ${tagsArr},
        "fileUrl"   = ${fileUrl !== null && fileUrl !== void 0 ? fileUrl : curr.fileUrl},
        "aiContent" = ${aiContent !== null && aiContent !== void 0 ? aiContent : curr.aiContent},
        "isActive"  = ${isActive !== undefined ? Boolean(isActive) : curr.isActive},
        downloads   = ${downloads !== undefined ? Number(downloads) : curr.downloads},
        "updatedAt" = ${now}
      WHERE id = ${req.params.id}
      RETURNING *
    `;
        return res.json({ success: true, data: rows[0], message: 'Resource updated' });
    }
    catch (err) {
        console.error('[PUT /api/digital-library/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to update resource' });
    }
}));
// ─── DELETE /api/digital-library/:id ─────────────────────────────
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield prisma_1.prisma.digitalLibraryResource.findUnique({
            where: { id: req.params.id },
        });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Resource not found' });
        yield prisma_1.prisma.digitalLibraryResource.delete({ where: { id: req.params.id } });
        return res.json({ success: true, message: `"${existing.title}" deleted` });
    }
    catch (err) {
        console.error('[DELETE /api/digital-library/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to delete resource' });
    }
}));
exports.default = router;
