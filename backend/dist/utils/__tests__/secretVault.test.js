"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const secretVault_1 = require("../secretVault");
describe('secretVault', () => {
    beforeAll(() => {
        process.env.CONFIG_ENCRYPTION_KEY = crypto_1.default.randomBytes(32).toString('hex');
    });
    it('round-trips a secret', () => {
        const plain = 'AKIAIOSFODNN7EXAMPLE';
        const blob = (0, secretVault_1.encryptSecret)(plain);
        expect(blob.startsWith('v1:')).toBe(true);
        expect(blob).not.toContain(plain);
        expect((0, secretVault_1.decryptSecret)(blob)).toBe(plain);
    });
    it('produces unique blobs per call (random IV)', () => {
        expect((0, secretVault_1.encryptSecret)('same')).not.toBe((0, secretVault_1.encryptSecret)('same'));
    });
    it('rejects tampered blobs', () => {
        const blob = (0, secretVault_1.encryptSecret)('secret-value');
        const parts = blob.split(':');
        parts[3] = Buffer.from('tampered-ciphertext').toString('base64');
        expect(() => (0, secretVault_1.decryptSecret)(parts.join(':'))).toThrow();
    });
    it('masks with first/last 4 and detects masked values', () => {
        const masked = (0, secretVault_1.maskSecret)('AKIAIOSFODNN7EXAMPLE');
        expect(masked.startsWith('AKIA')).toBe(true);
        expect(masked.endsWith('MPLE')).toBe(true);
        expect((0, secretVault_1.isMaskedValue)(masked)).toBe(true);
        expect((0, secretVault_1.isMaskedValue)('AKIAIOSFODNN7EXAMPLE')).toBe(false);
        expect((0, secretVault_1.maskSecret)('short')).toBe('••••••••');
    });
    it('maskStoredSecret never throws on garbage', () => {
        expect((0, secretVault_1.maskStoredSecret)('not-a-blob')).toBe('••••••••');
        expect((0, secretVault_1.maskStoredSecret)('')).toBe('');
        expect((0, secretVault_1.maskStoredSecret)((0, secretVault_1.encryptSecret)('sk-abcdef1234567890'))).toContain('sk-a');
    });
    it('throws a clear error when key is missing', () => {
        const saved = process.env.CONFIG_ENCRYPTION_KEY;
        delete process.env.CONFIG_ENCRYPTION_KEY;
        expect(() => (0, secretVault_1.encryptSecret)('x')).toThrow(/CONFIG_ENCRYPTION_KEY/);
        process.env.CONFIG_ENCRYPTION_KEY = saved;
    });
});
