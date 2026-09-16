import { prisma } from './prisma';
import { hashPassword } from '../utils/password';

export async function resolveUserId(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    // 1. Check if the userId matches a User directly
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (userExists) {
      return userId;
    }

    // Helper to ensure a PostgreSQL User exists for a given email, name, role, schoolId
    const ensureUser = async (email: string | null, name: string, role: any, schoolId: string | null) => {
      if (!email) return null;
      // Look up by email
      const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true }
      });
      if (existing) {
        return existing.id;
      }
      // Create User on the fly
      try {
        const created = await prisma.user.create({
          data: {
            name,
            email,
            role,
            schoolId,
            passwordHash: await hashPassword('123456'), // default
          },
          select: { id: true }
        });
        return created.id;
      } catch (e) {
        console.error('[resolveUserId] Error auto-creating user:', e);
        return null;
      }
    };

    // 2. If not, check if the userId belongs to HeadmasterStaff
    const staff = await prisma.headmasterStaff.findUnique({
      where: { id: userId }
    });

    if (staff) {
      const resolvedId = await ensureUser(staff.email, staff.name, 'TEACHER', staff.schoolId);
      // Persist the userId back to HeadmasterStaff for future lookups (avoids repeated User creation)
      if (resolvedId && !staff.userId) {
        try {
          await prisma.headmasterStaff.update({
            where: { id: staff.id },
            data: { userId: resolvedId }
          });
        } catch (e) {
          // Ignore unique constraint errors (another request may have set it already)
          console.warn('[resolveUserId] Could not persist userId to HeadmasterStaff:', e);
        }
      }
      return resolvedId;
    }

    // 3. Check if it belongs to HeadmasterParent
    const parent = await prisma.headmasterParent.findUnique({
      where: { id: userId }
    });

    if (parent) {
      const resolvedId = await ensureUser(parent.email, parent.name, 'PARENT', parent.schoolId);
      // Persist the userId back to HeadmasterParent for future lookups
      if (resolvedId && !parent.userId) {
        try {
          await prisma.headmasterParent.update({
            where: { id: parent.id },
            data: { userId: resolvedId }
          });
        } catch (e) {
          console.warn('[resolveUserId] Could not persist userId to HeadmasterParent:', e);
        }
      }
      return resolvedId;
    }

    // 4. Check if it belongs to HeadmasterTempStaff
    const tempStaff = await prisma.headmasterTempStaff.findUnique({
      where: { id: userId }
    });

    if (tempStaff) {
      return await ensureUser(tempStaff.email, tempStaff.name, 'TEACHER', tempStaff.schoolId);
    }
  } catch (err) {
    console.error('[resolveUserId] Error resolving userId:', err);
  }

  return null;
}
