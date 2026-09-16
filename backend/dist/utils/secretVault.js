"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.maskSecret = maskSecret;
exports.isMaskedValue = isMaskedValue;
exports.maskStoredSecret = maskStoredSecret;
const crypto_1 = __importDefault(require("crypto"));
// Encrypted blob format: "v1:<ivB64>:<tagB64>:<ctB64>"
const BLOB_PREFIX = 'v1';
const MASK_CHAR = '•'; // bullet
function getVaultKey() {
    const hex = process.env.CONFIG_ENCRYPTION_KEY || '';
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error('CONFIG_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    return Buffer.from(hex, 'hex');
}
function encryptSecret(plain) {
    const key = getVaultKey();
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [BLOB_PREFIX, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}
function decryptSecret(blob) {
    const parts = blob.split(':');
    if (parts.length !== 4 || parts[0] !== BLOB_PREFIX) {
        throw new Error('Invalid secret blob format');
    }
    const [, ivB64, tagB64, ctB64] = parts;
    const key = getVaultKey();
    const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}
/** First 4 + bullets + last 4; short values become all bullets. */
function maskSecret(plain) {
    if (!plain)
        return '';
    if (plain.length < 8)
        return MASK_CHAR.repeat(8);
    return plain.slice(0, 4) + MASK_CHAR.repeat(8) + plain.slice(-4);
}
/** True when the value is a masked placeholder (i.e. the user did not change the secret). */
function isMaskedValue(value) {
    return typeof value === 'string' && value.includes(MASK_CHAR);
}
/** Decrypt-then-mask helper for GET responses; never throws on corrupt blobs. */
function maskStoredSecret(blob) {
    if (!blob)
        return '';
    try {
        return maskSecret(decryptSecret(blob));
    }
    catch (_a) {
        return MASK_CHAR.repeat(8);
    }
}
