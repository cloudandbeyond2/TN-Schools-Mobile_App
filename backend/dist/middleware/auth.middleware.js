"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_HIERARCHY = void 0;
exports.hasPermission = hasPermission;
exports.getAuthUser = getAuthUser;
exports.authenticate = authenticate;
exports.requireRole = requireRole;
exports.requireMinRole = requireMinRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../utils/jwt");
// Hierarchy order — higher index = broader access.
// PET (physical-education teacher, derived at login) sits at the TEACHER tier.
exports.ROLE_HIERARCHY = [
    'STUDENT', 'PARENT', 'PET', 'TEACHER', 'HEADMASTER',
    'BEO', 'DEO', 'COMMISSIONER', 'MINISTER', 'SUPERADMIN',
];
// PET counts as TEACHER for hierarchy comparisons.
const effectiveRole = (role) => (role === 'PET' ? 'TEACHER' : role);
function hasPermission(userRole, requiredRole) {
    if (userRole === 'SUPERADMIN')
        return true;
    const userIdx = exports.ROLE_HIERARCHY.indexOf(effectiveRole(userRole));
    const reqIdx = exports.ROLE_HIERARCHY.indexOf(effectiveRole(requiredRole));
    if (userIdx === -1 || reqIdx === -1)
        return false;
    return userIdx >= reqIdx;
}
// Non-failing variant for public routes that merely vary behavior by role
// (e.g. staff can see drafts). Returns null when no valid token is present.
function getAuthUser(req) {
    return verifyRequest(req);
}
function verifyRequest(req) {
    var _a, _b;
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
        return null;
    try {
        const payload = jsonwebtoken_1.default.verify(header.slice(7), (0, jwt_1.getJwtSecret)());
        if (!payload.sub || !payload.role)
            return null;
        return {
            id: payload.sub,
            role: payload.role,
            schoolId: (_a = payload.schoolId) !== null && _a !== void 0 ? _a : null,
            studentId: (_b = payload.studentId) !== null && _b !== void 0 ? _b : null,
            name: payload.name,
        };
    }
    catch (_c) {
        return null;
    }
}
// Requires a valid token from any logged-in user.
function authenticate(req, res, next) {
    const user = verifyRequest(req);
    if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    req.user = user;
    return next();
}
function requireRole(allowedRoles) {
    return (req, res, next) => {
        const user = verifyRequest(req);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Authentication required.' });
        }
        req.user = user;
        if (user.role === 'SUPERADMIN' || allowedRoles.includes(user.role))
            return next();
        return res.status(403).json({
            success: false,
            error: "Access denied. Role '" + user.role + "' is not allowed for this resource.",
        });
    };
}
function requireMinRole(minRole) {
    return (req, res, next) => {
        const user = verifyRequest(req);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Authentication required.' });
        }
        req.user = user;
        if (hasPermission(user.role, minRole))
            return next();
        return res.status(403).json({
            success: false,
            error: 'Access denied. Minimum required role: ' + minRole,
        });
    };
}
