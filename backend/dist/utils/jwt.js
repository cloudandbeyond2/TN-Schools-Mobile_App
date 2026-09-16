"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtSecret = getJwtSecret;
exports.signAuthToken = signAuthToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Signed at login and verified by auth.middleware on every protected request.
// Lifetime matches the NextAuth session default (30 days) so a live frontend
// session never outlives its backend token.
const TOKEN_TTL = '30d';
function getJwtSecret() {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'tn-schools-secret-key-2026';
    return secret;
}
function signAuthToken(user) {
    var _a, _b, _c;
    const payload = {
        sub: String(user.id),
        role: user.role,
        schoolId: (_a = user.schoolId) !== null && _a !== void 0 ? _a : null,
        studentId: (_b = user.studentId) !== null && _b !== void 0 ? _b : null,
        name: (_c = user.name) !== null && _c !== void 0 ? _c : undefined,
    };
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });
}
