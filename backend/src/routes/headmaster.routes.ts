import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use((req: Request, res: Response, next) => {
  if (req.path.startsWith('/model-exams/student') && req.method === 'GET') {
    return next();
  }
  return authenticate(req, res, next);
});

const SAFE_STAFF_SELECT = {
  id: true, name: true, emisId: true, subject: true, phone: true, email: true,
  attendance: true, performance: true, leaveUsed: true, schoolId: true,
  createdAt: true, updatedAt: true, address: true, dob: true, gender: true, userId: true,
} as const;

const SAFE_TEMP_STAFF_SELECT = {
  id: true, name: true, role: true, agency: true, joined: true, phone: true, email: true,
  duration: true, salary: true, status: true, schoolId: true,
  createdAt: true, updatedAt: true, userId: true,
} as const;

// Helper to parse class and section from inputs like "Class 10A"
function parseClassSection(classStr: string) {
  if (!classStr) return { classVal: '10', sectionVal: 'A' };
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
function parseDob(dobStr: any) {
  if (!dobStr || dobStr === 'null' || dobStr === 'undefined' || String(dobStr).trim() === '') return null;

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
router.get('/students', async (req: Request, res: Response) => {
  try {
    let { schoolId } = req.query;
    if (!schoolId && req.user?.schoolId && req.user?.role !== 'SUPERADMIN') {
      schoolId = req.user.schoolId;
    }
    const students = await prisma.student.findMany({
      where: schoolId ? { schoolId: String(schoolId) } : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    // Format the response to flatten user name
    const formattedStudents = students.map(s => ({
      ...s,
      name: s.user?.name || 'Unknown',
      email: s.user?.email || s.parentEmail,
      phone: s.phoneNumber || s.parentMobile || s.user?.mobile,
    }));
    res.json({ success: true, count: formattedStudents.length, data: formattedStudents });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/students — Add a single student
router.post('/students', async (req: Request, res: Response) => {
  try {
    const {
      name, admissionNumber, rollNumber, emisNumber, dob, gender,
      bloodGroup, religion, community, nationality, mediumOfInstruction,
      class: cls, section, academicYear, fatherName, fatherOccupation,
      motherName, motherOccupation, parentEmail, phone, phoneNumber, parentName, address,
      city, district, state, pincode, studentStatus, schoolId, group
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    const cleanPhone = String(phone || phoneNumber || '').trim();
    const cleanRoll = rollNumber ? String(rollNumber).trim() : undefined;

    // Mobile uniqueness check for User table
    let mobileValue: string | null = cleanPhone || null;
    if (cleanPhone) {
      const existingMobile = await prisma.user.findFirst({ where: { mobile: cleanPhone } });
      if (existingMobile) mobileValue = null;
    }

    const { classVal, sectionVal } = parseClassSection(cls || '10');

    const result = await prisma.$transaction(async (tx) => {
      const studentEmail = cleanRoll
        ? `stu_${cleanRoll.toLowerCase().replace(/[^a-z0-9]/g, '')}_${schoolId.slice(-6)}@tn.gov.in`
        : `stu_${Date.now()}_${Math.floor(Math.random() * 10000)}@tn.gov.in`;

      const existingUserEmail = await tx.user.findFirst({ where: { email: studentEmail } });
      const finalEmail = existingUserEmail
        ? `stu_${cleanRoll || 'roll'}_${Date.now()}@tn.gov.in`
        : studentEmail;

      const user = await tx.user.create({
        data: {
          name,
          email: finalEmail,
          mobile: mobileValue,
          passwordHash: await hashPassword(cleanPhone || '123456'),
          role: 'STUDENT',
          schoolId,
        }
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          schoolId,
          class: classVal,
          section: section || sectionVal || 'A',
          group: (classVal === '11' || classVal === '12') ? (group || null) : null,
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
        const parentWhereConditions: any[] = [
          { email: { equals: parentEmail.trim().toLowerCase(), mode: 'insensitive' } }
        ];
        if (cleanPhone) {
          parentWhereConditions.push({ mobile: cleanPhone });
        }

        let parentUser = await tx.user.findFirst({
          where: { OR: parentWhereConditions }
        });

        if (!parentUser) {
          parentUser = await tx.user.create({
            data: {
              name: parentName || fatherName || motherName || 'Parent',
              email: parentEmail.trim().toLowerCase(),
              mobile: cleanPhone || null,
              passwordHash: await hashPassword(cleanPhone || '123456'),
              role: 'PARENT',
              schoolId,
            }
          });
        }

        // Check if HeadmasterParent model exists
        const hmParentWhereConditions: any[] = [
          { email: { equals: parentEmail.trim().toLowerCase(), mode: 'insensitive' } }
        ];
        if (cleanPhone) {
          hmParentWhereConditions.push({ phone: cleanPhone });
        }

        let hmParent = await tx.headmasterParent.findFirst({
          where: { OR: hmParentWhereConditions }
        });

        if (!hmParent) {
          hmParent = await tx.headmasterParent.create({
            data: {
              name: parentName || fatherName || motherName || 'Parent',
              role: 'Parent',
              phone: cleanPhone || 'N/A',
              email: parentEmail.trim().toLowerCase(),
              term: fatherName ? 'Father' : motherName ? 'Mother' : 'Parent',
              password: await hashPassword(cleanPhone || '123456'),
              schoolId,
              userId: parentUser.id,
            }
          });
        }

        // Link parent and student
        const linkExists = await tx.parentStudentLink.findFirst({
          where: { parentId: hmParent.id, studentId: student.id }
        });
        if (!linkExists) {
          await tx.parentStudentLink.create({
            data: {
              parentId: hmParent.id,
              studentId: student.id,
              isPrimary: true
            }
          });
        }
      }

      return { ...student, name: user.name };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error creating student:', err);
    let errorMsg = 'Failed to save student record.';
    const errStr = String(err);
    if (err?.code === 'P2002' || errStr.includes('Unique constraint failed')) {
      if (errStr.includes('email')) {
        errorMsg = 'A user or parent with this email address already exists. Please use a unique email address.';
      } else if (errStr.includes('mobile')) {
        errorMsg = 'A user with this mobile number already exists. Please use a unique phone number.';
      } else {
        errorMsg = 'A student with duplicate unique fields (roll number or EMIS) already exists.';
      }
    } else if (err?.message) {
      errorMsg = err.message;
    } else {
      errorMsg = errStr;
    }
    res.status(400).json({ success: false, error: errorMsg });
  }
});

// POST /api/headmaster/students/bulk — Bulk import students from Excel
router.post('/students/bulk', async (req: Request, res: Response) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ success: false, error: 'Invalid payload.' });
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Track phone numbers already used in THIS batch to avoid
    // intra-batch unique constraint violations on the User.mobile column.
    const batchUsedPhones = new Set<string>();

    for (const student of students) {
      const {
        schoolId, name, rollNumber, admissionNumber, emisNumber, dob, gender,
        bloodGroup, religion, community, nationality, mediumOfInstruction,
        class: cls, section, academicYear, fatherName, fatherOccupation,
        motherName, motherOccupation, parentEmail, phone, phoneNumber, parentName, address,
        city, district, state, pincode, studentStatus, group
      } = student;

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
      const existingStudent = await prisma.student.findFirst({
        where: { rollNumber, schoolId }
      });
      if (existingStudent) {
        skippedCount++;
        errors.push(`Skipped duplicate roll number "${rollNumber}" for "${name}"`);
        continue;
      }

      const cleanPhone = String(phone || phoneNumber || '').trim();

      // Resolve finalMobile: null if phone already taken in DB or in THIS batch
      let finalMobile: string | null = cleanPhone || null;
      if (finalMobile) {
        if (batchUsedPhones.has(finalMobile)) {
          finalMobile = null; // Already used by a previous student in this batch
        } else {
          const existingUser = await prisma.user.findFirst({ where: { mobile: finalMobile } });
          if (existingUser) {
            finalMobile = null; // Already taken in DB
          } else {
            batchUsedPhones.add(finalMobile); // Reserve it for this student
          }
        }
      }

      const hashedPassword = await hashPassword(cleanPhone || '123456');

      try {
        await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              schoolId,
              name,
              mobile: finalMobile,
              passwordHash: hashedPassword,
              role: 'STUDENT',
            }
          });

          await tx.student.create({
            data: {
              userId: newUser.id,
              rollNumber,
              schoolId,
              class: classVal,
              section: section || 'A',
              group: (classVal === '11' || classVal === '12') ? (group || null) : null,
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
            let parentUser = await tx.user.findFirst({
              where: { email: { equals: parentEmail.trim().toLowerCase(), mode: 'insensitive' } }
            });

            if (!parentUser) {
              let parentMobile: string | null = cleanPhone || null;
              if (parentMobile) {
                // Check both DB and batch for the parent phone
                const existingParentPhone = await tx.user.findFirst({ where: { mobile: parentMobile } });
                if (existingParentPhone || batchUsedPhones.has(parentMobile)) {
                  parentMobile = null;
                }
              }
              await tx.user.create({
                data: {
                  name: parentName || fatherName || motherName || 'Parent',
                  email: parentEmail.trim().toLowerCase(),
                  mobile: parentMobile,
                  passwordHash: await hashPassword(cleanPhone || '123456'),
                  role: 'PARENT',
                  schoolId,
                }
              });
            }
          }
        });

        createdCount++;
      } catch (err: any) {
        skippedCount++;
        const errMsg = err?.message || String(err);
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
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/students/:id — Update student details
router.put('/students/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, admissionNumber, rollNumber, emisNumber, dob, gender,
      bloodGroup, religion, community, nationality, mediumOfInstruction,
      class: cls, section, academicYear, fatherName, fatherOccupation,
      motherName, motherOccupation, parentEmail, phoneNumber, address,
      city, district, state, pincode, studentStatus, schoolId, group
    } = req.body;

    const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const { classVal } = parseClassSection(cls || student.class);

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        rollNumber,
        admissionNumber,
        emisNumber,
        class: classVal,
        section: section || student.section,
        group: (classVal === '11' || classVal === '12') ? (group !== undefined ? group : student.group) : null,
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
        const existingMobile = await prisma.user.findFirst({ where: { mobile: phoneNumber, id: { not: student.userId } } });
        if (!existingMobile) mobileValue = phoneNumber;
      }
      await prisma.user.update({
        where: { id: student.userId },
        data: {
          name: name !== undefined ? name : undefined,
          mobile: mobileValue,
        }
      });
    }

    res.json({ success: true, data: { ...updatedStudent, name: name !== undefined ? name : student.user.name } });
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/students/:id — Delete student
router.delete('/students/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id } });
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    // Delete dependent records
    await prisma.mark.deleteMany({ where: { studentId: id } });
    await prisma.attendance.deleteMany({ where: { studentId: id } });
    await prisma.scholarship.deleteMany({ where: { studentId: id } });
    await prisma.promotionRecord.deleteMany({ where: { studentId: id } });
    await prisma.studentAcademicHistory.deleteMany({ where: { studentId: id } });

    await prisma.student.delete({ where: { id } });
    await prisma.user.delete({ where: { id: student.userId } });

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/students/bulk-delete — Bulk delete students
router.post('/students/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'studentIds array is required' });
    }

    const students = await prisma.student.findMany({ where: { id: { in: studentIds } } });
    const userIds = students.map(s => s.userId);

    // Delete dependent records
    await prisma.mark.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.attendance.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.scholarship.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.promotionRecord.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.studentAcademicHistory.deleteMany({ where: { studentId: { in: studentIds } } });

    await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    res.json({ success: true, message: 'Students deleted successfully' });
  } catch (err) {
    console.error('Error in bulk delete:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});


// ─── Health Report Endpoints ─────────────────────────────────────

// GET /api/headmaster/health/:rollNumber
router.get('/health/:rollNumber', async (req: Request, res: Response) => {
  try {
    const { rollNumber } = req.params;
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { rollNumber: { equals: rollNumber, mode: 'insensitive' } },
          { emisNumber: { equals: rollNumber, mode: 'insensitive' } },
          { id: rollNumber },
          { user: { name: { contains: rollNumber, mode: 'insensitive' } } }
        ]
      }
    });
    if (!student) return res.json({ success: true, data: null });

    const health = await prisma.healthReport.findUnique({
      where: { studentId: student.id }
    });
    res.json({ success: true, data: health });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/health/:rollNumber
router.post('/health/:rollNumber', async (req: Request, res: Response) => {
  try {
    const { rollNumber } = req.params;
    const { height, weight, bloodGroup, vision, hearing, bmi, dental, lastCheckupDate, notes } = req.body;
    
    const student = await prisma.student.findFirst({
      where: { rollNumber: { equals: rollNumber, mode: 'insensitive' } }
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found in core system. Must be enrolled first.' });

    const health = await prisma.healthReport.upsert({
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Staff Endpoints ─────────────────────────────────────────────

// GET /api/headmaster/staff — List all staff
router.get('/staff', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    let whereClause: any = undefined;
    if (schoolId && String(schoolId).trim() !== '' && String(schoolId) !== 'undefined' && String(schoolId) !== 'null') {
      whereClause = { schoolId: String(schoolId) };
    }

    const staff = await prisma.headmasterStaff.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      select: SAFE_STAFF_SELECT,
    });

    // Dynamically derive taught subjects from ClassRoom entries if present
    const updatedStaff = await Promise.all(staff.map(async (s) => {
      let currentSubject = s.subject;
      let tIds: string[] = [s.id];

      if (s.email) {
        const matchedUser = await prisma.user.findFirst({
          where: { email: { equals: s.email, mode: 'insensitive' } },
          select: { id: true }
        });
        if (matchedUser) tIds.push(matchedUser.id);
      }

      const classes = await prisma.classRoom.findMany({
        where: { teacherId: { in: tIds } },
        select: { subject: true }
      });

      if (classes.length > 0) {
        const uniqueSubjects = Array.from(new Set(classes.map(c => c.subject).filter(Boolean)));
        if (uniqueSubjects.length > 0) {
          currentSubject = uniqueSubjects.join(", ");
        }
      }

      return {
        ...s,
        subject: currentSubject
      };
    }));

    res.json({ success: true, count: updatedStaff.length, data: updatedStaff });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/staff — Add single staff member
router.post('/staff', async (req: Request, res: Response) => {
  try {
    const { name, emisId, subject, phone, email, attendance, performance, leaveUsed, password, schoolId, address, dob, gender } = req.body;
    if (!name || !emisId) {
      return res.status(400).json({ success: false, error: 'name and emisId are required' });
    }
    const hashedPassword = await hashPassword(password || '123456');
    const staff = await prisma.headmasterStaff.upsert({
      where: { emisId },
      update: { 
        name, 
        subject: subject || 'General', 
        phone: phone || 'N/A', 
        email: email || null, 
        attendance: attendance ?? 100, 
        performance: performance || 'Good', 
        leaveUsed: leaveUsed ?? 0, 
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
        attendance: attendance ?? 100, 
        performance: performance || 'Good', 
        leaveUsed: leaveUsed ?? 0, 
        password: hashedPassword, 
        schoolId: schoolId || null,
        address: address || null,
        dob: dob ? new Date(dob) : null,
        gender: gender || null
      },
      select: SAFE_STAFF_SELECT,
    });
    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/seed-excel — Seed exact 12 staff from sample Excel template
router.get('/seed-excel', async (req: Request, res: Response) => {
  try {
    const schoolId = "0db278f1-54bc-4333-9856-718089ce7da9";
    const exactRows = [
      { name: "Karthik Raj", emisId: "TCHRKR001", category: "Teaching", subject: "Mathematics", phone: "9000000101", email: "karthik.raj@example.com", joined: "2024-06-01", work: "Exam Coordinator", cls: "10", sec: "A", docAppt: "Completed", address: "12 Gandhi Nagar, Thanthoni, Karur" },
      { name: "Meena Kumari", emisId: "NTCMKR002", category: "Non-Teaching", subject: "Librarian", phone: "9000000102", email: "meena.kumari@example.com", joined: "2023-09-15", work: "Library Management", cls: "", sec: "", docAppt: "Completed", address: "25 North Street, Karur" },
      { name: "Suresh Kumar", emisId: "TCHRKR003", category: "Teaching", subject: "Science", phone: "9000000103", email: "suresh.kumar@example.com", joined: "2022-06-10", work: "Science Lab In-charge", cls: "9", sec: "A", docAppt: "Completed", address: "18 School Road, Veliyanai, Karur" },
      { name: "Priya Devi", emisId: "TCHRKR004", category: "Teaching", subject: "English", phone: "9000000104", email: "priya.devi@example.com", joined: "2023-06-12", work: "English Department", cls: "8", sec: "A", docAppt: "Completed", address: "7 Market Road, Karur" },
      { name: "Arun Prakash", emisId: "TCHRKR005", category: "Teaching", subject: "Computer Science", phone: "9000000105", email: "arun.prakash@example.com", joined: "2024-07-01", work: "Computer Lab In-charge", cls: "12", sec: "A", docAppt: "Completed", address: "31 College Road, Karur" },
      { name: "Arun Kumar", emisId: "TCHRKR006", category: "Teaching", subject: "Tamil", phone: "9000000106", email: "arun.kumar@example.com", joined: "2022-06-01", work: "Class Teacher", cls: "6", sec: "A", docAppt: "Completed", address: "12 Gandhi Nagar, Thanthoni, Karur" },
      { name: "Priya Devi", emisId: "TCHRKR007", category: "Teaching", subject: "English", phone: "9000000107", email: "priya.devi@example.com", joined: "2022-06-01", work: "Class Teacher", cls: "7", sec: "A", docAppt: "Completed", address: "25 North Street, Karur" },
      { name: "Karthik Raj", emisId: "TCHRKR008", category: "Teaching", subject: "Mathematics", phone: "9000000108", email: "karthik.raj@example.com", joined: "2021-06-15", work: "Class Teacher", cls: "8", sec: "A", docAppt: "Completed", address: "18 Main Road, Veliyanai, Karur" },
      { name: "Meena Kumari", emisId: "TCHRKR009", category: "Teaching", subject: "Science", phone: "9000000109", email: "meena.kumari@example.com", joined: "2021-06-15", work: "Class Teacher", cls: "9", sec: "A", docAppt: "Completed", address: "7 School Road, Karur" },
      { name: "Suresh Kumar", emisId: "TCHRKR010", category: "Teaching", subject: "Social Science", phone: "9000000110", email: "suresh.kumar@example.com", joined: "2020-06-10", work: "Class Teacher", cls: "10", sec: "A", docAppt: "Completed", address: "31 Market Road, Karur" },
      { name: "Divya R", emisId: "TCHRKR011", category: "Teaching", subject: "Physics", phone: "9000000111", email: "divya.r@example.com", joined: "2023-06-12", work: "Class Teacher", cls: "11", sec: "A", docAppt: "Completed", address: "11 College Road, Karur" },
      { name: "Ravi Shankar", emisId: "TCHRKR012", category: "Teaching", subject: "Mathematics", phone: "9000000112", email: "ravi.shankar@example.com", joined: "2022-07-01", work: "Class Teacher", cls: "12", sec: "A", docAppt: "Completed", address: "22 Bus Stand Road, Karur" }
    ];

    await prisma.headmasterStaff.deleteMany({
      where: {
        schoolId,
        emisId: { startsWith: "TCH3" }
      }
    });

    const hashedPassword = await hashPassword('123456');

    for (const r of exactRows) {
      const address = JSON.stringify({
        address: r.address,
        staffType: r.category,
        joiningDate: r.joined,
        workAllocation: r.work,
        assignedClass: r.cls,
        assignedSection: r.sec,
        docAppointment: r.docAppt
      });

      await prisma.headmasterStaff.upsert({
        where: { emisId: r.emisId },
        update: {
          name: r.name,
          subject: r.category === "Teaching" ? r.subject : "Non-Teaching",
          phone: r.phone,
          email: r.email,
          attendance: 95,
          performance: "Excellent",
          leaveUsed: 1,
          password: hashedPassword,
          schoolId,
          address
        },
        create: {
          name: r.name,
          emisId: r.emisId,
          subject: r.category === "Teaching" ? r.subject : "Non-Teaching",
          phone: r.phone,
          email: r.email,
          attendance: 95,
          performance: "Excellent",
          leaveUsed: 1,
          password: hashedPassword,
          schoolId,
          address
        }
      });
    }

    res.json({ success: true, count: exactRows.length, message: "Imported 12 exact excel records" });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/staff/bulk — Bulk import from Excel
router.post('/staff/bulk', async (req: Request, res: Response) => {
  try {
    const { staff } = req.body as { staff: any[] };
    if (!Array.isArray(staff) || staff.length === 0) {
      return res.status(400).json({ success: false, error: 'staff array is required' });
    }

    const parseSafeFloat = (val: any, fallback = 100): number => {
      if (val === undefined || val === null || val === '') return fallback;
      const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
      return isNaN(num) ? fallback : num;
    };

    const parseSafeInt = (val: any, fallback = 0): number => {
      if (val === undefined || val === null || val === '') return fallback;
      const num = parseInt(String(val).replace(/\D/g, ''), 10);
      return isNaN(num) ? fallback : num;
    };

    let created = 0;
    for (let i = 0; i < staff.length; i++) {
      const s = staff[i];
      if (!s || !s.name) continue;
      const targetEmisId = (s.emisId && String(s.emisId).trim() !== '')
        ? String(s.emisId).trim()
        : `TCHR-${Date.now().toString().slice(-6)}-${i + 1}`;

      const hashedPassword = await hashPassword(s.password || '123456');
      const addressVal = typeof s.address === 'object' ? JSON.stringify(s.address) : (s.address ? String(s.address) : null);

      try {
        await prisma.headmasterStaff.upsert({
          where: { emisId: targetEmisId },
          update: { 
            name: String(s.name).trim(), 
            subject: s.subject ? String(s.subject) : 'General', 
            phone: s.phone ? String(s.phone) : 'N/A', 
            email: s.email ? String(s.email).trim().toLowerCase() : null, 
            attendance: parseSafeFloat(s.attendance, 100), 
            performance: s.performance ? String(s.performance) : 'Good', 
            leaveUsed: parseSafeInt(s.leaveUsed ?? s.leave, 0), 
            password: hashedPassword, 
            schoolId: s.schoolId ? String(s.schoolId) : (req.body.schoolId ? String(req.body.schoolId) : null),
            address: addressVal,
            dob: parseDob(s.dob),
            gender: s.gender ? String(s.gender) : null
          },
          create: { 
            name: String(s.name).trim(), 
            emisId: targetEmisId, 
            subject: s.subject ? String(s.subject) : 'General', 
            phone: s.phone ? String(s.phone) : 'N/A', 
            email: s.email ? String(s.email).trim().toLowerCase() : null, 
            attendance: parseSafeFloat(s.attendance, 100), 
            performance: s.performance ? String(s.performance) : 'Good', 
            leaveUsed: parseSafeInt(s.leaveUsed ?? s.leave, 0), 
            password: hashedPassword, 
            schoolId: s.schoolId ? String(s.schoolId) : (req.body.schoolId ? String(req.body.schoolId) : null),
            address: addressVal,
            dob: parseDob(s.dob),
            gender: s.gender ? String(s.gender) : null
          },
        });
        created++;
      } catch (itemErr) {
        console.error(`Error importing staff row "${s.name}":`, itemErr);
      }
    }
    res.status(201).json({ success: true, created });
  } catch (err) {
    console.error('Error in staff bulk import:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/staff/:id — Update staff member
router.put('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { name, subject, phone, email, attendance, performance, leaveUsed, password, schoolId, address, dob, gender } = req.body;
    const staff = await prisma.headmasterStaff.update({
      where: { id: req.params.id },
      data: {
        name: name !== undefined ? name : undefined,
        subject: subject !== undefined ? subject : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        attendance: attendance !== undefined ? attendance : undefined,
        performance: performance !== undefined ? performance : undefined,
        leaveUsed: leaveUsed !== undefined ? leaveUsed : undefined,
        password: password !== undefined ? await hashPassword(password) : undefined,
        schoolId: schoolId !== undefined ? schoolId : undefined,
        address: address !== undefined ? address : undefined,
        dob: dob !== undefined ? (dob ? new Date(dob) : null) : undefined,
        gender: gender !== undefined ? gender : undefined
      },
      select: SAFE_STAFF_SELECT,
    });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/staff/:id — Remove staff member
router.delete('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.headmasterStaff.findFirst({
      where: {
        OR: [
          { id },
          { emisId: id }
        ]
      }
    });

    if (existing) {
      await prisma.headmasterStaff.delete({ where: { id: existing.id } });
    }
    res.json({ success: true, message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Temporary / Contract Staff Endpoints ────────────────────────

// GET /api/headmaster/temp-staff
router.get('/temp-staff', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    const staff = await prisma.headmasterTempStaff.findMany({
      where: schoolId ? { schoolId: String(schoolId) } : undefined,
      orderBy: { createdAt: 'desc' },
      select: SAFE_TEMP_STAFF_SELECT,
    });
    res.json({ success: true, count: staff.length, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/temp-staff — Add single
router.post('/temp-staff', async (req: Request, res: Response) => {
  try {
    const { name, role, agency, joined, phone, email, duration, salary, status, password, schoolId } = req.body;
    if (!name || !role) return res.status(400).json({ success: false, error: 'name and role are required' });
    const staff = await prisma.headmasterTempStaff.create({
      data: { name, role, agency: agency || 'Direct Contract', joined: joined || '', phone: phone || 'N/A', email: email || 'N/A', duration: duration || '12 Months', salary: salary || 'N/A', status: status || 'Active', password: await hashPassword(password || '123456'), schoolId: schoolId || null },
      select: SAFE_TEMP_STAFF_SELECT,
    });
    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/temp-staff/bulk — Bulk import
router.post('/temp-staff/bulk', async (req: Request, res: Response) => {
  try {
    const { staff } = req.body as { staff: any[] };
    if (!Array.isArray(staff) || staff.length === 0) return res.status(400).json({ success: false, error: 'staff array required' });
    const records = await Promise.all(staff.filter((s) => s.name && s.role).map(async (s) => ({
      name: s.name, role: s.role, agency: s.agency || 'Direct Contract', joined: s.joined || '',
      phone: s.phone || 'N/A', email: s.email || 'N/A', duration: s.duration || '12 Months',
      salary: s.salary || 'N/A', status: 'Active', password: await hashPassword(s.password || '123456'), schoolId: s.schoolId || null,
    })));
    const result = await prisma.headmasterTempStaff.createMany({ data: records, skipDuplicates: false });
    res.status(201).json({ success: true, created: result.count });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/temp-staff/:id
router.put('/temp-staff/:id', async (req: Request, res: Response) => {
  try {
    const { name, role, agency, joined, phone, email, duration, salary, status, password, schoolId } = req.body;
    const staff = await prisma.headmasterTempStaff.update({
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
        password: password !== undefined ? await hashPassword(password) : undefined,
        schoolId: schoolId !== undefined ? schoolId : undefined,
      },
      select: SAFE_TEMP_STAFF_SELECT,
    });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/temp-staff/:id
router.delete('/temp-staff/:id', async (req: Request, res: Response) => {
  try {
    await prisma.headmasterTempStaff.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Temp staff removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Parents / PTA Committee Endpoints ────────────────────────────

// GET /api/headmaster/parents
router.get('/parents', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    const parents = await prisma.headmasterParent.findMany({
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
    const safeParents = parents.map(({ password, linkedStudents, ...p }) => {
      const primaryLink = linkedStudents.find(l => l.isPrimary) || linkedStudents[0];
      const studentName = primaryLink?.student?.user?.name || 'N/A';
      const studentClass = primaryLink?.student 
        ? `${primaryLink.student.class}${primaryLink.student.section || ''}`
        : 'N/A';
      return {
        ...p,
        studentName,
        studentClass,
        linkedStudents,
      };
    });
    res.json({ success: true, count: safeParents.length, data: safeParents });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/parents — Add single parent/officer
router.post('/parents', async (req: Request, res: Response) => {
  try {
    const { name, role, phone, email, studentName, studentClass, term, password, schoolId } = req.body;
    if (!name || !role || !phone) {
      return res.status(400).json({ success: false, error: 'name, role and phone are required' });
    }
    const parent = await prisma.headmasterParent.create({
      data: {
        name,
        role,
        phone,
        email: email || null,
        term: term || '2025-26',
        password: await hashPassword(password || '123456'),
        schoolId: schoolId || null,
      },
    });
    const { password: _pw, ...safeParent } = parent;
    res.status(201).json({ success: true, data: { ...safeParent, studentName: studentName || 'N/A', studentClass: studentClass || 'N/A' } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/parents/bulk — Bulk import parents from Excel
router.post('/parents/bulk', async (req: Request, res: Response) => {
  try {
    const { parents } = req.body as { parents: any[] };
    if (!Array.isArray(parents) || parents.length === 0) {
      return res.status(400).json({ success: false, error: 'parents array is required' });
    }
    const records = await Promise.all(parents
      .filter((p) => p.name && p.role && p.phone)
      .map(async (p) => ({
        name: p.name,
        role: p.role,
        phone: p.phone,
        email: p.email || null,
        term: p.term || '2025-26',
        password: await hashPassword(p.password || '123456'),
        schoolId: p.schoolId || null,
      })));
    const result = await prisma.headmasterParent.createMany({ data: records, skipDuplicates: false });
    res.status(201).json({ success: true, created: result.count });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/parents/:id — Update parent officer
router.put('/parents/:id', async (req: Request, res: Response) => {
  try {
    const { password, studentName, studentClass, ...rest } = req.body;
    const parent = await prisma.headmasterParent.update({
      where: { id: req.params.id },
      data: password !== undefined ? { ...rest, password: await hashPassword(password) } : rest,
    });
    const { password: _pw, ...safeParent } = parent;
    res.json({ success: true, data: { ...safeParent, studentName: studentName || 'N/A', studentClass: studentClass || 'N/A' } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/parents/:id — Remove parent officer
router.delete('/parents/:id', async (req: Request, res: Response) => {
  try {
    await prisma.headmasterParent.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'PTA Committee member removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});


// ─── Alumni Endpoints ─────────────────────────────────────────────

// GET /api/headmaster/alumni
router.get('/alumni', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    const alumniList = await prisma.headmasterAlumni.findMany({
      where: schoolId ? { schoolId: String(schoolId) } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, count: alumniList.length, data: alumniList });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/alumni — Add single alumni contribution
router.post('/alumni', async (req: Request, res: Response) => {
  try {
    const { name, batch, contribution, role, phone, email, location, value, schoolId } = req.body;
    if (!name || !contribution) {
      return res.status(400).json({ success: false, error: 'name and contribution details are required' });
    }
    const record = await prisma.headmasterAlumni.create({
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/alumni/bulk — Bulk import alumni from Excel
router.post('/alumni/bulk', async (req: Request, res: Response) => {
  try {
    const { alumni } = req.body as { alumni: any[] };
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
    const result = await prisma.headmasterAlumni.createMany({ data: records, skipDuplicates: false });
    res.status(201).json({ success: true, created: result.count });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/alumni/:id — Update alumni record
router.put('/alumni/:id', async (req: Request, res: Response) => {
  try {
    const { name, batch, contribution, role, phone, email, location, value, schoolId } = req.body;
    const record = await prisma.headmasterAlumni.update({
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/alumni/:id — Remove alumni contribution
router.delete('/alumni/:id', async (req: Request, res: Response) => {
  try {
    await prisma.headmasterAlumni.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Alumni contribution record removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── PTA Meeting Endpoints (Headmaster creates, parents view) ─────

const RSVPS_FILE = path.join(__dirname, '../../data/pta_rsvps.json');

function readRsvps(): Record<string, Record<string, any>> {
  try {
    if (!fs.existsSync(RSVPS_FILE)) {
      return {};
    }
    const content = fs.readFileSync(RSVPS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading RSVPs file:", err);
    return {};
  }
}

function writeRsvps(rsvps: Record<string, Record<string, any>>) {
  try {
    const dir = path.dirname(RSVPS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(RSVPS_FILE, JSON.stringify(rsvps, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing RSVPs file:", err);
  }
}

// GET /api/headmaster/pta-meetings
router.get('/pta-meetings', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    const meetings = await prisma.pTAMeeting.findMany({
      where: schoolId ? { schoolId: String(schoolId) } : undefined,
      orderBy: { meetingDate: 'asc' },
    });

    const rsvps = readRsvps();
    const enrichedMeetings = meetings.map(m => {
      const meetingRsvps = rsvps[m.id] || {};
      const rsvpValues = Object.values(meetingRsvps);
      return {
        ...m,
        rsvps: meetingRsvps,
        acceptCount: rsvpValues.filter(v => (typeof v === 'object' && v ? (v as any).status : v) === 'Accept').length,
        declineCount: rsvpValues.filter(v => (typeof v === 'object' && v ? (v as any).status : v) === 'Decline').length,
      };
    });

    res.json({ success: true, count: enrichedMeetings.length, data: enrichedMeetings });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/pta-meetings
router.post('/pta-meetings', async (req: Request, res: Response) => {
  try {
    const { schoolId, title, description, meetingDate, venue, status, agenda } = req.body;
    if (!title || !meetingDate) {
      return res.status(400).json({ success: false, error: 'title and meetingDate are required' });
    }
    const meeting = await prisma.pTAMeeting.create({
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
        const parents = await prisma.headmasterParent.findMany({
          where: { schoolId },
          select: { id: true, userId: true }
        });

        const meetingDateFormatted = new Date(meetingDate).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        if (parents.length > 0) {
          const notificationsData = parents
            .filter(p => p.userId)
            .map(p => ({
              userId: p.userId!,
              type: 'PTA_MEETING',
              title: `📅 New PTA Meeting Scheduled`,
              message: `"${title}" has been scheduled on ${meetingDateFormatted} at ${venue || 'School Auditorium'}. Please confirm your attendance in the Parent Portal.`,
              read: false,
            }));
          
          if (notificationsData.length > 0) {
            await prisma.notification.createMany({
              data: notificationsData,
            });
          }
        }
      } catch (notifErr) {
        // Notification failure should not block the meeting creation response
        console.error('[PTA Meeting Notification Error]', notifErr);
      }
    }

    res.status(201).json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/pta-meetings/:id/rsvp
router.put('/pta-meetings/:id/rsvp', async (req: Request, res: Response) => {
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/pta-meetings/:id
router.put('/pta-meetings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, meetingDate, venue, status, agenda } = req.body;
    const meeting = await prisma.pTAMeeting.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(meetingDate && { meetingDate: new Date(meetingDate) }),
        ...(venue && { venue }),
        ...(status && { status }),
        ...(Array.isArray(agenda) && { agenda }),
      },
    });
    res.json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/pta-meetings/:id
router.delete('/pta-meetings/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pTAMeeting.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'PTA meeting removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Parental Grievances Endpoints (Dynamic) ──────────────────────
const GRIEVANCES_FILE = path.join(__dirname, '../../data/grievances.json');

function readGrievances(): any[] {
  try {
    if (!fs.existsSync(GRIEVANCES_FILE)) return [];
    const content = fs.readFileSync(GRIEVANCES_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function writeGrievances(data: any[]) {
  try {
    const dir = path.dirname(GRIEVANCES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GRIEVANCES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing grievances:', err);
  }
}

// Initial default seed if empty
function getOrSeedGrievances(schoolId?: string): any[] {
  let list = readGrievances();
  if (list.length === 0) {
    list = [
      { id: 'grv-1', schoolId: schoolId || null, topic: "Transport facility delays in Zone B", raisedBy: "12 parents", status: "Under Review", createdAt: new Date().toISOString() },
      { id: 'grv-2', schoolId: schoolId || null, topic: "Request for extra special classes for 10th", raisedBy: "PTA Committee", status: "Approved", createdAt: new Date().toISOString() },
      { id: 'grv-3', schoolId: schoolId || null, topic: "RO Water filter service required in block C", raisedBy: "Class 7 Representative", status: "Resolved", createdAt: new Date().toISOString() },
    ];
    writeGrievances(list);
  }
  return list;
}

// GET /api/headmaster/grievances
router.get('/grievances', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    const all = getOrSeedGrievances(schoolId ? String(schoolId) : undefined);
    const filtered = schoolId 
      ? all.filter(g => !g.schoolId || g.schoolId === String(schoolId))
      : all;
    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/grievances — Raise new grievance
router.post('/grievances', async (req: Request, res: Response) => {
  try {
    const { schoolId, topic, raisedBy, status } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, error: 'topic is required' });
    }
    const all = getOrSeedGrievances(schoolId);
    const newGrievance = {
      id: `grv-${Date.now()}`,
      schoolId: schoolId || null,
      topic: topic.trim(),
      raisedBy: raisedBy ? raisedBy.trim() : 'Parent / PTA Member',
      status: status || 'Under Review',
      createdAt: new Date().toISOString()
    };
    all.unshift(newGrievance);
    writeGrievances(all);
    res.status(201).json({ success: true, data: newGrievance });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/grievances/:id — Update grievance status
router.put('/grievances/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, topic, raisedBy } = req.body;
    const all = readGrievances();
    const idx = all.findIndex(g => g.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Grievance not found' });
    }
    if (status) all[idx].status = status;
    if (topic) all[idx].topic = topic;
    if (raisedBy) all[idx].raisedBy = raisedBy;

    writeGrievances(all);
    res.json({ success: true, data: all[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/grievances/:id — Remove grievance
router.delete('/grievances/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let all = readGrievances();
    all = all.filter(g => g.id !== id);
    writeGrievances(all);
    res.json({ success: true, message: 'Grievance removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Parent → Student Link (Headmaster action) ────────────────────

// POST /api/headmaster/parents/:id/link-student
// Body: { studentId, isPrimary? }
router.post('/parents/:id/link-student', async (req: Request, res: Response) => {
  try {
    const parentId = req.params.id;
    const { studentId, isPrimary } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required' });
    }
    const link = await prisma.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: { isPrimary: isPrimary ?? false },
      create: { parentId, studentId, isPrimary: isPrimary ?? false },
    });
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/parents/:id/link-student
// Body: { studentId }
router.delete('/parents/:id/link-student', async (req: Request, res: Response) => {
  try {
    const parentId = req.params.id;
    const { studentId } = req.body;
    await prisma.parentStudentLink.delete({
      where: { parentId_studentId: { parentId, studentId } },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/parents/:id/linked-students
router.get('/parents/:id/linked-students', async (req: Request, res: Response) => {
  try {
    const { id: parentId } = req.params;
    const links = await prisma.parentStudentLink.findMany({
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/* ------------------- HEADMASTER PROFILE ROUTES ------------------- */

// GET /api/headmaster/profile/:userId — Fetch profile by User ID
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await prisma.headmasterProfile.findUnique({
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
  } catch (err) {
    console.error('Error fetching headmaster profile:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/profile — Create or Upsert profile
router.post('/profile', async (req: Request, res: Response) => {
  try {
    const { userId, schoolId, employeeId, joiningDate, address, gender, dob } = req.body;

    if (!userId || !schoolId) {
      return res.status(400).json({ success: false, error: 'userId and schoolId are required' });
    }

    const profile = await prisma.headmasterProfile.upsert({
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
  } catch (err) {
    console.error('Error upserting headmaster profile:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/profile/:id — Delete profile by profile ID
router.delete('/profile/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.headmasterProfile.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Headmaster profile deleted successfully' });
  } catch (err) {
    console.error('Error deleting headmaster profile:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/leave/:id — Approve or Reject a leave request
router.put('/leave/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approvedById } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Must be Approved or Rejected.' });
    }

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: { status, approvedById: approvedById || null },
    });

    // Handle Teacher Notification
    if (leave.staffId) {
      try {
        const { resolveUserId } = await import('../config/userResolver');
        const resolvedId = await resolveUserId(leave.staffId);
        if (resolvedId) {
          await prisma.notification.create({
            data: {
              userId: resolvedId,
              message: `Your leave request for ${leave.duration} has been ${status}.`,
            } as any
          });
        }
      } catch (notifErr) {
        console.error('[Leave Approval Notification Error]', notifErr);
      }
    }

    // Handle Student Notification
    if (leave.studentId) {
      try {
        const student = await prisma.student.findFirst({
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
          await prisma.notification.create({
            data: {
              userId: student.userId,
              message: `Your leave request for ${leave.duration} has been ${status}.`,
            } as any
          });
        }
      } catch (notifErr) {
        console.error('[Leave Approval Notification Error - Student]', notifErr);
      }
    }

    res.json({ success: true, data: leave });
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MODEL EXAM RESULTS — Classes 6–10 (Samacheer Kalvi)
// ═══════════════════════════════════════════════════════════════════════════

// Helper: compute grade from percentage (TN Samacheer Kalvi scale)
function computeGrade(pct: number): string {
  if (pct >= 91) return 'A+';
  if (pct >= 81) return 'A';
  if (pct >= 71) return 'B+';
  if (pct >= 61) return 'B';
  if (pct >= 51) return 'C';
  if (pct >= 35) return 'D';
  return 'U'; // Under 35 = Fail
}

// Helper: calc total and derived stats for a result row
function calcResultStats(data: any, maxTotal: number) {
  const subjects = ['tamil', 'english', 'mathematics', 'science', 'socialScience'];
  const vals = subjects.map((s) => (data[s] != null ? Number(data[s]) : null));
  const extraVal = data.extraSubject != null ? Number(data.extraSubject) : null;

  const enteredVals = [...vals, ...(extraVal != null ? [extraVal] : [])].filter((v) => v != null) as number[];
  const total = enteredVals.length > 0 ? enteredVals.reduce((a, b) => a + b, 0) : null;
  const percentage = total != null ? parseFloat(((total / maxTotal) * 100).toFixed(2)) : null;
  const grade = percentage != null ? computeGrade(percentage) : null;
  // Pass = every entered subject >= 35
  const isPassed = enteredVals.length > 0 ? enteredVals.every((v) => v >= 35) : null;
  return { total, percentage, grade, isPassed };
}

// POST /api/headmaster/model-exams — Create a new exam session
router.post('/model-exams', async (req: Request, res: Response) => {
  try {
    const { schoolId, examName, examType, class: cls, section, group, academicYear, examDate, createdBy } = req.body;
    if (!schoolId || !examName || !cls) {
      return res.status(400).json({ success: false, error: 'schoolId, examName, and class are required.' });
    }
    const exam = await prisma.modelExam.create({
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
  } catch (err) {
    console.error('Create model exam error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/model-exams — List exams for school (optionally filter by class/group)
router.get('/model-exams', async (req: Request, res: Response) => {
  try {
    const { schoolId, class: cls, academicYear, group } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId required.' });

    const sId = String(schoolId);
    const where: any = { schoolId: sId };
    if (cls) where.class = String(cls);
    if (academicYear) where.academicYear = String(academicYear);
    if (group) where.group = String(group);

    // Auto-sync completed ExamSchedule items into ModelExam
    try {
      const now = new Date();
      const completedSchedules = await prisma.examSchedule.findMany({
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
        if (cls && String(cls) !== clsClean) continue;

        const existingModel = await prisma.modelExam.findFirst({
          where: {
            schoolId: sId,
            class: clsClean,
            examName: sched.title,
          },
        });

        if (!existingModel) {
          await prisma.modelExam.create({
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
    } catch (syncErr) {
      console.warn('Sync examSchedule to modelExam warning:', syncErr);
    }

    const exams = await prisma.modelExam.findMany({
      where,
      orderBy: [{ class: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { results: true } },
      },
    });

    // Notify headmaster user for completed exams
    try {
      const headmasterUser = await prisma.user.findFirst({
        where: { schoolId: sId, role: 'HEADMASTER' },
      });

      if (headmasterUser) {
        const completedExams = exams.filter((e) => !e.examDate || new Date(e.examDate) <= new Date());
        for (const ex of completedExams) {
          const msg = `🔔 Exam Completed: ${ex.examName} for Class ${ex.class}-${ex.section} is completed in Exam Schedule. Please update & verify student marks.`;
          const existingNotif: any[] = await prisma.$queryRaw`
            SELECT id FROM "Notification" WHERE "userId" = ${headmasterUser.id} AND message = ${msg} LIMIT 1
          `;
          if (existingNotif.length === 0) {
            const id = randomUUID();
            const now = new Date();
            await prisma.$queryRaw`
              INSERT INTO "Notification" (id, "userId", message, "read", "createdAt")
              VALUES (${id}, ${headmasterUser.id}, ${msg}, false, ${now})
            `;
          }
        }
      }
    } catch (notifErr) {
      console.warn('Could not create notification:', notifErr);
    }

    res.json({ success: true, data: exams });
  } catch (err) {
    console.error('List model exams error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/model-exams/:id — Get single exam with all results
router.get('/model-exams/:id', async (req: Request, res: Response) => {
  try {
    const exam = await prisma.modelExam.findUnique({
      where: { id: req.params.id },
      include: {
        results: { orderBy: { rollNumber: 'asc' } },
      },
    });
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found.' });
    res.json({ success: true, data: exam });
  } catch (err) {
    console.error('Get model exam error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/model-exams/:id/results — Save/upsert marks (manual entry, one student at a time or batch)
router.post('/model-exams/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await prisma.modelExam.findUnique({ where: { id } });
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found.' });
    if (exam.isLocked) return res.status(403).json({ success: false, error: 'Exam is locked. Marks cannot be changed.' });

    const { results } = req.body; // array of mark rows
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ success: false, error: 'results array is required.' });
    }

    const maxTotal = 500; // 5 subjects × 100
    let savedCount = 0;

    for (const row of results) {
      const { studentId, studentName, rollNumber, tamil, english, mathematics, science, socialScience, extraSubject, extraSubjectName } = row;
      if (!studentId) continue;

      const stats = calcResultStats({ tamil, english, mathematics, science, socialScience, extraSubject }, maxTotal);

      await prisma.modelExamResult.upsert({
        where: { examId_studentId: { examId: id, studentId } },
        update: {
          tamil: tamil != null ? Number(tamil) : null,
          english: english != null ? Number(english) : null,
          mathematics: mathematics != null ? Number(mathematics) : null,
          science: science != null ? Number(science) : null,
          socialScience: socialScience != null ? Number(socialScience) : null,
          extraSubject: extraSubject != null ? Number(extraSubject) : null,
          extraSubjectName: extraSubjectName || null,
          ...stats,
        },
        create: {
          examId: id,
          studentId,
          studentName: studentName || 'Unknown',
          rollNumber: rollNumber || '',
          tamil: tamil != null ? Number(tamil) : null,
          english: english != null ? Number(english) : null,
          mathematics: mathematics != null ? Number(mathematics) : null,
          science: science != null ? Number(science) : null,
          socialScience: socialScience != null ? Number(socialScience) : null,
          extraSubject: extraSubject != null ? Number(extraSubject) : null,
          extraSubjectName: extraSubjectName || null,
          maxTotal,
          ...stats,
        },
      });
      savedCount++;
    }

    res.json({ success: true, saved: savedCount });
  } catch (err) {
    console.error('Save model exam results error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/model-exams/:id/bulk-results — Bulk upload marks from Excel
router.post('/model-exams/:id/bulk-results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await prisma.modelExam.findUnique({ where: { id } });
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found.' });
    if (exam.isLocked) return res.status(403).json({ success: false, error: 'Exam is locked. Marks cannot be changed.' });

    const { results } = req.body;
    if (!Array.isArray(results)) return res.status(400).json({ success: false, error: 'results array required.' });

    const maxTotal = 500;
    let savedCount = 0;
    const errors: string[] = [];

    for (const row of results) {
      const { studentId, studentName, rollNumber, tamil, english, mathematics, science, socialScience, extraSubject, extraSubjectName } = row;

      // Try to find student by rollNumber if studentId is missing
      let resolvedStudentId = studentId;
      if (!resolvedStudentId && rollNumber) {
        const found = await prisma.student.findFirst({ where: { rollNumber: String(rollNumber), schoolId: exam.schoolId } });
        if (found) resolvedStudentId = found.id;
      }
      if (!resolvedStudentId) {
        errors.push(`Row skipped: could not resolve student for roll "${rollNumber}"`);
        continue;
      }

      const stats = calcResultStats({ tamil, english, mathematics, science, socialScience, extraSubject }, maxTotal);

      try {
        await prisma.modelExamResult.upsert({
          where: { examId_studentId: { examId: id, studentId: resolvedStudentId } },
          update: {
            tamil: tamil != null ? Number(tamil) : null,
            english: english != null ? Number(english) : null,
            mathematics: mathematics != null ? Number(mathematics) : null,
            science: science != null ? Number(science) : null,
            socialScience: socialScience != null ? Number(socialScience) : null,
            extraSubject: extraSubject != null ? Number(extraSubject) : null,
            extraSubjectName: extraSubjectName || null,
            ...stats,
          },
          create: {
            examId: id,
            studentId: resolvedStudentId,
            studentName: studentName || 'Unknown',
            rollNumber: String(rollNumber || ''),
            tamil: tamil != null ? Number(tamil) : null,
            english: english != null ? Number(english) : null,
            mathematics: mathematics != null ? Number(mathematics) : null,
            science: science != null ? Number(science) : null,
            socialScience: socialScience != null ? Number(socialScience) : null,
            extraSubject: extraSubject != null ? Number(extraSubject) : null,
            extraSubjectName: extraSubjectName || null,
            maxTotal,
            ...stats,
          },
        });
        savedCount++;
      } catch (err: any) {
        errors.push(`Failed for roll "${rollNumber}": ${err?.message}`);
      }
    }

    res.json({ success: true, saved: savedCount, errors: errors.length ? errors : undefined });
  } catch (err) {
    console.error('Bulk model exam results error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/headmaster/model-exams/:id/lock — Lock exam (irreversible)
router.patch('/model-exams/:id/lock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await prisma.modelExam.findUnique({ where: { id } });
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found.' });
    if (exam.isLocked) return res.status(400).json({ success: false, error: 'Exam is already locked.' });

    const updated = await prisma.modelExam.update({
      where: { id },
      data: { isLocked: true, lockedAt: new Date() },
    });

    // ── Notify all students in this exam with their individual result ──
    try {
      const results = await prisma.modelExamResult.findMany({
        where: { examId: id },
        include: { exam: true },
      });

      for (const result of results) {
        try {
          // Find student's userId
          const student = await prisma.student.findUnique({ where: { id: result.studentId } });
          if (student?.userId) {
            const subjectLine = [
              result.tamil != null ? `Tamil:${result.tamil}` : null,
              result.english != null ? `English:${result.english}` : null,
              result.mathematics != null ? `Maths:${result.mathematics}` : null,
              result.science != null ? `Science:${result.science}` : null,
              result.socialScience != null ? `Social:${result.socialScience}` : null,
            ].filter(Boolean).join(', ');

            await prisma.notification.create({
              data: {
                userId: student.userId,
                message: `📊 ${exam.examName} Results (Class ${exam.class}-${exam.section}): ${subjectLine} | Total: ${result.total ?? '–'}/500 | ${result.isPassed ? '✅ PASS' : '❌ FAIL'} | Grade: ${result.grade ?? '–'}`,
              } as any,
            });
          }
        } catch (notifErr) {
          console.error('[Exam Result Notification - Student]', notifErr);
        }
      }

      // ── Notify teachers of this class/school ──
      try {
        const teachers = await prisma.teacher.findMany({ where: { schoolId: exam.schoolId } });
        const passed = results.filter(r => r.isPassed === true).length;
        const classMsg = `📋 ${exam.examName} (Class ${exam.class}-${exam.section}) marks have been finalised. ${results.length} students | ${passed} passed | ${results.length - passed} failed.`;
        for (const teacher of teachers) {
          await prisma.notification.create({
            data: { userId: teacher.userId, message: classMsg } as any,
          });
        }
      } catch (teacherNotifErr) {
        console.error('[Exam Result Notification - Teacher]', teacherNotifErr);
      }
    } catch (notifBlockErr) {
      console.error('[Exam Lock Notification Block]', notifBlockErr);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Lock exam error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/model-exams/:id/template — Download Excel template pre-filled with students
router.get('/model-exams/:id/template', async (req: Request, res: Response) => {
  try {
    const exam = await prisma.modelExam.findUnique({ where: { id: req.params.id } });
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found.' });

    // Fetch students in this class and group from the school
    const whereClause: any = { schoolId: exam.schoolId, class: exam.class, section: exam.section };
    if (exam.group) {
      whereClause.group = exam.group;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: { user: true },
      orderBy: { rollNumber: 'asc' },
    });

    // Return as JSON (frontend generates the Excel with XLSX)
    const rows = students.map((s) => ({
      studentId: s.id,
      studentName: s.user?.name || 'Unknown',
      rollNumber: s.rollNumber || '',
      class: s.class,
      section: s.section,
      tamil: '',
      english: '',
      mathematics: '',
      science: '',
      socialScience: '',
      extraSubject: '',
    }));

    res.json({ success: true, data: rows, examName: exam.examName, class: exam.class, section: exam.section });
  } catch (err) {
    console.error('Template fetch error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/model-exams/:id — Delete exam (only if not locked)
router.delete('/model-exams/:id', async (req: Request, res: Response) => {
  try {
    const exam = await prisma.modelExam.findUnique({ where: { id: req.params.id } });
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found.' });
    if (exam.isLocked) return res.status(403).json({ success: false, error: 'Cannot delete a locked exam.' });

    await prisma.modelExam.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete exam error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/model-exams/student/:studentId — Get locked model exam results for a student
router.get('/model-exams/student/:studentId', async (req: Request, res: Response) => {
  try {
    let { studentId } = req.params;

    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { userId: studentId }] },
    });

    if (student) {
      studentId = student.id;
    }

    const results = await prisma.modelExamResult.findMany({
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
  } catch (err) {
    console.error('Fetch student model exam results error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── School Resource Management Monitor ──────────────────────────────────────
// 9 monitored categories: Classrooms | Laboratories | Computers |
// Smart Classrooms | Libraries | Toilets | Drinking Water |
// Electricity | Internet Facilities

const RESOURCE_CATEGORIES: string[] = [
  'Classrooms', 'Laboratories', 'Computers', 'Smart Classrooms',
  'Libraries', 'Toilets', 'Drinking Water', 'Electricity', 'Internet Facilities',
  'Playground & Sports', 'Compound Wall & Security', 'Mid-Day Meal Shed',
  'PwD Accessibility & Ramps', 'Furniture & Desks', 'Fire Safety Equipment',
];

// GET /api/headmaster/school-resources?schoolId=&category=
router.get('/school-resources', async (req: Request, res: Response) => {
  try {
    const { schoolId, category } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required.' });
    }
    const where: any = { schoolId: String(schoolId) };
    if (category && String(category) !== 'All') {
      where.category = String(category);
    }
    const resources = await prisma.schoolResource.findMany({
      where,
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, count: resources.length, data: resources });
  } catch (err) {
    console.error('[school-resources GET]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/school-resources
router.post('/school-resources', async (req: Request, res: Response) => {
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

    const resource = await prisma.schoolResource.create({
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
  } catch (err) {
    console.error('[school-resources POST]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/headmaster/school-resources/:id
router.patch('/school-resources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.schoolResource.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }
    const { name, totalCount, functionalCount, status, remarks, lastAudited } = req.body;
    const updated = await prisma.schoolResource.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(totalCount !== undefined && { totalCount: totalCount != null ? Number(totalCount) : null }),
        ...(functionalCount !== undefined && { functionalCount: functionalCount != null ? Number(functionalCount) : null }),
        ...(status !== undefined && { status: String(status) }),
        ...(remarks !== undefined && { remarks: remarks ? String(remarks) : null }),
        ...(lastAudited !== undefined && { lastAudited: lastAudited ? new Date(String(lastAudited)) : null }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[school-resources PATCH]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Resource Reports → Higher Officials (BEO / DEO / Commissioner / Minister) ─

const REPORT_RECIPIENTS = ['BEO', 'DEO', 'Commissioner', 'Minister'];
const REPORT_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const REPORT_STATUSES = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
const REPORT_TYPES = ['Critical Alert', 'Category Summary', 'Full Infrastructure Report'];

// GET /api/headmaster/resource-reports?schoolId=&recipientRole=&status=
router.get('/resource-reports', async (req: Request, res: Response) => {
  try {
    const { schoolId, recipientRole, status } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required.' });
    }
    const where: any = { schoolId: String(schoolId) };
    if (recipientRole && String(recipientRole) !== 'All') where.recipientRole = String(recipientRole);
    if (status && String(status) !== 'All') where.status = String(status);
    const reports = await prisma.resourceReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    console.error('[resource-reports GET]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/resource-reports
router.post('/resource-reports', async (req: Request, res: Response) => {
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

    const report = await prisma.resourceReport.create({
      data: {
        schoolId: String(schoolId),
        resourceId: resourceId ? String(resourceId) : undefined,
        category: category ? String(category) : undefined,
        recipientRole: String(recipientRole),
        reportType: reportType && REPORT_TYPES.includes(String(reportType)) ? String(reportType) : 'Category Summary',
        priority: priority && REPORT_PRIORITIES.includes(String(priority)) ? String(priority) : 'Medium',
        subject: String(subject).trim(),
        description: description ? String(description) : undefined,
        snapshot: snapshot ?? undefined,
      },
    });
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    console.error('[resource-reports POST]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/headmaster/resource-reports/:id  (status workflow updates)
router.patch('/resource-reports/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.resourceReport.findUnique({ where: { id } });
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
    const updated = await prisma.resourceReport.update({
      where: { id },
      data: {
        ...(status !== undefined && { status: String(status) }),
        ...(priority !== undefined && { priority: String(priority) }),
        ...(subject !== undefined && { subject: String(subject).trim() }),
        ...(description !== undefined && { description: description ? String(description) : undefined }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[resource-reports PATCH]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/resource-reports/:id
router.delete('/resource-reports/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.resourceReport.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }
    await prisma.resourceReport.delete({ where: { id } });
    res.json({ success: true, message: 'Report deleted.' });
  } catch (err) {
    console.error('[resource-reports DELETE]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/school-resources/:id
router.delete('/school-resources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.schoolResource.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }
    await prisma.schoolResource.delete({ where: { id } });
    res.json({ success: true, message: 'Resource deleted.' });
  } catch (err) {
    console.error('[school-resources DELETE]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/rewards?schoolId=XYZ
router.get('/rewards', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId parameter is required' });
    }
    const rewards = await prisma.reward.findMany({
      where: { schoolId: String(schoolId) },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: rewards });
  } catch (err) {
    console.error('Error fetching rewards:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/rewards
router.post('/rewards', async (req: Request, res: Response) => {
  try {
    const { schoolId, title, recipient, category, date, citation } = req.body;
    if (!schoolId || !title || !recipient || !category) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    const newReward = await prisma.reward.create({
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
  } catch (err) {
    console.error('Error creating reward:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/rewards/:id
router.delete('/rewards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.reward.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Reward record not found' });
    }
    await prisma.reward.delete({ where: { id } });
    res.json({ success: true, message: 'Reward record deleted successfully' });
  } catch (err) {
    console.error('Error deleting reward:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});


// ─── Mid-Day Meal (MDM) Routes ─────────────────────────────────────────────

// GET /api/headmaster/mdm/overview — Aggregated stats for overview tab
router.get('/mdm/overview', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });
    const sid = String(schoolId);

    const [records, beneficiaries, stock, quality, menu] = await Promise.all([
      prisma.mdmDailyRecord.findMany({ where: { schoolId: sid }, orderBy: { date: 'desc' } }),
      prisma.mdmBeneficiary.findMany({ where: { schoolId: sid } }),
      prisma.mdmStockItem.findMany({ where: { schoolId: sid } }),
      prisma.mdmQualityReport.findMany({ where: { schoolId: sid } }),
      prisma.mdmMenuDay.findMany({ where: { schoolId: sid } }),
    ]);

    const activeBens = beneficiaries.filter(b => b.status === 'Active').length;
    const monthMeals = records.reduce((a, r) => a + r.mealsServed, 0);
    const avgCoverage = records.length
      ? Math.round(records.reduce((a, r) => a + (r.studentsPresent > 0 ? Math.round((r.mealsServed / r.studentsPresent) * 100) : 0), 0) / records.length)
      : 0;
    const openIssues = quality.filter(q => q.status !== 'Satisfactory').length;
    const avgQuality = quality.length
      ? Math.round((quality.reduce((a, q) => a + (q.tasteRating + q.quantityRating + q.hygieneRating) / 3, 0) / quality.length) * 10) / 10
      : 0;
    const compliantDays = menu.filter(m => m.compliance === 'Compliant').length;
    const markedDays = menu.filter(m => m.compliance !== 'Pending').length;

    res.json({
      success: true, data: {
        activeBens, monthMeals, avgCoverage, openIssues, avgQuality,
        menuCompliance: markedDays ? Math.round((compliantDays / markedDays) * 100) : 0,
        pendingSync: records.filter(r => r.status !== 'Verified').length,
        totalOnRoll: activeBens,
        todayRecord: records[0] || null,
        stockAlerts: stock.filter(s => s.quantity <= s.reorderLevel),
        recentActivity: records.slice(0, 5).map(r => ({
          id: r.id, time: r.date, icon: '🍛',
          text: `Daily meal log posted — ${r.mealsServed} of ${r.studentsPresent} present students served.`,
        })),
      }
    });
  } catch (err) {
    console.error('MDM overview error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/mdm/records
router.get('/mdm/records', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });
    const records = await prisma.mdmDailyRecord.findMany({
      where: { schoolId: String(schoolId) },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/mdm/records
router.post('/mdm/records', async (req: Request, res: Response) => {
  try {
    const { schoolId, date, menuItem, studentsPresent, mealsServed, eggsServed, bananasServed, riceUsedKg, remarks } = req.body;
    if (!schoolId || !date || !menuItem) return res.status(400).json({ success: false, error: 'schoolId, date, menuItem are required' });
    const record = await prisma.mdmDailyRecord.create({
      data: { schoolId, date, menuItem, studentsPresent: Number(studentsPresent) || 0, mealsServed: Number(mealsServed) || 0, eggsServed: Number(eggsServed) || 0, bananasServed: Number(bananasServed) || 0, riceUsedKg: Number(riceUsedKg) || 0, remarks: remarks || '', status: 'Submitted' },
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/headmaster/mdm/records/:id — update status
router.patch('/mdm/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await prisma.mdmDailyRecord.update({ where: { id }, data: req.body });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/mdm/beneficiaries
router.get('/mdm/beneficiaries', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });
    const data = await prisma.mdmBeneficiary.findMany({ where: { schoolId: String(schoolId) }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/mdm/beneficiaries
router.post('/mdm/beneficiaries', async (req: Request, res: Response) => {
  try {
    const { schoolId, name, classSection, emisId, category } = req.body;
    if (!schoolId || !name || !emisId) return res.status(400).json({ success: false, error: 'schoolId, name, emisId are required' });
    const data = await prisma.mdmBeneficiary.create({
      data: { schoolId, name, classSection: classSection || '', emisId, category: category || 'Regular Meal', mealsThisMonth: 0, status: 'Active', lastAvailed: '' },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/headmaster/mdm/beneficiaries/:id
router.patch('/mdm/beneficiaries/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await prisma.mdmBeneficiary.update({ where: { id }, data: req.body });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/mdm/stock
router.get('/mdm/stock', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });
    const data = await prisma.mdmStockItem.findMany({ where: { schoolId: String(schoolId) }, orderBy: { category: 'asc' } });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/mdm/stock
router.post('/mdm/stock', async (req: Request, res: Response) => {
  try {
    const { schoolId, item, category, quantity, unit, dailyUsage, reorderLevel, supplier } = req.body;
    if (!schoolId || !item || !unit) return res.status(400).json({ success: false, error: 'schoolId, item, unit are required' });
    const data = await prisma.mdmStockItem.create({
      data: { schoolId, item, category: category || 'Grains', quantity: Number(quantity) || 0, unit, dailyUsage: Number(dailyUsage) || 0, reorderLevel: Number(reorderLevel) || 0, supplier: supplier || '', lastRefilled: new Date().toISOString().slice(0, 10) },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/headmaster/mdm/stock/:id — refill or update stock
router.patch('/mdm/stock/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await prisma.mdmStockItem.update({ where: { id }, data: req.body });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/mdm/menu
router.get('/mdm/menu', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });
    const data = await prisma.mdmMenuDay.findMany({ where: { schoolId: String(schoolId) }, orderBy: { day: 'asc' } });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/headmaster/mdm/menu/:day — upsert a day's menu
router.put('/mdm/menu/:day', async (req: Request, res: Response) => {
  try {
    const { day } = req.params;
    const { schoolId, menuItem, accompaniment, eggDay, calories, proteinGm, compliance, deviationNote } = req.body;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });

    const existing = await prisma.mdmMenuDay.findFirst({
      where: { schoolId, day },
    });

    let data;
    if (existing) {
      data = await prisma.mdmMenuDay.update({
        where: { id: existing.id },
        data: {
          menuItem: menuItem !== undefined ? menuItem : existing.menuItem,
          accompaniment: accompaniment !== undefined ? accompaniment : existing.accompaniment,
          eggDay: eggDay !== undefined ? eggDay : existing.eggDay,
          calories: calories !== undefined ? Number(calories) : existing.calories,
          proteinGm: proteinGm !== undefined ? Number(proteinGm) : existing.proteinGm,
          compliance: compliance !== undefined ? compliance : existing.compliance,
          deviationNote: deviationNote !== undefined ? deviationNote : existing.deviationNote,
        },
      });
    } else {
      data = await prisma.mdmMenuDay.create({
        data: {
          schoolId,
          day,
          menuItem: menuItem || '',
          accompaniment: accompaniment || '',
          eggDay: eggDay ?? true,
          calories: Number(calories) || 0,
          proteinGm: Number(proteinGm) || 0,
          compliance: compliance || 'Compliant',
          deviationNote: deviationNote || '',
        },
      });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('MDM Menu PUT error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/mdm/quality
router.get('/mdm/quality', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });
    const data = await prisma.mdmQualityReport.findMany({ where: { schoolId: String(schoolId) }, orderBy: { date: 'desc' } });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/headmaster/mdm/quality
router.post('/mdm/quality', async (req: Request, res: Response) => {
  try {
    const { schoolId, date, inspector, role, tasteRating, quantityRating, hygieneRating, issues, actionTaken, status } = req.body;
    if (!schoolId || !inspector || !date) return res.status(400).json({ success: false, error: 'schoolId, date, inspector are required' });
    const data = await prisma.mdmQualityReport.create({
      data: { schoolId, date, inspector, role: role || 'Teacher on Duty', tasteRating: Number(tasteRating) || 3, quantityRating: Number(quantityRating) || 3, hygieneRating: Number(hygieneRating) || 3, issues: issues || 'None.', actionTaken: actionTaken || '—', status: status || 'Satisfactory' },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/mdm/beneficiaries/:id
router.delete('/mdm/beneficiaries/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.mdmBeneficiary.delete({ where: { id } });
    res.json({ success: true, message: 'Beneficiary deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/mdm/records/:id
router.delete('/mdm/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.mdmDailyRecord.delete({ where: { id } });
    res.json({ success: true, message: 'Daily record deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/mdm/stock/:id
router.delete('/mdm/stock/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.mdmStockItem.delete({ where: { id } });
    res.json({ success: true, message: 'Stock item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/headmaster/mdm/quality/:id
router.delete('/mdm/quality/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.mdmQualityReport.delete({ where: { id } });
    res.json({ success: true, message: 'Quality report deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/headmaster/mdm/quality/:id — update status / action taken by BEO or HM
router.patch('/mdm/quality/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, actionTaken } = req.body;
    const updated = await prisma.mdmQualityReport.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(actionTaken ? { actionTaken } : {}),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/headmaster/mdm/block-overview — block-level aggregated reports for BEO & DEO
router.get('/mdm/block-overview', async (req: Request, res: Response) => {
  try {
    const [qualityRaw, deviationsRaw, stockAlertsRaw, schoolsRaw] = await Promise.all([
      prisma.mdmQualityReport.findMany({ orderBy: { date: 'desc' }, take: 50 }),
      prisma.mdmMenuDay.findMany({ where: { compliance: 'Deviation' }, orderBy: { updatedAt: 'desc' } }),
      prisma.mdmStockItem.findMany({ where: { quantity: { lte: 50 } }, orderBy: { quantity: 'asc' } }),
      prisma.school.findMany({ select: { id: true, name: true, dise: true } }),
    ]);

    const schoolMap = new Map(schoolsRaw.map(s => [s.id, { schoolName: s.name, diseCode: s.dise || '50001' }]));

    const quality = qualityRaw.map(q => ({
      ...q,
      schoolName: schoolMap.get(q.schoolId)?.schoolName || 'Holy Cross Higher Secondary School',
      diseCode: schoolMap.get(q.schoolId)?.diseCode || '50001',
    }));

    const deviations = deviationsRaw.map(d => ({
      ...d,
      schoolName: schoolMap.get(d.schoolId)?.schoolName || 'Holy Cross Higher Secondary School',
      diseCode: schoolMap.get(d.schoolId)?.diseCode || '50001',
    }));

    const stockAlerts = stockAlertsRaw.map(s => ({
      ...s,
      schoolName: schoolMap.get(s.schoolId)?.schoolName || 'Holy Cross Higher Secondary School',
      diseCode: schoolMap.get(s.schoolId)?.diseCode || '50001',
    }));

    const schools = schoolsRaw.map(s => ({ id: s.id, name: s.name, diseCode: s.dise }));

    res.json({ success: true, data: { quality, deviations, stockAlerts, schools } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── SCHEME ALLOCATIONS & BENEFICIARIES ──────────────────────────────────────
const SCHEME_ALLOCATIONS_FILE = path.join(__dirname, '../../data/scheme_allocations.json');

function getSchemeAllocationsData() {
  try {
    if (fs.existsSync(SCHEME_ALLOCATIONS_FILE)) {
      const content = fs.readFileSync(SCHEME_ALLOCATIONS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error reading scheme_allocations.json:', e);
  }
  return { allocations: {}, beneficiaries: [] };
}

function saveSchemeAllocationsData(data: any) {
  try {
    const dir = path.dirname(SCHEME_ALLOCATIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SCHEME_ALLOCATIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing scheme_allocations.json:', e);
  }
}

router.get('/schemes/allocations', (_req: Request, res: Response) => {
  const data = getSchemeAllocationsData();
  res.json({ success: true, data });
});

router.post('/schemes/allocations', (req: Request, res: Response) => {
  const { allocations, beneficiaries } = req.body;
  const current = getSchemeAllocationsData();
  const updated = {
    allocations: allocations !== undefined ? allocations : current.allocations,
    beneficiaries: beneficiaries !== undefined ? beneficiaries : current.beneficiaries,
    updatedAt: new Date().toISOString()
  };
  saveSchemeAllocationsData(updated);
  res.json({ success: true, data: updated });
});

export default router;
