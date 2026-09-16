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
const prisma_1 = require("./config/prisma");
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('--- ClassRoom Records ---');
            const classrooms = yield prisma_1.prisma.$queryRaw `SELECT * FROM "ClassRoom"`;
            console.log(classrooms);
            console.log('\n--- HeadmasterStaff Records ---');
            const staff = yield prisma_1.prisma.headmasterStaff.findMany();
            console.log(staff);
            console.log('\n--- Teacher Table Records ---');
            const teachers = yield prisma_1.prisma.teacher.findMany({
                include: {
                    user: {
                        select: {
                            email: true,
                            name: true
                        }
                    }
                }
            });
            console.log(teachers);
        }
        catch (err) {
            console.error('Error:', err);
        }
        finally {
            yield prisma_1.prisma.$disconnect();
        }
    });
}
test();
