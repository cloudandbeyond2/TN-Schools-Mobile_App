import { prisma } from './config/prisma';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not defined in the environment.");
  process.exit(1);
}

// JSON parsing & cleaning helpers
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
  if (s.startsWith('```json')) s = s.slice(7).trim();
  else if (s.startsWith('```')) s = s.slice(3).trim();
  if (s.endsWith('```')) s = s.slice(0, s.length - 3).trim();
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) s = s.substring(firstBrace, lastBrace + 1);
  s = s.replace(/,\s*([\]}])/g, '$1');
  s = fixUnescapedControlChars(s);
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

async function callGemini(prompt: string): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 8192,
      responseMimeType: 'application/json'
    }
  };

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
          reject(new Error(`Gemini API error ${res.statusCode}: ${body}`));
          return;
        }
        try {
          const parsed = JSON.parse(body);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            reject(new Error('Empty content from Gemini.'));
            return;
          }
          resolve(robustParseJSON(text));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log("Generating Premium Lesson Plan & Slides for Class 8 Science...");

  const prompt = `
You are an expert curriculum developer for Tamil Nadu (TN) Schools.
Generate a comprehensive, syllabus-aligned lesson plan in JSON format for:
Syllabus: TN State Board (Samacheer Kalvi)
Grade/Class: Grade 8
Subject: Science
Topic/Chapter: Fundamentals of Measurement and Pressure
Language: Tamil + English Bilingual

CONSTRAINTS (MUST BE STRICTLY MET):
1. Create a complete visual lesson deck containing EXACTLY 20 premium slides inside the "slides" array.
2. Keep visible text per slide extremely minimal (Maximum 35 words total in "bullets" array per slide).
3. The content must be bilingual. Use Tamil + English side-by-side where appropriate.
4. Each slide must explain ONE concept visually.

OUTPUT STRUCTURE:
Output ONLY valid JSON (no markdown wrapper, no backticks):
{
  "objectives": ["obj1", "obj2", "obj3"],
  "timeline": [
    {"time": "00-05 Mins", "activity": "The Hook", "description": "Engaging visual setup"},
    {"time": "05-25 Mins", "activity": "Core Instruction", "description": "Theory and slides"},
    {"time": "25-40 Mins", "activity": "Active Learning", "description": "Student activity"},
    {"time": "40-45 Mins", "activity": "Quiz & Recap", "description": "Exit Tickets"}
  ],
  "bilingual": [
    {"english": "Measurement", "tamil": "அளவீடு", "pronunciation": "Alaveedu"},
    {"english": "Pressure", "tamil": "அழுத்தம்", "pronunciation": "Azhutham"},
    {"english": "Pascal's Law", "tamil": "பாஸ்கல் விதி", "pronunciation": "Paaskal Vidhi"},
    {"english": "Atmospheric Pressure", "tamil": "வளிமண்டல அழுத்தம்", "pronunciation": "Valimandala Azhutham"}
  ],
  "exitTickets": [
    {
      "question": "What is the SI unit of Pressure? / அழுத்தத்தின் SI அலகு எது?",
      "options": ["A) Newton / நியூட்டன்", "B) Pascal / பாஸ்கல்", "C) Joule / ஜூல்", "D) Watt / வாட்"],
      "answer": "B) Pascal / பாஸ்கல்",
      "rationale": "Pascal (Pa) is equivalent to one newton per square meter."
    },
    {
      "question": "Which instrument is used to measure atmospheric pressure? / வளிமண்டல அழுத்தத்தை அளவிடப் பயன்படும் கருவி எது?",
      "options": ["A) Thermometer / வெப்பமானி", "B) Barometer / காற்றழுத்தமானி", "C) Manometer / அழுத்தமானி", "D) Hydrometer / திரவமானி"],
      "answer": "B) Barometer / காற்றழுத்தமானி",
      "rationale": "A barometer measures atmospheric pressure."
    }
  ],
  "slides": [
    {
      "title": "Title of Slide (Bilingual, e.g. Slide 1: Cover Page / அட்டைப் படம்)",
      "subtitle": "Bilingual visual subtitle or explanation (e.g. Understanding Measurement / அளவீட்டைப் புரிந்துகொள்ளுதல்)",
      "bullets": ["Bullet 1 in bilingual (under 15 words)", "Bullet 2 in bilingual (under 15 words)"],
      "teacherNotes": "Detailed presentation instructions and notes for the teacher in English + Tamil.",
      "studentActivity": "Think / Observe / Discuss task for students in English + Tamil.",
      "illustrationPrompt": "AI Image prompt describing an ultra-realistic 3D scientific glassmorphic illustration or diagram with a white background and soft shadows.",
      "animationSuggestion": "Recommended animation path (Fade / Zoom / Morph / Sequential Build)"
    }
  ],
  "podcast": {
    "hosts": ["Aravind (AI Teacher)", "Meera (AI Expert)"],
    "script": [
      {"speaker": "Aravind", "text": "Welcome students! Today we explore measurement and pressure.", "lang": "en"},
      {"speaker": "Meera", "text": "வணக்கம் மாணவர்களே! இன்று நாம் அளவீடு மற்றும் அழுத்தம் பற்றிப் படிப்போம்.", "lang": "ta"},
      {"speaker": "Aravind", "text": "Pressure is force per unit area.", "lang": "en"},
      {"speaker": "Meera", "text": "ஆமாம், ஓரலகு பரப்பில் செயல்படும் விசையே அழுத்தம் ஆகும்.", "lang": "ta"}
    ]
  },
  "videoStoryboard": [
    {
      "sceneNumber": 1,
      "visualDescription": "3D animation showing a balloon being pressed and pop under pressure.",
      "narrationText": "Watch how pressure is distributed equally in all directions inside the balloon.",
      "subtitles": "பலூனின் உள்ளே அழுத்தம் அனைத்து திசைகளிலும் சமமாகப் பரவுவதைப் பாருங்கள்."
    }
  ],
  "infographic": {
    "heroTitle": "அளவீடு மற்றும் அழுத்தம் (Measurement & Pressure)",
    "heroSubtitle": "Class 8 Science Visual Guide",
    "heroIcon": "🔬",
    "conceptColor": "indigo",
    "modules": [
      {"id": "m1", "title": "அடிப்படை அளவுகள் (Base Quantities)", "desc": "Length, Mass, Time, Temperature, Amount of Substance.", "icon": "📏"},
      {"id": "m2", "title": "அழுத்தம் (Pressure Definition)", "desc": "Force acting perpendicular on a unit area of a surface.", "icon": "💨"},
      {"id": "m3", "title": "பாஸ்கல் விதி (Pascal's Law)", "desc": "Pressure applied at any point of a confined fluid is transmitted equally.", "icon": "💧"},
      {"id": "m4", "title": "காற்றழுத்தம் (Atmospheric Pressure)", "desc": "The force exerted by the weight of air above us.", "icon": "🌍"}
    ],
    "stats": [
      {"label": "SI Unit of Pressure", "value": "1 Pa = 1 N/m²", "desc": "Pascal (பாஸ்கல்)"},
      {"label": "Standard Atmosphere", "value": "1.013 x 10⁵ Pa", "desc": "At sea level (காற்றழுத்தம்)"},
      {"label": "Acceleration due to Gravity", "value": "9.8 m/s²", "desc": "g value (ஈர்ப்பு முடுக்கம்)"}
    ],
    "workflow": [
      {"step": "1. விசையை செலுத்துதல் (Apply Force)", "desc": "Perpendicular force acts on a surface.", "icon": "1️⃣"},
      {"step": "2. பரப்பை அளவிடுதல் (Measure Area)", "desc": "Calculate the contact surface area.", "icon": "2️⃣"},
      {"step": "3. அழுத்தத்தைக் கணக்கிடுதல் (Calculate Pressure)", "desc": "Use formula P = F/A.", "icon": "3️⃣"},
      {"step": "4. விதியைப் பயன்படுத்துதல் (Apply Pascal's Law)", "desc": "Observe fluid multiplier action.", "icon": "4️⃣"}
    ],
    "formulaBox": "P = F / A",
    "formulaExplain": "P = Pressure (அழுத்தம்), F = Force (விசை), A = Area (பரப்பு). Unit: Pascal or N/m².",
    "lawTitle": "பாஸ்கல் விதி (Pascal's Law)",
    "lawDesc": "அழுத்தப்படாத திரவத்தில் ஏதேனும் ஒரு புள்ளியில் செலுத்தப்படும் அழுத்தமானது, அத்திரவத்தின் அனைத்து திசைகளிலும் சமமாகப் பரவும்.",
    "termTable": [
      {"english": "Force", "tamil": "விசை", "definition": "An interaction that changes the motion of an object. (இயக்கத்தை மாற்றும் காரணி)"},
      {"english": "Area", "tamil": "பரப்பளவு", "definition": "The extent of a two-dimensional surface. (இரு பரிமாண இடத்தின் அளவு)"},
      {"english": "Fluid", "tamil": "பாய்மம்", "definition": "A substance that has no fixed shape and flows (liquid or gas). (திரவம் அல்லது வாயு)"}
    ],
    "constantName": "Standard Atmospheric Pressure (வளிமண்டல அழுத்தம்)",
    "constantValue": "101,325 Pa",
    "constantExplain": "The atmospheric pressure at mean sea level on Earth."
  }
}

SLIDE SEQUENCE (GENERATE EXACTLY 20 SLIDES):
- Slide 1: Cover Page: Course title, Grade 8, Subject Science, Chapter: Fundamentals of Measurement and Pressure.
- Slide 2: Learning Outcomes: Key outcomes regarding SI units, base quantities, and pressure concepts.
- Slide 3: Introduction to Measurement: What is measurement? Why is it essential?
- Slide 4: Base Quantities & SI Units: Temperature, Electric Current, Amount of Substance, Luminous Intensity.
- Slide 5: Temperature (வெப்பநிலை): Concept, units (Kelvin, Celsius, Fahrenheit), and thermometer illustration.
- Slide 6: Amount of Substance (பொருளின் அளவு): Concept of Mole and Avogadro's number.
- Slide 7: Luminous Intensity (ஒளிச்செறிவு): Concept of candela, photometer, and luminous flux.
- Slide 8: Rules for Writing SI Units: Crucial rules for symbols, units capitalization, and punctuation.
- Slide 9: Everyday Life Measurement Connection: Real world examples of measuring base quantities.
- Slide 10: Concept of Force & Pressure (விசை மற்றும் அழுத்தம்): Introduction to how they relate to area.
- Slide 11: Pressure in Fluids (பாய்மங்களில் அழுத்தம்): Thrust, fluid pressure, and factors determining fluid pressure.
- Slide 12: Atmospheric Pressure (வளிமண்டல அழுத்தம்): Torque of air columns, standard value, and barometers.
- Slide 13: Measurement of Atmospheric Pressure: How Torricelli's barometer works.
- Slide 14: Pressure in Liquids (திரவங்களில் அழுத்தம்): Pressure increases with depth and density.
- Slide 15: Pascal's Law (பாஸ்கல் விதி): Conceptual statement and working principle.
- Slide 16: Applications of Pascal's Law: Hydraulic lift, hydraulic brakes, and press.
- Slide 17: Surface Tension (பரப்பு இழுவிசை): Definition, cohesion/adhesion, and insect walking on water example.
- Slide 18: Viscosity (பாகுநிலை): Frictional force of liquids, coefficient of viscosity, and everyday fluids.
- Slide 19: DIY Classroom Activity: DIY experiment to prove liquid pressure increases with depth.
- Slide 20: Summary & Summary Flow: Quick visual checklist recap of measurements, pressure, rules, and laws.

Remember:
- Do NOT generate markdown code formatting around the JSON object.
- Keep slide copy short (max 35 words visible in "bullets" array per slide).
- Maintain bilingual text in all slides!
`;

  try {
    const result = await callGemini(prompt);
    console.log("Successfully generated lesson plan from Gemini!");

    // Save into Postgres
    console.log("Saving lesson plan into Postgres database...");
    const savedPlan = await prisma.lessonPlan.create({
      data: {
        syllabus: "TN State Board (Samacheer Kalvi)",
        grade: "Grade 8",
        subject: "Science",
        topic: "Fundamentals of Measurement and Pressure",
        duration: "45 Minutes",
        planData: result,
        schoolId: null
      }
    });

    console.log(`Saved successfully! ID: ${savedPlan.id}`);
    process.exit(0);
  } catch (err) {
    console.error("Error in generation/seeding script:", err);
    process.exit(1);
  }
}

main();
