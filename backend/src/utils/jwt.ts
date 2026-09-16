import jwt from 'jsonwebtoken';
import type { AppRole } from '../middleware/auth.middleware';

// Signed at login and verified by auth.middleware on every protected request.
// Lifetime matches the NextAuth session default (30 days) so a live frontend
// session never outlives its backend token.
const TOKEN_TTL = '30d';

export interface AuthTokenPayload {
  sub: string;
  role: AppRole;
  schoolId?: string | null;
  studentId?: string | null;
  name?: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'tn-schools-secret-key-2026';
  return secret;
}

export function signAuthToken(user: {
  id: string;
  role: string;
  schoolId?: string | null;
  studentId?: string | null;
  name?: string | null;
}): string {
  const payload: AuthTokenPayload = {
    sub: String(user.id),
    role: user.role as AppRole,
    schoolId: user.schoolId ?? null,
    studentId: user.studentId ?? null,
    name: user.name ?? undefined,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });
}
