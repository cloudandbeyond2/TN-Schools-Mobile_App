"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_LIMITS = void 0;
exports.documentFileFilter = documentFileFilter;
const path_1 = __importDefault(require("path"));
// Shared multer hardening: every upload route must set a size cap and an
// extension allowlist so the API can't be used to store arbitrary payloads.
exports.UPLOAD_LIMITS = {
    fileSize: 25 * 1024 * 1024, // 25 MB per file
    files: 10,
};
const ALLOWED_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.txt', '.md', '.csv',
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
    '.mp3', '.mp4', '.webm',
];
function documentFileFilter(_req, file, cb) {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Unsupported file type: ${ext || '(none)'}`));
    }
}
