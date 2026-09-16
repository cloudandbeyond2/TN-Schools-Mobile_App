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
// ─── POST /api/digital-library/flashcards/bookmark ──────────────────
// Toggle bookmark on a flashcard
router.post('/bookmark', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, resourceId, flashcardId, front, back } = req.body;
        if (!studentId || !resourceId || !flashcardId) {
            return res.status(400).json({ success: false, error: 'studentId, resourceId, and flashcardId are required' });
        }
        const existing = yield mongo_1.FlashcardBookmark.findOne({ studentId, resourceId, flashcardId });
        if (existing) {
            // Toggle off: Unbookmark
            yield mongo_1.FlashcardBookmark.deleteOne({ _id: existing._id });
            return res.json({ success: true, bookmarked: false, message: 'Flashcard unbookmarked' });
        }
        else {
            // Toggle on: Bookmark
            const bookmark = yield mongo_1.FlashcardBookmark.create({
                studentId,
                resourceId,
                flashcardId,
                front,
                back
            });
            return res.json({ success: true, bookmarked: true, data: bookmark, message: 'Flashcard bookmarked' });
        }
    }
    catch (err) {
        console.error('[POST /api/digital-library/flashcards/bookmark]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/digital-library/flashcards/bookmarks ──────────────────
// Get all bookmarked flashcards for a student
router.get('/bookmarks', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.query;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'studentId is required' });
        }
        const bookmarks = yield mongo_1.FlashcardBookmark.find({ studentId: String(studentId) })
            .sort({ createdAt: -1 })
            .exec();
        res.json({ success: true, data: bookmarks });
    }
    catch (err) {
        console.error('[GET /api/digital-library/flashcards/bookmarks]', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
