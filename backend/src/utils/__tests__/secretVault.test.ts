import crypto from 'crypto';
import { encryptSecret, decryptSecret, maskSecret, isMaskedValue, maskStoredSecret } from '../secretVault';

describe('secretVault', () => {
  beforeAll(() => {
    process.env.CONFIG_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  });

  it('round-trips a secret', () => {
    const plain = 'AKIAIOSFODNN7EXAMPLE';
    const blob = encryptSecret(plain);
    expect(blob.startsWith('v1:')).toBe(true);
    expect(blob).not.toContain(plain);
    expect(decryptSecret(blob)).toBe(plain);
  });

  it('produces unique blobs per call (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('rejects tampered blobs', () => {
    const blob = encryptSecret('secret-value');
    const parts = blob.split(':');
    parts[3] = Buffer.from('tampered-ciphertext').toString('base64');
    expect(() => decryptSecret(parts.join(':'))).toThrow();
  });

  it('masks with first/last 4 and detects masked values', () => {
    const masked = maskSecret('AKIAIOSFODNN7EXAMPLE');
    expect(masked.startsWith('AKIA')).toBe(true);
    expect(masked.endsWith('MPLE')).toBe(true);
    expect(isMaskedValue(masked)).toBe(true);
    expect(isMaskedValue('AKIAIOSFODNN7EXAMPLE')).toBe(false);
    expect(maskSecret('short')).toBe('••••••••');
  });

  it('maskStoredSecret never throws on garbage', () => {
    expect(maskStoredSecret('not-a-blob')).toBe('••••••••');
    expect(maskStoredSecret('')).toBe('');
    expect(maskStoredSecret(encryptSecret('sk-abcdef1234567890'))).toContain('sk-a');
  });

  it('throws a clear error when key is missing', () => {
    const saved = process.env.CONFIG_ENCRYPTION_KEY;
    delete process.env.CONFIG_ENCRYPTION_KEY;
    expect(() => encryptSecret('x')).toThrow(/CONFIG_ENCRYPTION_KEY/);
    process.env.CONFIG_ENCRYPTION_KEY = saved;
  });
});
