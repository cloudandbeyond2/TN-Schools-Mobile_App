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
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireMinRole)('PET'));
function schoolScope(req) {
    var _a;
    return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.schoolId) ? { schoolId: req.user.schoolId } : {};
}
function stampSchool(req, data) {
    var _a;
    if (!data.schoolId && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.schoolId))
        data.schoolId = req.user.schoolId;
    return data;
}
// GET /api/pet/sports-conducted - Fetch all sports events for the school
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield prisma_1.prisma.petSportsEvent.findMany({
            where: schoolScope(req),
            orderBy: { date: 'asc' },
        });
        res.json({ success: true, data: events });
    }
    catch (err) {
        console.error('Error fetching PET sports events:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/pet/sports-conducted - Log a new sports event
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = req.body;
        const data = stampSchool(req, {
            name: body.name,
            kind: body.kind,
            sport: body.sport,
            level: body.level,
            date: body.date,
            venue: body.venue,
            participants: Number(body.participants) || 0,
            status: body.status,
            result: body.result || "",
            notes: body.notes || "",
            targetClasses: body.targetClasses || "All Classes",
            ageGroup: body.ageGroup || "Open",
        });
        if (!data.name) {
            return res.status(400).json({ success: false, error: 'Event name is required' });
        }
        const created = yield prisma_1.prisma.petSportsEvent.create({ data });
        // Asynchronously dispatch notifications to parents of target students
        if (created.schoolId) {
            const studentIds = req.body.studentIds;
            Promise.resolve().then(() => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    let students;
                    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
                        students = yield prisma_1.prisma.student.findMany({
                            where: { id: { in: studentIds } },
                            select: { id: true, parentMobile: true, userId: true }
                        });
                    }
                    else {
                        let targetClassesList = [];
                        if (created.targetClasses === "Class 6-8") {
                            targetClassesList = ['6', '7', '8', '06', '07', '08'];
                        }
                        else if (created.targetClasses === "Class 9-10") {
                            targetClassesList = ['9', '10', '09', '10'];
                        }
                        else if (created.targetClasses === "Class 11-12") {
                            targetClassesList = ['11', '12'];
                        }
                        students = yield prisma_1.prisma.student.findMany({
                            where: {
                                schoolId: created.schoolId || undefined,
                                class: targetClassesList.length > 0 ? { in: targetClassesList } : undefined,
                            },
                            select: { id: true, parentMobile: true, userId: true }
                        });
                    }
                    // 1. Dispatch Parent Notifications & Student Notifications
                    for (const student of students) {
                        // Student notification
                        if (student.userId) {
                            yield prisma_1.prisma.notification.create({
                                data: {
                                    userId: student.userId,
                                    message: `New sports ${created.kind.toLowerCase()} scheduled: "${created.name}" (${created.sport}) on ${created.date} at ${created.venue}.`,
                                    read: false
                                }
                            });
                        }
                        // Parent notification
                        const links = yield prisma_1.prisma.parentStudentLink.findMany({
                            where: { studentId: student.id }
                        });
                        const parentIds = new Set();
                        links.forEach(l => parentIds.add(l.parentId));
                        if (parentIds.size === 0 && student.parentMobile) {
                            const parent = yield prisma_1.prisma.headmasterParent.findFirst({
                                where: { phone: student.parentMobile }
                            });
                            if (parent)
                                parentIds.add(parent.id);
                        }
                        for (const parentId of parentIds) {
                            yield prisma_1.prisma.parentNotification.create({
                                data: {
                                    parentId,
                                    studentId: student.id,
                                    type: 'SPORTS_ALERT',
                                    title: `New Sports ${created.kind} Scheduled`,
                                    message: `A new ${created.kind.toLowerCase()} "${created.name}" (${created.sport}) is scheduled for ${created.targetClasses} on ${created.date} at ${created.venue}.`,
                                }
                            });
                        }
                    }
                    // 2. Dispatch Headmaster Notification
                    const hmUser = yield prisma_1.prisma.user.findFirst({
                        where: {
                            schoolId: created.schoolId,
                            role: 'HEADMASTER'
                        }
                    });
                    if (hmUser) {
                        yield prisma_1.prisma.notification.create({
                            data: {
                                userId: hmUser.id,
                                message: `New school sports ${created.kind.toLowerCase()} logged: "${created.name}" (${created.sport}) scheduled for ${created.targetClasses} on ${created.date}.`,
                                read: false
                            }
                        });
                    }
                    console.log(`Dispatched notifications for sports event "${created.name}" to HM, ${students.length} students, and parents`);
                }
                catch (err) {
                    console.error('Error dispatching notifications for sports event:', err);
                }
            }));
        }
        res.json({ success: true, data: created });
    }
    catch (err) {
        console.error('Error creating PET sports event:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/pet/sports-conducted/bulk - Bulk import events
router.post('/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { events } = req.body;
        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ success: false, error: 'events must be a non-empty array' });
        }
        const rows = events.map((e) => stampSchool(req, {
            name: e.name,
            kind: e.kind,
            sport: e.sport,
            level: e.level,
            date: e.date,
            venue: e.venue,
            participants: Number(e.participants) || 0,
            status: e.status,
            result: e.result || "",
            notes: e.notes || "",
            targetClasses: e.targetClasses || "All Classes",
            ageGroup: e.ageGroup || "Open",
        })).filter(row => row.name);
        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: 'no valid events provided' });
        }
        const created = yield prisma_1.prisma.$transaction(rows.map((row) => prisma_1.prisma.petSportsEvent.create({ data: row })));
        res.json({ success: true, data: created });
    }
    catch (err) {
        console.error('Error bulk-creating PET sports events:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/pet/sports-conducted/:id - Update an event
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.petSportsEvent.findFirst({ where: Object.assign({ id }, schoolScope(req)) });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        const body = req.body;
        const data = {
            name: body.name,
            kind: body.kind,
            sport: body.sport,
            level: body.level,
            date: body.date,
            venue: body.venue,
            participants: Number(body.participants) || 0,
            status: body.status,
            result: body.result || "",
            notes: body.notes || "",
            targetClasses: body.targetClasses || "All Classes",
            ageGroup: body.ageGroup || "Open",
        };
        const updated = yield prisma_1.prisma.petSportsEvent.update({
            where: { id },
            data,
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('Error updating PET sports event:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/pet/sports-conducted/:id - Delete an event
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.petSportsEvent.findFirst({ where: Object.assign({ id }, schoolScope(req)) });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        yield prisma_1.prisma.petSportsEvent.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting PET sports event:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
