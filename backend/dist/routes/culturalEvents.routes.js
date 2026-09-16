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
// GET all cultural events
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const events = yield prisma_1.prisma.culturalEvent.findMany({
            where: schoolId ? { schoolId: schoolId } : undefined,
            orderBy: { eventDate: 'asc' }
        });
        res.json({ success: true, data: events });
    }
    catch (error) {
        console.error('Failed to fetch cultural events:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cultural events' });
    }
}));
// POST a new cultural event
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, eventDate, location, description, status, schoolId } = req.body;
        const newEvent = yield prisma_1.prisma.culturalEvent.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                title,
                eventDate: new Date(eventDate),
                location,
                description,
                status: status || 'Upcoming',
                schoolId
            }
        });
        res.status(201).json({ success: true, data: newEvent });
    }
    catch (error) {
        console.error('Failed to create cultural event:', error);
        res.status(500).json({ success: false, error: 'Failed to create cultural event' });
    }
}));
// PUT update a cultural event
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, eventDate, location, description, status } = req.body;
        const updatedEvent = yield prisma_1.prisma.culturalEvent.update({
            where: { id },
            data: {
                title,
                eventDate: eventDate ? new Date(eventDate) : undefined,
                location,
                description,
                status,
                updatedAt: new Date()
            }
        });
        res.json({ success: true, data: updatedEvent });
    }
    catch (error) {
        console.error('Failed to update cultural event:', error);
        res.status(500).json({ success: false, error: 'Failed to update cultural event' });
    }
}));
// DELETE a cultural event
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.culturalEvent.delete({
            where: { id }
        });
        res.json({ success: true, message: 'Cultural event deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete cultural event:', error);
        res.status(500).json({ success: false, error: 'Failed to delete cultural event' });
    }
}));
// GET registrations for cultural events
router.get('/registrations/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const registrations = yield prisma_1.prisma.culturalRegistration.findMany({
            where: schoolId ? { schoolId: schoolId } : undefined,
            orderBy: { registeredAt: 'desc' }
        });
        res.json({ success: true, data: registrations });
    }
    catch (error) {
        console.error('Failed to fetch cultural registrations:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch registrations' });
    }
}));
// POST a student/class registration
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId, eventTitle, participantName, class: className, count, type, schoolId, studentId } = req.body;
        let targetEventId = eventId;
        if (eventId) {
            const existing = yield prisma_1.prisma.culturalEvent.findUnique({ where: { id: eventId } }).catch(() => null);
            if (!existing && eventTitle) {
                const byTitle = yield prisma_1.prisma.culturalEvent.findFirst({
                    where: { title: { equals: eventTitle, mode: 'insensitive' } }
                }).catch(() => null);
                if (byTitle)
                    targetEventId = byTitle.id;
            }
        }
        const registration = yield prisma_1.prisma.culturalRegistration.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                eventId: targetEventId,
                eventTitle: eventTitle || "Cultural Event",
                participantName: participantName || "Student",
                class: className || "Class All",
                count: count ? parseInt(count) : 1,
                type: type || "individual",
                schoolId,
                studentId
            }
        });
        res.status(201).json({ success: true, data: registration });
    }
    catch (error) {
        console.error('Failed to create registration:', error);
        res.status(500).json({ success: false, error: 'Failed to register' });
    }
}));
// DELETE a registration
router.delete('/register/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.culturalRegistration.delete({
            where: { id }
        });
        res.json({ success: true, message: 'Registration cancelled' });
    }
    catch (error) {
        console.error('Failed to delete registration:', error);
        res.status(500).json({ success: false, error: 'Failed to cancel registration' });
    }
}));
exports.default = router;
