"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUserId = resolveUserId;
const prisma_1 = require("./prisma");
const password_1 = require("../utils/password");
function resolveUserId(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!userId)
            return null;
        try {
            // 1. Check if the userId matches a User directly
            const userExists = yield prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });
            if (userExists) {
                return userId;
            }
            // Helper to ensure a PostgreSQL User exists for a given email, name, role, schoolId
            const ensureUser = (email, name, role, schoolId) => __awaiter(this, void 0, void 0, function* () {
                if (!email)
                    return null;
                // Look up by email
                const existing = yield prisma_1.prisma.user.findFirst({
                    where: { email: { equals: email, mode: 'insensitive' } },
                    select: { id: true }
                });
                if (existing) {
                    return existing.id;
                }
                // Create User on the fly
                try {
                    const created = yield prisma_1.prisma.user.create({
                        data: {
                            name,
                            email,
                            role,
                            schoolId,
                            passwordHash: yield (0, password_1.hashPassword)('123456'), // default
                        },
                        select: { id: true }
                    });
                    return created.id;
                }
                catch (e) {
                    console.error('[resolveUserId] Error auto-creating user:', e);
                    return null;
                }
            });
            // 2. If not, check if the userId belongs to HeadmasterStaff
            const staff = yield prisma_1.prisma.headmasterStaff.findUnique({
                where: { id: userId }
            });
            if (staff) {
                const resolvedId = yield ensureUser(staff.email, staff.name, 'TEACHER', staff.schoolId);
                // Persist the userId back to HeadmasterStaff for future lookups (avoids repeated User creation)
                if (resolvedId && !staff.userId) {
                    try {
                        yield prisma_1.prisma.headmasterStaff.update({
                            where: { id: staff.id },
                            data: { userId: resolvedId }
                        });
                    }
                    catch (e) {
                        // Ignore unique constraint errors (another request may have set it already)
                        console.warn('[resolveUserId] Could not persist userId to HeadmasterStaff:', e);
                    }
                }
                return resolvedId;
            }
            // 3. Check if it belongs to HeadmasterParent
            const parent = yield prisma_1.prisma.headmasterParent.findUnique({
                where: { id: userId }
            });
            if (parent) {
                const resolvedId = yield ensureUser(parent.email, parent.name, 'PARENT', parent.schoolId);
                // Persist the userId back to HeadmasterParent for future lookups
                if (resolvedId && !parent.userId) {
                    try {
                        yield prisma_1.prisma.headmasterParent.update({
                            where: { id: parent.id },
                            data: { userId: resolvedId }
                        });
                    }
                    catch (e) {
                        console.warn('[resolveUserId] Could not persist userId to HeadmasterParent:', e);
                    }
                }
                return resolvedId;
            }
            // 4. Check if it belongs to HeadmasterTempStaff
            const tempStaff = yield prisma_1.prisma.headmasterTempStaff.findUnique({
                where: { id: userId }
            });
            if (tempStaff) {
                return yield ensureUser(tempStaff.email, tempStaff.name, 'TEACHER', tempStaff.schoolId);
            }
        }
        catch (err) {
            console.error('[resolveUserId] Error resolving userId:', err);
        }
        return null;
    });
}
