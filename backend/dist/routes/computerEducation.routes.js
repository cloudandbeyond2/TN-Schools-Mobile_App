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
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
// GET all computer education modules
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const modules = yield prisma_1.prisma.computerEducation.findMany({
            where: schoolId ? { schoolId: schoolId } : undefined,
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: modules });
    }
    catch (error) {
        console.error('Failed to fetch computer education modules:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch computer education modules' });
    }
}));
// POST a new module
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, moduleType, description, gradeLevel, schoolId } = req.body;
        const newModule = yield prisma_1.prisma.computerEducation.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                title,
                moduleType: moduleType || 'Basic',
                description: description || 'A computer education module.',
                gradeLevel: gradeLevel || 'All',
                schoolId
            }
        });
        res.status(201).json({ success: true, data: newModule });
    }
    catch (error) {
        console.error('Failed to create computer education module:', error);
        res.status(500).json({ success: false, error: 'Failed to create computer education module' });
    }
}));
// PUT update a module
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, moduleType, description, gradeLevel } = req.body;
        const updatedModule = yield prisma_1.prisma.computerEducation.update({
            where: { id },
            data: {
                title,
                moduleType,
                description,
                gradeLevel,
                updatedAt: new Date()
            }
        });
        res.json({ success: true, data: updatedModule });
    }
    catch (error) {
        console.error('Failed to update computer education module:', error);
        res.status(500).json({ success: false, error: 'Failed to update computer education module' });
    }
}));
// DELETE a module
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.computerEducation.delete({
            where: { id }
        });
        res.json({ success: true, message: 'Module deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete computer education module:', error);
        res.status(500).json({ success: false, error: 'Failed to delete computer education module' });
    }
}));
exports.default = router;
