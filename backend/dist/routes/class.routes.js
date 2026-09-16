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
// ─── GET /api/classes?schoolId=&teacherId= ──────────────────────
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, teacherId } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        }
        let classRooms = [];
        if (teacherId) {
            const teacherIds = [String(teacherId)];
            // 1. If teacherId is a User.id, let's find the HeadmasterStaff by email
            const user = yield prisma_1.prisma.user.findUnique({
                where: { id: String(teacherId) },
                select: { email: true }
            });
            if (user && user.email) {
                const staff = yield prisma_1.prisma.headmasterStaff.findFirst({
                    where: { email: user.email },
                    select: { id: true }
                });
                if (staff) {
                    teacherIds.push(staff.id);
                }
            }
            // 2. If teacherId is a HeadmasterStaff.id, let's find the User by email
            const staff = yield prisma_1.prisma.headmasterStaff.findUnique({
                where: { id: String(teacherId) },
                select: { email: true }
            });
            if (staff && staff.email) {
                const matchedUser = yield prisma_1.prisma.user.findFirst({
                    where: { email: { equals: staff.email, mode: 'insensitive' } },
                    select: { id: true }
                });
                if (matchedUser) {
                    teacherIds.push(matchedUser.id);
                }
            }
            classRooms = yield prisma_1.prisma.classRoom.findMany({
                where: {
                    schoolId: String(schoolId),
                    teacherId: { in: teacherIds }
                },
                orderBy: [
                    { className: 'asc' },
                    { section: 'asc' }
                ]
            });
        }
        else {
            classRooms = yield prisma_1.prisma.classRoom.findMany({
                where: {
                    schoolId: String(schoolId)
                },
                orderBy: [
                    { className: 'asc' },
                    { section: 'asc' }
                ]
            });
        }
        return res.json({ success: true, data: classRooms, count: classRooms.length });
    }
    catch (err) {
        console.error('[GET /api/classes]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch classes' });
    }
}));
// ─── GET /api/classes/:id ────────────────────────────────────────
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const rows = yield prisma_1.prisma.$queryRaw `
      SELECT * FROM "ClassRoom" WHERE id = ${id} LIMIT 1
    `;
        if (!rows.length) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        return res.json({ success: true, data: rows[0] });
    }
    catch (err) {
        console.error('[GET /api/classes/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch class' });
    }
}));
// ─── POST /api/classes ───────────────────────────────────────────
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, teacherId, className, section, subject, academicYear, roomNumber, schedule, totalStudents, description, } = req.body;
        if (!schoolId || !className || !section || !subject) {
            return res.status(400).json({
                success: false,
                error: 'schoolId, className, section, and subject are required',
            });
        }
        // Check duplicate
        const existing = yield prisma_1.prisma.$queryRaw `
      SELECT id FROM "ClassRoom"
      WHERE "schoolId" = ${schoolId}
        AND "className" = ${String(className)}
        AND section = ${String(section).toUpperCase()}
        AND subject = ${subject}
      LIMIT 1
    `;
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: `Class ${className}${section} - ${subject} already exists for this school`,
            });
        }
        const id = (0, crypto_1.randomUUID)();
        const now = new Date();
        const secUp = String(section).toUpperCase();
        const year = academicYear || '2024-25';
        const room = roomNumber || null;
        const sched = schedule || null;
        const total = parseInt(totalStudents) || 0;
        const desc = description || null;
        const teacher = teacherId || null;
        const rows = yield prisma_1.prisma.$queryRaw `
      INSERT INTO "ClassRoom"
        (id, "schoolId", "teacherId", "className", section, subject, "academicYear",
         "roomNumber", schedule, "totalStudents", description, "isActive", "createdAt", "updatedAt")
      VALUES
        (${id}, ${schoolId}, ${teacher}, ${String(className)}, ${secUp}, ${subject}, ${year},
         ${room}, ${sched}, ${total}, ${desc}, true, ${now}, ${now})
      RETURNING *
    `;
        return res.status(201).json({
            success: true,
            data: rows[0],
            message: `Class ${className}${secUp} - ${subject} created successfully`,
        });
    }
    catch (err) {
        console.error('[POST /api/classes]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to create class' });
    }
}));
// ─── PUT /api/classes/:id ────────────────────────────────────────
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.$queryRaw `
      SELECT * FROM "ClassRoom" WHERE id = ${id} LIMIT 1
    `;
        if (!existing.length) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        const cur = existing[0];
        const { className, section, subject, academicYear, roomNumber, schedule, totalStudents, description, isActive, teacherId, } = req.body;
        const now = new Date();
        const clsName = className !== undefined ? String(className) : cur.className;
        const secUp = section !== undefined ? String(section).toUpperCase() : cur.section;
        const subj = subject !== undefined ? subject : cur.subject;
        const year = academicYear !== undefined ? academicYear : cur.academicYear;
        const room = roomNumber !== undefined ? roomNumber : cur.roomNumber;
        const sched = schedule !== undefined ? schedule : cur.schedule;
        const total = totalStudents !== undefined ? parseInt(totalStudents) : cur.totalStudents;
        const desc = description !== undefined ? description : cur.description;
        const active = isActive !== undefined ? Boolean(isActive) : cur.isActive;
        const teacher = teacherId !== undefined ? teacherId : cur.teacherId;
        const rows = yield prisma_1.prisma.$queryRaw `
      UPDATE "ClassRoom"
      SET "className" = ${clsName}, section = ${secUp}, subject = ${subj},
          "academicYear" = ${year}, "roomNumber" = ${room}, schedule = ${sched},
          "totalStudents" = ${total}, description = ${desc}, "isActive" = ${active},
          "teacherId" = ${teacher}, "updatedAt" = ${now}
      WHERE id = ${id}
      RETURNING *
    `;
        return res.json({
            success: true,
            data: rows[0],
            message: `Class ${clsName}${secUp} updated successfully`,
        });
    }
    catch (err) {
        console.error('[PUT /api/classes/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to update class' });
    }
}));
// ─── DELETE /api/classes/:id ─────────────────────────────────────
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.$queryRaw `
      SELECT * FROM "ClassRoom" WHERE id = ${id} LIMIT 1
    `;
        if (!existing.length) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        const cur = existing[0];
        yield prisma_1.prisma.$queryRaw `DELETE FROM "ClassRoom" WHERE id = ${id}`;
        return res.json({
            success: true,
            message: `Class ${cur.className}${cur.section} - ${cur.subject} deleted successfully`,
        });
    }
    catch (err) {
        console.error('[DELETE /api/classes/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to delete class' });
    }
}));
exports.default = router;
