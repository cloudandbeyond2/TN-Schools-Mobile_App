import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EdgeTTS } from 'node-edge-tts';
import { LanguageCoachingProgress } from '../models/mongo';

import os from 'os';

const router = Router();
const prisma = new PrismaClient();

// Ensure audio cache folder exists safely (with fallback for read-only environments like Vercel)
let AUDIO_CACHE_DIR = path.join(__dirname, '../../public/audio_cache');
try {
  if (!fs.existsSync(AUDIO_CACHE_DIR)) {
    fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  }
} catch {
  AUDIO_CACHE_DIR = path.join(os.tmpdir(), 'audio_cache');
  try {
    if (!fs.existsSync(AUDIO_CACHE_DIR)) {
      fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
    }
  } catch {
    // Ignore if directory creation fails
  }
}


// ─── Grade Tier Helper ───────────────────────────────────────────────────────
type GradeTier = 'explorer' | 'communicator' | 'orator';

function getGradeTier(classNum: number): GradeTier {
  if (classNum <= 8)  return 'explorer';
  if (classNum <= 10) return 'communicator';
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

function getDailyTheme(): string {
  const dayOfWeek = new Date().getDay(); // 0=Sun … 6=Sat
  return DAILY_THEMES[dayOfWeek];
}

// ─── Resolve student & tier ───────────────────────────────────────────────────
async function resolveStudent(id: string) {
  const student = await prisma.student.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: { user: true }
  });
  if (!student) return null;
  const classNum = parseInt(String(student.class ?? '6'), 10) || 6;
  const tier     = getGradeTier(classNum);
  return { student, tier };
}

// ─── Gemini Coach Caller ──────────────────────────────────────────────────────
async function callGeminiCoach(systemPrompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') throw new Error('GEMINI_API_KEY missing');

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  const payload = {
    contents: [{ parts: [{ text: systemPrompt }] }],
    generationConfig: {
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json      = JSON.parse(data);
          const text      = json.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed    = JSON.parse(text);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// ─── Core system preamble ─────────────────────────────────────────────────────
function systemPreamble(tier: GradeTier, language: string) {
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
router.get('/:studentId/word-of-day', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const language = (req.query.language as string) || 'English';
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
    const { tier } = resolved;

    // Get recently used words to avoid repetition
    const progress = await LanguageCoachingProgress.findOne({ studentId: resolved.student.id });
    const recentWords = progress?.recentWords || [];

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
      const data = await callGeminiCoach(prompt);
      // Track word to avoid repetition
      await LanguageCoachingProgress.findOneAndUpdate(
        { studentId: resolved.student.id },
        { $addToSet: { recentWords: data.word }, $set: { lastWordOfDay: data.word } },
        { upsert: true }
      );
      return res.json({ success: true, data });
    } catch {
      // Fallback
      const fallbacks: Record<GradeTier, any> = language === 'Tamil' ? {
        explorer:     { word: 'மரியாதை', meaning: 'மற்றவர்களை மதிப்பளித்து அன்புடனும் மரியாதையுடனும் நடத்துவது.', example: 'பெரியவர்களுக்கும் நண்பர்களுக்கும் மரியாதை செலுத்துவது நற்பண்பாகும்.', difficulty: 'easy', tamilTranslation: 'Respect' },
        communicator: { word: 'முயற்சி', meaning: 'ஒரு செயலைச் செய்து முடிக்க எடுக்கும் கடின உழைப்பு.', example: 'முயற்சி உடையார் இகழ்ச்சி அடையார்.', difficulty: 'medium', tamilTranslation: 'Effort' },
        orator:       { word: 'நம்பிக்கை', meaning: 'தன்னைப் பற்றியும் பிறரைப் பற்றியும் கொள்ளும் நண்ணம்பிக்கை.', example: 'நம்பிக்கையே மனிதனின் வெற்றிக்கு அடிப்படை.', difficulty: 'hard', tamilTranslation: 'Confidence' }
      } : {
        explorer:     { word: 'Curious', meaning: 'Eager to know or learn', example: 'The curious student asked many questions.', difficulty: 'easy', tamilTranslation: 'ஆர்வமுள்ள (Aarvamulla)' },
        communicator: { word: 'Persuade', meaning: 'To convince someone to do or believe something', example: 'She persuaded her friend to join the debate club.', difficulty: 'medium', tamilTranslation: 'சமாதானப்படுத்து (Samadhaanapaduthu)' },
        orator:       { word: 'Articulate', meaning: 'Able to express ideas clearly and effectively', example: 'An articulate speaker commands the room during a Group Discussion.', difficulty: 'hard', tamilTranslation: 'தெளிவாக பேசுபவர் (Theligaaga Pesupavar)' }
      };
      return res.json({ success: true, data: fallbacks[tier] });
    }

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. VOCAB BUILDER (Flashcards)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/vocab-builder', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { language = 'English', difficulty = 'hard' } = req.body;
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
    const { tier } = resolved;
    const theme = getDailyTheme();

    const progress = await LanguageCoachingProgress.findOne({ studentId: resolved.student.id });
    const recentWords = progress?.recentWords || [];

    const prompt = `${systemPreamble(tier, language)}

Generate 5 challenging, advanced vocabulary flashcards for a ${tier} student in ${language}.
Each word should be ${difficulty} level (highly challenging/complex words that expand vocabulary, not simple or everyday words) and thematically related to: "${theme}".
Return JSON array:
[{ "word": "", "meaning": "", "sentence": "" }, ...]
Do not repeat: ${JSON.stringify(recentWords)}.`;

    try {
      const data = await callGeminiCoach(prompt);
      const rawWords = Array.isArray(data) ? data : data.flashcards || data.words || [];
      const cleanText = (str: any) => typeof str === 'string' ? str.replace(/[\uFFFD\uFEFF\u200B\u200C\u200D\u00AD]/g, '').trim() : str;
      const words = rawWords.map((w: any) => ({
        word: cleanText(w.word),
        meaning: cleanText(w.meaning),
        sentence: cleanText(w.sentence)
      }));
      await LanguageCoachingProgress.findOneAndUpdate(
        { studentId: resolved.student.id },
        { $inc: { newWordsCount: words.length } },
        { upsert: true }
      );
      return res.json({ success: true, data: words, theme });
    } catch {
      const fallback = language === 'Tamil' ? [
        { word: 'முயற்சி', meaning: 'ஒரு செயலைச் செய்து முடிக்க எடுக்கும் கடின உழைப்பு.', sentence: 'முயற்சி உடையார் இகழ்ச்சி அடையார்.' },
        { word: 'ஒழுக்கம்', meaning: 'நம்மை ஒழுங்குபடுத்தும் நல்ல பண்புகள்.', sentence: 'ஒழுக்கம் விழுப்பம் தரலான் ஒழுக்கம் உயிரினும் ஓம்பப் படும்.' },
        { word: 'நம்பிக்கை', meaning: 'தன்னம்பிக்கை மற்றும் பிறரிடம் கொள்ளும் நன்மதிப்பு.', sentence: 'நம்பிக்கையே மனிதனின் வெற்றிக்கு அடிப்படை பலம்.' },
        { word: 'மகிழ்ச்சி', meaning: 'மன நிறைவும் இன்பமும் கொண்ட நிலை.', sentence: 'நல்ல நண்பர்களுடன் பழகும்போது நாம் மகிழ்ச்சி அடைகிறோம்.' },
        { word: 'அறிவு', meaning: 'கல்வி மற்றும் அனுபவத்தால் பெரும் பகுத்தறிவு.', sentence: 'அறிவு அற்றம் காக்கும் கருவி.' }
      ] : [
        { word: 'Equanimity',    meaning: 'Mental calmness, composure, especially in a difficult situation.', sentence: 'She accepted both praise and criticism with equanimity.' },
        { word: 'Pernicious',    meaning: 'Having a harmful effect, especially in a gradual or subtle way.',  sentence: 'The pernicious influence of false rumours ruined their teamwork.' },
        { word: 'Obfuscate',     meaning: 'To render obscure, unclear, or unintelligible.',                  sentence: 'Avoid jargon that serves only to obfuscate your presentation.' },
        { word: 'Ephemeral',     meaning: 'Lasting for a very short time.',                                   sentence: 'The beauty of the sunset is ephemeral, fading in minutes.' },
        { word: 'Kakistocracy',  meaning: 'Government by the least suitable or competent citizens.',          sentence: 'Historians warn that unchecked corruption leads to a kakistocracy.' }
      ];
      return res.json({ success: true, data: fallback, theme });
    }

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SENTENCE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/sentence-builder', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { language = 'English' } = req.body;
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
    const { tier } = resolved;
    const theme = getDailyTheme();

    const prompt = `${systemPreamble(tier, language)}

Create one scrambled sentence-building exercise for a ${tier} student in ${language}.
Sentence length: explorer=4-5 words, communicator=6-8 words, orator=9-12 words.
Topic: "${theme}".
Return JSON:
{ "words": ["...", "..."], "target": "correct sentence here" }`;

    try {
      const data = await callGeminiCoach(prompt);
      return res.json({ success: true, data, theme });
    } catch {
      const fallbacks: Record<GradeTier, any> = language === 'Tamil' ? {
        explorer:     { words: ['நான்', 'பள்ளிக்குச்', 'செல்கிறேன்', 'தினமும்'],              target: 'நான் தினமும் பள்ளிக்குச் செல்கிறேன்' },
        communicator: { words: ['முயற்சி', 'திருவினையாக்கும்', 'என்றும்', 'கடின'],     target: 'கடின முயற்சி என்றும் திருவினையாக்கும்' },
        orator:       { words: ['அறிவு', 'மனிதனை', 'உயர்த்தும்', 'சிறந்த', 'கருவி', 'ஆகும்'], target: 'அறிவு மனிதனை உயர்த்தும் சிறந்த கருவி ஆகும்' }
      } : {
        explorer:     { words: ['I', 'love', 'going', 'school', 'to'],              target: 'I love going to school' },
        communicator: { words: ['is', 'hard', 'essential', 'work', 'for', 'success', 'that'],     target: 'Hard work is essential for success' },
        orator:       { words: ['critical', 'thinking', 'modern', 'challenges', 'solve', 'complex', 'helps', 'us', 'world\'s'], target: 'Critical thinking helps us solve the complex challenges of the modern world' }
      };
      return res.json({ success: true, data: fallbacks[tier], theme });
    }

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. STORY READING
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/story', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { language = 'English' } = req.body;
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
    const { tier } = resolved;

    const prompt = `${systemPreamble(tier, language)}

Write a short reading passage for a ${tier} student in ${language}.
Length: explorer=60-80 words (moral fable style), communicator=100-150 words (real-life narrative), orator=180-250 words (opinion/current-affairs style essay).
Include a title.
Return JSON:
{ "title": "", "passage": "", "comprehensionQuestion": "" }`;

    try {
      const data = await callGeminiCoach(prompt);
      return res.json({ success: true, data });
    } catch {
      const fallbacks: Record<GradeTier, any> = language === 'Tamil' ? {
        explorer:     { title: 'எறும்பும் வெட்டுக்கிளியும்', passage: 'கோடை காலத்தில், வெட்டுக்கிளி நாள் முழுவதும் பாடி மகிழ்ந்தது. ஆனால் எறும்பு குளிர்காலத்திற்காக உணவைச் சேமித்து வைத்தது. குளிர்காலம் வந்தபோது வெட்டுக்கிளி பசியால் வாடியது. எறும்பு தன் உணவைப் பகிர்ந்து கொண்டது. ஆனால், "எப்போதும் எதிர்காலத்திற்காக உழைக்க வேண்டும்" என்று அறிவுரை கூறியது. கடின உழைப்பின் முக்கியத்துவத்தை வெட்டுக்கிளி உணர்ந்தது.', comprehensionQuestion: 'வெட்டுக்கிளி கற்றுக்கொண்ட பாடம் என்ன?' },
        communicator: { title: 'அன்பின் சக்தி', passage: 'ரவி எப்போதும் படிப்பில் சுறுசுறுப்பாக இருப்பான். ஒரு நாள், தன் வகுப்பில் பிரியா தனியாக அழுதுகொண்டிருப்பதை கவனித்தான். அவள் தேர்வில் தோல்வியடைந்ததால் வருத்தத்தில் இருந்தாள். ரவி அவளுக்கு ஆதரவாகப் பேசி, மீண்டும் முயற்சி செய்ய ஊக்கப்படுத்தினான். படிக்க எளிய குறிப்புகளைக் கொடுத்து உதவினான். ஒரு மாதத்திற்குப் பிறகு பிரியா நல்ல மதிப்பெண் பெற்று தேர்ச்சி பெற்றாள். ரவிக்கு எளிய அன்பான செயல் பிறர் வாழ்க்கையை மாற்றும் என்பது புரிந்தது.', comprehensionQuestion: 'ரவி பிரியாவிற்கு எவ்வாறு உதவினான்? அதன் முடிவு என்ன?' },
        orator:       { title: 'டிஜிட்டல் இந்தியா: நன்மையும் சவாலும்', passage: 'இந்தியாவின் டிஜிட்டல் புரட்சி கல்வி, வங்கி மற்றும் அரசு சேவைகளை மக்கள் எளிதாகப் பெற மாற்றியுள்ளது. மொபைல் தொழில்நுட்பம் கிராமங்களுக்கும் நிதி வசதியைக் கொண்டு சேர்த்துள்ளது. இருப்பினும், இணைய வசதி நகரங்களில் எளிதாகவும் கிராமங்களில் கிராமப்புற மாணவர்கள் இணைய இணைப்பு இல்லாமல் தவிப்பதும் சவாலாக உள்ளது. இணையக் குற்றங்களும் தரவுப் பாதுகாப்பு சவால்களும் அதிகரித்து வருகின்றன. தொழில்நுட்பம் ஒரு தடையல்லாமல், பாலமாக அமைய நாம் அனைவரும் இணைந்து செயல்பட வேண்டும். டிஜிட்டல் கல்வி அனைவருக்கும் சமமாகக் கிடைக்க வழி செய்ய வேண்டும்.', comprehensionQuestion: 'டிஜிட்டல் புரட்சியால் ஏற்படும் முக்கிய சவால்கள் யாவை?' }
      } : {
        explorer:     { title: 'The Ant and the Grasshopper', passage: 'One summer, a grasshopper sang all day while an ant worked hard storing food. When winter came, the grasshopper was hungry. The ant shared its food but said, "Always prepare for tomorrow." The grasshopper learned a valuable lesson about hard work.', comprehensionQuestion: 'What lesson did the grasshopper learn?' },
        communicator: { title: 'The Power of Kindness', passage: 'Ravi was always busy with studies. One day, he noticed his classmate Priya sitting alone. She had failed her exam and felt sad. Ravi sat with her and encouraged her to try again. He shared study tips and helped her prepare. A month later, Priya passed with high marks. She thanked Ravi, who realized that small acts of kindness can change someone\'s life completely.', comprehensionQuestion: 'How did Ravi help Priya? What was the result?' },
        orator:       { title: 'Digital India: Promise and Peril', passage: 'India\'s digital revolution has transformed how millions access education, banking, and government services. The Jan Dhan-Aadhaar-Mobile trinity has brought financial inclusion to remote villages. Yet, rapid digitisation carries risks. The digital divide — where urban youth enjoy seamless connectivity while rural students struggle with bandwidth — threatens to widen existing inequalities. Cybercrime, misinformation, and data privacy breaches are rising. As India races toward a two-trillion-dollar digital economy, policymakers must ensure that technology becomes a bridge, not a barrier. Inclusive digital literacy programmes, affordable devices, and robust cyber laws are not optional — they are urgent national priorities.', comprehensionQuestion: 'What does the author mean by "technology becomes a bridge, not a barrier"? Do you agree?' }
      };
      return res.json({ success: true, data: fallbacks[tier] });
    }

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ROLEPLAY / REAL-LIFE CONVO
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/roleplay', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { language = 'English' } = req.body;
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
    const { tier } = resolved;

    const themes: Record<GradeTier, string[]> = {
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
      const data = await callGeminiCoach(prompt);
      return res.json({ success: true, data, theme });
    } catch {
      // Setup dynamic offline fallback lists
      const fallbacks: Record<GradeTier, Array<{ scenario: string, turns: any[] }>> = language === 'Tamil' ? {
        explorer: [
          {
            scenario: 'பள்ளி உணவகத்தில் உணவு வாங்குதல்.',
            turns: [
              {
                aiLine: 'உணவக அண்ணன்: தம்பி இன்று உனக்கு என்ன வேண்டும்?',
                options: [
                  { text: 'ஒரு சமோசாவும் சாறும் கொடுங்கள் அண்ணா.', quality: 'strong', feedback: 'மிகவும் மரியாதையான முழுமையான வாக்கியம்!' },
                  { text: 'சமோசா கொடு.', quality: 'weak', feedback: 'சிறிது மரியாதைக் குறைவான பதில். "அண்ணா" அல்லது "தயவுசெய்து" சேர்க்கலாம்.' }
                ]
              }
            ]
          },
          {
            scenario: 'பள்ளி நூலகத்தில் புத்தகம் வாங்குதல்.',
            turns: [
              {
                aiLine: 'நூலகர்: வணக்கம்! இன்று உனக்கு என்ன புத்தகம் வேண்டும்?',
                options: [
                  { text: 'வணக்கம் ஐயா, எனக்குக் கதை புத்தகம் வேண்டும்.', quality: 'strong', feedback: 'மரியாதையான தொடக்கமும் தெளிவான விளக்கமும்!' },
                  { text: 'கதை புத்தகம் கொடுங்க.', quality: 'weak', feedback: 'வணக்கம் கூறிவிட்டு மரியாதையாகக் கேட்கலாம்.' }
                ]
              }
            ]
          }
        ],
        communicator: [
          {
            scenario: 'குழு செயல்முறைப் பணி பற்றி நண்பனுடன் உரையாடல்.',
            turns: [
              {
                aiLine: 'நண்பன்: நீ இந்த திட்டத்தில் உன் பங்கைச் சரியாகச் செய்யவில்லை என நினைக்கிறேன்.',
                options: [
                  { text: 'உன் கவலை புரிகிறது. நான் செய்த வேலைகளை விளக்குகிறேன் கேள்.', quality: 'strong', feedback: 'மிகவும் ஆக்கபூர்வமான மரியாதையான பதில்.' },
                  { text: 'அது உண்மை இல்லை!', quality: 'weak', feedback: 'எதிர்ப்புத் தெரிவிக்கும் பதில், விவாதத்தை வளர்க்கும்.' }
                ]
              }
            ]
          }
        ],
        orator: [
          {
            scenario: 'வகுப்பில் மொபைல் போன் பயன்பாடு பற்றிய விவாதம்.',
            turns: [
              {
                aiLine: 'நண்பன்: வகுப்பில் மாணவர்கள் போன் பயன்படுத்த அனுமதிக்க வேண்டும் என நினைக்கிறேன்.',
                options: [
                  { text: 'போன்கள் நல்ல கற்றல் கருவிதான், ஆனால் அவை கவனத்தை சிதறடிக்கும் வாய்ப்பும் உள்ளது.', quality: 'strong', feedback: 'ஆக்கப்பூர்வமான இரு பக்க வாதம்.' },
                  { text: 'இல்லை, போன்கள் பயன்படுத்தக் கூடாது!', quality: 'weak', feedback: 'காரணம் கூறாமல் மறுக்கும் எளிய பதில்.' }
                ]
              }
            ]
          }
        ]
      } : {
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

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PUBLIC SPEAKING / DEBATE TOPIC
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/debate-topic', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { language = 'English' } = req.body;
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
    const { tier } = resolved;

    const prompt = `${systemPreamble(tier, language)}

Suggest one speaking/debate topic appropriate for a ${tier} student.
- explorer:     simple opinion topic (e.g. "Which is better, dogs or cats?")
- communicator: school-life debate (e.g. "Should homework be reduced?")
- orator:       current-affairs/persuasive topic (e.g. "Should social media have an age limit?")
Return JSON:
{ "topic": "", "prepTimeSeconds": 0, "speakTimeSeconds": 0, "guidingPoints": ["", "", ""] }`;

    try {
      const data = await callGeminiCoach(prompt);
      return res.json({ success: true, data });
    } catch {
      const fallbacks: Record<GradeTier, any> = {
        explorer:     { topic: 'Is reading books better than watching TV?', prepTimeSeconds: 30, speakTimeSeconds: 60, guidingPoints: ['Think of your favourite book or TV show', 'What do you learn from each?', 'Which one is more fun?'] },
        communicator: { topic: 'Should students be allowed to use mobile phones in class?', prepTimeSeconds: 60, speakTimeSeconds: 120, guidingPoints: ['Think of distractions vs. learning tools', 'What rules could help?', 'Share your own experience'] },
        orator:       { topic: 'Should India make coding a compulsory subject in all schools?', prepTimeSeconds: 120, speakTimeSeconds: 180, guidingPoints: ['Digital economy and job market', 'Equity and access in rural schools', 'Alternative skills education'] }
      };
      return res.json({ success: true, data: fallbacks[tier] });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. WRITING PRACTICE PROMPT
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/writing-prompt', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { language = 'English' } = req.body;
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
    const { tier } = resolved;

    const prompt = `${systemPreamble(tier, language)}

Generate a writing prompt for a ${tier} student in ${language}.
- explorer:     3-4 sentence simple message (e.g. note to a friend)
- communicator: short email/paragraph (formal-ish, 5-7 sentences)
- orator:       structured essay/cover-letter style (150-200 words expected)
Return JSON:
{ "prompt": "", "expectedLength": "", "rubricTips": ["", "", ""] }`;

    try {
      const data = await callGeminiCoach(prompt);
      return res.json({ success: true, data });
    } catch {
      const fallbacks: Record<GradeTier, any> = {
        explorer:     { prompt: 'Write a short note to your best friend about your favourite game.', expectedLength: '3-4 sentences', rubricTips: ['Start with a greeting', 'Describe the game clearly', 'End with a question for your friend'] },
        communicator: { prompt: 'Write an email to your class teacher requesting an extra day for submitting your project.', expectedLength: '5-7 sentences', rubricTips: ['Use a proper subject line', 'Give a valid reason politely', 'Thank the teacher at the end'] },
        orator:       { prompt: 'Write a persuasive essay arguing whether artificial intelligence will help or harm future employment in India.', expectedLength: '150-200 words', rubricTips: ['Open with a strong thesis statement', 'Support with 2-3 relevant examples or data', 'Acknowledge the counter-argument and refute it'] }
      };
      return res.json({ success: true, data: fallbacks[tier] });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. GRAMMAR CHECK / AI FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/grammar-check', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { text, language = 'English' } = req.body;
    if (!text || text.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Please provide student text to check.' });
    }
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
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
      const data = await callGeminiCoach(prompt);
      await LanguageCoachingProgress.findOneAndUpdate(
        { studentId: resolved.student.id },
        { $set: { grammarScore: data.score || 75 } },
        { upsert: true }
      );
      return res.json({ success: true, data });
    } catch {
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PRONUNCIATION FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/pronunciation-check', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { targetSentence, transcript, language = 'English' } = req.body;
    if (!targetSentence || !transcript) {
      return res.status(400).json({ success: false, error: 'Provide targetSentence and transcript.' });
    }
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
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
      const data = await callGeminiCoach(prompt);
      await LanguageCoachingProgress.findOneAndUpdate(
        { studentId: resolved.student.id },
        { $inc: { sentencesSpoken: 1 } },
        { upsert: true }
      );
      return res.json({ success: true, data });
    } catch {
      // Simple local word-diff fallback
      const targetWords   = targetSentence.toLowerCase().split(/\s+/);
      const spokenWords   = transcript.toLowerCase().split(/\s+/);
      const wordDiffs     = targetWords.map((w: string) => ({
        word:   w,
        status: spokenWords.includes(w) ? 'correct' : 'missed'
      }));
      const correct       = wordDiffs.filter((d: any) => d.status === 'correct').length;
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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. DAILY CHALLENGE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:studentId/daily-challenge', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const language = (req.query.language as string) || 'English';
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
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
      const data = await callGeminiCoach(prompt);
      return res.json({ success: true, data, theme: getDailyTheme() });
    } catch {
      const fallbacks: Record<GradeTier, any> = {
        explorer: {
          tasks: [
            { title: 'Say 3 Sentences',    description: 'Tell someone 3 things you did today in English.',  type: 'speaking', xp: 20 },
            { title: 'Word Detective',     description: 'Find 2 new English words in a storybook today.',  type: 'vocab',    xp: 15 },
            { title: 'Read Aloud',         description: 'Read one paragraph from your textbook out loud.', type: 'reading',  xp: 15 }
          ]
        },
        communicator: {
          tasks: [
            { title: 'Opinion in 1 Min',   description: 'Speak for 1 minute on whether exams should be online.', type: 'speaking', xp: 30 },
            { title: 'Vocab Challenge',    description: 'Use 3 new words correctly in written sentences.',         type: 'vocab',    xp: 25 },
            { title: 'Email Draft',        description: 'Write a 5-sentence email to your teacher.',               type: 'writing',  xp: 25 }
          ]
        },
        orator: {
          tasks: [
            { title: 'GD Opener',          description: 'Practice a 90-second Group Discussion opener on AI in education.', type: 'speaking', xp: 40 },
            { title: 'Editorial Analysis', description: 'Read a news editorial and summarise the argument in 3 points.',    type: 'reading',  xp: 30 },
            { title: 'Formal Paragraph',   description: 'Write a structured paragraph with a claim, evidence, and conclusion.', type: 'writing', xp: 30 }
          ]
        }
      };
      return res.json({ success: true, data: fallbacks[tier], theme: getDailyTheme() });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. AI CHAT — Migrated from student.routes.ts
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:studentId/chat', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { message, language = 'English' } = req.body;
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });
    const { tier } = resolved;

    await LanguageCoachingProgress.findOneAndUpdate(
      { studentId: resolved.student.id },
      { $inc: { sentencesSpoken: 1 } },
      { upsert: true }
    );

    const tierDesc: Record<GradeTier, string> = {
      explorer:     'simple, playful, encouraging — like a fun elder sibling',
      communicator: 'friendly but slightly formal, like a knowledgeable peer',
      orator:       'professional, precise, like a debate coach'
    };

    const prompt = `${systemPreamble(tier, language)}
You are a friendly AI Language Tutor. Your tone should be: ${tierDesc[tier]}.
The student may write in Tamil, English, or Tanglish. 
If they make a grammar error, politely correct it.
If they write in Tamil/Tanglish, show how to say it naturally in English.
Student says: "${message}"
Return JSON: { "text": "your bilingual coaching reply", "audioText": "clean English sentence to speak aloud" }`;

    try {
      const data = await callGeminiCoach(prompt);
      return res.json({ success: true, data });
    } catch {
      const lowerMsg = message.toLowerCase();
      let text = 'Super! Keep going — want to practice a dialogue together?';
      let audioText = 'Keep going, want to practice a dialogue together?';
      if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        text = 'Hello! Epdi irukkinga? Ready to practice today? 😊'; audioText = 'Hello! Ready to practice today?';
      } else if (lowerMsg.includes('how are you')) {
        text = "I'm doing great, nandri! How are you? 👍"; audioText = "I'm doing great. How are you?";
      }
      return res.json({ success: true, data: { text, audioText } });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. PROGRESS STATS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/:studentId/progress', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const resolved = await resolveStudent(studentId);
    if (!resolved) return res.status(404).json({ success: false, error: 'Student not found' });

    const progress = await LanguageCoachingProgress.findOne({ studentId: resolved.student.id });
    
    // Dynamic values based on actual student activity
    const speakingVal  = Math.min((progress?.sentencesSpoken ?? 0) * 10, 100);
    const readingVal   = Math.min((progress?.newWordsCount ?? 0) * 5, 100);
    const grammarVal   = progress?.grammarScore ?? 0;
    const listeningVal = Math.min(Math.round((speakingVal + readingVal) / 2), 100);
    const writingVal   = Math.min(Math.round(grammarVal * 0.9), 100);

    return res.json({
      success: true,
      data: {
        speaking: speakingVal,
        reading: readingVal,
        listening: listeningVal,
        writing: writingVal
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. TAMIL TTS AUDIO GENERATION (Zero API Key, Native Tamil Voice, MP3 Cached)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'ta-IN-PallaviNeural', rate = '0%' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text parameter is required' });
    }

    // 1. Calculate MD5 Hash for text + voice + rate (Unique MP3 file key)
    const hashKey = crypto
      .createHash('md5')
      .update(`${voice}_${rate}_${text}`)
      .digest('hex');

    const filename = `${hashKey}.mp3`;
    const filePath = path.join(AUDIO_CACHE_DIR, filename);
    const audioUrl = `/audio_cache/${filename}`;

    // 2. CHECK CACHE: Serve instantly if file already exists (0ms, 0 API calls)
    if (fs.existsSync(filePath)) {
      console.log(`[TTS Cache HIT] Serving cached MP3 for: "${text.substring(0, 30)}..."`);
      return res.json({ success: true, audioUrl, cached: true });
    }

    // 3. CACHE MISS: Convert to Native Tamil Speech without API Key
    console.log(`[TTS Cache MISS] Generating new Tamil audio for: "${text.substring(0, 30)}..."`);
    const tts = new EdgeTTS({
      voice: voice,
      lang: 'ta-IN',
      outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
      rate: rate
    });

    await tts.ttsPromise(text, filePath);

    return res.json({
      success: true,
      audioUrl,
      cached: false
    });
  } catch (err) {
    console.error('TTS Endpoint Error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;

