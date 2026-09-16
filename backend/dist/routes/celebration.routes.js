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
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const router = (0, express_1.Router)();
// GET /api/celebrations - Fetch all celebrations and holidays for a school
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId query parameter is required' });
        }
        const celebrations = yield prisma_1.prisma.celebration.findMany({
            where: {
                OR: [
                    { schoolId: String(schoolId) },
                    { schoolId: null },
                ]
            },
            orderBy: { date: 'asc' },
        });
        res.json({ success: true, count: celebrations.length, data: celebrations });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/celebrations - Create a celebration/holiday
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, date, description, type, schoolId } = req.body;
        if (!title || !date || !type || !schoolId) {
            return res.status(400).json({ success: false, error: 'title, date, type, and schoolId are required' });
        }
        const celebration = yield prisma_1.prisma.celebration.create({
            data: {
                title,
                date: new Date(date),
                description: description || null,
                type,
                schoolId,
            },
        });
        res.status(201).json({ success: true, data: celebration });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/celebrations/:id - Update celebration/holiday
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, date, description, type } = req.body;
        const celebration = yield prisma_1.prisma.celebration.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (title !== undefined && { title })), (date !== undefined && { date: new Date(date) })), (description !== undefined && { description: description || null })), (type !== undefined && { type })),
        });
        res.json({ success: true, data: celebration });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/celebrations/:id - Delete celebration/holiday
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.celebration.delete({
            where: { id },
        });
        res.json({ success: true, message: 'Celebration/holiday deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
