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
            const subjectCount = yield prisma_1.prisma.centralSubject.count();
            const unitCount = yield prisma_1.prisma.centralUnit.count();
            const topicCount = yield prisma_1.prisma.centralTopic.count();
            const contentCount = yield prisma_1.prisma.centralContent.count();
            console.log({
                success: true,
                subjectCount,
                unitCount,
                topicCount,
                contentCount
            });
        }
        catch (error) {
            console.error({
                success: false,
                error: error.message || error
            });
        }
        finally {
            yield prisma_1.prisma.$disconnect();
        }
    });
}
test();
