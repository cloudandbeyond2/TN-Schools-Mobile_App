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
const https_1 = __importDefault(require("https"));
const router = (0, express_1.Router)();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Helper to resolve user ID
function resolveUserId(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { id: userId },
                    { email: userId }
                ]
            }
        });
        return user ? user.id : null;
    });
}
// Helper to query student parents
function getStudentParents(studentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const links = yield prisma_1.prisma.parentStudentLink.findMany({
            where: { studentId },
            include: { parent: true }
        });
        return links.map(l => l.parent);
    });
}
// Helper to invoke Gemini
function callGemini(prompt_1) {
    return __awaiter(this, arguments, void 0, function* (prompt, jsonMode = false) {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
            throw new Error('GEMINI_API_KEY is missing. Please add it to backend/.env');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 8192 },
            safetySettings: [
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
        };
        if (jsonMode) {
            payload.generationConfig.responseMimeType = 'application/json';
        }
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const postData = JSON.stringify(payload);
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'x-goog-api-key': GEMINI_API_KEY,
                },
            };
            const req = https_1.default.request(options, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    var _a, _b, _c, _d, _e;
                    const body = Buffer.concat(chunks).toString('utf8');
                    if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                        reject(new Error(`Gemini API error ${res.statusCode}: ${body.substring(0, 500)}`));
                        return;
                    }
                    try {
                        const parsed = JSON.parse(body);
                        const text = (_e = (_d = (_c = (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                        if (!text) {
                            reject(new Error('Empty content from Gemini'));
                            return;
                        }
                        if (jsonMode) {
                            resolve(JSON.parse(text));
                        }
                        else {
                            resolve(text);
                        }
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', (e) => reject(e));
            req.write(postData);
            req.end();
        });
    });
}
// GET /api/students/:studentId/study-schedule
router.get('/:studentId/study-schedule', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const schedule = yield prisma_1.prisma.studySchedule.findUnique({
            where: { studentId }
        });
        res.json({ success: true, data: schedule });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/students/:studentId/study-schedule/generate
router.post('/:studentId/study-schedule/generate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { availableHours, upcomingExams, weakSubjects, learningPriority } = req.body;
        const student = yield prisma_1.prisma.student.findUnique({
            where: { id: studentId },
            include: { user: true, marks: true }
        });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        // Dynamic performance calculation: subject averages
        const subjectAverages = student.marks.reduce((acc, mark) => {
            const sub = mark.subject || 'General';
            if (!acc[sub])
                acc[sub] = { scored: 0, max: 0 };
            acc[sub].scored += mark.scored;
            acc[sub].max += mark.maxMarks;
            return acc;
        }, {});
        const perfString = Object.keys(subjectAverages).map(sub => {
            const avg = Math.round((subjectAverages[sub].scored / subjectAverages[sub].max) * 100);
            return `${sub}: ${avg}%`;
        }).join(', ') || 'No grades logged yet';
        const prompt = `
      You are an AI Academic Coach creating a personalized weekly study schedule (Monday to Sunday) for student ${student.user.name} in class ${student.class}${student.section}.
      
      Constraints & Parameters:
      - Available study time: ${availableHours} hours per day.
      - Upcoming examinations: "${upcomingExams || 'Regular study routine'}"
      - Weak subjects: ${Array.isArray(weakSubjects) ? weakSubjects.join(', ') : 'None specified'}
      - Learning priorities/focus: "${learningPriority || 'Concept Mastery'}"
      - Student's current average subject marks: "${perfString}"

      Construct a comprehensive weekly schedule mapping study slots. Distribute the available hours intelligently, focusing more on weak subjects and upcoming exams.
      Ensure the slots are structured cleanly. Return ONLY a valid JSON object matching this schema structure, do not include markdown code block formatting:
      {
        "weeklySchedule": [
          {
            "day": "Monday",
            "slots": [
              { "subject": "Mathematics", "time": "18:00 - 19:30", "topic": "Linear Equations", "tip": "Focus on step-by-step variables." }
            ]
          }
        ]
      }
    `;
        const aiSchedule = yield callGemini(prompt, true);
        const schedule = yield prisma_1.prisma.studySchedule.upsert({
            where: { studentId },
            create: {
                studentId,
                scheduleData: aiSchedule
            },
            update: {
                scheduleData: aiSchedule
            }
        });
        res.json({ success: true, data: schedule });
    }
    catch (err) {
        console.error('Error generating study schedule:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
