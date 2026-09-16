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
const router = (0, express_1.Router)();
// Helper to resolve all potential IDs for a teacher (User.id and HeadmasterStaff.id)
function getTeacherIds(teacherId) {
    return __awaiter(this, void 0, void 0, function* () {
        const ids = [teacherId];
        // 1. If teacherId is a User.id, let's find the HeadmasterStaff by email
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: teacherId },
            select: { email: true }
        });
        if (user && user.email) {
            const staff = yield prisma_1.prisma.headmasterStaff.findFirst({
                where: { email: user.email },
                select: { id: true }
            });
            if (staff)
                ids.push(staff.id);
        }
        // 2. If teacherId is a HeadmasterStaff.id, let's find the User by email
        const staff = yield prisma_1.prisma.headmasterStaff.findUnique({
            where: { id: teacherId },
            select: { email: true }
        });
        if (staff && staff.email) {
            const matchedUser = yield prisma_1.prisma.user.findFirst({
                where: { email: staff.email },
                select: { id: true }
            });
            if (matchedUser)
                ids.push(matchedUser.id);
        }
        return ids;
    });
}
// 1. GET /api/timetable — Fetch timetable slots
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, class: className, section, dayOfWeek } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        }
        const whereClause = { schoolId: String(schoolId) };
        if (className)
            whereClause.class = String(className);
        if (section)
            whereClause.section = String(section);
        if (dayOfWeek)
            whereClause.dayOfWeek = parseInt(String(dayOfWeek));
        const timetable = yield prisma_1.prisma.timetable.findMany({
            where: whereClause,
            orderBy: [
                { dayOfWeek: 'asc' },
                { period: 'asc' }
            ]
        });
        res.json({ success: true, count: timetable.length, data: timetable });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 2. GET /api/timetable/teacher/:teacherId — Fetch schedule for a specific teacher
router.get('/teacher/:teacherId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId } = req.params;
        const teacherIds = yield getTeacherIds(teacherId);
        const timetable = yield prisma_1.prisma.timetable.findMany({
            where: {
                teacherId: { in: teacherIds }
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { period: 'asc' }
            ]
        });
        res.json({ success: true, count: timetable.length, data: timetable });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 3. POST /api/timetable — Create weekly timetable slot with Conflict Checking
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, class: className, section, dayOfWeek, period, subject, teacherId, startTime, endTime } = req.body;
        if (!schoolId || !className || !section || !dayOfWeek || !period || !subject || !startTime || !endTime) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        // --- Production Conflict Checks ---
        if (teacherId) {
            const teacherIds = yield getTeacherIds(teacherId);
            // Check if this teacher is already scheduled elsewhere in the same period on this day
            const conflict = yield prisma_1.prisma.timetable.findFirst({
                where: {
                    schoolId,
                    dayOfWeek: parseInt(dayOfWeek),
                    period: parseInt(period),
                    teacherId: { in: teacherIds }
                }
            });
            if (conflict && (conflict.class !== String(className) || conflict.section !== String(section))) {
                return res.status(400).json({
                    success: false,
                    error: `Teacher conflict: This teacher is already scheduled to teach Class ${conflict.class}${conflict.section} (${conflict.subject}) in Period ${period} on this day.`
                });
            }
        }
        const slot = yield prisma_1.prisma.timetable.upsert({
            where: {
                schoolId_class_section_dayOfWeek_period: {
                    schoolId,
                    class: String(className),
                    section: String(section),
                    dayOfWeek: parseInt(dayOfWeek),
                    period: parseInt(period),
                }
            },
            update: {
                subject,
                teacherId: teacherId || null,
                startTime,
                endTime,
            },
            create: {
                schoolId,
                class: String(className),
                section: String(section),
                dayOfWeek: parseInt(dayOfWeek),
                period: parseInt(period),
                subject,
                teacherId: teacherId || null,
                startTime,
                endTime,
            }
        });
        res.json({ success: true, message: 'Timetable slot saved successfully', data: slot });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 4. PUT /api/timetable/:id — Update weekly timetable slot with Conflict Checking
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { subject, teacherId, startTime, endTime, class: className, section, dayOfWeek, period, schoolId } = req.body;
        const parsedDayOfWeek = dayOfWeek ? parseInt(dayOfWeek) : undefined;
        const parsedPeriod = period ? parseInt(period) : undefined;
        // --- Production Conflict Checks ---
        if (teacherId && schoolId && parsedDayOfWeek && parsedPeriod) {
            const teacherIds = yield getTeacherIds(teacherId);
            const conflict = yield prisma_1.prisma.timetable.findFirst({
                where: {
                    schoolId,
                    dayOfWeek: parsedDayOfWeek,
                    period: parsedPeriod,
                    teacherId: { in: teacherIds },
                    id: { not: id } // Exclude current record
                }
            });
            if (conflict) {
                return res.status(400).json({
                    success: false,
                    error: `Teacher conflict: This teacher is already scheduled to teach Class ${conflict.class}${conflict.section} (${conflict.subject}) in Period ${parsedPeriod} on this day.`
                });
            }
        }
        const slot = yield prisma_1.prisma.timetable.update({
            where: { id },
            data: {
                subject,
                teacherId: teacherId !== undefined ? teacherId : undefined,
                startTime,
                endTime,
                class: className,
                section,
                dayOfWeek: parsedDayOfWeek,
                period: parsedPeriod,
            }
        });
        res.json({ success: true, message: 'Timetable slot updated successfully', data: slot });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 5. DELETE /api/timetable/:id — Delete weekly timetable slot
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.timetable.delete({
            where: { id }
        });
        res.json({ success: true, message: 'Timetable slot deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 6. GET /api/timetable/teachers — Fetch teachers in a school for selection with availability context
router.get('/teachers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, dayOfWeek, period } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        }
        const staff = yield prisma_1.prisma.headmasterStaff.findMany({
            where: { schoolId: String(schoolId) },
            orderBy: { name: 'asc' },
        });
        // If dayOfWeek and period are provided, check which teachers are busy
        if (dayOfWeek && period) {
            const busySlots = yield prisma_1.prisma.timetable.findMany({
                where: {
                    schoolId: String(schoolId),
                    dayOfWeek: parseInt(String(dayOfWeek)),
                    period: parseInt(String(period))
                },
                select: {
                    teacherId: true,
                    class: true,
                    section: true
                }
            });
            const formattedStaff = staff.map(s => {
                const busy = busySlots.find(slot => slot.teacherId === s.id || slot.teacherId === s.userId);
                return Object.assign(Object.assign({}, s), { isBusy: !!busy, busyWithClass: busy ? `${busy.class}${busy.section}` : null });
            });
            return res.json({ success: true, count: formattedStaff.length, data: formattedStaff });
        }
        res.json({ success: true, count: staff.length, data: staff });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 7. POST /api/timetable/proxy — Create/update proxy assignment with Conflict Check
router.post('/proxy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { schoolId, date, period, timetableId, absentTeacherId, proxyTeacherId, notes } = req.body;
        if (!schoolId || !date || !period || !timetableId || !absentTeacherId || !proxyTeacherId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const parsedDate = new Date(date + 'T00:00:00Z');
        const dayOfWeek = parsedDate.getDay(); // 0 = Sun, 1 = Mon...
        const proxyTeacherIds = yield getTeacherIds(proxyTeacherId);
        // --- Production Proxy Conflict Checks ---
        // A. Check if substitute has a regular class scheduled during this period today
        const regularConflict = yield prisma_1.prisma.timetable.findFirst({
            where: {
                schoolId,
                dayOfWeek,
                period: parseInt(period),
                teacherId: { in: proxyTeacherIds }
            }
        });
        // B. Check if substitute is already covering another proxy during this period today
        const proxyConflict = yield prisma_1.prisma.proxyAssignment.findFirst({
            where: {
                schoolId,
                date: parsedDate,
                period: parseInt(period),
                proxyTeacherId: { in: proxyTeacherIds },
                timetableId: { not: timetableId }
            },
            include: {
                timetable: true
            }
        });
        if (regularConflict || proxyConflict) {
            const conflictingClass = regularConflict
                ? `Class ${regularConflict.class}${regularConflict.section} (Regular Schedule)`
                : `Class ${(_a = proxyConflict === null || proxyConflict === void 0 ? void 0 : proxyConflict.timetable) === null || _a === void 0 ? void 0 : _a.class}${(_b = proxyConflict === null || proxyConflict === void 0 ? void 0 : proxyConflict.timetable) === null || _b === void 0 ? void 0 : _b.section} (Other Proxy Duty)`;
            return res.status(400).json({
                success: false,
                error: `Conflict: Substitute teacher is already busy teaching ${conflictingClass} during Period ${period} today.`
            });
        }
        const proxy = yield prisma_1.prisma.proxyAssignment.upsert({
            where: {
                schoolId_date_period_timetableId: {
                    schoolId,
                    date: parsedDate,
                    period: parseInt(period),
                    timetableId,
                }
            },
            update: {
                absentTeacherId,
                proxyTeacherId,
                notes: notes || null,
            },
            create: {
                schoolId,
                date: parsedDate,
                period: parseInt(period),
                timetableId,
                absentTeacherId,
                proxyTeacherId,
                notes: notes || null,
            }
        });
        res.json({ success: true, message: 'Proxy assignment confirmed successfully', data: proxy });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 8. GET /api/timetable/proxy — Fetch proxy assignments for a school on a specific date
router.get('/proxy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, date } = req.query;
        if (!schoolId || !date) {
            return res.status(400).json({ success: false, error: 'schoolId and date are required' });
        }
        const parsedDate = new Date(String(date) + 'T00:00:00Z');
        const proxies = yield prisma_1.prisma.proxyAssignment.findMany({
            where: {
                schoolId: String(schoolId),
                date: parsedDate
            },
            include: {
                timetable: true
            }
        });
        res.json({ success: true, count: proxies.length, data: proxies });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// 9. GET /api/timetable/proxy/teacher/:teacherId — Fetch proxy duties (substituting/absent) for a teacher today
router.get('/proxy/teacher/:teacherId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId } = req.params;
        const { date } = req.query;
        const teacherIds = yield getTeacherIds(teacherId);
        const whereClause = {
            OR: [
                { proxyTeacherId: { in: teacherIds } },
                { absentTeacherId: { in: teacherIds } }
            ]
        };
        if (date) {
            whereClause.date = new Date(String(date) + 'T00:00:00Z');
        }
        const proxies = yield prisma_1.prisma.proxyAssignment.findMany({
            where: whereClause,
            include: {
                timetable: true,
                school: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
        res.json({ success: true, count: proxies.length, data: proxies });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
