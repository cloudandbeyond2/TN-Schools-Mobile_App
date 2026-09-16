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
// ─── POST /api/digital-library/progress ─────────────────────────────
// Save or update reading progress
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, resourceId, resourceTitle, subject, type, lastChapter, progressPercent, timeSpentSeconds } = req.body;
        if (!studentId || !resourceId) {
            return res.status(400).json({ success: false, error: 'studentId and resourceId are required' });
        }
        // Upsert reading progress record
        const progress = yield mongo_1.LibraryProgress.findOneAndUpdate({ studentId, resourceId }, {
            $set: {
                resourceTitle,
                subject,
                type,
                lastChapter,
                lastOpenedAt: new Date()
            },
            $max: {
                progressPercent: progressPercent || 0
            },
            $inc: {
                timeSpentSeconds: timeSpentSeconds || 0
            }
        }, { new: true, upsert: true });
        res.json({ success: true, data: progress });
    }
    catch (err) {
        console.error('[POST /api/digital-library/progress]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/digital-library/progress ──────────────────────────────
// Get reading progress for a student
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.query;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'studentId is required' });
        }
        const progressList = yield mongo_1.LibraryProgress.find({ studentId: String(studentId) })
            .sort({ lastOpenedAt: -1 })
            .exec();
        res.json({ success: true, data: progressList });
    }
    catch (err) {
        console.error('[GET /api/digital-library/progress]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/digital-library/progress/today ───────────────────────
// Get stats of reading progress updated today
router.get('/today', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.query;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'studentId is required' });
        }
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        // Fetch resources accessed/updated today
        const list = yield mongo_1.LibraryProgress.find({
            studentId: String(studentId),
            updatedAt: { $gte: startOfToday }
        }).exec();
        // Sum time spent on resources accessed today
        const totalSeconds = list.reduce((sum, item) => sum + (item.timeSpentSeconds || 0), 0);
        const completedCount = list.filter(item => item.progressPercent >= 100).length;
        res.json({
            success: true,
            data: {
                totalTimeSpentMinutes: Math.round(totalSeconds / 60),
                activeCount: list.length,
                completedCount,
                recentResources: list.slice(0, 5).map(item => ({
                    resourceId: item.resourceId,
                    resourceTitle: item.resourceTitle,
                    subject: item.subject,
                    type: item.type,
                    lastChapter: item.lastChapter,
                    progressPercent: item.progressPercent,
                    updatedAt: item.updatedAt
                }))
            }
        });
    }
    catch (err) {
        console.error('[GET /api/digital-library/progress/today]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
