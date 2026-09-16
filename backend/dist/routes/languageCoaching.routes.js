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
const client_1 = require("@prisma/client");
const https_1 = __importDefault(require("https"));
const mongo_1 = require("../models/mongo");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
function getGradeTier(classNum) {
    if (classNum <= 8)
        return 'explorer';
    if (classNum <= 10)
        return 'communicator';
    return 'orator';
}
// ─── Daily Theme Rotation ─────────────────────────────────────────────────────
const DAILY_THEMES = [
    'school life',
    'environment and nature',
    'career choices and future',
    'technology and gadgets',
    'sports and health',
    'family and relationships',
    'travel and culture'
];
function getDailyTheme() {
    const dayOfWeek = new Date().getDay(); // 0=Sun … 6=Sat
    return DAILY_THEMES[dayOfWeek];
}
// ─── Resolve student & tier ───────────────────────────────────────────────────
function resolveStudent(id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const student = yield prisma.student.findFirst({
            where: { OR: [{ id }, { userId: id }] },
            include: { user: true }
        });
        if (!student)
            return null;
        const classNum = parseInt(String((_a = student.class) !== null && _a !== void 0 ? _a : '6'), 10) || 6;
        const tier = getGradeTier(classNum);
        return { student, tier };
    });
}
// ─── Gemini Coach Caller ──────────────────────────────────────────────────────
function callGeminiCoach(systemPrompt) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey.trim() === '')
            throw new Error('GEMINI_API_KEY missing');
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        const payload = {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
                maxOutputTokens: 2048,
                responseMimeType: 'application/json'
            }
        };
        return new Promise((resolve, reject) => {
            const req = https_1.default.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    var _a, _b, _c, _d, _e;
                    try {
                        const json = JSON.parse(data);
                        const text = (_e = (_d = (_c = (_b = (_a = json.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                        const parsed = JSON.parse(text);
                        resolve(parsed);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.write(JSON.stringify(payload));
            req.end();
        });
    });
}
// ─── Core system preamble ─────────────────────────────────────────────────────
function systemPreamble(tier, language) {
    return `You are an AI Language & Communication Coach for school students in India.
Strictly tailor tone, vocabulary, and complexity to the student's grade tier:
- "explorer"     = Grades 6–8: simple words, playful tone, short sentences, relatable everyday topics.
- "communicator" = Grades 9–10: moderate vocabulary, confident tone, social/school-life topics.
- "orator"       = Grades 11–12: advanced vocabulary, formal tone, real-world/current-affairs topics.
Language: respond in ${language}.
Never include content unsuitable for school-age students.
Always return ONLY valid JSON matching the requested schema — no preamble, no markdown fences.
Current tier: ${tier}.`;
}
// ═══════════════════════════════════════════════════════════════════════════════
// 1. WORD OF THE DAY
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:studentId/word-of-day', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const language = req.query.language || 'English';
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        // Get recently used words to avoid repetition
        const progress = yield mongo_1.LanguageCoachingProgress.findOne({ studentId: resolved.student.id });
        const recentWords = (progress === null || progress === void 0 ? void 0 : progress.recentWords) || [];
        const prompt = `${systemPreamble(tier, language)}

Generate one "Word of the Day" for a ${tier} student learning ${language}.
Return JSON:
{
  "word": "",
  "meaning": "",
  "example": "",
  "difficulty": "easy|medium|hard",
  "tamilTranslation": ""
}
Avoid words already used: ${JSON.stringify(recentWords)}.`;
        try {
            const data = yield callGeminiCoach(prompt);
            // Track word to avoid repetition
            yield mongo_1.LanguageCoachingProgress.findOneAndUpdate({ studentId: resolved.student.id }, { $addToSet: { recentWords: data.word }, $set: { lastWordOfDay: data.word } }, { upsert: true });
            return res.json({ success: true, data });
        }
        catch (_a) {
            // Fallback
            const fallbacks = {
                explorer: { word: 'Curious', meaning: 'Eager to know or learn', example: 'The curious student asked many questions.', difficulty: 'easy', tamilTranslation: 'ஆர்வமுள்ள (Aarvamulla)' },
                communicator: { word: 'Persuade', meaning: 'To convince someone to do or believe something', example: 'She persuaded her friend to join the debate club.', difficulty: 'medium', tamilTranslation: 'சமாதானப்படுத்து (Samadhaanapaduthu)' },
                orator: { word: 'Articulate', meaning: 'Able to express ideas clearly and effectively', example: 'An articulate speaker commands the room during a Group Discussion.', difficulty: 'hard', tamilTranslation: 'தெளிவாக பேசுபவர் (Theligaaga Pesupavar)' }
            };
            return res.json({ success: true, data: fallbacks[tier] });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 2. VOCAB BUILDER (Flashcards)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/vocab-builder', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { language = 'English', difficulty = 'hard' } = req.body;
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        const theme = getDailyTheme();
        const progress = yield mongo_1.LanguageCoachingProgress.findOne({ studentId: resolved.student.id });
        const recentWords = (progress === null || progress === void 0 ? void 0 : progress.recentWords) || [];
        const prompt = `${systemPreamble(tier, language)}

Generate 5 challenging, advanced vocabulary flashcards for a ${tier} student in ${language}.
Each word should be ${difficulty} level (highly challenging/complex words that expand vocabulary, not simple or everyday words) and thematically related to: "${theme}".
Return JSON array:
[{ "word": "", "meaning": "", "sentence": "" }, ...]
Do not repeat: ${JSON.stringify(recentWords)}.`;
        try {
            const data = yield callGeminiCoach(prompt);
            const words = Array.isArray(data) ? data : data.flashcards || data.words || [];
            yield mongo_1.LanguageCoachingProgress.findOneAndUpdate({ studentId: resolved.student.id }, { $inc: { newWordsCount: words.length } }, { upsert: true });
            return res.json({ success: true, data: words, theme });
        }
        catch (_a) {
            const fallback = [
                { word: 'Equanimity', meaning: 'Mental calmness, composure, especially in a difficult situation.', sentence: 'She accepted both praise and criticism with equanimity.' },
                { word: 'Pernicious', meaning: 'Having a harmful effect, especially in a gradual or subtle way.', sentence: 'The pernicious influence of false rumours ruined their teamwork.' },
                { word: 'Obfuscate', meaning: 'To render obscure, unclear, or unintelligible.', sentence: 'Avoid jargon that serves only to obfuscate your presentation.' },
                { word: 'Ephemeral', meaning: 'Lasting for a very short time.', sentence: 'The beauty of the sunset is ephemeral, fading in minutes.' },
                { word: 'Kakistocracy', meaning: 'Government by the least suitable or competent citizens.', sentence: 'Historians warn that unchecked corruption leads to a kakistocracy.' }
            ];
            return res.json({ success: true, data: fallback, theme });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 3. SENTENCE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/sentence-builder', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { language = 'English' } = req.body;
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        const theme = getDailyTheme();
        const prompt = `${systemPreamble(tier, language)}

Create one scrambled sentence-building exercise for a ${tier} student in ${language}.
Sentence length: explorer=4-5 words, communicator=6-8 words, orator=9-12 words.
Topic: "${theme}".
Return JSON:
{ "words": ["...", "..."], "target": "correct sentence here" }`;
        try {
            const data = yield callGeminiCoach(prompt);
            return res.json({ success: true, data, theme });
        }
        catch (_a) {
            const fallbacks = {
                explorer: { words: ['I', 'love', 'going', 'school', 'to'], target: 'I love going to school' },
                communicator: { words: ['is', 'hard', 'essential', 'work', 'for', 'success', 'that'], target: 'Hard work is essential for success' },
                orator: { words: ['critical', 'thinking', 'modern', 'challenges', 'solve', 'complex', 'helps', 'us', 'world\'s'], target: 'Critical thinking helps us solve the complex challenges of the modern world' }
            };
            return res.json({ success: true, data: fallbacks[tier], theme });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 4. STORY READING
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/story', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { language = 'English' } = req.body;
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        const prompt = `${systemPreamble(tier, language)}

Write a short reading passage for a ${tier} student in ${language}.
Length: explorer=60-80 words (moral fable style), communicator=100-150 words (real-life narrative), orator=180-250 words (opinion/current-affairs style essay).
Include a title.
Return JSON:
{ "title": "", "passage": "", "comprehensionQuestion": "" }`;
        try {
            const data = yield callGeminiCoach(prompt);
            return res.json({ success: true, data });
        }
        catch (_a) {
            const fallbacks = {
                explorer: { title: 'The Ant and the Grasshopper', passage: 'One summer, a grasshopper sang all day while an ant worked hard storing food. When winter came, the grasshopper was hungry. The ant shared its food but said, "Always prepare for tomorrow." The grasshopper learned a valuable lesson about hard work.', comprehensionQuestion: 'What lesson did the grasshopper learn?' },
                communicator: { title: 'The Power of Kindness', passage: 'Ravi was always busy with studies. One day, he noticed his classmate Priya sitting alone. She had failed her exam and felt sad. Ravi sat with her and encouraged her to try again. He shared study tips and helped her prepare. A month later, Priya passed with high marks. She thanked Ravi, who realized that small acts of kindness can change someone\'s life completely.', comprehensionQuestion: 'How did Ravi help Priya? What was the result?' },
                orator: { title: 'Digital India: Promise and Peril', passage: 'India\'s digital revolution has transformed how millions access education, banking, and government services. The Jan Dhan-Aadhaar-Mobile trinity has brought financial inclusion to remote villages. Yet, rapid digitisation carries risks. The digital divide — where urban youth enjoy seamless connectivity while rural students struggle with bandwidth — threatens to widen existing inequalities. Cybercrime, misinformation, and data privacy breaches are rising. As India races toward a two-trillion-dollar digital economy, policymakers must ensure that technology becomes a bridge, not a barrier. Inclusive digital literacy programmes, affordable devices, and robust cyber laws are not optional — they are urgent national priorities.', comprehensionQuestion: 'What does the author mean by "technology becomes a bridge, not a barrier"? Do you agree?' }
            };
            return res.json({ success: true, data: fallbacks[tier] });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 5. ROLEPLAY / REAL-LIFE CONVO
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/roleplay', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { language = 'English' } = req.body;
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        const themes = {
            explorer: [
                'ordering food at a school canteen',
                'borrowing a book from the school library',
                'asking a teacher for help with a math homework question',
                'introducing yourself to a new classmate on the first day',
                'buying stationery items at a local shop'
            ],
            communicator: [
                'resolving a disagreement with a teammate about a group project workload',
                'convincing your parents to let you participate in an out-of-station science exhibition',
                'reporting a lost school bag to the main office administrative staff',
                'planning a weekend combined study session with a classmate',
                'asking for permission from the teacher to organise a classroom debate'
            ],
            orator: [
                'answering questions during a competitive college admission interview',
                'handling tough questions from judges after presenting a science project',
                'proposing a project deadline extension to a strict team manager',
                'debating a peer about using mobile devices in school classrooms',
                'requesting detailed project feedback from a senior course instructor'
            ]
        };
        const tierThemes = themes[tier];
        const theme = tierThemes[Math.floor(Math.random() * tierThemes.length)];
        const prompt = `${systemPreamble(tier, language)}

Create a 3-turn branching roleplay scenario for a ${tier} student practicing ${language}.
Scenario theme: "${theme}".
At each AI turn, give the student 2 reply options (one better, one weaker) and briefly note which is stronger and why.
Return JSON:
{
  "scenario": "",
  "turns": [
    {
      "aiLine": "",
      "options": [
        { "text": "", "quality": "strong|weak", "feedback": "" },
        { "text": "", "quality": "strong|weak", "feedback": "" }
      ]
    }
  ]
}`;
        try {
            const data = yield callGeminiCoach(prompt);
            return res.json({ success: true, data, theme });
        }
        catch (_a) {
            // Setup dynamic offline fallback lists
            const fallbacks = {
                explorer: [
                    {
                        scenario: 'You are ordering food at the school canteen.',
                        turns: [
                            {
                                aiLine: 'Canteen Uncle: Hello! What would you like to buy today?',
                                options: [
                                    { text: 'One samosa and a juice, please.', quality: 'strong', feedback: 'Very polite and clear.' },
                                    { text: 'Give me samosa.', quality: 'weak', feedback: 'A bit impolite. Try adding "please".' }
                                ]
                            }
                        ]
                    },
                    {
                        scenario: 'You are borrowing a book from the library.',
                        turns: [
                            {
                                aiLine: 'Librarian: Good morning! How can I help you today?',
                                options: [
                                    { text: 'Good morning, I would like to borrow an adventure book.', quality: 'strong', feedback: 'Polite greeting and clear explanation.' },
                                    { text: 'Adventure book now.', quality: 'weak', feedback: 'Too demanding. Greet first.' }
                                ]
                            }
                        ]
                    }
                ],
                communicator: [
                    {
                        scenario: 'You and your friend had an argument about a group project.',
                        turns: [
                            {
                                aiLine: 'Friend: I feel you did not do your part of the project.',
                                options: [
                                    { text: 'I understand your concern. Let me explain what I worked on.', quality: 'strong', feedback: 'Very polite and constructive.' },
                                    { text: 'That is not true!', quality: 'weak', feedback: 'Too defensive. Might escalate the argument.' }
                                ]
                            }
                        ]
                    },
                    {
                        scenario: 'Convincing your parents to let you join a weekend study group.',
                        turns: [
                            {
                                aiLine: 'Parent: I am worried that a study group will just be a distraction.',
                                options: [
                                    { text: 'I understand. We have a set agenda and will complete chapter 3.', quality: 'strong', feedback: 'Addresses worry directly with a plan.' },
                                    { text: 'No it is not!', quality: 'weak', feedback: 'Dismissive. Doesn\'t address the parent\'s concern.' }
                                ]
                            }
                        ]
                    }
                ],
                orator: [
                    {
                        scenario: 'You are being interviewed by a college admission officer.',
                        turns: [
                            {
                                aiLine: 'Interviewer: Tell me about a time you faced a difficult academic challenge.',
                                options: [
                                    { text: 'I struggled with calculus initially, but started a peer study group and raised my grade.', quality: 'strong', feedback: 'Shows initiative and proactive problem solving.' },
                                    { text: 'Math was hard but I studied and got past it.', quality: 'weak', feedback: 'Too brief. Doesn\'t highlight leadership or structure.' }
                                ]
                            }
                        ]
                    },
                    {
                        scenario: 'Negotiating a project deadline extension with a manager.',
                        turns: [
                            {
                                aiLine: 'Manager: I understand you want more time, but the client expects the draft by tomorrow.',
                                options: [
                                    { text: 'If we extend by 2 days, we can integrate the safety checks, ensuring a flawless launch.', quality: 'strong', feedback: 'Focuses on client value to justify the delay.' },
                                    { text: 'We just need more time because it is not finished.', quality: 'weak', feedback: 'Unprofessional. Doesn\'t explain the benefit of the extension.' }
                                ]
                            }
                        ]
                    }
                ]
            };
            const tierFallbacks = fallbacks[tier];
            const selectedFallback = tierFallbacks[Math.floor(Math.random() * tierFallbacks.length)];
            return res.json({ success: true, data: selectedFallback, theme });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 6. PUBLIC SPEAKING / DEBATE TOPIC
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/debate-topic', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { language = 'English' } = req.body;
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        const prompt = `${systemPreamble(tier, language)}

Suggest one speaking/debate topic appropriate for a ${tier} student.
- explorer:     simple opinion topic (e.g. "Which is better, dogs or cats?")
- communicator: school-life debate (e.g. "Should homework be reduced?")
- orator:       current-affairs/persuasive topic (e.g. "Should social media have an age limit?")
Return JSON:
{ "topic": "", "prepTimeSeconds": 0, "speakTimeSeconds": 0, "guidingPoints": ["", "", ""] }`;
        try {
            const data = yield callGeminiCoach(prompt);
            return res.json({ success: true, data });
        }
        catch (_a) {
            const fallbacks = {
                explorer: { topic: 'Is reading books better than watching TV?', prepTimeSeconds: 30, speakTimeSeconds: 60, guidingPoints: ['Think of your favourite book or TV show', 'What do you learn from each?', 'Which one is more fun?'] },
                communicator: { topic: 'Should students be allowed to use mobile phones in class?', prepTimeSeconds: 60, speakTimeSeconds: 120, guidingPoints: ['Think of distractions vs. learning tools', 'What rules could help?', 'Share your own experience'] },
                orator: { topic: 'Should India make coding a compulsory subject in all schools?', prepTimeSeconds: 120, speakTimeSeconds: 180, guidingPoints: ['Digital economy and job market', 'Equity and access in rural schools', 'Alternative skills education'] }
            };
            return res.json({ success: true, data: fallbacks[tier] });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 7. WRITING PRACTICE PROMPT
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/writing-prompt', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { language = 'English' } = req.body;
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        const prompt = `${systemPreamble(tier, language)}

Generate a writing prompt for a ${tier} student in ${language}.
- explorer:     3-4 sentence simple message (e.g. note to a friend)
- communicator: short email/paragraph (formal-ish, 5-7 sentences)
- orator:       structured essay/cover-letter style (150-200 words expected)
Return JSON:
{ "prompt": "", "expectedLength": "", "rubricTips": ["", "", ""] }`;
        try {
            const data = yield callGeminiCoach(prompt);
            return res.json({ success: true, data });
        }
        catch (_a) {
            const fallbacks = {
                explorer: { prompt: 'Write a short note to your best friend about your favourite game.', expectedLength: '3-4 sentences', rubricTips: ['Start with a greeting', 'Describe the game clearly', 'End with a question for your friend'] },
                communicator: { prompt: 'Write an email to your class teacher requesting an extra day for submitting your project.', expectedLength: '5-7 sentences', rubricTips: ['Use a proper subject line', 'Give a valid reason politely', 'Thank the teacher at the end'] },
                orator: { prompt: 'Write a persuasive essay arguing whether artificial intelligence will help or harm future employment in India.', expectedLength: '150-200 words', rubricTips: ['Open with a strong thesis statement', 'Support with 2-3 relevant examples or data', 'Acknowledge the counter-argument and refute it'] }
            };
            return res.json({ success: true, data: fallbacks[tier] });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 8. GRAMMAR CHECK / AI FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/grammar-check', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { text, language = 'English' } = req.body;
        if (!text || text.trim().length < 3) {
            return res.status(400).json({ success: false, error: 'Please provide student text to check.' });
        }
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        const prompt = `${systemPreamble(tier, language)}

Review this ${tier} student's ${language} writing submission:
"${text}"

Give encouraging, age-appropriate feedback:
- 1 thing done well
- Up to 2 corrections, explained simply
- 1 suggestion to make it richer/more advanced

Return JSON:
{ "strengths": "", "corrections": [""], "suggestion": "", "score": 0 }
Score should be 0-100 based on grammar, vocabulary, and clarity.`;
        try {
            const data = yield callGeminiCoach(prompt);
            yield mongo_1.LanguageCoachingProgress.findOneAndUpdate({ studentId: resolved.student.id }, { $set: { grammarScore: data.score || 75 } }, { upsert: true });
            return res.json({ success: true, data });
        }
        catch (_a) {
            return res.json({
                success: true,
                data: {
                    strengths: 'You made a good attempt and your idea is clear!',
                    corrections: ['Check your verb tense — use past tense consistently.', 'Add a comma after introductory phrases.'],
                    suggestion: 'Try adding a descriptive adjective before your nouns to make writing more vivid.',
                    score: 72
                }
            });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 9. PRONUNCIATION FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/pronunciation-check', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { targetSentence, transcript, language = 'English' } = req.body;
        if (!targetSentence || !transcript) {
            return res.status(400).json({ success: false, error: 'Provide targetSentence and transcript.' });
        }
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        const prompt = `${systemPreamble(tier, language)}

Compare the target sentence:
"${targetSentence}"
with the student's spoken transcript (from speech recognition):
"${transcript}"
for a ${tier} student learning ${language}.
Identify mispronounced/missing/extra words and give one encouraging tip.
Return JSON:
{
  "accuracyScore": 0,
  "wordDiffs": [{ "word": "", "status": "correct|missed|wrong" }],
  "tip": ""
}`;
        try {
            const data = yield callGeminiCoach(prompt);
            yield mongo_1.LanguageCoachingProgress.findOneAndUpdate({ studentId: resolved.student.id }, { $inc: { sentencesSpoken: 1 } }, { upsert: true });
            return res.json({ success: true, data });
        }
        catch (_a) {
            // Simple local word-diff fallback
            const targetWords = targetSentence.toLowerCase().split(/\s+/);
            const spokenWords = transcript.toLowerCase().split(/\s+/);
            const wordDiffs = targetWords.map((w) => ({
                word: w,
                status: spokenWords.includes(w) ? 'correct' : 'missed'
            }));
            const correct = wordDiffs.filter((d) => d.status === 'correct').length;
            const accuracyScore = Math.round((correct / targetWords.length) * 100);
            return res.json({
                success: true,
                data: {
                    accuracyScore,
                    wordDiffs,
                    tip: 'Great effort! Speak slowly and clearly, one word at a time.'
                }
            });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 10. DAILY CHALLENGE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:studentId/daily-challenge', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const language = req.query.language || 'English';
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        const prompt = `${systemPreamble(tier, language)}

Generate 3 daily micro-challenges for a ${tier} student in ${language}, mixing speaking, vocab, and reading/writing.
Keep each completable in under 5 minutes.
Return JSON:
{
  "tasks": [
    { "title": "", "description": "", "type": "speaking|vocab|reading|writing", "xp": 0 }
  ]
}`;
        try {
            const data = yield callGeminiCoach(prompt);
            return res.json({ success: true, data, theme: getDailyTheme() });
        }
        catch (_a) {
            const fallbacks = {
                explorer: {
                    tasks: [
                        { title: 'Say 3 Sentences', description: 'Tell someone 3 things you did today in English.', type: 'speaking', xp: 20 },
                        { title: 'Word Detective', description: 'Find 2 new English words in a storybook today.', type: 'vocab', xp: 15 },
                        { title: 'Read Aloud', description: 'Read one paragraph from your textbook out loud.', type: 'reading', xp: 15 }
                    ]
                },
                communicator: {
                    tasks: [
                        { title: 'Opinion in 1 Min', description: 'Speak for 1 minute on whether exams should be online.', type: 'speaking', xp: 30 },
                        { title: 'Vocab Challenge', description: 'Use 3 new words correctly in written sentences.', type: 'vocab', xp: 25 },
                        { title: 'Email Draft', description: 'Write a 5-sentence email to your teacher.', type: 'writing', xp: 25 }
                    ]
                },
                orator: {
                    tasks: [
                        { title: 'GD Opener', description: 'Practice a 90-second Group Discussion opener on AI in education.', type: 'speaking', xp: 40 },
                        { title: 'Editorial Analysis', description: 'Read a news editorial and summarise the argument in 3 points.', type: 'reading', xp: 30 },
                        { title: 'Formal Paragraph', description: 'Write a structured paragraph with a claim, evidence, and conclusion.', type: 'writing', xp: 30 }
                    ]
                }
            };
            return res.json({ success: true, data: fallbacks[tier], theme: getDailyTheme() });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 11. AI CHAT — Migrated from student.routes.ts
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const { message, language = 'English' } = req.body;
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const { tier } = resolved;
        yield mongo_1.LanguageCoachingProgress.findOneAndUpdate({ studentId: resolved.student.id }, { $inc: { sentencesSpoken: 1 } }, { upsert: true });
        const tierDesc = {
            explorer: 'simple, playful, encouraging — like a fun elder sibling',
            communicator: 'friendly but slightly formal, like a knowledgeable peer',
            orator: 'professional, precise, like a debate coach'
        };
        const prompt = `${systemPreamble(tier, language)}
You are a friendly AI Language Tutor. Your tone should be: ${tierDesc[tier]}.
The student may write in Tamil, English, or Tanglish. 
If they make a grammar error, politely correct it.
If they write in Tamil/Tanglish, show how to say it naturally in English.
Student says: "${message}"
Return JSON: { "text": "your bilingual coaching reply", "audioText": "clean English sentence to speak aloud" }`;
        try {
            const data = yield callGeminiCoach(prompt);
            return res.json({ success: true, data });
        }
        catch (_a) {
            const lowerMsg = message.toLowerCase();
            let text = 'Super! Keep going — want to practice a dialogue together?';
            let audioText = 'Keep going, want to practice a dialogue together?';
            if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
                text = 'Hello! Epdi irukkinga? Ready to practice today? 😊';
                audioText = 'Hello! Ready to practice today?';
            }
            else if (lowerMsg.includes('how are you')) {
                text = "I'm doing great, nandri! How are you? 👍";
                audioText = "I'm doing great. How are you?";
            }
            return res.json({ success: true, data: { text, audioText } });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ═══════════════════════════════════════════════════════════════════════════════
// 12. PROGRESS STATS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:studentId/progress', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { studentId } = req.params;
        const resolved = yield resolveStudent(studentId);
        if (!resolved)
            return res.status(404).json({ success: false, error: 'Student not found' });
        const progress = yield mongo_1.LanguageCoachingProgress.findOne({ studentId: resolved.student.id });
        // Dynamic values based on actual student activity
        const speakingVal = Math.min(((_a = progress === null || progress === void 0 ? void 0 : progress.sentencesSpoken) !== null && _a !== void 0 ? _a : 0) * 10, 100);
        const readingVal = Math.min(((_b = progress === null || progress === void 0 ? void 0 : progress.newWordsCount) !== null && _b !== void 0 ? _b : 0) * 5, 100);
        const grammarVal = (_c = progress === null || progress === void 0 ? void 0 : progress.grammarScore) !== null && _c !== void 0 ? _c : 0;
        const listeningVal = Math.min(Math.round((speakingVal + readingVal) / 2), 100);
        const writingVal = Math.min(Math.round(grammarVal * 0.9), 100);
        return res.json({
            success: true,
            data: {
                speaking: speakingVal,
                reading: readingVal,
                listening: listeningVal,
                writing: writingVal
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
