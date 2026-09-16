import path from 'path';
import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';

// Shared multer hardening: every upload route must set a size cap and an
// extension allowlist so the API can't be used to store arbitrary payloads.
export const UPLOAD_LIMITS = {
  fileSize: 500 * 1024 * 1024, // 500 MB per file (supports large textbooks & videos)
  files: 10,
};

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.txt', '.md', '.csv',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
  '.mp3', '.mp4', '.webm', '.ogg', '.wav', '.aac', '.m4a', '.flac',
  '.mov', '.avi', '.mkv',
  '.epub', '.mobi', '.zip', '.html', '.rtf',
];

export function documentFileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext || '(none)'}`));
  }
}

