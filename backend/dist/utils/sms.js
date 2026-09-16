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
exports.sendMockSMS = sendMockSMS;
exports.getStudentParents = getStudentParents;
const prisma_1 = require("../config/prisma");
function sendMockSMS(to, message) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`\n======================================================`);
        console.log(`📱 [SMS GATEWAY DISPATCH]`);
        console.log(`Recipient Mobile : ${to}`);
        console.log(`Message Content  : "${message}"`);
        console.log(`Timestamp        : ${new Date().toLocaleString()}`);
        console.log(`Status           : SUCCESS (Simulated)`);
        console.log(`======================================================\n`);
        return true;
    });
}
// Helper to resolve parent details for a given student ID
function getStudentParents(studentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const parentsList = [];
        try {
            // 1. Resolve via ParentStudentLink
            const links = yield prisma_1.prisma.parentStudentLink.findMany({
                where: { studentId },
                include: { parent: true },
            });
            for (const link of links) {
                if (link.parent && link.parent.phone) {
                    parentsList.push({
                        id: link.parent.id,
                        phone: link.parent.phone,
                        name: link.parent.name,
                    });
                }
            }
            // 2. Fallback to student's direct parent details if no link exists
            if (parentsList.length === 0) {
                const student = yield prisma_1.prisma.student.findUnique({
                    where: { id: studentId },
                });
                if (student && student.parentMobile) {
                    // Attempt to find a parent record with this mobile
                    const parent = yield prisma_1.prisma.headmasterParent.findFirst({
                        where: { phone: student.parentMobile },
                    });
                    if (parent) {
                        parentsList.push({
                            id: parent.id,
                            phone: parent.phone,
                            name: parent.name,
                        });
                    }
                    else {
                        // If no parent profile exists, create a stub entry or mock using student's values
                        parentsList.push({
                            id: '', // Empty parent ID if no profile exists
                            phone: student.parentMobile,
                            name: student.parentName || 'Parent/Guardian',
                        });
                    }
                }
            }
        }
        catch (err) {
            console.error(`[getStudentParents] Error resolving parents for student ${studentId}:`, err);
        }
        return parentsList;
    });
}
