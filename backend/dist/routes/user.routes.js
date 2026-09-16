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
const client_1 = require("@prisma/client");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Fields safe to return to clients — never includes passwordHash
const SAFE_USER_SELECT = {
    id: true,
    emisId: true,
    aadhaarHash: true,
    mobile: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    schoolId: true,
    district: true,
    block: true,
    assignedRegion: true,
    createdAt: true,
    updatedAt: true,
};
// GET /api/users - List users by role
router.get('/', (0, auth_middleware_1.requireMinRole)('HEADMASTER'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role } = req.query;
        if (role && !Object.values(client_1.Role).includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role parameter' });
        }
        const filter = role ? { role: role } : {};
        const users = yield prisma_1.prisma.user.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' },
            select: SAFE_USER_SELECT,
        });
        res.json({ success: true, count: users.length, data: users });
    }
    catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/users - Create a new user
router.post('/', (0, auth_middleware_1.requireMinRole)('BEO'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, email, mobile, role, password, schoolId } = req.body;
        if (!name || !email || !role || !password) {
            return res.status(400).json({ success: false, error: 'Name, email, role, and password are required' });
        }
        if (!Object.values(client_1.Role).includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role value' });
        }
        // Only a superadmin can create another superadmin
        if (role === 'SUPERADMIN' && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'SUPERADMIN') {
            return res.status(403).json({ success: false, error: 'Only a superadmin can create superadmin accounts' });
        }
        // Check if email already exists
        const existing = yield prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ success: false, error: 'User with this email already exists' });
        }
        // Check if mobile already exists
        if (mobile) {
            const existingMobile = yield prisma_1.prisma.user.findUnique({ where: { mobile } });
            if (existingMobile) {
                return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
            }
        }
        // Create user in PostgreSQL database
        const user = yield prisma_1.prisma.user.create({
            data: {
                name,
                email,
                mobile: mobile || null,
                role: role,
                passwordHash: yield (0, password_1.hashPassword)(password),
                schoolId: schoolId || null,
            },
            select: SAFE_USER_SELECT,
        });
        res.status(201).json({ success: true, data: user });
    }
    catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/users/:id - Update a user
router.put('/:id', (0, auth_middleware_1.requireMinRole)('BEO'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { name, email, mobile, password, schoolId, district, block, assignedRegion } = req.body;
        const existingUser = yield prisma_1.prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        // Only a superadmin can modify a superadmin account
        if (existingUser.role === 'SUPERADMIN' && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'SUPERADMIN') {
            return res.status(403).json({ success: false, error: 'Only a superadmin can modify superadmin accounts' });
        }
        // Check email uniqueness if email is changed
        if (email && email !== existingUser.email) {
            const emailDuplicate = yield prisma_1.prisma.user.findUnique({ where: { email } });
            if (emailDuplicate) {
                return res.status(400).json({ success: false, error: 'User with this email already exists' });
            }
        }
        // Check mobile uniqueness if mobile is changed
        if (mobile && mobile !== existingUser.mobile) {
            const mobileDuplicate = yield prisma_1.prisma.user.findUnique({ where: { mobile } });
            if (mobileDuplicate) {
                return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
            }
        }
        const updated = yield prisma_1.prisma.user.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                email: email !== undefined ? email : undefined,
                mobile: mobile !== undefined ? (mobile || null) : undefined,
                passwordHash: (password !== undefined && password !== '') ? yield (0, password_1.hashPassword)(password) : undefined,
                schoolId: schoolId !== undefined ? (schoolId || null) : undefined,
                district: district !== undefined ? (district || null) : undefined,
                block: block !== undefined ? (block || null) : undefined,
                assignedRegion: assignedRegion !== undefined ? (assignedRegion || null) : undefined,
            },
            select: SAFE_USER_SELECT,
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/users/:id - Delete a user and all dependent records
router.delete('/:id', (0, auth_middleware_1.requireMinRole)('BEO'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const existingUser = yield prisma_1.prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        // Only a superadmin can delete a superadmin account
        if (existingUser.role === 'SUPERADMIN' && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'SUPERADMIN') {
            return res.status(403).json({ success: false, error: 'Only a superadmin can delete superadmin accounts' });
        }
        // If the user is a STUDENT, clean up all student-linked records first
        const student = yield prisma_1.prisma.student.findUnique({ where: { userId: id } });
        if (student) {
            yield prisma_1.prisma.parentStudentLink.deleteMany({ where: { studentId: student.id } });
            yield prisma_1.prisma.parentNotification.updateMany({ where: { studentId: student.id }, data: { studentId: null } });
            yield prisma_1.prisma.homeworkSubmission.updateMany({ where: { studentId: student.id }, data: { studentId: null } });
            yield prisma_1.prisma.watchlistStudent.updateMany({ where: { studentId: student.id }, data: { studentId: null } });
            yield prisma_1.prisma.clubMember.deleteMany({ where: { studentId: student.id } });
            yield prisma_1.prisma.scholarship.deleteMany({ where: { studentId: student.id } });
            yield prisma_1.prisma.mark.deleteMany({ where: { studentId: student.id } });
            yield prisma_1.prisma.attendance.deleteMany({ where: { studentId: student.id } });
            yield prisma_1.prisma.studentBadge.deleteMany({ where: { studentId: student.id } });
            // Student itself will CASCADE delete when User is deleted
        }
        // If the user is a TEACHER, Notification CASCADE handles it via schema
        // User delete will CASCADE to Student and Teacher via onDelete: Cascade
        yield prisma_1.prisma.user.delete({ where: { id } });
        res.json({ success: true, message: 'User and all associated records deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// Staff whose subject is Physical Education log into the dedicated PET portal
// (the DB Role enum has no PET value — the role is derived from the subject).
const isPetSubject = (subject) => {
    const s = (subject || '').trim().toLowerCase();
    return s === 'pet' || s === 'p.e.t' || s === 'p.e.t.' || s.includes('physical educ') || s.includes('physical train');
};
// POST /api/users/auth - Authenticate user (for NextAuth)
router.post('/auth', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { loginType, email, password, rollNumber, phone } = req.body;
        const withSchoolInfo = (userData) => __awaiter(void 0, void 0, void 0, function* () {
            if (userData.schoolId) {
                const school = yield prisma_1.prisma.school.findUnique({
                    where: { id: userData.schoolId },
                    select: { name: true, dise: true }
                });
                if (school) {
                    userData.schoolName = school.name;
                    userData.schoolDise = school.dise;
                }
            }
            return userData;
        });
        if (loginType === 'student') {
            const inputRoll = rollNumber || email;
            const inputPhone = phone || password;
            if (!inputRoll || !inputPhone) {
                return res.status(400).json({ success: false, error: 'Roll number and phone number are required for student login.' });
            }
            const cleanRoll = String(inputRoll).trim();
            const cleanPhone = String(inputPhone).trim();
            // Query student by rollNumber (case-insensitive)
            const student = yield prisma_1.prisma.student.findFirst({
                where: {
                    rollNumber: {
                        equals: cleanRoll,
                        mode: 'insensitive'
                    }
                },
                include: {
                    user: true
                }
            });
            if (!student) {
                return res.status(400).json({ success: false, error: 'Student not found with this roll number.' });
            }
            if (!student.user) {
                return res.status(400).json({ success: false, error: 'Student account is not linked to a user.' });
            }
            // Verify phone number against multiple stored fields:
            // 1. passwordHash (bcrypt hash of phone, set on creation — most reliable)
            // 2. user.mobile (can be null if another user had same phone)
            // 3. student.parentMobile (fallback)
            const userMobile = student.user.mobile ? String(student.user.mobile).trim() : null;
            const parentMobile = student.parentMobile ? String(student.parentMobile).trim() : null;
            const matchesPhone = (yield (0, password_1.verifyPassword)(cleanPhone, student.user.passwordHash)) ||
                userMobile === cleanPhone ||
                parentMobile === cleanPhone;
            if (!matchesPhone) {
                return res.status(400).json({ success: false, error: 'Incorrect phone number.' });
            }
            return res.json({
                success: true,
                data: yield withSchoolInfo({
                    id: student.user.id,
                    name: student.user.name,
                    email: student.user.email || `${student.rollNumber}@tn.gov.in`,
                    role: "STUDENT",
                    // IMPORTANT
                    schoolId: student.schoolId,
                    class: student.class,
                    section: student.section,
                    group: student.group, // Student HSC group
                    studentId: student.id, // Student record ID (for leave, homework, etc.)
                    rollNumber: student.rollNumber, // Roll number for display
                    token: (0, jwt_1.signAuthToken)({
                        id: student.user.id,
                        role: 'STUDENT',
                        schoolId: student.schoolId,
                        studentId: student.id,
                        name: student.user.name,
                    }),
                }),
            });
        }
        else {
            // Staff / Parent login by Email and Password
            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Email and password are required.' });
            }
            const cleanEmail = String(email).trim().toLowerCase();
            // ── Step 1: Check PostgreSQL User table (primary source) ──
            const pgUser = yield prisma_1.prisma.user.findFirst({
                where: { email: { equals: cleanEmail, mode: 'insensitive' } }
            });
            if (pgUser) {
                let isPasswordValid = yield (0, password_1.verifyPassword)(password, pgUser.passwordHash);
                // Fallback check for TEACHER role password in headmasterStaff
                if (!isPasswordValid && pgUser.role === "TEACHER") {
                    const teacher = yield prisma_1.prisma.headmasterStaff.findFirst({
                        where: { email: { equals: cleanEmail, mode: "insensitive" } },
                    });
                    if (teacher && (yield (0, password_1.verifyPassword)(password, teacher.password))) {
                        isPasswordValid = true;
                        // Synchronize password to PostgreSQL User table for future logins
                        // (always store a bcrypt hash — never copy a possibly-plaintext value)
                        yield prisma_1.prisma.user.update({
                            where: { id: pgUser.id },
                            data: { passwordHash: yield (0, password_1.hashPassword)(password) }
                        });
                    }
                }
                // Fallback check for PARENT role password in headmasterParent
                if (!isPasswordValid && pgUser.role === "PARENT") {
                    const parent = yield prisma_1.prisma.headmasterParent.findFirst({
                        where: { email: { equals: cleanEmail, mode: "insensitive" } },
                    });
                    if (parent && (yield (0, password_1.verifyPassword)(password, parent.password))) {
                        isPasswordValid = true;
                        // Synchronize password to PostgreSQL User table for future logins
                        // (always store a bcrypt hash — never copy a possibly-plaintext value)
                        yield prisma_1.prisma.user.update({
                            where: { id: pgUser.id },
                            data: { passwordHash: yield (0, password_1.hashPassword)(password) }
                        });
                    }
                }
                if (!isPasswordValid) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid password."
                    });
                }
                if (pgUser.role === "TEACHER") {
                    const teacher = yield prisma_1.prisma.headmasterStaff.findFirst({
                        where: {
                            email: {
                                equals: cleanEmail,
                                mode: "insensitive",
                            },
                        },
                    });
                    const teacherSubject = (_a = teacher === null || teacher === void 0 ? void 0 : teacher.subject) !== null && _a !== void 0 ? _a : "General";
                    const teacherRole = isPetSubject(teacherSubject) ? "PET" : "TEACHER";
                    const teacherId = (_b = teacher === null || teacher === void 0 ? void 0 : teacher.id) !== null && _b !== void 0 ? _b : pgUser.id;
                    const teacherSchoolId = (_c = teacher === null || teacher === void 0 ? void 0 : teacher.schoolId) !== null && _c !== void 0 ? _c : pgUser.schoolId;
                    return res.json({
                        success: true,
                        data: yield withSchoolInfo({
                            id: teacherId,
                            name: (_d = teacher === null || teacher === void 0 ? void 0 : teacher.name) !== null && _d !== void 0 ? _d : pgUser.name,
                            email: pgUser.email,
                            role: teacherRole,
                            schoolId: teacherSchoolId,
                            subject: teacherSubject,
                            token: (0, jwt_1.signAuthToken)({
                                id: teacherId,
                                role: teacherRole,
                                schoolId: teacherSchoolId,
                                name: (_e = teacher === null || teacher === void 0 ? void 0 : teacher.name) !== null && _e !== void 0 ? _e : pgUser.name,
                            }),
                        }),
                    });
                }
                let studentProfile = null;
                if (pgUser.role === "STUDENT") {
                    studentProfile = yield prisma_1.prisma.student.findUnique({ where: { userId: pgUser.id } });
                }
                return res.json({
                    success: true,
                    data: yield withSchoolInfo({
                        id: pgUser.id,
                        name: pgUser.name,
                        email: pgUser.email,
                        role: pgUser.role,
                        schoolId: pgUser.schoolId,
                        studentId: (studentProfile === null || studentProfile === void 0 ? void 0 : studentProfile.id) || null,
                        class: (studentProfile === null || studentProfile === void 0 ? void 0 : studentProfile.class) || null,
                        section: (studentProfile === null || studentProfile === void 0 ? void 0 : studentProfile.section) || null,
                        group: (studentProfile === null || studentProfile === void 0 ? void 0 : studentProfile.group) || null,
                        // Governance scope fields (for BEO/DEO/Commissioner/Minister/SuperAdmin)
                        district: pgUser.district || null,
                        block: pgUser.block || null,
                        assignedRegion: pgUser.assignedRegion || null,
                        token: (0, jwt_1.signAuthToken)({
                            id: pgUser.id,
                            role: pgUser.role,
                            schoolId: pgUser.schoolId,
                            studentId: (studentProfile === null || studentProfile === void 0 ? void 0 : studentProfile.id) || null,
                            name: pgUser.name,
                        }),
                    }),
                });
            }
            // ── Step 2: Check headmasterStaff (MongoDB via Prisma) ──
            const staffMember = yield prisma_1.prisma.headmasterStaff.findFirst({
                where: { email: cleanEmail }
            });
            if (staffMember) {
                if (!(yield (0, password_1.verifyPassword)(password, staffMember.password))) {
                    return res.status(400).json({ success: false, error: 'Invalid password.' });
                }
                const staffRole = isPetSubject(staffMember.subject) ? 'PET' : 'TEACHER';
                return res.json({
                    success: true,
                    data: yield withSchoolInfo({
                        id: String(staffMember.id),
                        name: staffMember.name,
                        email: staffMember.email || cleanEmail,
                        role: staffRole,
                        schoolId: staffMember.schoolId || null,
                        subject: staffMember.subject || 'General',
                        token: (0, jwt_1.signAuthToken)({
                            id: String(staffMember.id),
                            role: staffRole,
                            schoolId: staffMember.schoolId || null,
                            name: staffMember.name,
                        }),
                    })
                });
            }
            // ── Step 3: Check headmasterParent (MongoDB via Prisma) ──
            const parentMember = yield prisma_1.prisma.headmasterParent.findFirst({
                where: { email: cleanEmail }
            });
            if (parentMember) {
                if (!(yield (0, password_1.verifyPassword)(password, parentMember.password))) {
                    return res.status(400).json({ success: false, error: 'Invalid password.' });
                }
                return res.json({
                    success: true,
                    data: yield withSchoolInfo({
                        id: String(parentMember.id),
                        name: parentMember.name,
                        email: parentMember.email || cleanEmail,
                        role: 'PARENT',
                        schoolId: parentMember.schoolId || null,
                        token: (0, jwt_1.signAuthToken)({
                            id: String(parentMember.id),
                            role: 'PARENT',
                            schoolId: parentMember.schoolId || null,
                            name: parentMember.name,
                        }),
                    })
                });
            }
            // ── Not found in any source ──
            return res.status(400).json({ success: false, error: 'User not found.' });
        }
    }
    catch (err) {
        console.error('Authentication error:', err);
        res.status(500).json({ success: false, error: String((err === null || err === void 0 ? void 0 : err.message) || err) });
    }
}));
exports.default = router;
