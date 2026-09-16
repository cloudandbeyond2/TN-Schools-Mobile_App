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
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const multer_1 = __importDefault(require("multer"));
const uploads_1 = require("../utils/uploads");
const storage_service_1 = require("../services/storage.service");
// Files buffer in memory and go through the storage service, which routes to
// the superadmin-configured provider (local disk / S3 / custom server).
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: uploads_1.UPLOAD_LIMITS, fileFilter: uploads_1.documentFileFilter });
const router = (0, express_1.Router)();
// GET /api/digital-library-upload
// Fetch approved resources for students (can be combined with main API in frontend)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, subject, type, class: cls, search } = req.query;
        const where = { approvalStatus: 'APPROVED' };
        const conditions = [];
        if (schoolId) {
            conditions.push({
                OR: [
                    { schoolId: String(schoolId) },
                    { schoolId: null } // Global resources
                ]
            });
        }
        if (subject)
            where.subject = String(subject);
        if (type)
            where.type = String(type);
        if (cls)
            where.class = String(cls);
        if (search) {
            conditions.push({
                OR: [
                    { title: { contains: String(search), mode: 'insensitive' } },
                    { description: { contains: String(search), mode: 'insensitive' } },
                ]
            });
        }
        if (conditions.length > 0) {
            where.AND = conditions;
        }
        const data = yield prisma_1.prisma.digitalLibraryUpload.findMany({
            where,
            orderBy: { uploadDate: 'desc' },
        });
        return res.json({ success: true, data, count: data.length });
    }
    catch (err) {
        console.error('[GET /api/digital-library-upload]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch resources' });
    }
}));
// GET /api/digital-library-upload/pending
// Fetch pending resources for a specific school (For Headmaster)
router.get('/pending', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        if (!schoolId)
            return res.status(400).json({ success: false, error: 'schoolId required' });
        const data = yield prisma_1.prisma.digitalLibraryUpload.findMany({
            where: {
                schoolId: String(schoolId),
                approvalStatus: 'PENDING'
            },
            orderBy: { uploadDate: 'desc' },
        });
        return res.json({ success: true, data, count: data.length });
    }
    catch (err) {
        console.error('[GET /api/digital-library-upload/pending]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch pending resources' });
    }
}));
// GET /api/digital-library-upload/school/:schoolId
// Fetch all resources (approved and pending) for a school (For Headmaster Management)
router.get('/school/:schoolId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.params;
        const data = yield prisma_1.prisma.digitalLibraryUpload.findMany({
            where: { schoolId: String(schoolId) },
            orderBy: { uploadDate: 'desc' },
        });
        return res.json({ success: true, data, count: data.length });
    }
    catch (err) {
        console.error('[GET /api/digital-library-upload/school]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch school resources' });
    }
}));
// POST /api/digital-library-upload
// Upload a new resource (Super Admin, Headmaster, Teacher)
router.post('/', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, type, subject, class: cls, description, schoolId, role, userId, tags } = req.body;
        let { fileUrl } = req.body;
        if (req.file) {
            const uploaded = yield (0, storage_service_1.uploadBuffer)({
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                folder: 'digital-library',
            });
            fileUrl = uploaded.url;
        }
        if (!title || !type || !subject || !cls || !role || !userId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const isGlobal = !schoolId || String(schoolId).toLowerCase() === 'global';
        // Headmaster uploads are auto-approved for their school.
        let approvalStatus = 'PENDING';
        if (role === 'HEADMASTER') {
            approvalStatus = 'APPROVED';
        }
        let normalizedTags = [];
        if (tags) {
            try {
                normalizedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
            }
            catch (_a) {
                normalizedTags = [String(tags)];
            }
        }
        if (isGlobal && role === 'SUPER_ADMIN') {
            const allSchools = yield prisma_1.prisma.school.findMany({ select: { id: true } });
            if (allSchools.length === 0) {
                return res.status(400).json({ success: false, error: 'No schools found in the system to assign to.' });
            }
            const uploadsToCreate = allSchools.map(school => ({
                title: String(title),
                type: String(type),
                subject: String(subject),
                class: String(cls),
                description: description ? String(description) : null,
                fileUrl: fileUrl ? String(fileUrl) : null,
                tags: normalizedTags,
                schoolId: school.id,
                uploadedByRole: String(role),
                uploadedById: String(userId),
                approvalStatus: 'PENDING'
            }));
            const result = yield prisma_1.prisma.digitalLibraryUpload.createMany({
                data: uploadsToCreate
            });
            return res.status(201).json({ success: true, count: result.count, message: 'Resource sent to all Headmasters for approval' });
        }
        else {
            const normalizedSchoolId = !isGlobal ? String(schoolId) : null;
            const newUpload = yield prisma_1.prisma.digitalLibraryUpload.create({
                data: {
                    title: String(title),
                    type: String(type),
                    subject: String(subject),
                    class: String(cls),
                    description: description ? String(description) : null,
                    fileUrl: fileUrl ? String(fileUrl) : null,
                    tags: normalizedTags,
                    schoolId: normalizedSchoolId,
                    uploadedByRole: String(role),
                    uploadedById: String(userId),
                    approvalStatus
                }
            });
            return res.status(201).json({ success: true, data: newUpload, message: 'Resource uploaded successfully' });
        }
    }
    catch (err) {
        console.error('[POST /api/digital-library-upload]', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}));
// PUT /api/digital-library-upload/:id/approve
// Approve or Reject a resource (Headmaster)
router.put('/:id/approve', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'APPROVED' or 'REJECTED'
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }
        const updated = yield prisma_1.prisma.digitalLibraryUpload.update({
            where: { id },
            data: { approvalStatus: status }
        });
        return res.json({ success: true, data: updated, message: `Resource ${status.toLowerCase()} successfully` });
    }
    catch (err) {
        console.error('[PUT /api/digital-library-upload/:id/approve]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to update resource status' });
    }
}));
// PUT /api/digital-library-upload/:id
// Update an existing resource
router.put('/:id', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, type, subject, class: cls, description } = req.body;
        let { fileUrl } = req.body;
        if (req.file) {
            const uploaded = yield (0, storage_service_1.uploadBuffer)({
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                folder: 'digital-library',
            });
            fileUrl = uploaded.url;
        }
        const updatedData = {};
        if (title)
            updatedData.title = String(title);
        if (type)
            updatedData.type = String(type);
        if (subject)
            updatedData.subject = String(subject);
        if (cls)
            updatedData.class = String(cls);
        if (description !== undefined)
            updatedData.description = description ? String(description) : null;
        if (fileUrl !== undefined)
            updatedData.fileUrl = fileUrl ? String(fileUrl) : null;
        // Reset approvalStatus to PENDING if a teacher or user edits their resource
        updatedData.approvalStatus = 'PENDING';
        const updated = yield prisma_1.prisma.digitalLibraryUpload.update({
            where: { id },
            data: updatedData
        });
        return res.json({ success: true, data: updated, message: 'Resource updated successfully' });
    }
    catch (err) {
        console.error('[PUT /api/digital-library-upload/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to update resource' });
    }
}));
// DELETE /api/digital-library-upload/:id
// Delete a resource
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.digitalLibraryUpload.delete({
            where: { id }
        });
        return res.json({ success: true, message: 'Resource deleted successfully' });
    }
    catch (err) {
        console.error('[DELETE /api/digital-library-upload/:id]', err.message);
        return res.status(500).json({ success: false, error: 'Failed to delete resource' });
    }
}));
exports.default = router;
