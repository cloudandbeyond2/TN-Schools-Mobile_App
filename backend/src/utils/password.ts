import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return Promise.resolve(false);
  if (!isBcryptHash(stored)) {
    return Promise.resolve(plain === stored);
  }
  return bcrypt.compare(plain, stored);
}

export function isBcryptHash(value: string | null | undefined): boolean {
  return /^\$2[aby]?\$/.test(value ?? '');
}
