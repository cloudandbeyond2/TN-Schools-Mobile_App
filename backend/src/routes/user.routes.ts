import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAuthToken } from '../utils/jwt';
import { requireMinRole, authenticate } from '../middleware/auth.middleware';

const router = Router();

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
} as const;

// GET /api/users/me - Verify current session & return user profile
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: req.user,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/users/count - Get total user count
router.get('/count', requireMinRole('HEADMASTER'), async (req: Request, res: Response) => {
  try {
    const count = await prisma.user.count();
    const activeSchools = await prisma.school.count();
    const syllabusItems = await prisma.studyMaterial.count();
    
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });

    const rolesMap: Record<string, number> = {};
    roleCounts.forEach(r => {
      rolesMap[r.role] = r._count.role;
    });

    const formatLakhs = (num: number) => {
       if (num >= 100000) return (num / 100000).toFixed(1) + "L";
       if (num >= 1000) return (num / 1000).toFixed(1) + "K";
       return num.toString();
    };

    res.json({ 
      success: true, 
      count,
      activeSchools,
      syllabusItems,
      rolesFormatted: {
        students: formatLakhs(rolesMap['STUDENT'] || 0),
        teachers: formatLakhs(rolesMap['TEACHER'] || 0),
        parents: formatLakhs(rolesMap['PARENT'] || 0),
        headmasters: formatLakhs(rolesMap['HEADMASTER'] || 0),
        beos: formatLakhs(rolesMap['BEO'] || 0),
        deos: formatLakhs(rolesMap['DEO'] || 0),
        commissioners: formatLakhs(rolesMap['COMMISSIONER'] || 0),
        ministers: formatLakhs(rolesMap['MINISTER'] || 0),
        superAdmins: formatLakhs(rolesMap['SUPERADMIN'] || 0)
      }
    });
  } catch (err) {
    console.error('Error fetching user count:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/users - List users by role
router.get('/', requireMinRole('HEADMASTER'), async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    if (role && !Object.values(Role).includes(role as Role)) {
      return res.status(400).json({ success: false, error: 'Invalid role parameter' });
    }
    const filter = role ? { role: role as Role } : {};
    const users = await prisma.user.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      select: SAFE_USER_SELECT,
    });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/users - Create a new user
router.post('/', requireMinRole('BEO'), async (req: Request, res: Response) => {
  try {
    const { name, email, mobile, role, password, schoolId, district, block, emisId } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, role, and password are required' });
    }

    if (!Object.values(Role).includes(role as Role)) {
      return res.status(400).json({ success: false, error: 'Invalid role value' });
    }

    // Only a superadmin can create another superadmin
    if (role === 'SUPERADMIN' && req.user?.role !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, error: 'Only a superadmin can create superadmin accounts' });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    // Check if mobile already exists
    if (mobile) {
      const existingMobile = await prisma.user.findUnique({ where: { mobile } });
      if (existingMobile) {
        return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
      }
    }

    // Create user in PostgreSQL database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        mobile: mobile || null,
        role: role as Role,
        passwordHash: await hashPassword(password),
        schoolId: schoolId || null,
        district: district || null,
        block: block || null,
        emisId: emisId || null,
      },
      select: SAFE_USER_SELECT,
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/users/:id - Update a user
router.put('/:id', requireMinRole('BEO'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, password, schoolId, district, block, assignedRegion, isActive, emisId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Only a superadmin can modify a superadmin account
    if (existingUser.role === 'SUPERADMIN' && req.user?.role !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, error: 'Only a superadmin can modify superadmin accounts' });
    }

    // Check email uniqueness if email is changed
    if (email && email !== existingUser.email) {
      const emailDuplicate = await prisma.user.findUnique({ where: { email } });
      if (emailDuplicate) {
        return res.status(400).json({ success: false, error: 'User with this email already exists' });
      }
    }

    // Check mobile uniqueness if mobile is changed
    if (mobile && mobile !== existingUser.mobile) {
      const mobileDuplicate = await prisma.user.findUnique({ where: { mobile } });
      if (mobileDuplicate) {
        return res.status(400).json({ success: false, error: 'User with this mobile number already exists' });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
        mobile: mobile !== undefined ? (mobile || null) : undefined,
        passwordHash: (password !== undefined && password !== '') ? await hashPassword(password) : undefined,
        schoolId: schoolId !== undefined ? (schoolId || null) : undefined,
        district: district !== undefined ? (district || null) : undefined,
        block: block !== undefined ? (block || null) : undefined,
        assignedRegion: assignedRegion !== undefined ? (assignedRegion || null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        emisId: emisId !== undefined ? (emisId || null) : undefined,
      },
      select: SAFE_USER_SELECT,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/users/:id - Delete a user and all dependent records
router.delete('/:id', requireMinRole('BEO'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Only a superadmin can delete a superadmin account
    if (existingUser.role === 'SUPERADMIN' && req.user?.role !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, error: 'Only a superadmin can delete superadmin accounts' });
    }

    // If the user is a STUDENT, clean up all student-linked records first
    const student = await prisma.student.findUnique({ where: { userId: id } });
    if (student) {
      await prisma.parentStudentLink.deleteMany({ where: { studentId: student.id } });
      await prisma.notification.updateMany({ where: { studentId: student.id }, data: { studentId: null } });
      await prisma.homeworkSubmission.updateMany({ where: { studentId: student.id }, data: { studentId: null } });
      await prisma.watchlistStudent.updateMany({ where: { studentId: student.id }, data: { studentId: null } });
      await prisma.clubMember.deleteMany({ where: { studentId: student.id } });
      await prisma.scholarship.deleteMany({ where: { studentId: student.id } });
      await prisma.mark.deleteMany({ where: { studentId: student.id } });
      await prisma.attendance.deleteMany({ where: { studentId: student.id } });
      await prisma.studentBadge.deleteMany({ where: { studentId: student.id } });
      // Student itself will CASCADE delete when User is deleted
    }

    // If the user is a TEACHER, Notification CASCADE handles it via schema
    // User delete will CASCADE to Student and Teacher via onDelete: Cascade
    await prisma.user.delete({ where: { id } });

    res.json({ success: true, message: 'User and all associated records deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Staff whose subject is Physical Education log into the dedicated PET portal
// (the DB Role enum has no PET value — the role is derived from the subject).
const isPetSubject = (subject?: string | null): boolean => {
  const s = (subject || '').trim().toLowerCase();
  return s === 'pet' || s === 'p.e.t' || s === 'p.e.t.' || s.includes('physical educ') || s.includes('physical train');
};

// POST /api/users/auth - Authenticate user (for NextAuth)
router.post('/auth', async (req: Request, res: Response) => {
  try {
    const { loginType, email, password, rollNumber, phone } = req.body;

    const withSchoolInfo = async (userData: any) => {
      if (userData.schoolId) {
        const school = await prisma.school.findUnique({
          where: { id: userData.schoolId },
          select: { name: true, dise: true }
        });
        if (school) {
          userData.schoolName = school.name;
          userData.schoolDise = school.dise;
        }
      }
      return userData;
    };

    if (loginType === 'student') {
      const inputRoll = rollNumber || email;
      const inputPhone = phone || password;

      if (!inputRoll || !inputPhone) {
        return res.status(400).json({ success: false, error: 'Roll number and phone number are required for student login.' });
      }

      const cleanRoll = String(inputRoll).trim();
      const cleanPhone = String(inputPhone).trim();

      // Query student by rollNumber (case-insensitive)
      const student = await prisma.student.findFirst({
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
      const userMobile    = student.user.mobile       ? String(student.user.mobile).trim()       : null;
      const parentMobile  = student.parentMobile      ? String(student.parentMobile).trim()      : null;

      const matchesPhone =
        await verifyPassword(cleanPhone, student.user.passwordHash) ||
        userMobile   === cleanPhone ||
        parentMobile === cleanPhone;

      if (!matchesPhone) {
        return res.status(400).json({ success: false, error: 'Incorrect phone number.' });
      }

return res.json({
  success: true,
  data: await withSchoolInfo({
    id: student.user.id,
    name: student.user.name,
    email: student.user.email || `${student.rollNumber}@tn.gov.in`,
    role: "STUDENT",

    // IMPORTANT
    schoolId: student.schoolId,
    class: student.class,
    section: student.section,
    studentId: student.id,           // Student record ID (for leave, homework, etc.)
    rollNumber: student.rollNumber,  // Roll number for display
    token: signAuthToken({
      id: student.user.id,
      role: 'STUDENT',
      schoolId: student.schoolId,
      studentId: student.id,
      name: student.user.name,
    }),
  }),
});
    } else {
      // Staff / Parent login by Email and Password
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      const cleanEmail = String(email).trim().toLowerCase();

      // ── Step 1: Check PostgreSQL User table (primary source) ──
      const pgUser = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } }
      });

    if (pgUser) {
      let isPasswordValid = await verifyPassword(password, pgUser.passwordHash);

      // Fallback check for TEACHER role password in headmasterStaff
      if (!isPasswordValid && pgUser.role === "TEACHER") {
        const teacher = await prisma.headmasterStaff.findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" } },
        });
        if (teacher && await verifyPassword(password, teacher.password)) {
          isPasswordValid = true;
          // Synchronize password to PostgreSQL User table for future logins
          // (always store a bcrypt hash — never copy a possibly-plaintext value)
          await prisma.user.update({
            where: { id: pgUser.id },
            data: { passwordHash: await hashPassword(password) }
          });
        }
      }

      // Fallback check for PARENT role password (must match Phone Number or stored hash)
      if (!isPasswordValid && pgUser.role === "PARENT") {
        const parentMobile = String(pgUser.mobile || "").trim();
        if (password === parentMobile && parentMobile !== "") {
          isPasswordValid = true;
        } else {
          const parent = await prisma.headmasterParent.findFirst({
            where: {
              OR: [
                { email: { equals: cleanEmail, mode: "insensitive" } },
                { phone: cleanEmail }
              ]
            },
          });
          if (parent && (password === parent.phone || await verifyPassword(password, parent.password))) {
            isPasswordValid = true;
            await prisma.user.update({
              where: { id: pgUser.id },
              data: { passwordHash: await hashPassword(password) }
            });
          }
        }
      }

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          error: "Invalid password."
        });
      }

    if (pgUser.role === "TEACHER") {
        const teacher = await prisma.headmasterStaff.findFirst({
            where: {
                email: {
                    equals: cleanEmail,
                    mode: "insensitive",
                },
            },
        });

        let isClassTeacher = false;
        let assignedClass = "";
        let assignedSection = "";
        if (teacher?.address) {
            try {
                const meta = JSON.parse(teacher.address);
                isClassTeacher = !!meta.isClassTeacher || meta.workAllocation === "Class Teacher";
                assignedClass = meta.assignedClass || "";
                assignedSection = meta.assignedSection || "";
            } catch (e) {}
        }

        const teacherSubject = teacher?.subject ?? "General";
        const teacherRole = isPetSubject(teacherSubject) ? "PET" : "TEACHER";
        const teacherId = teacher?.id ?? pgUser.id;
        const teacherSchoolId = teacher?.schoolId ?? pgUser.schoolId;
        return res.json({
            success: true,
            data: await withSchoolInfo({
                id: teacherId,
                name: teacher?.name ?? pgUser.name,
                email: pgUser.email,
                role: teacherRole,
                schoolId: teacherSchoolId,
                subject: teacherSubject,
                isClassTeacher,
                assignedClass,
                assignedSection,
                class: assignedClass,
                token: signAuthToken({
                    id: teacherId,
                    role: teacherRole,
                    schoolId: teacherSchoolId,
                    name: teacher?.name ?? pgUser.name,
                }),
            }),
        });
    }

    return res.json({
        success: true,
        data: await withSchoolInfo({
            id: pgUser.id,
            name: pgUser.name,
            email: pgUser.email,
            role: pgUser.role,
            schoolId: pgUser.schoolId,
            // Governance scope fields (for BEO/DEO/Commissioner/Minister/SuperAdmin)
            district: (pgUser as any).district || null,
            block: (pgUser as any).block || null,
            assignedRegion: (pgUser as any).assignedRegion || null,
            token: signAuthToken({
                id: pgUser.id,
                role: pgUser.role,
                schoolId: pgUser.schoolId,
                name: pgUser.name,
            }),
        }),
    });
}
      // ── Step 2: Check headmasterStaff (MongoDB via Prisma) ──
      const staffMember = await prisma.headmasterStaff.findFirst({
        where: { email: cleanEmail }
      });

      if (staffMember) {
        if (!(await verifyPassword(password, staffMember.password))) {
          return res.status(400).json({ success: false, error: 'Invalid password.' });
        }
        let isClassTeacher = false;
        let assignedClass = "";
        let assignedSection = "";
        if (staffMember?.address) {
          try {
            const meta = JSON.parse(staffMember.address);
            isClassTeacher = !!meta.isClassTeacher || meta.workAllocation === "Class Teacher";
            assignedClass = meta.assignedClass || "";
            assignedSection = meta.assignedSection || "";
          } catch (e) {}
        }
        const staffRole = isPetSubject(staffMember.subject) ? 'PET' : 'TEACHER';
        return res.json({
          success: true,
          data: await withSchoolInfo({
            id: String(staffMember.id),
            name: staffMember.name,
            email: staffMember.email || cleanEmail,
            role: staffRole,
            schoolId: staffMember.schoolId || null,
            subject: staffMember.subject || 'General',
            isClassTeacher,
            assignedClass,
            assignedSection,
            class: assignedClass,
            token: signAuthToken({
              id: String(staffMember.id),
              role: staffRole,
              schoolId: staffMember.schoolId || null,
              name: staffMember.name,
            }),
          })
        });
      }

      // ── Step 3: Check headmasterParent records ──
      const parentMember = await prisma.headmasterParent.findFirst({
        where: {
          OR: [
            { email: { equals: cleanEmail, mode: 'insensitive' } },
            { phone: cleanEmail }
          ]
        }
      });

      if (parentMember) {
        const parentPassOk =
          (password === parentMember.phone && parentMember.phone !== "") ||
          await verifyPassword(password, parentMember.password);

        if (!parentPassOk) {
          return res.status(400).json({ success: false, error: 'Invalid password.' });
        }
        return res.json({
          success: true,
          data: await withSchoolInfo({
            id: String(parentMember.id),
            name: parentMember.name,
            email: parentMember.email || cleanEmail,
            role: 'PARENT',
            schoolId: parentMember.schoolId || null,
            token: signAuthToken({
              id: String(parentMember.id),
              role: 'PARENT',
              schoolId: parentMember.schoolId || null,
              name: parentMember.name,
            }),
          })
        });
      }

      // ── Step 4: Fallback check Student parent info (from Parent Directory) ──
      const studentMatch = await prisma.student.findFirst({
        where: {
          OR: [
            { parentEmail: { equals: cleanEmail, mode: 'insensitive' } },
            { parentMobile: cleanEmail },
            { phoneNumber: cleanEmail }
          ]
        },
        include: { user: true }
      });

      if (studentMatch) {
        const parentPhone = String(studentMatch.parentMobile || studentMatch.phoneNumber || "").trim();
        const parentPassOk =
          (password === parentPhone && parentPhone !== "") ||
          (studentMatch.user?.passwordHash ? await verifyPassword(password, studentMatch.user.passwordHash) : false);

        if (!parentPassOk) {
          return res.status(400).json({ success: false, error: 'Invalid password.' });
        }

        const parentName = studentMatch.parentName || studentMatch.fatherName || studentMatch.motherName || `${studentMatch.user?.name || "Student"}'s Parent`;
        const parentEmail = studentMatch.parentEmail || cleanEmail;

        let pUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: parentEmail, mode: 'insensitive' } },
              { mobile: parentPhone }
            ]
          }
        });

        if (!pUser) {
          try {
            pUser = await prisma.user.create({
              data: {
                name: parentName,
                email: parentEmail.includes('@') ? parentEmail : `parent_${Date.now()}@tn.gov.in`,
                mobile: parentPhone || cleanEmail,
                role: "PARENT",
                passwordHash: await hashPassword(password),
                schoolId: studentMatch.schoolId
              }
            });
          } catch (e) {
            console.error("Auto-provision parent user failed:", e);
          }
        }

        const pUserId = pUser?.id || studentMatch.id;
        const pSchoolId = pUser?.schoolId || studentMatch.schoolId;

        return res.json({
          success: true,
          data: await withSchoolInfo({
            id: pUserId,
            name: parentName,
            email: parentEmail,
            role: 'PARENT',
            schoolId: pSchoolId,
            token: signAuthToken({
              id: pUserId,
              role: 'PARENT',
              schoolId: pSchoolId,
              name: parentName,
            }),
          })
        });
      }

      // ── Not found in any source ──
      return res.status(400).json({ success: false, error: 'User not found.' });
    }
  } catch (err: any) {
    console.error('Authentication error:', err);
    res.status(500).json({ success: false, error: String(err?.message || err) });
  }
});

export default router;

