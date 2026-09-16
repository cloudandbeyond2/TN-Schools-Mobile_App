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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./config/prisma");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("📖 Reading SQL schema from central_content_schema.sql...");
            const sqlPath = path_1.default.join(__dirname, '../../central_content_schema.sql');
            const sqlContent = fs_1.default.readFileSync(sqlPath, 'utf8');
            // Strip comment lines first
            const cleanSql = sqlContent
                .split('\n')
                .map(line => line.trim())
                .filter(line => !line.startsWith('--'))
                .join('\n');
            // Split SQL content into individual statements by semicolon
            const statements = cleanSql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            console.log(`🚀 Executing ${statements.length} SQL statements...`);
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                console.log(`Executing statement [${i + 1}/${statements.length}]...`);
                yield prisma_1.prisma.$executeRawUnsafe(statement);
            }
            console.log("🎉 All tables created successfully via Prisma raw execution!");
        }
        catch (error) {
            console.error("❌ Table creation failed:", error.message || error);
        }
        finally {
            yield prisma_1.prisma.$disconnect();
        }
    });
}
run();
