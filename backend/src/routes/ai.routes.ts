import { Router, Request, Response } from 'express';
import { AIChat, LearningPath, Wellness, LibraryCompanion, Saved3DModel } from '../models/mongo'; // Portfolio removed — not used here; active portfolio uses PostgreSQL via portfolio.routes.ts
import https from 'https';
import { authenticate } from '../middleware/auth.middleware';
import { getGeminiApiKey } from '../services/aiConfig.service';
import { prisma } from '../config/prisma';
const router = Router();

// Student chat sessions, tutor responses, homework ideas, and wellness chat allow student access
router.use((req: Request, res: Response, next) => {
  if (
    req.path.startsWith('/chat') ||
    req.path === '/chat-tutor' ||
    req.path === '/homework-ideas' ||
    req.path.startsWith('/wellness-ai')
  ) {
    return next();
  }
  return authenticate(req, res, next);
});

// ===========================================================================
// POST /api/wellness-ai/chat
// ===========================================================================
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const {
      messages = [],
      currentMessage,
      language = "English",
    } = req.body;

    const historyText = messages
      .map(
        (m: any) =>
          `${m.role === "user" ? "Student" : "AI"}: ${m.content}`
      )
      .join("\n");

    const prompt = `
You are an AI Wellness Companion for Tamil Nadu Government School students.

Your Role:
- Listen carefully and respond kindly.
- Support students with stress, anxiety, sadness, motivation, sleep, study balance and emotions.
- Give simple, practical wellness advice.
- Never diagnose illnesses or prescribe medicines.
- Never judge or criticize the student.

Safety Rules:
- If a student mentions suicide, self-harm, or immediate danger, calmly advise them to contact a parent, teacher, trusted adult, or school counselor immediately.
- Stay supportive and reassuring.

Language Rules:
- Default language: ${language}
- If the student asks for Tamil, reply only in Tamil.
- If the student asks for English, reply only in English.
- Never mix languages unless requested.
IMPORTANT: Follow these rules exactly. If you break any rule, your answer is incorrect.

Response Rules:
- Reply in EXACTLY 5 sentences.
- Each sentence must be under 12 words.
- Maximum 50 words total.
- Never use bullet points.
- Never use numbering.
- Never use headings or markdown.
- Never write long paragraphs.
- Never explain each point.
- Never give more than one idea per sentence.
- Only answer the student's latest question.
- If the student greets you, greet back in one short sentence.
- Otherwise, do NOT start with greetings.
- End with one short encouraging sentence.

Conversation History:
${historyText}

Student:
${currentMessage}

Remember:
Return ONLY the final answer.
Exactly 5 short sentences.
No extra text.
`;

    const reply = await callGemini(prompt, false);

    res.json({
      success: true,
      text: reply,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: String(err),
    });
  }
});
// ---------------------------------------------------------------------------
// Robust multi-stage JSON repair (handles Gemini quirks)
// ---------------------------------------------------------------------------
function fixUnescapedControlChars(s: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\') { result += ch; escaped = true; continue; }
    if (ch === '"') { result += ch; inString = !inString; continue; }
    if (inString) {
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
    }
    result += ch;
  }
  return result;
}

function attemptRepair(s: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if ((ch === '}' || ch === ']') && stack.length > 0) stack.pop();
    }
  }
  if (inString) s += '"';
  s += stack.reverse().join('');
  return s;
}

function robustParseJSON(text: string): any {
  let s = text.trim();
  // Stage 1: strip markdown fences
  if (s.startsWith('```json')) s = s.slice(7).trim();
  else if (s.startsWith('```')) s = s.slice(3).trim();
  if (s.endsWith('```')) s = s.slice(0, s.length - 3).trim();
  // Stage 2: extract outer {}
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) s = s.substring(firstBrace, lastBrace + 1);
  // Stage 3: remove trailing commas
  s = s.replace(/,\s*([\]}])/g, '$1');
  // Stage 4: fix unescaped control chars
  s = fixUnescapedControlChars(s);
  // Stage 5: try parse; if fails, repair truncated JSON
  try {
    return JSON.parse(s);
  } catch (e1) {
    const repaired = attemptRepair(s);
    try {
      return JSON.parse(repaired);
    } catch (e2) {
      throw new Error(`JSON parse failed. Error: ${String(e1)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Gemini API helper
// ---------------------------------------------------------------------------

// Model used when a caller does not name one. AI Content Studio skills pass a
// per-skill model resolved from the superadmin AI Skill Control panel.
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export interface GeminiUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface GeminiResponse<T = any> {
  data: T;
  usage: GeminiUsage;
}

export async function callGeminiWithUsage<T = any>(
  prompt: string,
  jsonMode: boolean = false,
  schema?: any,
  maxTokens: number = 8192,
  timeoutMs: number = 90000,
  base64Image?: string,
  mimeType?: string,
  model: string = DEFAULT_GEMINI_MODEL
): Promise<GeminiResponse<T>> {
  // Superadmin-configured key (AI Integration Setup) wins; env var is the fallback.
  const GEMINI_API_KEY = await getGeminiApiKey();
  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
    throw new Error('Gemini API key is missing. Configure it in AI Integration Setup or backend/.env');
  }

  // API key goes in a header, not the query string, so it never lands in URL logs
  const modelId = (model || DEFAULT_GEMINI_MODEL).trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`;

  const parts: any[] = [{ text: prompt }];
  if (base64Image && mimeType) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Image
      }
    });
  }

  const payload: any = {
    contents: [{ parts }],
    generationConfig: { maxOutputTokens: maxTokens },
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  if (jsonMode) {
    payload.generationConfig.responseMimeType = 'application/json';
    if (schema) {
      payload.generationConfig.responseSchema = schema;
    }
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

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`Gemini API error ${res.statusCode}: ${body.substring(0, 500)}`));
          return;
        }
        let parsed: any = null;
        let text: string | undefined;
        try {
          parsed = JSON.parse(body);
          text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            const finishReason = parsed?.candidates?.[0]?.finishReason;
            reject(new Error(`Empty content from Gemini. Finish reason: ${finishReason || 'UNKNOWN'}`));
            return;
          }

          const parsedUsage = parsed?.usageMetadata;
          const promptTokens = Number(parsedUsage?.promptTokenCount) || Math.ceil(prompt.length / 4);
          const candidatesTokens = Number(parsedUsage?.candidatesTokenCount) || Math.ceil(text.length / 4);
          const totalTokens = Number(parsedUsage?.totalTokenCount) || (promptTokens + candidatesTokens);

          const data = jsonMode ? robustParseJSON(text) : text;
          resolve({
            data,
            usage: {
              promptTokens,
              candidatesTokens,
              totalTokens,
            },
          });
        } catch (e) {
          const finishReason = parsed?.candidates?.[0]?.finishReason;
          reject(new Error(`Failed to parse response. Finish: ${finishReason || 'UNKNOWN'}. Error: ${String(e)}. Snippet: ${text ? text.substring(0, 300) : body.substring(0, 300)}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Gemini API timed out after ${Math.round(timeoutMs / 1000)} seconds`)));
    req.write(postData);
    req.end();
  });
}

export async function callGemini(
  prompt: string,
  jsonMode: boolean = false,
  schema?: any,
  maxTokens: number = 8192,
  timeoutMs: number = 90000,
  base64Image?: string,
  mimeType?: string,
  model: string = DEFAULT_GEMINI_MODEL
): Promise<any> {
  const res = await callGeminiWithUsage(prompt, jsonMode, schema, maxTokens, timeoutMs, base64Image, mimeType, model);
  return res.data;
}

// ---------------------------------------------------------------------------
// Extract most-relevant 15,000 char window from a large textbook PDF
// ---------------------------------------------------------------------------
function limitContext(context: string | undefined, topic: string): string {
  if (!context) return '';
  const cleaned = context.trim();
  if (cleaned.length <= 15000) return cleaned;
  const keywords = topic.toLowerCase().split(/\s+/).filter((k) => k.length > 2);
  if (keywords.length === 0) return cleaned.substring(0, 15000);
  let bestIndex = 0;
  let maxMatches = 0;
  for (let i = 0; i < cleaned.length - 15000; i += 1000) {
    const chunk = cleaned.substring(i, i + 15000).toLowerCase();
    let matches = 0;
    for (const kw of keywords) { if (chunk.includes(kw)) matches++; }
    if (matches > maxMatches) { maxMatches = matches; bestIndex = i; }
  }
  return cleaned.substring(bestIndex, bestIndex + 15000);
}

// ===========================================================================
// POST /api/ai/generate-lesson-plan
// Generates a compact, schema-validated CORE lesson plan that reliably fits in
// the token budget. Heavy media (15 slides, podcast, video) are generated lazily
// via separate endpoints when the teacher opens those studio tools.
// ===========================================================================
const LESSON_CORE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    objectives: { type: 'ARRAY', items: { type: 'STRING' }, description: '3 learning objectives' },
    timeline: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          time: { type: 'STRING' },
          activity: { type: 'STRING' },
          description: { type: 'STRING' },
        },
        required: ['time', 'activity', 'description'],
      },
      description: '4 phases: Hook, Core Instruction, Guided Practice, Exit Ticket',
    },
    studentKeyPoints: {
      type: 'OBJECT',
      properties: {
        en: { type: 'ARRAY', items: { type: 'STRING' } },
        ta: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['en', 'ta'],
      description: '5-6 crisp takeaways a student must remember, in English and Tamil (same count/order)',
    },
    bilingual: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          english: { type: 'STRING' },
          tamil: { type: 'STRING' },
          pronunciation: { type: 'STRING' },
        },
        required: ['english', 'tamil', 'pronunciation'],
      },
      description: '5 key technical terms',
    },
    exitTickets: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          answer: { type: 'STRING' },
          rationale: { type: 'STRING' },
        },
        required: ['question', 'options', 'answer', 'rationale'],
      },
      description: '5 MCQs (options like "A) ...")',
    },
    infographic: {
      type: 'OBJECT',
      properties: {
        heroTitle: { type: 'STRING' },
        heroSubtitle: { type: 'STRING' },
        heroIcon: { type: 'STRING' },
        conceptColor: { type: 'STRING' },
        modules: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { id: { type: 'STRING' }, title: { type: 'STRING' }, desc: { type: 'STRING' }, icon: { type: 'STRING' } },
            required: ['id', 'title', 'desc', 'icon'],
          },
        },
        stats: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { label: { type: 'STRING' }, value: { type: 'STRING' }, desc: { type: 'STRING' } },
            required: ['label', 'value', 'desc'],
          },
        },
        workflow: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { step: { type: 'STRING' }, desc: { type: 'STRING' }, icon: { type: 'STRING' } },
            required: ['step', 'desc', 'icon'],
          },
        },
        formulaBox: { type: 'STRING' },
        formulaExplain: { type: 'STRING' },
        lawTitle: { type: 'STRING' },
        lawDesc: { type: 'STRING' },
        termTable: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { english: { type: 'STRING' }, tamil: { type: 'STRING' }, definition: { type: 'STRING' } },
            required: ['english', 'tamil', 'definition'],
          },
        },
        constantName: { type: 'STRING' },
        constantValue: { type: 'STRING' },
        constantExplain: { type: 'STRING' },
      },
      required: ['heroTitle', 'heroSubtitle', 'heroIcon', 'conceptColor', 'modules', 'stats', 'workflow', 'termTable'],
    },
    conceptExplanation: {
      type: 'OBJECT',
      properties: {
        mainTitle: { type: 'STRING' },
        subtitle: { type: 'STRING' },
        whatIsIt: { type: 'STRING' },
        howItWorks: { type: 'ARRAY', items: { type: 'STRING' } },
        keyJobs: { type: 'ARRAY', items: { type: 'STRING' } },
        mainParts: { type: 'ARRAY', items: { type: 'STRING' } },
        funFacts: { type: 'ARRAY', items: { type: 'STRING' } },
        takeCare: { type: 'ARRAY', items: { type: 'STRING' } },
        didYouKnow: { type: 'STRING' },
        footerText: { type: 'STRING' }
      },
      required: ['mainTitle', 'subtitle', 'whatIsIt', 'howItWorks', 'keyJobs', 'mainParts', 'funFacts', 'takeCare', 'didYouKnow', 'footerText'],
      description: 'A detailed concept explanation map, similar to a sticky notes pinboard',
    },
  },
  required: ['objectives', 'timeline', 'studentKeyPoints', 'bilingual', 'exitTickets', 'infographic', 'conceptExplanation'],
};

router.post('/generate-lesson-plan', async (req: Request, res: Response) => {
  try {
    const { syllabus, grade, subject, topic, duration, textbookContext, language } = req.body;
    const truncatedContext = limitContext(textbookContext, topic);
    const isTamil = language === 'tamil';

    const prompt = isTamil
      ? `நீங்கள் தமிழ்நாடு மாநில வாரிய பள்ளிகளுக்கான நிபுணத்துவம் வாய்ந்த பாடத்திட்ட உருவாக்குநர். கீழ்கண்ட தகவல்களுக்கு ஏற்ப ஒரு விரிவான பாட திட்டம் உருவாக்கவும்:
- பாடத்திட்டம்: ${syllabus}
- வகுப்பு: ${grade}
- பாடம்: ${subject}
- தலைப்பு: ${topic}
- காலம்: ${duration}
${truncatedContext ? `\nபாடநூல் பகுதி (\"${topic}\" பற்றிய தகவல்களை மட்டும் பயன்படுத்தவும்):\n${truncatedContext}` : ''}
\"${topic}\" பற்றிய தகவல்கள் இல்லாவிட்டால், தரமான TN Board பாடத்திட்டத்தை பின்பற்றவும்.

JSON schema-ஐ பின்பற்றி திரும்ப அனுப்பவும். அனைத்து உள்ளடக்கமும் குறிப்பாக \"${topic}\" பற்றியது மட்டுமே இருக்க வேண்டும். விதிகள்:
- objectives: சரியாக 3 கற்றல் நோக்கங்கள் — தமிழில் எழுதவும்.
- timeline: சரியாக 4 கட்டங்கள் — \"அறிமுகம் (Hook)\", \"முக்கிய போதனை (Core Instruction)\", \"வழிகாட்டப்பட்ட பயிற்சி (Guided Practice)\", \"மதிப்பீடு (Exit Ticket)\" — மொத்தம் ${duration} ஆகும். விவரங்கள் தமிழில்.
- studentKeyPoints: 5-6 முக்கிய புள்ளிகள் — en (ஆங்கிலம்) மற்றும் ta (தமிழ்) — இரண்டும் சம எண்ணிக்கையில், ஒரே வரிசையில். ta புள்ளிகள் இயற்கையான வகுப்பறை தமிழில் இருக்க வேண்டும்.
- bilingual: 5 முக்கிய தொழில்நுட்ப சொற்கள் (english, tamil, pronunciation).
- exitTickets: சரியாக 5 MCQ கேள்விகள் — கேள்விகள் தமிழிலும் ஆங்கிலத்திலும் — options \"A) ...\", answer is full correct option text.
- infographic: ${topic} பற்றிய உண்மையான தரவு — heroTitle (இரு மொழிகளிலும்), heroSubtitle \"${grade} ${subject}\", heroIcon (சிறந்த emoji), conceptColor (emerald/sky/indigo/amber/rose/teal/violet), 4 modules, 3 stats, 4 workflow steps, formulaBox + formulaExplain (தமிழில்), lawTitle + lawDesc (தமிழில்), 3 termTable entries, constantName/Value/Explain.`
      : `You are an expert curriculum developer for Tamil Nadu (TN) State Board schools.
Create the CORE of a syllabus-aligned lesson plan for:
- Syllabus: ${syllabus}
- Grade/Class: ${grade}
- Subject: ${subject}
- Topic/Chapter: ${topic}
- Duration: ${duration}
${truncatedContext ? `\nTextbook extract (use ONLY content about "${topic}", ignore other chapters):\n${truncatedContext}` : ''}
If "${topic}" is not in the context, use the standard TN Board curriculum.

Return JSON matching the provided schema. All content MUST be specifically about "${topic}" — no generic placeholders. Rules:
- objectives: exactly 3.
- timeline: exactly 4 phases — "The Hook", "Core Instruction", "Guided Practice", "Exit Ticket" — with realistic time ranges that sum to ${duration}.
- studentKeyPoints: 5-6 crisp, memorable takeaways for a student, given in BOTH English (en) and natural classroom Tamil (ta), same count and order. These are the "clear points" students see when the lesson is projected.
- bilingual: 5 key technical terms (english, tamil, pronunciation).
- exitTickets: exactly 5 MCQs; options formatted like "A) ...", answer is the full correct option text.
- infographic: real data about ${topic} — heroTitle (bilingual), heroSubtitle "Grade ${grade} ${subject}", heroIcon (best emoji), conceptColor (one of emerald/sky/indigo/amber/rose/teal/violet), 4 modules, 3 stats, 4 workflow steps, formulaBox + formulaExplain, lawTitle + lawDesc, 3 termTable entries, constantName/Value/Explain (use real constants; leave formula/law/constant blank only if genuinely not applicable to ${topic}).
- conceptExplanation: generate detailed content for a sticky note pinboard explaining the concept. Provide mainTitle, subtitle, whatIsIt (short intro), howItWorks (3-5 steps), keyJobs (3-5 jobs/roles), mainParts (3-5 parts), funFacts (3-5 facts), takeCare (3-5 tips), didYouKnow (interesting fact), and footerText.`;

    const core = await callGemini(prompt, true, LESSON_CORE_SCHEMA, 24000);
    res.json({
      success: true,
      data: {
        syllabus, grade, subject, topic, duration,
        planData: core,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/ai/generate-lesson-slides — lazy: only when the Slide Deck tool opens
const LESSON_SLIDES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    slides: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          subtitle: { type: 'STRING' },
          bullets: { type: 'ARRAY', items: { type: 'STRING' } },
          stickyNotes: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                heading: { type: 'STRING', description: 'A catchy title for the sticky note (e.g. Fun Fact, Pro Tip, Common Myth, Real World)' },
                detail: { type: 'STRING', description: 'Detailed, engaging explanation or trivia different from the main bullets' }
              },
              required: ['heading', 'detail']
            }
          },
          teacherNotes: { type: 'STRING' },
          studentActivity: { type: 'STRING' },
          illustrationPrompt: { type: 'STRING' },
          animationSuggestion: { type: 'STRING' },
          graphicType: { type: 'STRING' },
          graphicData: {
            type: 'OBJECT',
            properties: {
              label: { type: 'STRING' },
              values: { type: 'ARRAY', items: { type: 'STRING' } },
              formula: { type: 'STRING' },
              variables: { type: 'ARRAY', items: { type: 'STRING' } },
            },
          },
        },
        required: ['title', 'subtitle', 'bullets', 'graphicType'],
      },
    },
  },
  required: ['slides'],
};

router.post('/generate-lesson-slides', async (req: Request, res: Response) => {
  try {
    const { grade, subject, topic, textbookContext } = req.body;
    const truncatedContext = limitContext(textbookContext, topic);

    const prompt = `Generate EXACTLY 15 professional concept slides for a Grade ${grade} ${subject} lesson on "${topic}" (TN State Board).
${truncatedContext ? `Textbook context (only "${topic}"):\n${truncatedContext}\n` : ''}
Return JSON matching the schema (a "slides" array of exactly 15 objects) in this sequence:
1 Premium Cover (graphicType "hero", graphicData.label=title)
2 Learning Outcomes (concept, values=3-4 objectives)
3 Introduction (concept, values=3-4 points)
4 Concept Visualization (concept, label=main concept, values=4)
5 Real World Example (application, values=4)
6 Working Principle (process, label=process, values=4 steps)
7 Scientific Formula (formula, graphicData.formula=real formula, variables=3-4)
8 Comparison (comparison, values=[LeftHeader,RightHeader,r1l,r1r,r2l,r2r])
9 Experiment (experiment, values=3 apparatus)
10 Daily Life Applications (application, values=4)
11 Important Facts (concept, values=4)
12 Practice Questions (quiz)
13 Activity (experiment, values=3 materials)
14 Summary (summary, values=4)
15 Thank You (hero, label=next topic teaser)
Each slide: large bold title, minimal body (max 30 words), numbered bullets, one-line teacherNotes, one-line studentActivity. You MUST generate 3 to 4 'stickyNotes' with deep-dives, detailed explanations, real-world analogies, or extra facts. The text in 'stickyNotes' MUST be entirely different and more detailed than the 'bullets'. Additionally, 'graphicData' MUST visually represent the structural relationships or an entirely different facet of the concept, and MUST NOT simply duplicate the 'bullets'. All content specifically about "${topic}".`;

    const result = await callGemini(prompt, true, LESSON_SLIDES_SCHEMA, 32000, 150000);
    res.json({ success: true, data: Array.isArray(result?.slides) ? result.slides : [] });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/generate-lesson-quiz — lazy: 10 bilingual MCQs for the Assessment tool
// ===========================================================================
const LESSON_QUIZ_SCHEMA = {
  type: 'OBJECT',
  properties: {
    quiz: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          questionTa: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          answer: { type: 'STRING' },
          rationale: { type: 'STRING' },
          difficulty: { type: 'STRING' },
        },
        required: ['question', 'questionTa', 'options', 'answer', 'rationale', 'difficulty'],
      },
    },
  },
  required: ['quiz'],
};

router.post('/generate-lesson-quiz', async (req: Request, res: Response) => {
  try {
    const { grade, subject, topic, textbookContext } = req.body;
    const truncatedContext = limitContext(textbookContext, topic);

    const prompt = `Generate EXACTLY 10 multiple-choice quiz questions for a Grade ${grade} ${subject} lesson on "${topic}" (TN State Board).
${truncatedContext ? `Textbook context (only "${topic}"):\n${truncatedContext}\n` : ''}
Rules:
- Exactly 10 questions, all specifically about "${topic}".
- Progressive difficulty: 4 "Easy", 4 "Medium", 2 "Hard" (set the "difficulty" field accordingly).
- Each question: 4 options formatted like "A) ...", "B) ...", "C) ...", "D) ...".
- "answer" is the FULL text of the correct option (e.g. "B) ...").
- "questionTa" is a natural classroom Tamil translation of the question.
- "rationale" briefly explains why the answer is correct (1 sentence).`;

    const result = await callGemini(prompt, true, LESSON_QUIZ_SCHEMA, 20000, 120000);
    res.json({ success: true, data: Array.isArray(result?.quiz) ? result.quiz : [] });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/generate-lesson-podcast — lazy: bilingual 2-host audio script
// ===========================================================================
const LESSON_PODCAST_SCHEMA = {
  type: 'OBJECT',
  properties: {
    hosts: { type: 'ARRAY', items: { type: 'STRING' } },
    script: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          speaker: { type: 'STRING' },
          text: { type: 'STRING' },
          lang: { type: 'STRING' },
        },
        required: ['speaker', 'text', 'lang'],
      },
    },
  },
  required: ['hosts', 'script'],
};

router.post('/generate-lesson-podcast', async (req: Request, res: Response) => {
  try {
    const { grade, subject, topic, textbookContext } = req.body;
    const truncatedContext = limitContext(textbookContext, topic);

    const prompt = `Write a lively 2-host educational podcast that teaches "${topic}" to a Grade ${grade} ${subject} student (TN State Board).
${truncatedContext ? `Textbook context (only "${topic}"):\n${truncatedContext}\n` : ''}
Rules:
- hosts: exactly ["Arjun", "Meera"]. Arjun explains mostly in English; Meera adds warm Tamil explanations and analogies.
- script: 12-14 alternating turns. Each turn: "speaker" is "Arjun" or "Meera"; "text" is 1-3 sentences; "lang" is "en" for English lines and "ta" for lines that are primarily Tamil.
- Cover: a hook, the core concept, one real-world example, a common misconception, and a recap. Natural conversational tone, not a monologue.`;

    const result = await callGemini(prompt, true, LESSON_PODCAST_SCHEMA, 16000, 120000);
    res.json({ success: true, data: result && Array.isArray(result.script) ? result : { hosts: [], script: [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/generate-lesson-video — lazy: cinematic storyboard (image + narration)
// ===========================================================================
const LESSON_VIDEO_SCHEMA = {
  type: 'OBJECT',
  properties: {
    videoStoryboard: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sceneNumber: { type: 'NUMBER' },
          visualDescription: { type: 'STRING' },
          narrationText: { type: 'STRING' },
          subtitles: { type: 'STRING' },
        },
        required: ['sceneNumber', 'visualDescription', 'narrationText', 'subtitles'],
      },
    },
  },
  required: ['videoStoryboard'],
};

router.post('/generate-lesson-video', async (req: Request, res: Response) => {
  try {
    const { grade, subject, topic, textbookContext } = req.body;
    const truncatedContext = limitContext(textbookContext, topic);

    const prompt = `Create a cinematic 6-scene explainer-video storyboard that teaches "${topic}" to a Grade ${grade} ${subject} student (TN State Board).
${truncatedContext ? `Textbook context (only "${topic}"):\n${truncatedContext}\n` : ''}
Rules:
- videoStoryboard: exactly 6 scenes, sceneNumber 1..6 in order (intro hook → concept → how it works → real-world example → key takeaway → recap/outro).
- "visualDescription": a vivid, concrete image-generation prompt (what the camera sees) — realistic, detailed, education-friendly. No text overlays described.
- "narrationText": 1-2 sentence English voiceover for the scene.
- "subtitles": the same narration in natural Tamil.`;

    const result = await callGemini(prompt, true, LESSON_VIDEO_SCHEMA, 16000, 120000);
    res.json({ success: true, data: Array.isArray(result?.videoStoryboard) ? result.videoStoryboard : [] });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/generate-study-plan
// ===========================================================================
router.post('/generate-study-plan', async (req: Request, res: Response) => {
  try {
    const { subject, topic, grade, textbookContext } = req.body;
    const truncatedContext = limitContext(textbookContext, topic);

    const prompt = `
You are an expert AI Study Buddy for Tamil Nadu State Board students.
Create a personalized, 4-unit self-study plan in JSON format for:
Grade: ${grade}
Subject: ${subject}
Topic/Chapter: ${topic}
${truncatedContext ? `Textbook extract context:\n${truncatedContext}` : ''}

CRITICAL INSTRUCTION: If textbook context is provided, ONLY extract content about "${topic}". Ignore all other chapters.

CONSTRAINTS: goals=3, units=4, each unit: infographicCard (2 formulas, 2 keyConcepts, 1 illustration), audioGuide=2 turns, quiz=1 question, slides=15 (exactly 15 items in the slides array, mapping to Slide 1 through Slide 15 below).

SLIDE GENERATION RULES (CRITICAL):
Generate exactly 15 slides. The "slides" array in JSON MUST contain exactly 15 objects in this precise sequence.
Each slide must adhere to the following visual style and structure:

VISUAL STYLE & THEME:
- Background: Clean white/very light blue-white gradient. Professional, clean, modern, magazine-style educational presentation.
- Color Palette: Primary (Royal Blue, Navy, Indigo, White). Secondary (Emerald, Teal). Accents (Purple, Orange, Cyan).
- Illustration Style: Ultra-realistic 3D scientific illustration, white background, glassmorphism panels, detailed and professional, government educational standard, highly detailed, no cartoon, no clipart.
- Lighting: Soft, HDR, global illumination, glass reflections, natural and warm. No neon glow.
- Typography: Large bold title, numbered bullets, minimal body text (maximum 35 words per slide).
- Icons: Premium vector, scientific, modern (strictly no cartoons, no clipart).

SLIDE STRUCTURE (EXACTLY 15 SLIDES):
- Slide 1: Premium Cover → graphicType:"hero" graphicData.label=topic title
- Slide 2: Learning Outcomes → graphicType:"concept" graphicData.values=[3-4 objectives]
- Slide 3: Introduction → graphicType:"concept" graphicData.values=[3-4 key introduction points]
- Slide 4: Concept Visualization → graphicType:"concept" graphicData.label=main concept, values=[4 concept sub-elements]
- Slide 5: Real World Example → graphicType:"application" graphicData.values=[4 real examples with detail]
- Slide 6: Working Principle → graphicType:"process" graphicData.label=process name, values=[4 sequential steps]
- Slide 7: Scientific Formula → graphicType:"formula" graphicData.formula=actual formula, graphicData.variables=[3-4 variable explanations]
- Slide 8: Comparison → graphicType:"comparison" graphicData.label=comparison title, values=[LeftHeader, RightHeader, row1left, row1right, row2left, row2right]
- Slide 9: Experiment → graphicType:"experiment" graphicData.label=experiment name, values=[apparatus1, apparatus2, apparatus3]
- Slide 10: Daily Life Applications → graphicType:"application" graphicData.values=[4 detailed real-world uses]
- Slide 11: Important Facts → graphicType:"concept" graphicData.values=[4 key facts/milestones]
- Slide 12: Practice Questions → graphicType:"quiz"
- Slide 13: Activity → graphicType:"experiment" graphicData.values=[material1, material2, material3]
- Slide 14: Summary → graphicType:"summary" graphicData.values=[4 key summary points]
- Slide 15: Thank You → graphicType:"hero" graphicData.label=Next topic teaser

INFOGRAPHIC RULES — MOST IMPORTANT:
ALL infographic content MUST be about "${topic}" specifically. Use REAL educational data from the context.
- heroTitle: Tamil + English bilingual title for ${topic}
- heroSubtitle: Grade ${grade} ${subject} self-study guide
- heroIcon: pick best emoji for ${topic}
- conceptColor: one of emerald/sky/indigo/amber/rose/teal/violet
- modules: 4 real concept modules about ${topic}
- stats: 3 real quantitative facts/formulas from ${topic}
- workflow: 4 real steps to master ${topic}
- formulaBox: the actual primary formula or law for ${topic}
- formulaExplain: bilingual explanation of the formula
- lawTitle: name of the main law/theorem (bilingual)
- lawDesc: statement of the law (bilingual)
- termTable: 3 real technical terms from ${topic} (english, tamil, definition)
- constantName: a real key constant for ${topic}
- constantValue: the actual numeric value
- constantExplain: bilingual 1-sentence meaning

Output ONLY valid JSON (no markdown, no backticks):
{
  "subject": "${subject}",
  "topic": "${topic}",
  "grade": "${grade}",
  "goals": ["goal1", "goal2", "goal3"],
  "units": [
    {
      "id": "u1",
      "title": "Unit 1: Fundamentals of ${topic}",
      "status": "In Progress",
      "summary": "Introduction",
      "studyTime": "30 Minutes",
      "infographicCard": {
        "title": "Cheat Sheet",
        "formulas": ["formula1", "formula2"],
        "keyConcepts": ["concept1", "concept2"],
        "illustrations": ["visual description"]
      },
      "audioGuide": [
        {"speaker": "Karthik (AI Buddy)", "text": "explanation in English", "lang": "en"},
        {"speaker": "Priya (AI Buddy)", "text": "தமிழ் விளக்கம்", "lang": "ta"}
      ],
      "quiz": [{"question": "mcq?", "options": ["A) a","B) b","C) c","D) d"], "answer": "A) a", "rationale": "because"}]
    },
    {
      "id": "u2",
      "title": "Unit 2: Key Concepts of ${topic}",
      "status": "Pending",
      "summary": "Core concepts",
      "studyTime": "35 Minutes",
      "infographicCard": {"title": "Concepts", "formulas": ["f1","f2"], "keyConcepts": ["c1","c2"], "illustrations": ["visual"]},
      "audioGuide": [
        {"speaker": "Karthik (AI Buddy)", "text": "English explanation unit 2", "lang": "en"},
        {"speaker": "Priya (AI Buddy)", "text": "தமிழ் unit 2", "lang": "ta"}
      ],
      "quiz": [{"question": "unit2 mcq?", "options": ["A) a","B) b","C) c","D) d"], "answer": "B) b", "rationale": "because"}]
    },
    {
      "id": "u3",
      "title": "Unit 3: Problem Solving for ${topic}",
      "status": "Pending",
      "summary": "Practice and problems",
      "studyTime": "40 Minutes",
      "infographicCard": {"title": "Practice", "formulas": ["f1","f2"], "keyConcepts": ["c1","c2"], "illustrations": ["visual"]},
      "audioGuide": [
        {"speaker": "Karthik (AI Buddy)", "text": "English explanation unit 3", "lang": "en"},
        {"speaker": "Priya (AI Buddy)", "text": "தமிழ் unit 3", "lang": "ta"}
      ],
      "quiz": [{"question": "unit3 mcq?", "options": ["A) a","B) b","C) c","D) d"], "answer": "C) c", "rationale": "because"}]
    },
    {
      "id": "u4",
      "title": "Unit 4: Exam Preparation for ${topic}",
      "status": "Pending",
      "summary": "Revision and exam tips",
      "studyTime": "25 Minutes",
      "infographicCard": {"title": "Revision", "formulas": ["f1","f2"], "keyConcepts": ["c1","c2"], "illustrations": ["visual"]},
      "audioGuide": [
        {"speaker": "Karthik (AI Buddy)", "text": "English explanation unit 4", "lang": "en"},
        {"speaker": "Priya (AI Buddy)", "text": "தமிழ் unit 4", "lang": "ta"}
      ],
      "quiz": [{"question": "unit4 mcq?", "options": ["A) a","B) b","C) c","D) d"], "answer": "D) d", "rationale": "because"}]
    }
  ],
  "infographic": {
    "heroTitle": "REAL BILINGUAL TITLE FOR ${topic}",
    "heroSubtitle": "Grade ${grade} ${subject} Self-Study",
    "heroIcon": "📚",
    "conceptColor": "sky",
    "modules": [
      {"id": "m1", "title": "REAL CONCEPT 1 (தமிழ்)", "desc": "Real bilingual explanation.", "icon": "📌"},
      {"id": "m2", "title": "REAL CONCEPT 2 (தமிழ்)", "desc": "Real bilingual explanation.", "icon": "🔍"},
      {"id": "m3", "title": "REAL CONCEPT 3 (தமிழ்)", "desc": "Real bilingual explanation.", "icon": "⚡"},
      {"id": "m4", "title": "REAL CONCEPT 4 (தமிழ்)", "desc": "Real bilingual explanation.", "icon": "🌟"}
    ],
    "stats": [
      {"label": "REAL STAT 1", "value": "VALUE1", "desc": "explanation"},
      {"label": "REAL STAT 2", "value": "VALUE2", "desc": "explanation"},
      {"label": "REAL STAT 3", "value": "VALUE3", "desc": "explanation"}
    ],
    "workflow": [
      {"step": "REAL STEP 1 (படிநிலை)", "desc": "Real step explanation. தமிழ்.", "icon": "1️⃣"},
      {"step": "REAL STEP 2 (படிநிலை)", "desc": "Real step explanation. தமிழ்.", "icon": "2️⃣"},
      {"step": "REAL STEP 3 (படிநிலை)", "desc": "Real step explanation. தமிழ்.", "icon": "3️⃣"},
      {"step": "REAL STEP 4 (படிநிலை)", "desc": "Real step explanation. தமிழ்.", "icon": "4️⃣"}
    ],
    "formulaBox": "REAL PRIMARY FORMULA FOR ${topic}",
    "formulaExplain": "Bilingual formula explanation. சூத்திர விளக்கம்.",
    "lawTitle": "REAL LAW NAME (விதி)",
    "lawDesc": "Real bilingual law statement.",
    "termTable": [
      {"english": "term1", "tamil": "சொல்1", "definition": "definition1"},
      {"english": "term2", "tamil": "சொல்2", "definition": "definition2"},
      {"english": "term3", "tamil": "சொல்3", "definition": "definition3"}
    ],
    "constantName": "REAL CONSTANT NAME",
    "constantValue": "REAL NUMERIC VALUE",
    "constantExplain": "Bilingual constant explanation."
  },
  "slides": [
    {
      "title": "Slide Title (e.g. Premium Cover)",
      "subtitle": "Visual Explanation / Subtitle",
      "bullets": ["Bullet 1", "Bullet 2"],
      "teacherNotes": "Study notes...",
      "studentActivity": "Practice task...",
      "illustrationPrompt": "Ultra realistic, 3D scientific illustration, glassmorphism, white background...",
      "animationSuggestion": "Animated flow...",
      "graphicType": "hero|concept|formula|comparison|process|experiment|application|summary|quiz",
      "graphicData": {
        "label": "Main label or concept name",
        "values": ["Item 1", "Item 2", "Item 3", "Item 4"],
        "formula": "E = mc²",
        "variables": ["E = Energy", "m = Mass", "c = Speed of light"]
      }
    }
  ],
}
`;

    const result = await callGemini(prompt, true);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/draft-homework
// ===========================================================================
router.post('/draft-homework', async (req: Request, res: Response) => {
  try {
    const { topic, className } = req.body;

    const prompt = `
You are an expert teacher in Tamil Nadu, India, teaching the "TN Samacheer Kalvi" State Board syllabus.
Draft a short, engaging homework assignment for students.
Class & Subject: ${className}
Unit Title / Topic: ${topic}

Requirements:
- Provide 3-5 thought-provoking questions or tasks.
- Keep the language simple, direct, and grade-appropriate.
- Do NOT include any introductory or concluding pleasantries. Just return the homework questions/prompts directly as plain text with numbered bullet points.
- Include a mix of objective (e.g. fill in the blanks/multiple choice) and descriptive/creative questions.
- Optionally add a hint of regional relevance if applicable to the topic.
`;

    const result = await callGemini(prompt, false);
    res.json({ success: true, text: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/chat-tutor
// ===========================================================================
router.post('/chat-tutor', async (req: Request, res: Response) => {
  try {
    const { subject, grade, messages, currentMessage, language, studentId } = req.body;
    const parsedGrade = parseInt(String(grade || '').match(/\d+/)?.[0] || '10', 10);
    const dailyQuotaLimit = parsedGrade >= 11 ? 25 : 15;

    // Check daily quota if studentId is provided
    let countToday = 0;
    if (studentId) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayChats = await AIChat.find({
        studentId,
        updatedAt: { $gte: startOfDay }
      });

      for (const chat of todayChats) {
        countToday += (chat.messages || []).filter((m: any) => m.role === 'user').length;
      }

      if (countToday >= dailyQuotaLimit) {
        return res.status(429).json({
          success: false,
          error: `Daily question limit reached (${dailyQuotaLimit} questions/day for Grade ${parsedGrade}). Please return tomorrow for more learning!`,
          quotaExceeded: true,
          limit: dailyQuotaLimit,
          used: countToday
        });
      }
    }

    const historyText = (messages || [])
      .map((m: any) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
      .join('\n');

    let prompt = '';
    if (language === 'tamil') {
      prompt = `நீங்கள் தமிழ்நாடு பள்ளி மாணவர்களுக்கான ஒரு முழுமையான அனைத்துப் பாட AI கற்றல் ஆசிரியர் (All-Subject AI Scholar Tutor).
மாணவரின் வகுப்பு/தரநிலை: ${grade}.
மாணவர் தற்போது தேர்ந்தெடுத்துள்ள பாடம்/தலைப்பு: ${subject || 'அனைத்துப் பாடங்கள்'}.

முக்கியக் கட்டளைகள் (CRITICAL INSTRUCTIONS):
1. மாணவர் கணிதம், இயற்பியல், வேதியியல், உயிரியல், கணினி அறிவியல், வரலாறு, புவியியல், சமூக அறிவியல், வணிகவியல், கணக்குப்பதிவியல், பொருளாதாரம், தமிழ், ஆங்கிலம், பொது அறிவு போன்ற எந்தப் பாடத்தைப் பற்றிக் கேட்டாலும், அவரது வகுப்புக்கு (${grade}) ஏற்ற உயர்தர பாடத்திட்ட பதில்களைத் தெளிவாக வழங்க வேண்டும்.
2. "நான் ஒரு குறிப்பிட்ட பாடத்திற்கு மட்டுமே பதில் அளிப்பேன்" என்று ஒருபோதும் மறுக்கவோ கூறவோ கூடாது. நீங்கள் அனைத்துப் பாடங்களுக்கும் சந்தேகங்களைத் தீர்க்கும் தகுதிவாய்ந்த AI ஆசிரியர்.
3. முழுக்க முழுக்க தமிழில் மட்டுமே பதில் அளிக்கவும் (Only answer in Tamil). கடினமான கலைச்சொற்கள்/தொழில்நுட்ப சொற்கள் தேவைப்படும் போது அடைப்புக்குறியில் ஆங்கிலத்திலும் கொடுக்கலாம்.
4. தெளிவான bullet points, bold text, numbered lists பயன்படுத்தி கட்டமைக்கப்பட்ட வடிவில் பதில் அளிக்கவும்.
5. தொனி மிகவும் ஊக்கமளிக்கும் வகையிலும், வகுப்பறை ஆசிரியரைப் போல இயற்கையாகவும் இருக்க வேண்டும்.

உரையாடல் வரலாறு:
${historyText}
மாணவர்: ${currentMessage}`;
    } else if (language === 'english') {
      prompt = `You are a comprehensive All-Subject AI Scholar Tutor for Tamil Nadu school students.
Student Grade Level: ${grade}.
Currently selected subject/topic: ${subject || 'All Subjects'}.

CRITICAL INSTRUCTIONS:
1. You MUST answer questions across ALL academic subjects and disciplines (Mathematics, Physics, Chemistry, Biology, Computer Science, History, Geography, Social Science, Commerce, Accountancy, Economics, Languages, General Knowledge, etc.) tailored specifically to the student's grade standard (${grade}).
2. NEVER refuse to answer a question or claim that you are restricted to only Science, Math, or any single subject. You are a complete all-subject AI tutor for ${grade}. Regardless of what subject question the student asks, provide an accurate, in-depth, age-appropriate answer suitable for ${grade}.
3. Language mode: STRICTLY ENGLISH ONLY. Do not use any Tamil words or sentences.
4. Answer clearly with bullet points, bold text, and numbered lists where helpful.
5. Keep the tone encouraging, inspiring, and pedagogical.

Conversation history:
${historyText}
Student: ${currentMessage}`;
    } else {
      prompt = `You are a comprehensive, bilingual All-Subject AI Scholar Tutor for Tamil Nadu school students.
You speak both Tamil (தமிழ்) and English (Tanglish is also allowed).
Student Grade Level: ${grade}.
Currently selected subject/topic: ${subject || 'All Subjects'}.

CRITICAL INSTRUCTIONS:
1. You MUST answer questions across ALL academic subjects and disciplines (Mathematics, Physics, Chemistry, Biology, Computer Science, History, Geography, Social Science, Commerce, Accountancy, Economics, Tamil, English, General Knowledge, etc.) tailored specifically to the student's grade standard (${grade}).
2. NEVER refuse to answer a question or claim that you are restricted to only Science or one specific subject. You are an all-subject AI tutor. Whatever subject question the student asks, answer it thoroughly at the ${grade} curriculum level.
3. Language mode: BILINGUAL — mix clear English explanations with friendly Tamil reinforcement.
4. Answer clearly with bullet points, bold text, and numbered lists where helpful.
5. Keep the tone encouraging, inspiring, and pedagogical.

Conversation history:
${historyText}
Student: ${currentMessage}`;
    }

    const result = await callGemini(prompt, false);
    res.json({
      success: true,
      text: result,
      quotaInfo: {
        used: countToday + 1,
        limit: dailyQuotaLimit,
        remaining: Math.max(0, dailyQuotaLimit - (countToday + 1))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/chat — Save chat log
// ===========================================================================
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { studentId, sessionId, messages, subject, language } = req.body;
    const chat = await AIChat.findOneAndUpdate(
      { studentId, sessionId },
      { $set: { messages, subject, language } },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, data: chat });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/ai/chat/:studentId — Get chat history
router.get('/chat/:studentId', async (req: Request, res: Response) => {
  try {
    const chats = await AIChat.find({ studentId: req.params.studentId }).sort({ updatedAt: -1 }).limit(10);
    res.json({ success: true, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/ai/learning-path/:studentId
router.get('/learning-path/:studentId', async (req: Request, res: Response) => {
  try {
    const path = await LearningPath.findOne({ studentId: req.params.studentId });
    res.json({ success: true, data: path });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/ai/learning-path
router.post('/learning-path', async (req: Request, res: Response) => {
  try {
    const lp = await LearningPath.findOneAndUpdate(
      { studentId: req.body.studentId },
      req.body,
      { upsert: true, new: true }
    );
    res.json({ success: true, data: lp });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/ai/generate-questions
router.post('/generate-questions', async (req: Request, res: Response) => {
  try {
    const { grade, subject, topic, difficulty, mcqCount, shortCount, longCount } = req.body;

    const prompt = `
You are an expert curriculum developer and teacher for Tamil Nadu (TN) Schools under the State Board (Samacheer Kalvi) syllabus.
Generate high-quality questions for:
Grade: ${grade}
Subject: ${subject}
Topic/Concept: ${topic}
Overall Difficulty Level: ${difficulty}

You need to generate:
- MCQ questions (type: "mcq"): ${mcqCount || 0} questions. Each MCQ should have 4 options. Each MCQ is worth 1 mark. The options must be an array of strings like ["A) option1", "B) option2", "C) option3", "D) option4"] and answer must be the option letter (e.g. "A").
- Short Answer questions (type: "short"): ${shortCount || 0} questions. Each short answer question is worth 2 marks. Options should be empty/null, and answer should be a brief model answer key.
- Long Answer questions (type: "long"): ${longCount || 0} questions. Each long answer question is worth 5 marks. Options should be empty/null, and answer should be a detailed model answer key.

Your output MUST be a JSON object with a single key "questions" containing an array of all generated questions.
Each question object in the "questions" array MUST have the following structure:
{
  "type": "mcq" | "short" | "long",
  "difficulty": "${difficulty}",
  "text": "Question statement...",
  "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"] or null,
  "answer": "A" (for MCQs) or "brief model answer description" (for short/long questions),
  "marks": 1 (for mcq) or 2 (for short) or 5 (for long)
}

CRITICAL: Return ONLY valid JSON matching this schema. Do not add any introductory or concluding markdown code blocks other than standard JSON.
`;

    const schema = {
      type: "OBJECT",
      properties: {
        questions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: { type: "STRING", enum: ["mcq", "short", "long"] },
              difficulty: { type: "STRING" },
              text: { type: "STRING" },
              options: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              answer: { type: "STRING" },
              marks: { type: "INTEGER" }
            },
            required: ["type", "difficulty", "text", "answer", "marks"]
          }
        }
      },
      required: ["questions"]
    };

    const result = await callGemini(prompt, true, schema);
    const questionsWithMeta = (result.questions || []).map((q: any) => ({
      ...q,
      grade: q.grade || grade,
      subject: q.subject || subject,
      topic: q.topic || topic
    }));
    res.json({ success: true, data: questionsWithMeta });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/ai/generate-resource-content
router.post('/generate-resource-content', async (req: Request, res: Response) => {
  try {
    const { title, subject, type, description } = req.body;

    const prompt = `
You are an expert educator and content creator for Tamil Nadu (TN) State Board Syllabus.
Please generate comprehensive study material for the following topic:

Title: ${title}
Subject: ${subject}
Resource Type: ${type}
Description: ${description || "Provide a detailed overview and key notes."}

Generate structured, easy-to-read educational content. Include:
1. Introduction
2. Key Concepts & Definitions
3. Important Formulas / Facts (if applicable)
4. Summary / Conclusion

Keep it concise (around 400-500 words). Format the output cleanly.
Return a JSON object with a single key "content" containing the generated text (formatted with basic HTML tags like <h3>, <p>, <ul>, <li>, <strong> for readability).
`;

    const schema = {
      type: "OBJECT",
      properties: {
        content: { type: "STRING" }
      },
      required: ["content"]
    };

    const result = await callGemini(prompt, true, schema);
    res.json({ success: true, data: result.content });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/ai/companion
router.post('/companion', async (req: Request, res: Response) => {
  try {
    const { resourceId, title, subject, grade, description, aiContent } = req.body;
    if (!resourceId) {
      return res.status(400).json({ success: false, error: "resourceId is required" });
    }

    // 1. Check MongoDB cache first
    const cached = await LibraryCompanion.findOne({ resourceId });
    if (cached && cached.flashcards && cached.flashcards.length > 0 && cached.visualMindMap) {
      return res.json({ success: true, data: cached });
    }

    // 2. Generate new content using Gemini
    const prompt = `
You are an expert curriculum developer and teacher for Tamil Nadu (TN) Schools under the State Board (Samacheer Kalvi) syllabus.
Generate a comprehensive AI Study Companion package for:
Grade: ${grade}
Subject: ${subject}
Resource Title: ${title}
Resource Description: ${description || ""}
Additional Content context: ${aiContent || ""}

Please analyze this resource and produce:
1. **summary**: A structured, detailed, student-friendly text summary of the chapter/concept (approx 150-250 words, using basic HTML tags like <p>, <strong> for formatting).
2. **keyPoints**: An array of 4 to 6 critical bullet takeaways from the topic.
3. **formulas**: An array of important equations, scientific constants, or grammar rules/facts covered in this subject topic (provide 3-5 formulas if it's a science/math subject, or key rules/facts if it's a language/social study).
4. **mindMap**: A text-based ASCII flowchart or Mermaid diagram outline representing the flow of concepts in this resource, formatted as a clear hierarchy or relationship graph.
5. **examQuestions**: Exactly 5 important exam questions. For each question, provide a detailed model answer key and the number of marks (e.g. 1 for MCQ, 2 for short, 5 for long/essay).
6. **flashcards**: Exactly 6 study flashcards. Each card must have an id (e.g. "fc-1"), front (a key term, question, or conceptual hint), and back (the matching explanation, definition, or model answer).
7. **visualMindMap**: A tree hierarchy JSON structure for interactive rendering:
   - topic: The main root topic title
   - branches: An array of 3-5 subtopics, where each subtopic has a "title" and an array of "details" strings describing key points.

You MUST return a JSON object that matches this exact schema:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "formulas": ["...", "..."],
  "mindMap": "...",
  "examQuestions": [
    { "question": "...", "answerKey": "...", "marks": 5 },
    ...
  ],
  "flashcards": [
    { "id": "fc-1", "front": "...", "back": "..." },
    ...
  ],
  "visualMindMap": {
    "topic": "...",
    "branches": [
      { "title": "...", "details": ["...", "..."] },
      ...
    ]
  }
}
Return ONLY valid JSON matching this schema. Do not add markdown framing other than the JSON itself.
`;

    const schema = {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING" },
        keyPoints: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        formulas: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        mindMap: { type: "STRING" },
        examQuestions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              question: { type: "STRING" },
              answerKey: { type: "STRING" },
              marks: { type: "INTEGER" }
            },
            required: ["question", "answerKey", "marks"]
          }
        },
        flashcards: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              front: { type: "STRING" },
              back: { type: "STRING" }
            },
            required: ["id", "front", "back"]
          }
        },
        visualMindMap: {
          type: "OBJECT",
          properties: {
            topic: { type: "STRING" },
            branches: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  details: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["title", "details"]
              }
            }
          },
          required: ["topic", "branches"]
        }
      },
      required: ["summary", "keyPoints", "formulas", "mindMap", "examQuestions", "flashcards", "visualMindMap"]
    };

    const result = await callGemini(prompt, true, schema);
    
    // 3. Cache the response in MongoDB (overwrite if exists, to update with flashcards/mindmaps)
    const companion = await LibraryCompanion.findOneAndUpdate(
      { resourceId },
      {
        $set: {
          summary: result.summary,
          keyPoints: result.keyPoints || [],
          formulas: result.formulas || [],
          mindMap: result.mindMap || "",
          examQuestions: result.examQuestions || [],
          flashcards: result.flashcards || [],
          visualMindMap: result.visualMindMap || null
        }
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: companion });
  } catch (err) {
    console.error('[POST /api/ai/companion]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/career-aptitude
// AI-powered Career Aptitude Assessment for Tamil Nadu school students.
// Analyzes interests, academic profile, skills, and preferences to generate
// a personalized bilingual (English/Tamil) career guidance report.
// ===========================================================================
const CAREER_APTITUDE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    topCareers: {
      type: 'ARRAY',
      description: 'Exactly 3 best-fit career recommendations',
      items: {
        type: 'OBJECT',
        properties: {
          title:    { type: 'STRING', description: 'Career title in English' },
          titleTa:  { type: 'STRING', description: 'Career title in Tamil' },
          matchScore: { type: 'INTEGER', description: 'Match percentage 60-99' },
          whyMatch:   { type: 'STRING', description: 'Why this career fits (English, 2 sentences)' },
          whyMatchTa: { type: 'STRING', description: 'Why this career fits (Tamil, 2 sentences)' },
          roadmap:    { type: 'STRING', description: 'Step-by-step path after school (English)' },
          roadmapTa:  { type: 'STRING', description: 'Step-by-step path after school (Tamil)' },
          examTip:    { type: 'STRING', description: 'Key entrance exam and one preparation tip (English)' },
          examTipTa:  { type: 'STRING', description: 'Key entrance exam and one preparation tip (Tamil)' },
          stream:     { type: 'STRING', description: 'Recommended stream: Science / Commerce / Arts / Any' },
          salaryRange: { type: 'STRING', description: 'Expected salary range e.g. ₹6–40 LPA' },
        },
        required: ['title', 'titleTa', 'matchScore', 'whyMatch', 'whyMatchTa', 'roadmap', 'roadmapTa', 'examTip', 'examTipTa', 'stream', 'salaryRange'],
      },
    },
    personalityProfile: {
      type: 'OBJECT',
      properties: {
        type:          { type: 'STRING', description: 'Personality archetype name, e.g. "The Innovator"' },
        typeTa:        { type: 'STRING', description: 'Personality archetype name in Tamil' },
        description:   { type: 'STRING', description: '2-sentence description in English' },
        descriptionTa: { type: 'STRING', description: '2-sentence description in Tamil' },
        traits:        { type: 'ARRAY', items: { type: 'STRING' }, description: '5 personality trait labels' },
        traitsTa:      { type: 'ARRAY', items: { type: 'STRING' }, description: '5 personality trait labels in Tamil' },
        emoji:         { type: 'STRING', description: 'One emoji representing this personality' },
      },
      required: ['type', 'typeTa', 'description', 'descriptionTa', 'traits', 'traitsTa', 'emoji'],
    },
    strengthReport: {
      type: 'OBJECT',
      properties: {
        strongSubjects:      { type: 'ARRAY', items: { type: 'STRING' }, description: 'Top 3-4 strong subject/skill areas' },
        improvementAreas:    { type: 'ARRAY', items: { type: 'STRING' }, description: '2-3 areas to improve' },
        studyTip:            { type: 'STRING', description: 'One specific actionable study tip (English)' },
        studyTipTa:          { type: 'STRING', description: 'One specific actionable study tip (Tamil)' },
        uniqueStrength:      { type: 'STRING', description: 'One standout quality this student has (English)' },
        uniqueStrengthTa:    { type: 'STRING', description: 'One standout quality this student has (Tamil)' },
      },
      required: ['strongSubjects', 'improvementAreas', 'studyTip', 'studyTipTa', 'uniqueStrength', 'uniqueStrengthTa'],
    },
    actionPlan: {
      type: 'OBJECT',
      properties: {
        immediate:  { type: 'ARRAY', items: { type: 'STRING' }, description: '3 things to do right now (this week)' },
        shortTerm:  { type: 'ARRAY', items: { type: 'STRING' }, description: '3 goals for the next 6 months' },
        longTerm:   { type: 'ARRAY', items: { type: 'STRING' }, description: '3 goals for 1-2 years from now' },
        immediateTa: { type: 'ARRAY', items: { type: 'STRING' }, description: '3 immediate actions in Tamil' },
        shortTermTa: { type: 'ARRAY', items: { type: 'STRING' }, description: '3 short-term goals in Tamil' },
        longTermTa:  { type: 'ARRAY', items: { type: 'STRING' }, description: '3 long-term goals in Tamil' },
      },
      required: ['immediate', 'shortTerm', 'longTerm', 'immediateTa', 'shortTermTa', 'longTermTa'],
    },
    motivationalNote:   { type: 'STRING', description: '2-sentence personal encouragement in English, using the student name' },
    motivationalNoteTa: { type: 'STRING', description: '2-sentence personal encouragement in Tamil, using the student name' },
  },
  required: ['topCareers', 'personalityProfile', 'strengthReport', 'actionPlan', 'motivationalNote', 'motivationalNoteTa'],
};

router.post('/career-aptitude', async (req: Request, res: Response) => {
  try {
    const {
      studentName = 'Student',
      studentClass = 10,
      language = 'English',
      interests = [],
      academicStrengths = [],
      weakSubjects = [],
      skills = [],
      careerPreferences = [],
      workStyle = 'Both',
      roleModel = '',
      hobbies = '',
    } = req.body;

    const isTamil = language === 'Tamil';

    const prompt = `You are an expert Tamil Nadu school career counselor with 20 years of experience.
A student from Tamil Nadu Government School has completed a Career Aptitude Assessment. 
Analyze their profile and generate a comprehensive, personalized career guidance report.

STUDENT PROFILE:
- Name: ${studentName}
- Class: ${studentClass} (Tamil Nadu State Board)
- Interests: ${interests.join(', ') || 'Not specified'}
- Academic Strengths: ${academicStrengths.join(', ') || 'Not specified'}
- Weak Subjects: ${weakSubjects.join(', ') || 'None mentioned'}
- Skills: ${skills.join(', ') || 'Not specified'}
- Career Preferences: ${careerPreferences.join(', ') || 'Not specified'}
- Preferred Work Style: ${workStyle}
- Role Model: ${roleModel || 'Not specified'}
- Hobbies: ${hobbies || 'Not specified'}

CONTEXT:
- Student is in Tamil Nadu, India — recommend careers relevant to TN/Indian education system
- Consider TN Board curriculum: NEET for Medical, JEE/TNEA for Engineering, CLAT for Law, TNPSC/UPSC for Civil Services
- Class ${studentClass} students should be given age-appropriate and actionable advice
- Prioritize government college opportunities (IIT Madras, NIT Trichy, Anna University, AIIMS Madurai, MMC, etc.)
- Be specific and warm — this student may be the first in their family to explore career planning

RULES:
- Recommend EXACTLY 3 careers in topCareers, ordered from best to third-best match
- matchScore must reflect genuine alignment with the student's profile (60–99)
- All Tamil text (titleTa, whyMatchTa, roadmapTa, examTipTa, typeTa, descriptionTa, traitsTa, studyTipTa, uniqueStrengthTa, immediateTa, shortTermTa, longTermTa, motivationalNoteTa) must be in proper, natural Tamil (not just transliteration)
- Action plan items must be concrete and achievable for a Class ${studentClass} student
- Motivational note must address the student by first name and be warm, encouraging, and specific

${isTamil ? 'IMPORTANT: The student prefers Tamil — make Tamil sections especially rich and detailed.' : ''}

Return a JSON object matching the provided schema exactly.`;

    const result = await callGemini(prompt, true, CAREER_APTITUDE_SCHEMA, 4096, 60000);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[POST /api/ai/career-aptitude]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/daily-discovery — lazy: 5 mind-blowing facts for TikTok-style feed
// ===========================================================================
const DAILY_DISCOVERY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    facts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING' },
          categoryTa: { type: 'STRING' },
          title: { type: 'STRING' },
          titleTa: { type: 'STRING' },
          fact: { type: 'STRING' },
          factTa: { type: 'STRING' },
          imageSearchTerm: { type: 'STRING', description: 'One english keyword like "space" or "laser"' },
          color: { type: 'STRING', description: 'Tailwind gradient classes e.g., "from-emerald-600/90 to-slate-900/95"' },
          icon: { type: 'STRING', description: 'Flaticon class e.g., "fi fi-sr-rocket"' },
          quiz: {
            type: 'OBJECT',
            properties: {
              question: { type: 'STRING' },
              questionTa: { type: 'STRING' },
              options: { type: 'ARRAY', items: { type: 'STRING' } },
              optionsTa: { type: 'ARRAY', items: { type: 'STRING' } },
              answer: { type: 'NUMBER', description: 'Index of correct option (0-2)' }
            },
            required: ['question', 'questionTa', 'options', 'optionsTa', 'answer']
          }
        },
        required: ['category', 'categoryTa', 'title', 'titleTa', 'fact', 'factTa', 'imageSearchTerm', 'color', 'icon', 'quiz']
      }
    }
  },
  required: ['facts']
};

router.post('/daily-discovery', async (req: Request, res: Response) => {
  try {
    const { level = 'middle' } = req.body;
    const prompt = `Generate exactly 5 fascinating, mind-blowing educational facts suitable for a ${level} school student (TN State Board). 
Cover diverse categories like Cosmos, Tech & AI, Nature, History, and Physics.
Make the facts engaging and punchy.
Rules:
- facts: array of exactly 5 items.
- title: A big engaging question in English.
- titleTa: Natural Tamil translation of the title.
- fact: A 2-3 sentence punchy explanation.
- factTa: Natural Tamil translation of the fact.
- imageSearchTerm: A single, highly visual English keyword (e.g. "galaxy", "robot", "forest").
- color: Pick a Tailwind gradient (e.g. "from-blue-600/90 to-slate-900/95", "from-purple-600/90 to-slate-900/95"). Use a variety.
- icon: Pick a relevant Flaticon class (e.g. "fi fi-sr-rocket", "fi fi-sr-brain", "fi fi-sr-microchip").
- quiz.options & quiz.optionsTa: exactly 3 options.
- quiz.answer: the 0-based index of the correct option.`;

    const result = await callGemini(prompt, true, DAILY_DISCOVERY_SCHEMA, 12000, 60000);
    
    // Map imageSearchTerm to an unsplash URL
    if (result && Array.isArray(result.facts)) {
      result.facts = result.facts.map((f: any, idx: number) => {
        f.id = Date.now() + idx;
        f.image = `https://source.unsplash.com/1200x800/?${encodeURIComponent(f.imageSearchTerm || 'education')}`;
        return f;
      });
    }

    res.json({ success: true, data: result?.facts || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});
// ===========================================================================
// POST /api/ai/generate-3d — Generate 3D schematic models using Gemini
// ===========================================================================
const GENERATE_3D_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Title of the 3D model' },
    subject: { type: 'STRING', description: 'Subject area, e.g., Biology, Physics, Tech' },
    description: { type: 'STRING', description: 'A short description of what this model demonstrates' },
    color: { type: 'STRING', description: 'One of: rose, indigo, emerald, amber, sky, purple' },
    shapes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', description: 'One of: sphere, cylinder, box, ring, line, particle_cloud, text' },
          color: { type: 'STRING', description: 'Hex color code' },
          label: { type: 'STRING' },
          description: { type: 'STRING' },
          x: { type: 'NUMBER' },
          y: { type: 'NUMBER' },
          z: { type: 'NUMBER' },
          radius: { type: 'NUMBER' },
          x1: { type: 'NUMBER' },
          y1: { type: 'NUMBER' },
          z1: { type: 'NUMBER' },
          x2: { type: 'NUMBER' },
          y2: { type: 'NUMBER' },
          z2: { type: 'NUMBER' },
          w: { type: 'NUMBER' },
          h: { type: 'NUMBER' },
          d: { type: 'NUMBER' },
          plane: { type: 'STRING', description: 'xy, xz, yz (only for ring)' },
          thickness: { type: 'NUMBER' },
          text: { type: 'STRING' },
          fontSize: { type: 'NUMBER' },
          xLink: { type: 'NUMBER' },
          yLink: { type: 'NUMBER' },
          zLink: { type: 'NUMBER' }
        },
        required: ['type', 'color']
      }
    }
  },
  required: ['name', 'subject', 'description', 'color', 'shapes']
};

router.post('/generate-3d', async (req: Request, res: Response) => {
  try {
    const { topic, subject = "Science", imageBase64, imageMimeType } = req.body;
    
    if (!topic && !imageBase64) {
      return res.status(400).json({ success: false, error: 'Topic or image is required' });
    }

    let prompt = `You are a 3D structural designer. Generate a schematic 3D model representing the topic: "${topic || 'Unknown'}" in the subject area of "${subject}".\n`;
    if (imageBase64) {
      prompt += `I have provided an image for reference. Analyze the image and generate a 3D layout that matches the structures, components, or layout shown in the image.\n`;
    }
    prompt += `The model should be composed of 5 to 15 primitive shapes (sphere, cylinder, box, ring, line, text).
Each shape can have a label and description for educational purposes.
Use appropriate hex colors. Keep coordinates (x,y,z) roughly within a -100 to 100 range.
Add descriptive text nodes with pointers (xLink, yLink, zLink) to explain parts of the model.
Return the layout adhering strictly to the JSON schema.`;

    const result = await callGemini(prompt, true, GENERATE_3D_SCHEMA, 8000, 60000, imageBase64, imageMimeType);
    
    try {
      if (topic) {
        // Search by relevance rather than likeCount to avoid keyword-stuffed irrelevant models
        const sketchfabUrl = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(topic)}`;
        const sketchRes = await fetch(sketchfabUrl);
        if (sketchRes.ok) {
          const sketchData = await sketchRes.json();
          if (sketchData.results && sketchData.results.length > 0) {
            result.sketchfabUid = sketchData.results[0].uid;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch from Sketchfab', e);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('[POST /api/ai/generate-3d]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/saved-3d-models - Save a 3D model
// ===========================================================================
router.post('/saved-3d-models', async (req: Request, res: Response) => {
  try {
    const { name, subject, color, sketchfabUid, shapes, description } = req.body;
    const model = new Saved3DModel({
      userId: req.user!.id,
      name,
      subject,
      color,
      sketchfabUid,
      shapes,
      description
    });
    await model.save();
    res.json({ success: true, data: model });
  } catch (err) {
    console.error('[POST /api/ai/saved-3d-models]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// GET /api/ai/saved-3d-models - Get all saved 3D models for user
// ===========================================================================
router.get('/saved-3d-models', async (req: Request, res: Response) => {
  try {
    const models = await Saved3DModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: models });
  } catch (err) {
    console.error('[GET /api/ai/saved-3d-models]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// DELETE /api/ai/saved-3d-models/:id - Delete a saved 3D model
// ===========================================================================
router.delete('/saved-3d-models/:id', async (req: Request, res: Response) => {
  try {
    const model = await Saved3DModel.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!model) {
      return res.status(404).json({ success: false, error: 'Model not found or not authorized' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/ai/saved-3d-models/:id]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/generate-questions
// ===========================================================================
router.post('/generate-questions', async (req: Request, res: Response) => {
  try {
    const { grade, subject, topic, difficulty, mcqCount = 5 } = req.body;
    
    const prompt = `You are an expert educator. Create a mock test for ${grade} students on the subject of ${subject}. The specific topic is "${topic}". The difficulty level should be ${difficulty}.
    
Generate exactly ${mcqCount} multiple choice questions.
Return ONLY a JSON array of objects.
Each object must match this schema exactly:
{
  "type": "mcq",
  "text": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "The correct option exactly as it appears in the options array",
  "marks": 1
}`;

    const schema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING" },
          text: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" } },
          answer: { type: "STRING" },
          marks: { type: "INTEGER" }
        },
        required: ["type", "text", "options", "answer", "marks"]
      }
    };

    const questions = await callGemini(prompt, true, schema);
    res.json({ success: true, data: questions });
  } catch (err) {
    console.error('[POST /api/ai/generate-questions]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/visualdesign
// ===========================================================================
const VISUAL_DESIGN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    subtitle: { type: 'STRING' },
    introduction: { type: 'STRING' },
    centralImageUrl: { type: 'STRING', description: 'A single unsplash image keyword like "earth" or "galaxy"' },
    whatIsIt: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          icon: { type: 'STRING', description: 'A flat icon name, e.g., fi-rr-apple, fi-rr-arrow-down' },
          text: { type: 'STRING' }
        },
        required: ['icon', 'text']
      }
    },
    lawOrFormula: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        subtitle: { type: 'STRING' },
        formula: { type: 'STRING' },
        variables: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              symbol: { type: 'STRING' },
              explanation: { type: 'STRING' }
            },
            required: ['symbol', 'explanation']
          }
        }
      },
      required: ['title', 'subtitle', 'formula', 'variables']
    },
    keyFacts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          icon: { type: 'STRING', description: 'fi-rr-dumbbell, fi-rr-arrows-h, etc.' },
          title: { type: 'STRING' },
          description: { type: 'STRING' }
        },
        required: ['icon', 'title', 'description']
      }
    },
    didYouKnow: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        description: { type: 'STRING' }
      },
      required: ['title', 'description']
    },
    examples: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          imageKeyword: { type: 'STRING', description: 'Keyword for Unsplash, e.g., "skydiver", "moon"' },
          title: { type: 'STRING' },
          description: { type: 'STRING' }
        },
        required: ['imageKeyword', 'title', 'description']
      }
    },
    applications: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          icon: { type: 'STRING', description: 'fi-rr-rocket, fi-rr-bridge, etc.' },
          title: { type: 'STRING' },
          description: { type: 'STRING' }
        },
        required: ['icon', 'title', 'description']
      }
    },
    quote: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING' },
        author: { type: 'STRING' }
      },
      required: ['text', 'author']
    },
    remember: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        text: { type: 'STRING' }
      },
      required: ['title', 'text']
    }
  },
  required: ['title', 'subtitle', 'introduction', 'centralImageUrl', 'whatIsIt', 'lawOrFormula', 'keyFacts', 'didYouKnow', 'examples', 'applications', 'quote', 'remember']
};

router.post('/visualdesign', async (req: Request, res: Response) => {
  try {
    const { command, focus } = req.body;
    
    if (!command) {
      return res.status(400).json({ success: false, message: "Missing command" });
    }

    let focusInstruction = "";
    if (focus === "Exam point of view") {
      focusInstruction = "FOCUS: Exam point of view. Prioritize academic definitions, crucial formulas, board-exam patterns, strict syllabus alignment, and highly testable facts.";
    } else if (focus === "General knowledge") {
      focusInstruction = "FOCUS: General knowledge. Prioritize fascinating trivia, real-world relevance, broad concepts, historical context, and fun facts.";
    } else if (focus === "Know more") {
      focusInstruction = "FOCUS: Know more (Deep dive). Prioritize advanced concepts, cutting-edge applications, complex underlying theories, and beyond-the-syllabus explorations.";
    }

    const prompt = `You are an expert educational content generator.
The user wants an infographic for the topic: "${command}"
${focusInstruction}

Generate structured JSON data for a stunning, comprehensive infographic. The content should be accurate, detailed, and fit perfectly into the provided schema.

CRITICAL INSTRUCTION FOR ICONS:
For any field requiring an icon, you MUST choose strictly from this exact list of safe icons:
"fi-rr-star", "fi-rr-lightbulb", "fi-rr-book-alt", "fi-rr-world", "fi-rr-leaf", "fi-rr-rocket", "fi-rr-heart", "fi-rr-sun", "fi-rr-moon", "fi-rr-shield", "fi-rr-bolt", "fi-rr-microscope", "fi-rr-atom", "fi-rr-telescope", "fi-rr-chart-pie", "fi-rr-flask", "fi-rr-brain", "fi-rr-clock", "fi-rr-graduation-cap", "fi-rr-users", "fi-rr-building", "fi-rr-computer", "fi-rr-globe", "fi-rr-water", "fi-rr-flame", "fi-rr-cloud", "fi-rr-wind"

Do NOT make up any other icon names.

Ensure you provide:
- A strong title and subtitle
- An introductory paragraph
- "whatIsIt": 4 key points defining the topic. Provide flaticon class names for icons from the safe list.
- "lawOrFormula": The main governing law/formula for this topic, with variable definitions.
- "keyFacts": 5 interesting facts with icons from the safe list.
- "didYouKnow": A mind-blowing trivia box.
- "examples": 5 real-world examples with a 1-2 word image generation prompt for the image (e.g. "vast galaxy", "green leaf macro").
- "applications": 3 practical applications with icons from the safe list.
- "quote": A famous quote related to this topic.
- "remember": A brief summary.

Return ONLY valid JSON matching the schema.`;

    const designData = await callGemini(prompt, true, VISUAL_DESIGN_SCHEMA, 8192);
    res.json({ success: true, data: designData });
  } catch (err) {
    console.error('[POST /api/ai/visualdesign]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

const LAB_DESIGN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    subtitle: { type: 'STRING' },
    aim: { type: 'STRING' },
    centralImageUrl: { type: 'STRING' },
    apparatus: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    theory: {
      type: 'OBJECT',
      properties: {
        description: { type: 'STRING' },
        formula: { type: 'STRING' }
      },
      required: ['description', 'formula']
    },
    procedures: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    flowchart: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          step: { type: 'STRING' },
          action: { type: 'STRING' }
        },
        required: ['step', 'action']
      }
    },
    precautions: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    }
  },
  required: ['title', 'subtitle', 'aim', 'centralImageUrl', 'apparatus', 'theory', 'procedures', 'flowchart', 'precautions']
};

// ===========================================================================
// POST /api/ai/labdesign
// ===========================================================================
router.post('/labdesign', async (req: Request, res: Response) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ success: false, message: "Missing command" });
    }

    const prompt = `You are an expert educational lab content generator.
The user wants a lab experiment infographic for the topic: "${command}"

Generate structured JSON data for a stunning, comprehensive lab experiment infographic. 
Ensure you provide:
- A strong title and subtitle
- aim: The objective of the experiment
- apparatus: List of materials needed
- theory: The underlying principle, and the governing formula if any (use N/A if not applicable)
- procedures: 5-8 clear numbered steps detailing how to perform the experiment
- flowchart: The procedure broken down into a 4-5 step sequence representing a flowchart or pipeline. For each item provide the 'step' number and the 'action' (very brief summary).
- precautions: 3-5 crucial safety precautions or tips for accuracy.
- centralImageUrl: A 1-3 word prompt describing the primary apparatus or setup for generating an image (e.g., "titration setup", "microscope view").

Return ONLY valid JSON matching the schema.`;

    const designData = await callGemini(prompt, true, LAB_DESIGN_SCHEMA, 8192);
    res.json({ success: true, data: designData });
  } catch (err) {
    console.error('[POST /api/ai/labdesign]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// POST /api/ai/visualdesign/save
// ===========================================================================
router.post('/visualdesign/save', async (req: Request, res: Response) => {
  try {
    const { className, subjectId, topic, focus, infographicData } = req.body;
    
    if (!className || !subjectId || !topic || !infographicData) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const saved = await prisma.infographicLesson.create({
      data: {
        class: String(className),
        subjectId,
        topic,
        focus: focus || "General",
        infographicData,
        teacherId: req.user?.id || null
      }
    });

    res.json({ success: true, data: saved });
  } catch (err) {
    console.error('[POST /api/ai/visualdesign/save]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// GET /api/ai/visualdesign/list
// ===========================================================================
router.get('/visualdesign/list', async (req: Request, res: Response) => {
  try {
    const { className, subjectId, topic, focus } = req.query;

    const whereClause: any = {};
    if (className) whereClause.class = String(className);
    if (subjectId) whereClause.subjectId = String(subjectId);
    if (topic) whereClause.topic = { contains: String(topic), mode: 'insensitive' };
    if (focus) whereClause.focus = String(focus);

    const list = await prisma.infographicLesson.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: list });
  } catch (err) {
    console.error('[GET /api/ai/visualdesign/list]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// GET /api/ai/visualdesign/published
// ===========================================================================
router.get('/visualdesign/published', async (req: Request, res: Response) => {
  try {
    const { className, section, schoolId } = req.query;

    if (!className) {
      return res.status(400).json({ success: false, message: "Class is required" });
    }

    const classNum = (String(className).match(/\d+/) || [])[0];
    const schoolIdStr = schoolId ? String(schoolId).trim() : (req.user?.schoolId || null);

    const andConditions: any[] = [
      { isPublished: true },
      { class: classNum || String(className) }
    ];

    if (schoolIdStr) {
      const schoolUsers = await prisma.user.findMany({
        where: { schoolId: schoolIdStr },
        select: { id: true }
      });
      const userIds = schoolUsers.map(u => u.id);

      const schoolTeachers = await prisma.teacher.findMany({
        where: { schoolId: schoolIdStr },
        select: { id: true, userId: true }
      });
      schoolTeachers.forEach(t => {
        if (t.id) userIds.push(t.id);
        if (t.userId) userIds.push(t.userId);
      });

      const uniqueTeacherIds = Array.from(new Set(userIds));
      andConditions.push({
        OR: [
          { teacherId: { in: uniqueTeacherIds } },
          { teacherId: null }
        ]
      });
    }

    if (section) {
      andConditions.push({
        publishedSections: {
          has: String(section).toUpperCase().trim()
        }
      });
    }

    const list = await prisma.infographicLesson.findMany({
      where: { AND: andConditions },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: list });
  } catch (err) {
    console.error('[GET /api/ai/visualdesign/published]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ===========================================================================
// GET /api/ai/visualdesign/:id
// ===========================================================================
router.get('/visualdesign/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await prisma.infographicLesson.findUnique({
      where: { id }
    });
    
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Infographic not found" });
    }

    res.json({ success: true, data: lesson });
  } catch (err) {
    console.error('[GET /api/ai/visualdesign/:id]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});



// ===========================================================================
// PUT /api/ai/visualdesign/:id/publish
// ===========================================================================
router.put('/visualdesign/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPublished, publishedSections } = req.body;

    const lesson = await prisma.infographicLesson.update({
      where: { id },
      data: {
        isPublished: Boolean(isPublished),
        publishedSections: Array.isArray(publishedSections) ? publishedSections : []
      }
    });

    res.json({ success: true, data: lesson });
  } catch (err) {
    console.error('[PUT /api/ai/visualdesign/:id/publish]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
