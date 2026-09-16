"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const password_1 = require("../utils/password");
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
const SAFE_STAFF_SELECT = {
    id: true, name: true, emisId: true, subject: true, phone: true, email: true,
    attendance: true, performance: true, leaveUsed: true, schoolId: true,
    createdAt: true, updatedAt: true, address: true, dob: true, gender: true, userId: true,
};
const SAFE_TEMP_STAFF_SELECT = {
    id: true, name: true, role: true, agency: true, joined: true, phone: true, email: true,
    duration: true, salary: true, status: true, schoolId: true,
    createdAt: true, updatedAt: true, userId: true,
};
// Helper to parse class and section from inputs like "Class 10A"
function parseClassSection(classStr) {
    if (!classStr)
        return { classVal: '10', sectionVal: 'A' };
    const clean = classStr.replace(/class/i, '').trim();
    const match = clean.match(/^(\d+)([a-zA-Z])$/);
    if (match) {
        return { classVal: match[1], sectionVal: match[2].toUpperCase() };
    }
    const digitMatch = clean.match(/^(\d+)$/);
    if (digitMatch) {
        return { classVal: digitMatch[1], sectionVal: 'A' };
    }
    return { classVal: clean || '10', sectionVal: 'A' };
}
// Helper to parse date safely — also handles Excel serial numbers (e.g. "41411")
// which JavaScript would wrongly interpret as a year if passed to new Date().
function parseDob(dobStr) {
    if (!dobStr || dobStr === 'null' || dobStr === 'undefined' || String(dobStr).trim() === '')
        return null;
    const str = String(dobStr).trim();
    // Detect an Excel date serial number: a plain integer between 1 and 99999
    // (Excel serial 1 = 1900-01-01, serial 45000 ≈ 2023-03-18)
    const numVal = Number(str);
    if (!isNaN(numVal) && Number.isInteger(numVal) && numVal > 1 && numVal < 99999) {
        // Excel epoch base: Dec 30, 1899 (accounts for Excel's leap-year bug)
        const excelEpoch = new Date(1899, 11, 30).getTime();
        const d = new Date(excelEpoch + numVal * 86400000);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}
// GET /api/headmaster/students — List all students for a school
router.get('/students', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const students = yield prisma_1.prisma.student.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
        // Format the response to flatten user name
        const formattedStudents = students.map(s => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({}, s), { name: ((_a = s.user) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown', email: ((_b = s.user) === null || _b === void 0 ? void 0 : _b.email) || s.parentEmail, phone: s.phoneNumber || s.parentMobile || ((_c = s.user) === null || _c === void 0 ? void 0 : _c.mobile) }));
        });
        res.json({ success: true, count: formattedStudents.length, data: formattedStudents });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/students — Add a single student
router.post('/students', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, admissionNumber, rollNumber, emisNumber, dob, gender, bloodGroup, religion, community, nationality, mediumOfInstruction, class: cls, section, academicYear, fatherName, fatherOccupation, motherName, motherOccupation, parentEmail, phone, phoneNumber, parentName, address, city, district, state, pincode, studentStatus, schoolId, group } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        }
        const cleanPhone = String(phone || phoneNumber || '').trim();
        const cleanRoll = rollNumber ? String(rollNumber).trim() : undefined;
        // Mobile uniqueness check for User table
        let mobileValue = cleanPhone || null;
        if (cleanPhone) {
            const existingMobile = yield prisma_1.prisma.user.findFirst({ where: { mobile: cleanPhone } });
            if (existingMobile)
                mobileValue = null;
        }
        const { classVal, sectionVal } = parseClassSection(cls || '10');
        const result = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const user = yield tx.user.create({
                data: {
                    name,
                    email: cleanRoll ? `${cleanRoll.toLowerCase()}@tn.gov.in` : null,
                    mobile: mobileValue,
                    passwordHash: yield (0, password_1.hashPassword)(cleanPhone || '123456'),
                    role: 'STUDENT',
                    schoolId,
                }
            });
            const student = yield tx.student.create({
                data: {
                    userId: user.id,
                    schoolId,
                    class: classVal,
                    section: section || sectionVal || 'A',
                    group,
                    rollNumber: cleanRoll,
                    admissionNumber,
                    emisNumber,
                    dob: parseDob(dob),
                    gender,
                    bloodGroup,
                    religion,
                    community,
                    nationality,
                    mediumOfInstruction,
                    academicYear,
                    fatherName,
                    fatherOccupation,
                    motherName,
                    motherOccupation,
                    parentEmail,
                    parentName: parentName || fatherName || motherName || 'Parent',
                    parentMobile: cleanPhone || null,
                    phoneNumber: cleanPhone || null,
                    address,
                    city,
                    district,
                    state,
                    pincode,
                    studentStatus: studentStatus || 'Active',
                }
            });
            if (parentEmail && parentEmail.trim() !== '') {
                // Check if parent user already exists in PostgreSQL
                const parentWhereConditions = [
                    { email: { equals: parentEmail.trim().toLowerCase(), mode: 'insensitive' } }
                ];
                if (cleanPhone) {
                    parentWhereConditions.push({ mobile: cleanPhone });
                }
                let parentUser = yield tx.user.findFirst({
                    where: { OR: parentWhereConditions }
                });
                if (!parentUser) {
                    parentUser = yield tx.user.create({
                        data: {
                            name: parentName || fatherName || motherName || 'Parent',
                            email: parentEmail.trim().toLowerCase(),
                            mobile: cleanPhone || null,
                            passwordHash: yield (0, password_1.hashPassword)(cleanPhone || '123456'),
                            role: 'PARENT',
                            schoolId,
                        }
                    });
                }
                // Check if HeadmasterParent model exists
                const hmParentWhereConditions = [
                    { email: { equals: parentEmail.trim().toLowerCase(), mode: 'insensitive' } }
                ];
                if (cleanPhone) {
                    hmParentWhereConditions.push({ phone: cleanPhone });
                }
                let hmParent = yield tx.headmasterParent.findFirst({
                    where: { OR: hmParentWhereConditions }
                });
                if (!hmParent) {
                    hmParent = yield tx.headmasterParent.create({
                        data: {
                            name: parentName || fatherName || motherName || 'Parent',
                            role: 'Parent',
                            phone: cleanPhone || 'N/A',
                            email: parentEmail.trim().toLowerCase(),
                            studentName: name,
                            studentClass: classVal,
                            term: fatherName ? 'Father' : motherName ? 'Mother' : 'Parent',
                            password: yield (0, password_1.hashPassword)(cleanPhone || '123456'),
                            schoolId,
                            userId: parentUser.id,
                        }
                    });
                }
                // Link parent and student
                const linkExists = yield tx.parentStudentLink.findFirst({
                    where: { parentId: hmParent.id, studentId: student.id }
                });
                if (!linkExists) {
                    yield tx.parentStudentLink.create({
                        data: {
                            parentId: hmParent.id,
                            studentId: student.id,
                            isPrimary: true
                        }
                    });
                }
            }
            return Object.assign(Object.assign({}, student), { name: user.name });
        }));
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        console.error('Error creating student:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/students/bulk — Bulk import students from Excel
router.post('/students/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { students } = req.body;
        if (!students || !Array.isArray(students)) {
            return res.status(400).json({ success: false, error: 'Invalid payload.' });
        }
        let createdCount = 0;
        let skippedCount = 0;
        const errors = [];
        // Track phone numbers already used in THIS batch to avoid
        // intra-batch unique constraint violations on the User.mobile column.
        const batchUsedPhones = new Set();
        for (const student of students) {
            const { schoolId, name, rollNumber, admissionNumber, emisNumber, dob, gender, bloodGroup, religion, community, nationality, mediumOfInstruction, class: cls, section, academicYear, fatherName, fatherOccupation, motherName, motherOccupation, parentEmail, phone, phoneNumber, parentName, address, city, district, state, pincode, studentStatus, group } = student;
            // Skip rows missing required fields
            if (!name || !rollNumber) {
                skippedCount++;
                errors.push(`Row skipped: missing name or roll number (${name || 'unknown'})`);
                continue;
            }
            // SchoolId is required to scope the student to a school
            if (!schoolId) {
                skippedCount++;
                errors.push(`Row skipped: schoolId missing for student "${name}"`);
                continue;
            }
            const { classVal } = parseClassSection(cls || 'Class 1');
            // Skip duplicate roll numbers within the same school
            const existingStudent = yield prisma_1.prisma.student.findFirst({
                where: { rollNumber, schoolId }
            });
            if (existingStudent) {
                skippedCount++;
                errors.push(`Skipped duplicate roll number "${rollNumber}" for "${name}"`);
                continue;
            }
            const cleanPhone = String(phone || phoneNumber || '').trim();
            // Resolve finalMobile: null if phone already taken in DB or in THIS batch
            let finalMobile = cleanPhone || null;
            if (finalMobile) {
                if (batchUsedPhones.has(finalMobile)) {
                    finalMobile = null; // Already used by a previous student in this batch
                }
                else {
                    const existingUser = yield prisma_1.prisma.user.findFirst({ where: { mobile: finalMobile } });
                    if (existingUser) {
                        finalMobile = null; // Already taken in DB
                    }
                    else {
                        batchUsedPhones.add(finalMobile); // Reserve it for this student
                    }
                }
            }
            const hashedPassword = yield (0, password_1.hashPassword)(cleanPhone || '123456');
            try {
                yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                    const newUser = yield tx.user.create({
                        data: {
                            schoolId,
                            name,
                            mobile: finalMobile,
                            passwordHash: hashedPassword,
                            role: 'STUDENT',
                        }
                    });
                    yield tx.student.create({
                        data: {
                            userId: newUser.id,
                            rollNumber,
                            schoolId,
                            class: classVal,
                            section: section || 'A',
                            group: group || null,
                            admissionNumber: admissionNumber || null,
                            emisNumber: emisNumber || null,
                            dob: parseDob(dob),
                            gender: gender || null,
                            bloodGroup: bloodGroup || null,
                            religion: religion || null,
                            community: community || null,
                            nationality: nationality || null,
                            mediumOfInstruction: mediumOfInstruction || null,
                            academicYear: academicYear || null,
                            fatherName: fatherName || null,
                            fatherOccupation: fatherOccupation || null,
                            motherName: motherName || null,
                            motherOccupation: motherOccupation || null,
                            parentEmail: parentEmail || null,
                            parentName: parentName || fatherName || motherName || 'Parent',
                            parentMobile: cleanPhone || null,
                            phoneNumber: cleanPhone || null,
                            address: address || null,
                            city: city || null,
                            district: district || null,
                            state: state || null,
                            pincode: pincode || null,
                            studentStatus: studentStatus || 'Active',
                        }
                    });
                    // Create parent user if parentEmail is provided and not already existing
                    if (parentEmail && parentEmail.trim() !== '') {
                        let parentUser = yield tx.user.findFirst({
                            where: { email: { equals: parentEmail.trim().toLowerCase(), mode: 'insensitive' } }
                        });
                        if (!parentUser) {
                            let parentMobile = cleanPhone || null;
                            if (parentMobile) {
                                // Check both DB and batch for the parent phone
                                const existingParentPhone = yield tx.user.findFirst({ where: { mobile: parentMobile } });
                                if (existingParentPhone || batchUsedPhones.has(parentMobile)) {
                                    parentMobile = null;
                                }
                            }
                            yield tx.user.create({
                                data: {
                                    name: parentName || fatherName || motherName || 'Parent',
                                    email: parentEmail.trim().toLowerCase(),
                                    mobile: parentMobile,
                                    passwordHash: yield (0, password_1.hashPassword)(cleanPhone || '123456'),
                                    role: 'PARENT',
                                    schoolId,
                                }
                            });
                        }
                    }
                }));
                createdCount++;
            }
            catch (err) {
                skippedCount++;
                const errMsg = (err === null || err === void 0 ? void 0 : err.message) || String(err);
                errors.push(`Failed to save "${name}" (roll: ${rollNumber}): ${errMsg}`);
                console.error('Bulk import — error inserting student:', name, errMsg);
            }
        }
        res.json({
            success: true,
            created: createdCount,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined,
        });
    }
    catch (err) {
        console.error('Bulk upload error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/headmaster/students/:id — Update student details
router.put('/students/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, admissionNumber, rollNumber, emisNumber, dob, gender, bloodGroup, religion, community, nationality, mediumOfInstruction, class: cls, section, academicYear, fatherName, fatherOccupation, motherName, motherOccupation, parentEmail, phoneNumber, address, city, district, state, pincode, studentStatus, schoolId } = req.body;
        const student = yield prisma_1.prisma.student.findUnique({ where: { id }, include: { user: true } });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found.' });
        }
        const { classVal } = parseClassSection(cls || student.class);
        const updatedStudent = yield prisma_1.prisma.student.update({
            where: { id },
            data: {
                rollNumber,
                admissionNumber,
                emisNumber,
                class: classVal,
                section: section || student.section,
                dob: parseDob(dob),
                gender,
                bloodGroup,
                religion,
                community,
                nationality,
                mediumOfInstruction,
                academicYear,
                fatherName,
                fatherOccupation,
                motherName,
                motherOccupation,
                parentEmail,
                phoneNumber,
                address,
                city,
                district,
                state,
                pincode,
                studentStatus,
                schoolId,
            }
        });
        // Update User if name or mobile changed
        if (name !== undefined || phoneNumber !== undefined) {
            let mobileValue = student.user.mobile;
            if (phoneNumber && phoneNumber !== student.user.mobile) {
                const existingMobile = yield prisma_1.prisma.user.findFirst({ where: { mobile: phoneNumber, id: { not: student.userId } } });
                if (!existingMobile)
                    mobileValue = phoneNumber;
            }
            yield prisma_1.prisma.user.update({
                where: { id: student.userId },
                data: {
                    name: name !== undefined ? name : undefined,
                    mobile: mobileValue,
                }
            });
        }
        res.json({ success: true, data: Object.assign(Object.assign({}, updatedStudent), { name: name !== undefined ? name : student.user.name }) });
    }
    catch (err) {
        console.error('Error updating student:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/students/:id — Delete student
router.delete('/students/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const student = yield prisma_1.prisma.student.findUnique({ where: { id } });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found.' });
        }
        // Delete dependent records
        yield prisma_1.prisma.mark.deleteMany({ where: { studentId: id } });
        yield prisma_1.prisma.attendance.deleteMany({ where: { studentId: id } });
        yield prisma_1.prisma.scholarship.deleteMany({ where: { studentId: id } });
        yield prisma_1.prisma.promotionRecord.deleteMany({ where: { studentId: id } });
        yield prisma_1.prisma.studentAcademicHistory.deleteMany({ where: { studentId: id } });
        yield prisma_1.prisma.student.delete({ where: { id } });
        yield prisma_1.prisma.user.delete({ where: { id: student.userId } });
        res.json({ success: true, message: 'Student deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting student:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/students/bulk-delete — Bulk delete students
router.post('/students/bulk-delete', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, error: 'studentIds array is required' });
        }
        const students = yield prisma_1.prisma.student.findMany({ where: { id: { in: studentIds } } });
        const userIds = students.map(s => s.userId);
        // Delete dependent records
        yield prisma_1.prisma.mark.deleteMany({ where: { studentId: { in: studentIds } } });
        yield prisma_1.prisma.attendance.deleteMany({ where: { studentId: { in: studentIds } } });
        yield prisma_1.prisma.scholarship.deleteMany({ where: { studentId: { in: studentIds } } });
        yield prisma_1.prisma.promotionRecord.deleteMany({ where: { studentId: { in: studentIds } } });
        yield prisma_1.prisma.studentAcademicHistory.deleteMany({ where: { studentId: { in: studentIds } } });
        yield prisma_1.prisma.student.deleteMany({ where: { id: { in: studentIds } } });
        yield prisma_1.prisma.user.deleteMany({ where: { id: { in: userIds } } });
        res.json({ success: true, message: 'Students deleted successfully' });
    }
    catch (err) {
        console.error('Error in bulk delete:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── Health Report Endpoints ─────────────────────────────────────
// GET /api/headmaster/health/:rollNumber
router.get('/health/:rollNumber', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rollNumber } = req.params;
        const student = yield prisma_1.prisma.student.findFirst({
            where: { rollNumber: { equals: rollNumber, mode: 'insensitive' } }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found in core system.' });
        const health = yield prisma_1.prisma.healthReport.findUnique({
            where: { studentId: student.id }
        });
        res.json({ success: true, data: health });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/health/:rollNumber
router.post('/health/:rollNumber', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rollNumber } = req.params;
        const { height, weight, bloodGroup, vision, hearing, bmi, dental, lastCheckupDate, notes } = req.body;
        const student = yield prisma_1.prisma.student.findFirst({
            where: { rollNumber: { equals: rollNumber, mode: 'insensitive' } }
        });
        if (!student)
            return res.status(404).json({ success: false, error: 'Student not found in core system. Must be enrolled first.' });
        const health = yield prisma_1.prisma.healthReport.upsert({
            where: { studentId: student.id },
            update: {
                height: height ? parseFloat(height) : null,
                weight: weight ? parseFloat(weight) : null,
                bloodGroup,
                vision,
                hearing,
                bmi: bmi ? parseFloat(bmi) : null,
                dental,
                lastCheckupDate: lastCheckupDate ? new Date(lastCheckupDate) : null,
                notes
            },
            create: {
                studentId: student.id,
                height: height ? parseFloat(height) : null,
                weight: weight ? parseFloat(weight) : null,
                bloodGroup,
                vision,
                hearing,
                bmi: bmi ? parseFloat(bmi) : null,
                dental,
                lastCheckupDate: lastCheckupDate ? new Date(lastCheckupDate) : null,
                notes
            }
        });
        res.json({ success: true, data: health });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── Staff Endpoints ─────────────────────────────────────────────
// GET /api/headmaster/staff — List all staff
router.get('/staff', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const staff = yield prisma_1.prisma.headmasterStaff.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            orderBy: { createdAt: 'asc' },
            select: SAFE_STAFF_SELECT,
        });
        res.json({ success: true, count: staff.length, data: staff });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/staff — Add single staff member
router.post('/staff', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, emisId, subject, phone, email, attendance, performance, leaveUsed, password, schoolId, address, dob, gender } = req.body;
        if (!name || !emisId) {
            return res.status(400).json({ success: false, error: 'name and emisId are required' });
        }
        const hashedPassword = yield (0, password_1.hashPassword)(password || '123456');
        const staff = yield prisma_1.prisma.headmasterStaff.upsert({
            where: { emisId },
            update: {
                name,
                subject: subject || 'General',
                phone: phone || 'N/A',
                email: email || null,
                attendance: attendance !== null && attendance !== void 0 ? attendance : 100,
                performance: performance || 'Good',
                leaveUsed: leaveUsed !== null && leaveUsed !== void 0 ? leaveUsed : 0,
                password: hashedPassword,
                schoolId: schoolId || null,
                address: address !== undefined ? address : undefined,
                dob: dob ? new Date(dob) : undefined,
                gender: gender !== undefined ? gender : undefined
            },
            create: {
                name,
                emisId,
                subject: subject || 'General',
                phone: phone || 'N/A',
                email: email || null,
                attendance: attendance !== null && attendance !== void 0 ? attendance : 100,
                performance: performance || 'Good',
                leaveUsed: leaveUsed !== null && leaveUsed !== void 0 ? leaveUsed : 0,
                password: hashedPassword,
                schoolId: schoolId || null,
                address: address || null,
                dob: dob ? new Date(dob) : null,
                gender: gender || null
            },
            select: SAFE_STAFF_SELECT,
        });
        res.status(201).json({ success: true, data: staff });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/staff/bulk — Bulk import from Excel
router.post('/staff/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { staff } = req.body;
        if (!Array.isArray(staff) || staff.length === 0) {
            return res.status(400).json({ success: false, error: 'staff array is required' });
        }
        let created = 0;
        for (const s of staff) {
            if (!s.name || !s.emisId)
                continue;
            const hashedPassword = yield (0, password_1.hashPassword)(s.password || '123456');
            yield prisma_1.prisma.headmasterStaff.upsert({
                where: { emisId: s.emisId },
                update: {
                    name: s.name,
                    subject: s.subject || 'General',
                    phone: s.phone || 'N/A',
                    email: s.email || null,
                    attendance: (_a = s.attendance) !== null && _a !== void 0 ? _a : 100,
                    performance: s.performance || 'Good',
                    leaveUsed: (_c = (_b = s.leaveUsed) !== null && _b !== void 0 ? _b : s.leave) !== null && _c !== void 0 ? _c : 0,
                    password: hashedPassword,
                    schoolId: s.schoolId || null,
                    address: s.address || null,
                    dob: s.dob ? new Date(s.dob) : null,
                    gender: s.gender || null
                },
                create: {
                    name: s.name,
                    emisId: s.emisId,
                    subject: s.subject || 'General',
                    phone: s.phone || 'N/A',
                    email: s.email || null,
                    attendance: (_d = s.attendance) !== null && _d !== void 0 ? _d : 100,
                    performance: s.performance || 'Good',
                    leaveUsed: (_f = (_e = s.leaveUsed) !== null && _e !== void 0 ? _e : s.leave) !== null && _f !== void 0 ? _f : 0,
                    password: hashedPassword,
                    schoolId: s.schoolId || null,
                    address: s.address || null,
                    dob: s.dob ? new Date(s.dob) : null,
                    gender: s.gender || null
                },
            });
            created++;
        }
        res.status(201).json({ success: true, created });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/headmaster/staff/:id — Update staff member
router.put('/staff/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, subject, phone, email, attendance, performance, leaveUsed, password, schoolId, address, dob, gender } = req.body;
        const staff = yield prisma_1.prisma.headmasterStaff.update({
            where: { id: req.params.id },
            data: {
                name: name !== undefined ? name : undefined,
                subject: subject !== undefined ? subject : undefined,
                phone: phone !== undefined ? phone : undefined,
                email: email !== undefined ? email : undefined,
                attendance: attendance !== undefined ? attendance : undefined,
                performance: performance !== undefined ? performance : undefined,
                leaveUsed: leaveUsed !== undefined ? leaveUsed : undefined,
                password: password !== undefined ? yield (0, password_1.hashPassword)(password) : undefined,
                schoolId: schoolId !== undefined ? schoolId : undefined,
                address: address !== undefined ? address : undefined,
                dob: dob !== undefined ? (dob ? new Date(dob) : null) : undefined,
                gender: gender !== undefined ? gender : undefined
            },
            select: SAFE_STAFF_SELECT,
        });
        res.json({ success: true, data: staff });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/staff/:id — Remove staff member
router.delete('/staff/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.headmasterStaff.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Staff member removed' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── Temporary / Contract Staff Endpoints ────────────────────────
// GET /api/headmaster/temp-staff
router.get('/temp-staff', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const staff = yield prisma_1.prisma.headmasterTempStaff.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            orderBy: { createdAt: 'desc' },
            select: SAFE_TEMP_STAFF_SELECT,
        });
        res.json({ success: true, count: staff.length, data: staff });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/temp-staff — Add single
router.post('/temp-staff', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, role, agency, joined, phone, email, duration, salary, status, password, schoolId } = req.body;
        if (!name || !role)
            return res.status(400).json({ success: false, error: 'name and role are required' });
        const staff = yield prisma_1.prisma.headmasterTempStaff.create({
            data: { name, role, agency: agency || 'Direct Contract', joined: joined || '', phone: phone || 'N/A', email: email || 'N/A', duration: duration || '12 Months', salary: salary || 'N/A', status: status || 'Active', password: yield (0, password_1.hashPassword)(password || '123456'), schoolId: schoolId || null },
            select: SAFE_TEMP_STAFF_SELECT,
        });
        res.status(201).json({ success: true, data: staff });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/temp-staff/bulk — Bulk import
router.post('/temp-staff/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staff } = req.body;
        if (!Array.isArray(staff) || staff.length === 0)
            return res.status(400).json({ success: false, error: 'staff array required' });
        const records = yield Promise.all(staff.filter((s) => s.name && s.role).map((s) => __awaiter(void 0, void 0, void 0, function* () {
            return ({
                name: s.name, role: s.role, agency: s.agency || 'Direct Contract', joined: s.joined || '',
                phone: s.phone || 'N/A', email: s.email || 'N/A', duration: s.duration || '12 Months',
                salary: s.salary || 'N/A', status: 'Active', password: yield (0, password_1.hashPassword)(s.password || '123456'), schoolId: s.schoolId || null,
            });
        })));
        const result = yield prisma_1.prisma.headmasterTempStaff.createMany({ data: records, skipDuplicates: false });
        res.status(201).json({ success: true, created: result.count });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/headmaster/temp-staff/:id
router.put('/temp-staff/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, role, agency, joined, phone, email, duration, salary, status, password, schoolId } = req.body;
        const staff = yield prisma_1.prisma.headmasterTempStaff.update({
            where: { id: req.params.id },
            data: {
                name: name !== undefined ? name : undefined,
                role: role !== undefined ? role : undefined,
                agency: agency !== undefined ? agency : undefined,
                joined: joined !== undefined ? joined : undefined,
                phone: phone !== undefined ? phone : undefined,
                email: email !== undefined ? email : undefined,
                duration: duration !== undefined ? duration : undefined,
                salary: salary !== undefined ? salary : undefined,
                status: status !== undefined ? status : undefined,
                password: password !== undefined ? yield (0, password_1.hashPassword)(password) : undefined,
                schoolId: schoolId !== undefined ? schoolId : undefined,
            },
            select: SAFE_TEMP_STAFF_SELECT,
        });
        res.json({ success: true, data: staff });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/temp-staff/:id
router.delete('/temp-staff/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.headmasterTempStaff.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Temp staff removed' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── Parents / PTA Committee Endpoints ────────────────────────────
// GET /api/headmaster/parents
router.get('/parents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const parents = yield prisma_1.prisma.headmasterParent.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            include: {
                linkedStudents: {
                    include: {
                        student: {
                            include: {
                                user: { select: { name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        const safeParents = parents.map((_a) => {
            var { password } = _a, rest = __rest(_a, ["password"]);
            return rest;
        });
        res.json({ success: true, count: safeParents.length, data: safeParents });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/parents — Add single parent/officer
router.post('/parents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, role, phone, email, studentName, studentClass, term, password, schoolId } = req.body;
        if (!name || !role || !phone) {
            return res.status(400).json({ success: false, error: 'name, role and phone are required' });
        }
        const parent = yield prisma_1.prisma.headmasterParent.create({
            data: {
                name,
                role,
                phone,
                email: email || null,
                studentName: studentName || 'N/A',
                studentClass: studentClass || 'N/A',
                term: term || '2025-26',
                password: yield (0, password_1.hashPassword)(password || '123456'),
                schoolId: schoolId || null,
            },
        });
        const { password: _pw } = parent, safeParent = __rest(parent, ["password"]);
        res.status(201).json({ success: true, data: safeParent });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/parents/bulk — Bulk import parents from Excel
router.post('/parents/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { parents } = req.body;
        if (!Array.isArray(parents) || parents.length === 0) {
            return res.status(400).json({ success: false, error: 'parents array is required' });
        }
        const records = yield Promise.all(parents
            .filter((p) => p.name && p.role && p.phone)
            .map((p) => __awaiter(void 0, void 0, void 0, function* () {
            return ({
                name: p.name,
                role: p.role,
                phone: p.phone,
                email: p.email || null,
                studentName: p.studentName || 'N/A',
                studentClass: p.studentClass || 'N/A',
                term: p.term || '2025-26',
                password: yield (0, password_1.hashPassword)(p.password || '123456'),
                schoolId: p.schoolId || null,
            });
        })));
        const result = yield prisma_1.prisma.headmasterParent.createMany({ data: records, skipDuplicates: false });
        res.status(201).json({ success: true, created: result.count });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/headmaster/parents/:id — Update parent officer
router.put('/parents/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { password } = _a, rest = __rest(_a, ["password"]);
        const parent = yield prisma_1.prisma.headmasterParent.update({
            where: { id: req.params.id },
            data: password !== undefined ? Object.assign(Object.assign({}, rest), { password: yield (0, password_1.hashPassword)(password) }) : rest,
        });
        const { password: _pw } = parent, safeParent = __rest(parent, ["password"]);
        res.json({ success: true, data: safeParent });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/parents/:id — Remove parent officer
router.delete('/parents/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.headmasterParent.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'PTA Committee member removed' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── Alumni Endpoints ─────────────────────────────────────────────
// GET /api/headmaster/alumni
router.get('/alumni', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const alumniList = yield prisma_1.prisma.headmasterAlumni.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, count: alumniList.length, data: alumniList });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/alumni — Add single alumni contribution
router.post('/alumni', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, batch, contribution, role, phone, email, location, value, schoolId } = req.body;
        if (!name || !contribution) {
            return res.status(400).json({ success: false, error: 'name and contribution details are required' });
        }
        const record = yield prisma_1.prisma.headmasterAlumni.create({
            data: {
                name,
                batch: batch || 'N/A',
                contribution,
                role: role || 'Alumni Member',
                phone: phone || 'N/A',
                email: email || 'N/A',
                location: location || 'N/A',
                value: value || 'N/A',
                schoolId: schoolId || null,
            },
        });
        res.status(201).json({ success: true, data: record });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/alumni/bulk — Bulk import alumni from Excel
router.post('/alumni/bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { alumni } = req.body;
        if (!Array.isArray(alumni) || alumni.length === 0) {
            return res.status(400).json({ success: false, error: 'alumni array is required' });
        }
        const records = alumni
            .filter((a) => a.name && a.contribution)
            .map((a) => ({
            name: a.name,
            batch: a.batch || 'N/A',
            contribution: a.contribution,
            role: a.role || 'Alumni Member',
            phone: a.phone || 'N/A',
            email: a.email || 'N/A',
            location: a.location || 'N/A',
            value: a.value || 'N/A',
            schoolId: a.schoolId || null,
        }));
        const result = yield prisma_1.prisma.headmasterAlumni.createMany({ data: records, skipDuplicates: false });
        res.status(201).json({ success: true, created: result.count });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/headmaster/alumni/:id — Update alumni record
router.put('/alumni/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, batch, contribution, role, phone, email, location, value, schoolId } = req.body;
        const record = yield prisma_1.prisma.headmasterAlumni.update({
            where: { id: req.params.id },
            data: {
                name: name !== undefined ? name : undefined,
                batch: batch !== undefined ? batch : undefined,
                contribution: contribution !== undefined ? contribution : undefined,
                role: role !== undefined ? role : undefined,
                phone: phone !== undefined ? phone : undefined,
                email: email !== undefined ? email : undefined,
                location: location !== undefined ? location : undefined,
                value: value !== undefined ? value : undefined,
                schoolId: schoolId !== undefined ? schoolId : undefined,
            },
        });
        res.json({ success: true, data: record });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/alumni/:id — Remove alumni contribution
router.delete('/alumni/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.headmasterAlumni.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Alumni contribution record removed' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── PTA Meeting Endpoints (Headmaster creates, parents view) ─────
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const RSVPS_FILE = path_1.default.join(__dirname, '../../data/pta_rsvps.json');
function readRsvps() {
    try {
        if (!fs_1.default.existsSync(RSVPS_FILE)) {
            return {};
        }
        const content = fs_1.default.readFileSync(RSVPS_FILE, 'utf8');
        return JSON.parse(content);
    }
    catch (err) {
        console.error("Error reading RSVPs file:", err);
        return {};
    }
}
function writeRsvps(rsvps) {
    try {
        const dir = path_1.default.dirname(RSVPS_FILE);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        fs_1.default.writeFileSync(RSVPS_FILE, JSON.stringify(rsvps, null, 2), 'utf8');
    }
    catch (err) {
        console.error("Error writing RSVPs file:", err);
    }
}
// GET /api/headmaster/pta-meetings
router.get('/pta-meetings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const meetings = yield prisma_1.prisma.pTAMeeting.findMany({
            where: schoolId ? { schoolId: String(schoolId) } : undefined,
            orderBy: { meetingDate: 'asc' },
        });
        const rsvps = readRsvps();
        const enrichedMeetings = meetings.map(m => {
            const meetingRsvps = rsvps[m.id] || {};
            const rsvpValues = Object.values(meetingRsvps);
            return Object.assign(Object.assign({}, m), { rsvps: meetingRsvps, acceptCount: rsvpValues.filter(v => (typeof v === 'object' && v ? v.status : v) === 'Accept').length, declineCount: rsvpValues.filter(v => (typeof v === 'object' && v ? v.status : v) === 'Decline').length });
        });
        res.json({ success: true, count: enrichedMeetings.length, data: enrichedMeetings });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/pta-meetings
router.post('/pta-meetings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, title, description, meetingDate, venue, status, agenda } = req.body;
        if (!title || !meetingDate) {
            return res.status(400).json({ success: false, error: 'title and meetingDate are required' });
        }
        const meeting = yield prisma_1.prisma.pTAMeeting.create({
            data: {
                schoolId: schoolId || null,
                title,
                description: description || null,
                meetingDate: new Date(meetingDate),
                venue: venue || 'School Auditorium',
                status: status || 'Upcoming',
                agenda: Array.isArray(agenda) ? agenda : [],
            },
        });
        // Notify all parents of this school about the new PTA meeting
        if (schoolId) {
            try {
                const parents = yield prisma_1.prisma.headmasterParent.findMany({
                    where: { schoolId },
                    select: { id: true }
                });
                const meetingDateFormatted = new Date(meetingDate).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                if (parents.length > 0) {
                    yield prisma_1.prisma.parentNotification.createMany({
                        data: parents.map(p => ({
                            parentId: p.id,
                            type: 'PTA_MEETING',
                            title: `📅 New PTA Meeting Scheduled`,
                            message: `"${title}" has been scheduled on ${meetingDateFormatted} at ${venue || 'School Auditorium'}. Please confirm your attendance in the Parent Portal.`,
                            isRead: false,
                        }))
                    });
                }
            }
            catch (notifErr) {
                // Notification failure should not block the meeting creation response
                console.error('[PTA Meeting Notification Error]', notifErr);
            }
        }
        res.status(201).json({ success: true, data: meeting });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/headmaster/pta-meetings/:id/rsvp
router.put('/pta-meetings/:id/rsvp', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { parentId, rsvpStatus, reason } = req.body;
        if (!parentId || !rsvpStatus) {
            return res.status(400).json({ success: false, error: 'parentId and rsvpStatus are required' });
        }
        if (!['Accept', 'Decline'].includes(rsvpStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid rsvpStatus' });
        }
        const rsvps = readRsvps();
        if (!rsvps[id]) {
            rsvps[id] = {};
        }
        rsvps[id][parentId] = {
            status: rsvpStatus,
            reason: rsvpStatus === 'Decline' ? (reason || null) : null
        };
        writeRsvps(rsvps);
        res.json({ success: true, message: 'RSVP registered successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/headmaster/pta-meetings/:id
router.put('/pta-meetings/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, description, meetingDate, venue, status, agenda } = req.body;
        const meeting = yield prisma_1.prisma.pTAMeeting.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (title && { title })), (description !== undefined && { description })), (meetingDate && { meetingDate: new Date(meetingDate) })), (venue && { venue })), (status && { status })), (Array.isArray(agenda) && { agenda })),
        });
        res.json({ success: true, data: meeting });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/pta-meetings/:id
router.delete('/pta-meetings/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.pTAMeeting.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'PTA meeting removed' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── Parent → Student Link (Headmaster action) ────────────────────
// POST /api/headmaster/parents/:id/link-student
// Body: { studentId, isPrimary? }
router.post('/parents/:id/link-student', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parentId = req.params.id;
        const { studentId, isPrimary } = req.body;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'studentId is required' });
        }
        const link = yield prisma_1.prisma.parentStudentLink.upsert({
            where: { parentId_studentId: { parentId, studentId } },
            update: { isPrimary: isPrimary !== null && isPrimary !== void 0 ? isPrimary : false },
            create: { parentId, studentId, isPrimary: isPrimary !== null && isPrimary !== void 0 ? isPrimary : false },
        });
        res.status(201).json({ success: true, data: link });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/parents/:id/link-student
// Body: { studentId }
router.delete('/parents/:id/link-student', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parentId = req.params.id;
        const { studentId } = req.body;
        yield prisma_1.prisma.parentStudentLink.delete({
            where: { parentId_studentId: { parentId, studentId } },
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/headmaster/parents/:id/linked-students
router.get('/parents/:id/linked-students', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: parentId } = req.params;
        const links = yield prisma_1.prisma.parentStudentLink.findMany({
            where: { parentId },
            include: {
                student: {
                    include: { user: { select: { name: true } } },
                },
            },
            orderBy: [{ isPrimary: 'desc' }],
        });
        res.json({
            success: true,
            data: links.map(l => ({
                linkId: l.id,
                studentId: l.student.id,
                name: l.student.user.name,
                class: l.student.class,
                section: l.student.section,
                rollNumber: l.student.rollNumber,
                isPrimary: l.isPrimary,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
/* ------------------- HEADMASTER PROFILE ROUTES ------------------- */
// GET /api/headmaster/profile/:userId — Fetch profile by User ID
router.get('/profile/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const profile = yield prisma_1.prisma.headmasterProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        mobile: true,
                        isActive: true,
                    }
                },
                school: {
                    select: {
                        name: true,
                        dise: true,
                        district: true,
                        block: true,
                    }
                }
            }
        });
        if (!profile) {
            return res.status(404).json({ success: false, error: 'Headmaster profile not found' });
        }
        res.json({ success: true, data: profile });
    }
    catch (err) {
        console.error('Error fetching headmaster profile:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/profile — Create or Upsert profile
router.post('/profile', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, schoolId, employeeId, joiningDate, address, gender, dob } = req.body;
        if (!userId || !schoolId) {
            return res.status(400).json({ success: false, error: 'userId and schoolId are required' });
        }
        const profile = yield prisma_1.prisma.headmasterProfile.upsert({
            where: { userId },
            update: {
                schoolId,
                employeeId: employeeId || null,
                joiningDate: joiningDate ? new Date(joiningDate) : null,
                address: address || null,
                gender: gender || null,
                dob: dob ? new Date(dob) : null,
            },
            create: {
                userId,
                schoolId,
                employeeId: employeeId || null,
                joiningDate: joiningDate ? new Date(joiningDate) : null,
                address: address || null,
                gender: gender || null,
                dob: dob ? new Date(dob) : null,
            }
        });
        res.status(201).json({ success: true, data: profile });
    }
    catch (err) {
        console.error('Error upserting headmaster profile:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/profile/:id — Delete profile by profile ID
router.delete('/profile/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.headmasterProfile.delete({
            where: { id }
        });
        res.json({ success: true, message: 'Headmaster profile deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting headmaster profile:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/headmaster/leave/:id — Approve or Reject a leave request
router.put('/leave/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, approvedById } = req.body;
        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status. Must be Approved or Rejected.' });
        }
        const leave = yield prisma_1.prisma.leaveRequest.update({
            where: { id },
            data: { status, approvedById: approvedById || null },
        });
        // Handle Teacher Notification
        if (leave.staffId) {
            try {
                const { resolveUserId } = yield Promise.resolve().then(() => __importStar(require('../config/userResolver')));
                const resolvedId = yield resolveUserId(leave.staffId);
                if (resolvedId) {
                    yield prisma_1.prisma.notification.create({
                        data: {
                            userId: resolvedId,
                            message: `Your leave request for ${leave.duration} has been ${status}.`,
                        }
                    });
                }
            }
            catch (notifErr) {
                console.error('[Leave Approval Notification Error]', notifErr);
            }
        }
        // Handle Student Notification
        if (leave.studentId) {
            try {
                const student = yield prisma_1.prisma.student.findFirst({
                    where: {
                        OR: [
                            { id: leave.studentId },
                            { rollNumber: { equals: leave.studentId, mode: 'insensitive' } },
                            { admissionNumber: { equals: leave.studentId, mode: 'insensitive' } },
                            { emisNumber: { equals: leave.studentId, mode: 'insensitive' } }
                        ]
                    }
                });
                if (student && student.userId) {
                    yield prisma_1.prisma.notification.create({
                        data: {
                            userId: student.userId,
                            message: `Your leave request for ${leave.duration} has been ${status}.`,
                        }
                    });
                }
            }
            catch (notifErr) {
                console.error('[Leave Approval Notification Error - Student]', notifErr);
            }
        }
        res.json({ success: true, data: leave });
    }
    catch (err) {
        console.error('Error updating leave status:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════
// MODEL EXAM RESULTS — Classes 6–10 (Samacheer Kalvi)
// ═══════════════════════════════════════════════════════════════════════════
// Helper: compute grade from percentage (TN Samacheer Kalvi scale)
function computeGrade(pct) {
    if (pct >= 91)
        return 'A+';
    if (pct >= 81)
        return 'A';
    if (pct >= 71)
        return 'B+';
    if (pct >= 61)
        return 'B';
    if (pct >= 51)
        return 'C';
    if (pct >= 35)
        return 'D';
    return 'U'; // Under 35 = Fail
}
// Helper: calc total and derived stats for a result row
function calcResultStats(data, maxTotal) {
    const subjects = ['tamil', 'english', 'mathematics', 'science', 'socialScience'];
    const vals = subjects.map((s) => (data[s] != null ? Number(data[s]) : null));
    const extraVal = data.extraSubject != null ? Number(data.extraSubject) : null;
    const enteredVals = [...vals, ...(extraVal != null ? [extraVal] : [])].filter((v) => v != null);
    const total = enteredVals.length > 0 ? enteredVals.reduce((a, b) => a + b, 0) : null;
    const percentage = total != null ? parseFloat(((total / maxTotal) * 100).toFixed(2)) : null;
    const grade = percentage != null ? computeGrade(percentage) : null;
    // Pass = every entered subject >= 35
    const isPassed = enteredVals.length > 0 ? enteredVals.every((v) => v >= 35) : null;
    return { total, percentage, grade, isPassed };
}
// POST /api/headmaster/model-exams — Create a new exam session
router.post('/model-exams', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, examName, examType, class: cls, section, group, academicYear, examDate, createdBy } = req.body;
        if (!schoolId || !examName || !cls) {
            return res.status(400).json({ success: false, error: 'schoolId, examName, and class are required.' });
        }
        const exam = yield prisma_1.prisma.modelExam.create({
            data: {
                schoolId,
                examName: examName.trim(),
                examType: examType || 'Unit Test',
                class: String(cls).replace(/class\s*/i, '').trim(),
                section: section || 'A',
                group: group || null,
                academicYear: academicYear || '2024-25',
                examDate: examDate ? new Date(examDate) : null,
                createdBy: createdBy || null,
            },
        });
        res.status(201).json({ success: true, data: exam });
    }
    catch (err) {
        console.error('Create model exam error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/headmaster/model-exams — List exams for school (optionally filter by class/group)
router.get('/model-exams', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, class: cls, academicYear, group } = req.query;
        if (!schoolId)
            return res.status(400).json({ success: false, error: 'schoolId required.' });
        const sId = String(schoolId);
        const where = { schoolId: sId };
        if (cls)
            where.class = String(cls);
        if (academicYear)
            where.academicYear = String(academicYear);
        if (group)
            where.group = String(group);
        // Auto-sync completed ExamSchedule items into ModelExam
        try {
            const now = new Date();
            const completedSchedules = yield prisma_1.prisma.examSchedule.findMany({
                where: {
                    schoolId: sId,
                    OR: [
                        { status: 'Completed' },
                        { examDate: { lte: now } },
                    ],
                },
            });
            for (const sched of completedSchedules) {
                const clsClean = String(sched.class).replace(/class\s*/i, '').split(' ')[0].trim();
                if (cls && String(cls) !== clsClean)
                    continue;
                const existingModel = yield prisma_1.prisma.modelExam.findFirst({
                    where: {
                        schoolId: sId,
                        class: clsClean,
                        examName: sched.title,
                    },
                });
                if (!existingModel) {
                    yield prisma_1.prisma.modelExam.create({
                        data: {
                            schoolId: sId,
                            examName: sched.title,
                            examType: sched.examType || 'Unit Test 1',
                            class: clsClean,
                            section: sched.section === 'All' ? 'A' : sched.section,
                            academicYear: sched.academicYear || '2024-25',
                            examDate: sched.examDate,
                        },
                    });
                }
            }
        }
        catch (syncErr) {
            console.warn('Sync examSchedule to modelExam warning:', syncErr);
        }
        const exams = yield prisma_1.prisma.modelExam.findMany({
            where,
            orderBy: [{ class: 'asc' }, { createdAt: 'desc' }],
            include: {
                _count: { select: { results: true } },
            },
        });
        // Notify headmaster user for completed exams
        try {
            const headmasterUser = yield prisma_1.prisma.user.findFirst({
                where: { schoolId: sId, role: 'HEADMASTER' },
            });
            if (headmasterUser) {
                const completedExams = exams.filter((e) => !e.examDate || new Date(e.examDate) <= new Date());
                for (const ex of completedExams) {
                    const msg = `🔔 Exam Completed: ${ex.examName} for Class ${ex.class}-${ex.section} is completed in Exam Schedule. Please update & verify student marks.`;
                    const existingNotif = yield prisma_1.prisma.$queryRaw `
            SELECT id FROM "Notification" WHERE "userId" = ${headmasterUser.id} AND message = ${msg} LIMIT 1
          `;
                    if (existingNotif.length === 0) {
                        const id = (0, crypto_1.randomUUID)();
                        const now = new Date();
                        yield prisma_1.prisma.$queryRaw `
              INSERT INTO "Notification" (id, "userId", message, "read", "createdAt")
              VALUES (${id}, ${headmasterUser.id}, ${msg}, false, ${now})
            `;
                    }
                }
            }
        }
        catch (notifErr) {
            console.warn('Could not create notification:', notifErr);
        }
        res.json({ success: true, data: exams });
    }
    catch (err) {
        console.error('List model exams error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/headmaster/model-exams/:id — Get single exam with all results
router.get('/model-exams/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exam = yield prisma_1.prisma.modelExam.findUnique({
            where: { id: req.params.id },
            include: {
                results: { orderBy: { rollNumber: 'asc' } },
            },
        });
        if (!exam)
            return res.status(404).json({ success: false, error: 'Exam not found.' });
        res.json({ success: true, data: exam });
    }
    catch (err) {
        console.error('Get model exam error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/model-exams/:id/results — Save/upsert marks (manual entry, one student at a time or batch)
router.post('/model-exams/:id/results', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const exam = yield prisma_1.prisma.modelExam.findUnique({ where: { id } });
        if (!exam)
            return res.status(404).json({ success: false, error: 'Exam not found.' });
        if (exam.isLocked)
            return res.status(403).json({ success: false, error: 'Exam is locked. Marks cannot be changed.' });
        const { results } = req.body; // array of mark rows
        if (!Array.isArray(results) || results.length === 0) {
            return res.status(400).json({ success: false, error: 'results array is required.' });
        }
        const maxTotal = 500; // 5 subjects × 100
        let savedCount = 0;
        for (const row of results) {
            const { studentId, studentName, rollNumber, tamil, english, mathematics, science, socialScience, extraSubject, extraSubjectName } = row;
            if (!studentId)
                continue;
            const stats = calcResultStats({ tamil, english, mathematics, science, socialScience, extraSubject }, maxTotal);
            yield prisma_1.prisma.modelExamResult.upsert({
                where: { examId_studentId: { examId: id, studentId } },
                update: Object.assign({ tamil: tamil != null ? Number(tamil) : null, english: english != null ? Number(english) : null, mathematics: mathematics != null ? Number(mathematics) : null, science: science != null ? Number(science) : null, socialScience: socialScience != null ? Number(socialScience) : null, extraSubject: extraSubject != null ? Number(extraSubject) : null, extraSubjectName: extraSubjectName || null }, stats),
                create: Object.assign({ examId: id, studentId, studentName: studentName || 'Unknown', rollNumber: rollNumber || '', tamil: tamil != null ? Number(tamil) : null, english: english != null ? Number(english) : null, mathematics: mathematics != null ? Number(mathematics) : null, science: science != null ? Number(science) : null, socialScience: socialScience != null ? Number(socialScience) : null, extraSubject: extraSubject != null ? Number(extraSubject) : null, extraSubjectName: extraSubjectName || null, maxTotal }, stats),
            });
            savedCount++;
        }
        res.json({ success: true, saved: savedCount });
    }
    catch (err) {
        console.error('Save model exam results error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/model-exams/:id/bulk-results — Bulk upload marks from Excel
router.post('/model-exams/:id/bulk-results', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const exam = yield prisma_1.prisma.modelExam.findUnique({ where: { id } });
        if (!exam)
            return res.status(404).json({ success: false, error: 'Exam not found.' });
        if (exam.isLocked)
            return res.status(403).json({ success: false, error: 'Exam is locked. Marks cannot be changed.' });
        const { results } = req.body;
        if (!Array.isArray(results))
            return res.status(400).json({ success: false, error: 'results array required.' });
        const maxTotal = 500;
        let savedCount = 0;
        const errors = [];
        for (const row of results) {
            const { studentId, studentName, rollNumber, tamil, english, mathematics, science, socialScience, extraSubject, extraSubjectName } = row;
            // Try to find student by rollNumber if studentId is missing
            let resolvedStudentId = studentId;
            if (!resolvedStudentId && rollNumber) {
                const found = yield prisma_1.prisma.student.findFirst({ where: { rollNumber: String(rollNumber), schoolId: exam.schoolId } });
                if (found)
                    resolvedStudentId = found.id;
            }
            if (!resolvedStudentId) {
                errors.push(`Row skipped: could not resolve student for roll "${rollNumber}"`);
                continue;
            }
            const stats = calcResultStats({ tamil, english, mathematics, science, socialScience, extraSubject }, maxTotal);
            try {
                yield prisma_1.prisma.modelExamResult.upsert({
                    where: { examId_studentId: { examId: id, studentId: resolvedStudentId } },
                    update: Object.assign({ tamil: tamil != null ? Number(tamil) : null, english: english != null ? Number(english) : null, mathematics: mathematics != null ? Number(mathematics) : null, science: science != null ? Number(science) : null, socialScience: socialScience != null ? Number(socialScience) : null, extraSubject: extraSubject != null ? Number(extraSubject) : null, extraSubjectName: extraSubjectName || null }, stats),
                    create: Object.assign({ examId: id, studentId: resolvedStudentId, studentName: studentName || 'Unknown', rollNumber: String(rollNumber || ''), tamil: tamil != null ? Number(tamil) : null, english: english != null ? Number(english) : null, mathematics: mathematics != null ? Number(mathematics) : null, science: science != null ? Number(science) : null, socialScience: socialScience != null ? Number(socialScience) : null, extraSubject: extraSubject != null ? Number(extraSubject) : null, extraSubjectName: extraSubjectName || null, maxTotal }, stats),
                });
                savedCount++;
            }
            catch (err) {
                errors.push(`Failed for roll "${rollNumber}": ${err === null || err === void 0 ? void 0 : err.message}`);
            }
        }
        res.json({ success: true, saved: savedCount, errors: errors.length ? errors : undefined });
    }
    catch (err) {
        console.error('Bulk model exam results error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PATCH /api/headmaster/model-exams/:id/lock — Lock exam (irreversible)
router.patch('/model-exams/:id/lock', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const exam = yield prisma_1.prisma.modelExam.findUnique({ where: { id } });
        if (!exam)
            return res.status(404).json({ success: false, error: 'Exam not found.' });
        if (exam.isLocked)
            return res.status(400).json({ success: false, error: 'Exam is already locked.' });
        const updated = yield prisma_1.prisma.modelExam.update({
            where: { id },
            data: { isLocked: true, lockedAt: new Date() },
        });
        // ── Notify all students in this exam with their individual result ──
        try {
            const results = yield prisma_1.prisma.modelExamResult.findMany({
                where: { examId: id },
                include: { exam: true },
            });
            for (const result of results) {
                try {
                    // Find student's userId
                    const student = yield prisma_1.prisma.student.findUnique({ where: { id: result.studentId } });
                    if (student === null || student === void 0 ? void 0 : student.userId) {
                        const subjectLine = [
                            result.tamil != null ? `Tamil:${result.tamil}` : null,
                            result.english != null ? `English:${result.english}` : null,
                            result.mathematics != null ? `Maths:${result.mathematics}` : null,
                            result.science != null ? `Science:${result.science}` : null,
                            result.socialScience != null ? `Social:${result.socialScience}` : null,
                        ].filter(Boolean).join(', ');
                        yield prisma_1.prisma.notification.create({
                            data: {
                                userId: student.userId,
                                message: `📊 ${exam.examName} Results (Class ${exam.class}-${exam.section}): ${subjectLine} | Total: ${(_a = result.total) !== null && _a !== void 0 ? _a : '–'}/500 | ${result.isPassed ? '✅ PASS' : '❌ FAIL'} | Grade: ${(_b = result.grade) !== null && _b !== void 0 ? _b : '–'}`,
                            },
                        });
                    }
                }
                catch (notifErr) {
                    console.error('[Exam Result Notification - Student]', notifErr);
                }
            }
            // ── Notify teachers of this class/school ──
            try {
                const teachers = yield prisma_1.prisma.teacher.findMany({ where: { schoolId: exam.schoolId } });
                const passed = results.filter(r => r.isPassed === true).length;
                const classMsg = `📋 ${exam.examName} (Class ${exam.class}-${exam.section}) marks have been finalised. ${results.length} students | ${passed} passed | ${results.length - passed} failed.`;
                for (const teacher of teachers) {
                    yield prisma_1.prisma.notification.create({
                        data: { userId: teacher.userId, message: classMsg },
                    });
                }
            }
            catch (teacherNotifErr) {
                console.error('[Exam Result Notification - Teacher]', teacherNotifErr);
            }
        }
        catch (notifBlockErr) {
            console.error('[Exam Lock Notification Block]', notifBlockErr);
        }
        res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('Lock exam error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/headmaster/model-exams/:id/template — Download Excel template pre-filled with students
router.get('/model-exams/:id/template', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exam = yield prisma_1.prisma.modelExam.findUnique({ where: { id: req.params.id } });
        if (!exam)
            return res.status(404).json({ success: false, error: 'Exam not found.' });
        // Fetch students in this class and group from the school
        const whereClause = { schoolId: exam.schoolId, class: exam.class, section: exam.section };
        if (exam.group) {
            whereClause.group = exam.group;
        }
        const students = yield prisma_1.prisma.student.findMany({
            where: whereClause,
            include: { user: true },
            orderBy: { rollNumber: 'asc' },
        });
        // Return as JSON (frontend generates the Excel with XLSX)
        const rows = students.map((s) => {
            var _a;
            return ({
                studentId: s.id,
                studentName: ((_a = s.user) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                rollNumber: s.rollNumber || '',
                class: s.class,
                section: s.section,
                tamil: '',
                english: '',
                mathematics: '',
                science: '',
                socialScience: '',
                extraSubject: '',
            });
        });
        res.json({ success: true, data: rows, examName: exam.examName, class: exam.class, section: exam.section });
    }
    catch (err) {
        console.error('Template fetch error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/model-exams/:id — Delete exam (only if not locked)
router.delete('/model-exams/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exam = yield prisma_1.prisma.modelExam.findUnique({ where: { id: req.params.id } });
        if (!exam)
            return res.status(404).json({ success: false, error: 'Exam not found.' });
        if (exam.isLocked)
            return res.status(403).json({ success: false, error: 'Cannot delete a locked exam.' });
        yield prisma_1.prisma.modelExam.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Delete exam error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/headmaster/model-exams/student/:studentId — Get locked model exam results for a student
router.get('/model-exams/student/:studentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { studentId } = req.params;
        const student = yield prisma_1.prisma.student.findFirst({
            where: { OR: [{ id: studentId }, { userId: studentId }] },
        });
        if (student) {
            studentId = student.id;
        }
        const results = yield prisma_1.prisma.modelExamResult.findMany({
            where: {
                studentId,
                exam: {
                    isLocked: true
                }
            },
            include: {
                exam: true
            },
            orderBy: {
                exam: {
                    examDate: 'desc'
                }
            }
        });
        res.json({ success: true, data: results });
    }
    catch (err) {
        console.error('Fetch student model exam results error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── School Resource Management Monitor ──────────────────────────────────────
// 9 monitored categories: Classrooms | Laboratories | Computers |
// Smart Classrooms | Libraries | Toilets | Drinking Water |
// Electricity | Internet Facilities
const RESOURCE_CATEGORIES = [
    'Classrooms', 'Laboratories', 'Computers', 'Smart Classrooms',
    'Libraries', 'Toilets', 'Drinking Water', 'Electricity', 'Internet Facilities',
];
// GET /api/headmaster/school-resources?schoolId=&category=
router.get('/school-resources', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, category } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required.' });
        }
        const where = { schoolId: String(schoolId) };
        if (category && String(category) !== 'All') {
            where.category = String(category);
        }
        const resources = yield prisma_1.prisma.schoolResource.findMany({
            where,
            orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
        });
        res.json({ success: true, count: resources.length, data: resources });
    }
    catch (err) {
        console.error('[school-resources GET]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/school-resources
router.post('/school-resources', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, category, name, totalCount, functionalCount, status, remarks, lastAudited } = req.body;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required.' });
        }
        if (!category || !RESOURCE_CATEGORIES.includes(String(category))) {
            return res.status(400).json({ success: false, error: 'Invalid or missing category.' });
        }
        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, error: 'name is required.' });
        }
        const resource = yield prisma_1.prisma.schoolResource.create({
            data: {
                schoolId: String(schoolId),
                category: String(category),
                name: String(name).trim(),
                totalCount: totalCount != null ? Number(totalCount) : null,
                functionalCount: functionalCount != null ? Number(functionalCount) : null,
                status: status ? String(status) : 'Good',
                remarks: remarks ? String(remarks) : null,
                lastAudited: lastAudited ? new Date(String(lastAudited)) : null,
            },
        });
        res.status(201).json({ success: true, data: resource });
    }
    catch (err) {
        console.error('[school-resources POST]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PATCH /api/headmaster/school-resources/:id
router.patch('/school-resources/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.schoolResource.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Resource not found.' });
        }
        const { name, totalCount, functionalCount, status, remarks, lastAudited } = req.body;
        const updated = yield prisma_1.prisma.schoolResource.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name !== undefined && { name: String(name).trim() })), (totalCount !== undefined && { totalCount: totalCount != null ? Number(totalCount) : null })), (functionalCount !== undefined && { functionalCount: functionalCount != null ? Number(functionalCount) : null })), (status !== undefined && { status: String(status) })), (remarks !== undefined && { remarks: remarks ? String(remarks) : null })), (lastAudited !== undefined && { lastAudited: lastAudited ? new Date(String(lastAudited)) : null })),
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('[school-resources PATCH]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── Resource Reports → Higher Officials (BEO / DEO / Commissioner / Minister) ─
const REPORT_RECIPIENTS = ['BEO', 'DEO', 'Commissioner', 'Minister'];
const REPORT_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const REPORT_STATUSES = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
const REPORT_TYPES = ['Critical Alert', 'Category Summary', 'Full Infrastructure Report'];
// GET /api/headmaster/resource-reports?schoolId=&recipientRole=&status=
router.get('/resource-reports', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, recipientRole, status } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required.' });
        }
        const where = { schoolId: String(schoolId) };
        if (recipientRole && String(recipientRole) !== 'All')
            where.recipientRole = String(recipientRole);
        if (status && String(status) !== 'All')
            where.status = String(status);
        const reports = yield prisma_1.prisma.resourceReport.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, count: reports.length, data: reports });
    }
    catch (err) {
        console.error('[resource-reports GET]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/resource-reports
router.post('/resource-reports', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, resourceId, category, recipientRole, reportType, priority, subject, description, snapshot } = req.body;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required.' });
        }
        if (!recipientRole || !REPORT_RECIPIENTS.includes(String(recipientRole))) {
            return res.status(400).json({ success: false, error: 'recipientRole must be one of: ' + REPORT_RECIPIENTS.join(', ') });
        }
        if (!subject || !String(subject).trim()) {
            return res.status(400).json({ success: false, error: 'subject is required.' });
        }
        if (category != null && category !== '' && !RESOURCE_CATEGORIES.includes(String(category))) {
            return res.status(400).json({ success: false, error: 'Invalid category.' });
        }
        const report = yield prisma_1.prisma.resourceReport.create({
            data: {
                schoolId: String(schoolId),
                resourceId: resourceId ? String(resourceId) : undefined,
                category: category ? String(category) : undefined,
                recipientRole: String(recipientRole),
                reportType: reportType && REPORT_TYPES.includes(String(reportType)) ? String(reportType) : 'Category Summary',
                priority: priority && REPORT_PRIORITIES.includes(String(priority)) ? String(priority) : 'Medium',
                subject: String(subject).trim(),
                description: description ? String(description) : undefined,
                snapshot: snapshot !== null && snapshot !== void 0 ? snapshot : undefined,
            },
        });
        res.status(201).json({ success: true, data: report });
    }
    catch (err) {
        console.error('[resource-reports POST]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PATCH /api/headmaster/resource-reports/:id  (status workflow updates)
router.patch('/resource-reports/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.resourceReport.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Report not found.' });
        }
        const { status, priority, subject, description } = req.body;
        if (status !== undefined && !REPORT_STATUSES.includes(String(status))) {
            return res.status(400).json({ success: false, error: 'status must be one of: ' + REPORT_STATUSES.join(', ') });
        }
        if (priority !== undefined && !REPORT_PRIORITIES.includes(String(priority))) {
            return res.status(400).json({ success: false, error: 'priority must be one of: ' + REPORT_PRIORITIES.join(', ') });
        }
        const updated = yield prisma_1.prisma.resourceReport.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (status !== undefined && { status: String(status) })), (priority !== undefined && { priority: String(priority) })), (subject !== undefined && { subject: String(subject).trim() })), (description !== undefined && { description: description ? String(description) : undefined })),
        });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('[resource-reports PATCH]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/resource-reports/:id
router.delete('/resource-reports/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.resourceReport.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Report not found.' });
        }
        yield prisma_1.prisma.resourceReport.delete({ where: { id } });
        res.json({ success: true, message: 'Report deleted.' });
    }
    catch (err) {
        console.error('[resource-reports DELETE]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/school-resources/:id
router.delete('/school-resources/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.schoolResource.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Resource not found.' });
        }
        yield prisma_1.prisma.schoolResource.delete({ where: { id } });
        res.json({ success: true, message: 'Resource deleted.' });
    }
    catch (err) {
        console.error('[school-resources DELETE]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/headmaster/rewards?schoolId=XYZ
router.get('/rewards', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId parameter is required' });
        }
        const rewards = yield prisma_1.prisma.reward.findMany({
            where: { schoolId: String(schoolId) },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: rewards });
    }
    catch (err) {
        console.error('Error fetching rewards:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/rewards
router.post('/rewards', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, title, recipient, category, date, citation } = req.body;
        if (!schoolId || !title || !recipient || !category) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }
        const newReward = yield prisma_1.prisma.reward.create({
            data: {
                schoolId,
                title,
                recipient,
                category,
                date: date || String(new Date().getFullYear()),
                citation: citation || 'Honored for outstanding contributions.'
            }
        });
        res.json({ success: true, data: newReward });
    }
    catch (err) {
        console.error('Error creating reward:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/rewards/:id
router.delete('/rewards/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield prisma_1.prisma.reward.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Reward record not found' });
        }
        yield prisma_1.prisma.reward.delete({ where: { id } });
        res.json({ success: true, message: 'Reward record deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting reward:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
