import crypto from 'crypto';

// Encrypted blob format: "v1:<ivB64>:<tagB64>:<ctB64>"
const BLOB_PREFIX = 'v1';
const MASK_CHAR = '•'; // bullet

function getVaultKey(): Buffer {
  const hex = process.env.CONFIG_ENCRYPTION_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'CONFIG_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptSecret(plain: string): string {
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [BLOB_PREFIX, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

export function decryptSecret(blob: string): string {
  const parts = blob.split(':');
  if (parts.length !== 4 || parts[0] !== BLOB_PREFIX) {
    throw new Error('Invalid secret blob format');
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const key = getVaultKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

/** First 4 + bullets + last 4; short values become all bullets. */
export function maskSecret(plain: string): string {
  if (!plain) return '';
  if (plain.length < 8) return MASK_CHAR.repeat(8);
  return plain.slice(0, 4) + MASK_CHAR.repeat(8) + plain.slice(-4);
}

/** True when the value is a masked placeholder (i.e. the user did not change the secret). */
export function isMaskedValue(value: unknown): boolean {
  return typeof value === 'string' && value.includes(MASK_CHAR);
}

/** Decrypt-then-mask helper for GET responses; never throws on corrupt blobs. */
export function maskStoredSecret(blob: string | undefined | null): string {
  if (!blob) return '';
  try {
    return maskSecret(decryptSecret(blob));
  } catch {
    return MASK_CHAR.repeat(8);
  }
}
