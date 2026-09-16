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
const mongo_1 = require("../models/mongo");
const router = (0, express_1.Router)();
// POST /api/counsellor/message — Submit a message to the counsellor (logs into Wellness)
router.post('/message', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, mood, topic, feedbackText, isAnonymous } = req.body;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'studentId is required' });
        }
        // Default stressScore logic based on mood just for Wellness compatibility
        let stressScore = 5;
        if (mood === 'Angry' || mood === 'Anxious' || mood === 'Sad' || mood === 'கோபம்' || mood === 'பதற்றம்' || mood === 'கவலை') {
            stressScore = 8;
        }
        const notes = `[Topic: ${topic}] [Anonymous: ${isAnonymous}]\n${feedbackText}`;
        // Create a new Wellness entry for every message (so they can submit multiple)
        const entry = yield mongo_1.Wellness.create({
            studentId: isAnonymous ? 'ANONYMOUS_' + studentId : studentId,
            mood: 'okay', // Standardizing on 'okay' for the model's enum if it doesn't match perfectly
            stressScore,
            notes,
            counselingReferred: true,
            date: new Date(),
        });
        res.status(201).json({ success: true, data: entry });
    }
    catch (err) {
        console.error("COUNSELLOR MESSAGE ERROR:", err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// GET /api/counsellor/slots — Retrieve available counsellor slots
router.get('/slots', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        const query = {};
        if (schoolId)
            query.schoolId = schoolId;
        // In a real app we might filter for future dates only
        const slots = yield mongo_1.CounsellorSlot.find(query).sort({ createdAt: 1 });
        res.json({ success: true, data: slots });
    }
    catch (err) {
        console.error("COUNSELLOR SLOTS ERROR:", err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/counsellor/booking — Book a counsellor session
router.post('/booking', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, slotId, slot, topic, isAnonymous } = req.body;
        if (!studentId || (!slotId && !slot)) {
            return res.status(400).json({ success: false, error: 'studentId and slotId are required' });
        }
        let slotText = slot;
        // If a specific slot document ID was passed, mark it as booked
        if (slotId) {
            const counsellorSlot = yield mongo_1.CounsellorSlot.findById(slotId);
            if (counsellorSlot) {
                if (counsellorSlot.isBooked) {
                    return res.status(400).json({ success: false, error: 'Slot is already booked' });
                }
                counsellorSlot.isBooked = true;
                yield counsellorSlot.save();
                slotText = `${counsellorSlot.dayEn} ${counsellorSlot.time}`;
            }
        }
        const booking = yield mongo_1.CounsellorBooking.create({
            studentId: isAnonymous ? 'ANONYMOUS_' + studentId : studentId,
            slot: slotText || 'Unknown Slot',
            topic,
            isAnonymous,
            status: 'booked'
        });
        res.status(201).json({ success: true, data: booking });
    }
    catch (err) {
        console.error("COUNSELLOR BOOKING ERROR:", err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
