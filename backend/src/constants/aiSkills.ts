// ===========================================================================
// AI Content Studio — skill registry
// ---------------------------------------------------------------------------
// Single source of truth for the 20 teacher "/command" content skills.
// The frontend keeps a *client-safe mirror* of the display half of this file in
// frontend/src/lib/aiSkills.ts — prompts never ship to the browser.
//
// Superadmin overrides (enable/disable, class range, model, maxTokens, prompt
// text) live in the Mongo AiSkillConfig collection; an absent doc means "use
// the defaults declared here". Reset-to-default = delete the doc.
//
// Same catalog convention as frontend/src/lib/moduleCatalog.ts.
// ===========================================================================

export type SkillGroup =
  | 'TEACH'
  | 'PRACTICE'
  | 'ASSESS'
  | 'ENGAGE'
  | 'DIFFERENTIATE'
  | 'FEEDBACK'
  | 'PLAN';

export type OutputKind =
  | 'document'
  | 'questionSet'
  | 'worksheet'
  | 'matrix'
  | 'cardList'
  | 'slides'
  // A real visual poster, not text cards. Shares its shape with
  // VISUAL_DESIGN_SCHEMA in routes/ai.routes.ts so the existing
  // components/InfographicRenderer.tsx can draw it unchanged.
  | 'infographic';

export type SubjectPack =
  | 'MATHS'
  | 'SCIENCE'
  | 'LANGUAGE'
  | 'SOCIAL'
  | 'COMPUTER'
  | 'GENERAL';

export type PushTarget = 'questionBank' | 'lessonPlan' | 'homework' | 'smartClass';

export interface SkillInput {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  default?: string | number;
  placeholder?: string;
  /** Shown under the field in the composer. */
  hint?: string;
}

export interface AiSkillDef {
  key: string;
  command: string;
  label: string;
  description: string;
  group: SkillGroup;
  outputKind: OutputKind;
  icon: string;
  accent: string;
  /** Prompt body. Placeholders: {{class}} {{grade}} {{subject}} {{topic}} {{unit}} {{duration}} plus every SkillInput key. */
  basePrompt: string;
  defaultModel: string;
  defaultMaxTokens: number;
  defaultClassRange: [number, number];
  inputs: SkillInput[];
  pushTargets: PushTarget[];
  /** One-line "what you'll get" shown before generating. */
  preview: string;
}

export const SKILL_GROUPS: Record<
  SkillGroup,
  { key: SkillGroup; slug: string; label: string; icon: string; blurb: string }
> = {
  TEACH: {
    key: 'TEACH',
    slug: 'teach',
    label: 'Teach & Explain',
    icon: 'fi fi-rr-chalkboard-user',
    blurb: 'Plan the period and explain the concept',
  },
  PRACTICE: {
    key: 'PRACTICE',
    slug: 'practice',
    label: 'Practice & Work',
    icon: 'fi fi-rr-pencil',
    blurb: 'Worksheets, activities, homework and revision',
  },
  ASSESS: {
    key: 'ASSESS',
    slug: 'assess',
    label: 'Tests & Assess',
    icon: 'fi fi-rr-list-check',
    blurb: 'Quizzes, MCQs, question papers and answer keys',
  },
  ENGAGE: {
    key: 'ENGAGE',
    slug: 'engage',
    label: 'Engage & Discuss',
    icon: 'fi fi-rr-comments',
    blurb: 'Get the class talking and involved',
  },
  DIFFERENTIATE: {
    key: 'DIFFERENTIATE',
    slug: 'differentiate',
    label: 'Differentiate',
    icon: 'fi fi-rr-users-alt',
    blurb: 'Adapt for mixed-ability classrooms and grade fairly',
  },
  FEEDBACK: {
    key: 'FEEDBACK',
    slug: 'feedback',
    label: 'Feedback',
    icon: 'fi fi-rr-comment-check',
    blurb: 'Constructive, specific feedback on student work',
  },
  PLAN: {
    key: 'PLAN',
    slug: 'plan',
    label: 'Plan & Organise',
    icon: 'fi fi-rr-clipboard-list',
    blurb: 'Trips, cover lessons, stations and post-lesson review',
  },
};

export const GROUP_BY_SLUG: Record<string, SkillGroup> = Object.values(SKILL_GROUPS).reduce(
  (acc, g) => {
    acc[g.slug] = g.key;
    return acc;
  },
  {} as Record<string, SkillGroup>
);

// ---------------------------------------------------------------------------
// Subject packs — the "adopt their execution way" layer.
//
// A pack changes WHAT the skill produces, not just its wording. `kindHints`
// carries the structural directive for each output kind, so 6 packs x 6 kinds
// covers all 20 skills without 120 hand-written templates.
// ---------------------------------------------------------------------------

export interface SubjectPackDef {
  key: SubjectPack;
  label: string;
  icon: string;
  persona: string;
  method: string;
  examplePolicy: string;
  kindHints: Record<OutputKind, string>;
}

export const SUBJECT_PACKS: Record<SubjectPack, SubjectPackDef> = {
  MATHS: {
    key: 'MATHS',
    label: 'Mathematics',
    icon: '🧮',
    persona:
      'an experienced Tamil Nadu State Board Mathematics teacher who teaches procedurally, one step at a time',
    method:
      'Always move concrete -> pictorial -> abstract. Show every intermediate step. Name the rule or theorem being applied at each step. Anticipate the arithmetic and sign errors students actually make.',
    examplePolicy:
      'Use Indian contexts and rupee/metric units. Numbers must be clean enough to compute mentally where possible; never invent a result that does not actually follow from the working.',
    kindHints: {
      document:
        'Structure as: recall of prerequisite skill -> statement of the rule/formula -> one fully worked example with every step numbered -> a second example with a twist -> common mistakes -> quick self-check sums.',
      questionSet:
        'Questions must be computational. Spread them across 1-mark direct substitution, 2-mark two-step, and 5-mark multi-concept problems. Every answer must include the worked steps in the explanation field, not just the final value.',
      worksheet:
        'Sections must be: (A) Warm-up drill of 5 single-step sums, (B) Core practice of graded sums, (C) 2 word problems, (D) 1 challenge sum. The answer key must contain the full working, and commonErrors must list the specific sign/place-value/transposition slips for this topic.',
      matrix:
        'Rows are the mathematical competencies (accuracy of computation, correct method, presentation of steps, reasoning/justification). Columns are performance bands. Cell text must reference the number of steps shown or errors permitted, not vague adjectives.',
      cardList:
        'Each card is one worked micro-example or one real-life measurement/money/geometry situation where this topic is actually used.',
      slides:
        'One idea per slide. Formula slides must show the formula on its own line and then a substituted example underneath. Include at least two board-work slides where the teacher solves live.',
      infographic:
        'lawOrFormula is the centrepiece — put the actual formula there with every variable named. keyFacts must carry real numbers (typical values, ranges, worked results). examples are situations where the formula is applied with actual figures. whatIsIt states the rule in words before symbols.',
    },
  },
  SCIENCE: {
    key: 'SCIENCE',
    label: 'Science',
    icon: '🔬',
    persona:
      'an experienced Tamil Nadu State Board Science teacher who teaches through observation, evidence and mechanism',
    method:
      'Move from the observable phenomenon -> the underlying mechanism -> the real-world application. Use labelled diagrams and observation tables. Distinguish clearly between an observation, an inference and a conclusion.',
    examplePolicy:
      'Use phenomena a Tamil Nadu student can actually see — monsoon, coastal life, local crops, household appliances. All scientific values, units and constants must be real.',
    kindHints: {
      document:
        'Structure as: the phenomenon (what we notice) -> the scientific explanation (mechanism) -> a labelled diagram description -> an application -> misconceptions to correct.',
      questionSet:
        'Mix definition/recall, diagram-labelling, reason-assertion, and application questions. Include at least one "predict the outcome of this experiment" item. Explanations must state the scientific principle used.',
      worksheet:
        'Sections must be: (A) Label the diagram (describe the diagram precisely in words so a teacher can draw it), (B) Fill the observation table, (C) Reason-based short answers, (D) One application question. Answer key includes the inference for each observation.',
      matrix:
        'Rows are scientific skills (accurate observation, correct use of terminology, labelled diagram, valid inference, safety awareness). Cells must describe observable evidence of each band.',
      cardList:
        'Each card is one everyday phenomenon or application, with the scientific principle named explicitly in the body.',
      slides:
        'Alternate between a phenomenon slide and a mechanism slide. Every diagram slide must include a visualHint precise enough to sketch on the board.',
      infographic:
        'lawOrFormula carries the governing law, word equation or balanced reaction. whatIsIt describes the observable phenomenon. keyFacts must be measured values with correct units. applications are real technologies or natural processes. centralImageUrl should picture the phenomenon itself.',
    },
  },
  LANGUAGE: {
    key: 'LANGUAGE',
    label: 'Language (Tamil / English)',
    icon: '📖',
    persona:
      'an experienced Tamil Nadu State Board language teacher who builds meaning, usage and expression together',
    method:
      'Move from meaning -> usage in a sentence -> pattern/grammar rule -> the student producing their own language. Always give the word or structure in context before defining it. Give both English and Tamil glosses for key vocabulary.',
    examplePolicy:
      'Sentences must be natural classroom language, not textbook-stiff. Use Tamil Nadu names, places and situations.',
    kindHints: {
      document:
        'Structure as: the passage/extract in context -> meaning and key vocabulary (with Tamil gloss) -> the language pattern or literary device at work -> model sentences -> a short writing task.',
      questionSet:
        'Group questions as reading comprehension, vocabulary/word-usage, grammar transformation, and one short composition prompt. Never make grammar questions context-free — embed each in a sentence.',
      worksheet:
        'Sections must be: (A) A short original passage (6-10 lines) on the topic, (B) Comprehension questions on that passage, (C) Vocabulary and grammar drill drawn from the passage, (D) A guided writing task with a sentence starter. Answer key gives model answers, not one-word keys.',
      matrix:
        'Rows are language competencies (content and ideas, vocabulary range, grammatical accuracy, organisation, expression/fluency). Cells must describe what the writing actually looks like at each band.',
      cardList:
        'Each card is one usage example, idiom, or sentence pattern, with an English meaning and a natural Tamil equivalent.',
      slides:
        'Show the language before naming the rule. Each slide should carry one model sentence in large text plus its breakdown.',
      infographic:
        'lawOrFormula holds the language pattern or rule (e.g. the sentence structure) with variables naming each part of speech. whatIsIt gives meaning and usage. keyFacts are usage rules with a model sentence each. examples are sentences in context, with the Tamil gloss in the description.',
    },
  },
  SOCIAL: {
    key: 'SOCIAL',
    label: 'Social Science',
    icon: '🗺️',
    persona:
      'an experienced Tamil Nadu State Board Social Science teacher who teaches through sources, chronology and causation',
    method:
      'Anchor everything in time, place and evidence. Always build a cause -> event -> consequence chain. Use maps, timelines and short source extracts. Present differing viewpoints where they genuinely exist.',
    examplePolicy:
      'Dates, place names, figures and constitutional articles must be historically accurate. Prefer Tamil Nadu and Indian examples, then world context.',
    kindHints: {
      document:
        'Structure as: context (when and where) -> the sequence of events -> causes -> consequences -> significance today. Include a compact timeline and one map reference.',
      questionSet:
        'Mix recall of facts/dates, map/timeline identification, source-based interpretation, and cause-effect reasoning. Explanations must cite the specific event or provision.',
      worksheet:
        'Sections must be: (A) A short source extract with interpretation questions, (B) A timeline or map-marking task described in words, (C) Cause-and-effect chain to complete, (D) One opinion question with a sentence frame. Answer key gives the reasoning, not just the fact.',
      matrix:
        'Rows are historical/civic skills (factual accuracy, use of evidence, cause-effect reasoning, chronology, balanced viewpoint).',
      cardList:
        'Each card is one event, personality, provision or present-day parallel, dated and placed.',
      slides:
        'Lead with a timeline slide, then one slide per cause and per consequence. Include one map slide with a precise visualHint.',
      infographic:
        'lawOrFormula holds the key principle, constitutional provision or cause-effect chain, with variables naming each factor. keyFacts must carry real dates, places and figures. examples are actual historical events or present-day parallels. whatIsIt sets time and place first.',
    },
  },
  COMPUTER: {
    key: 'COMPUTER',
    label: 'Computer Science',
    icon: '💻',
    persona:
      'an experienced Tamil Nadu State Board Computer Science teacher who teaches by tracing code and building up from small working pieces',
    method:
      'Concept -> minimal working code -> dry run / trace table -> deliberate bug to fix -> extension. Code must be complete, runnable and correctly indented.',
    examplePolicy:
      'Use the language on the TN syllabus for that class. Every code snippet must be syntactically valid and its stated output must be the output it genuinely produces.',
    kindHints: {
      document:
        'Structure as: the concept in plain words -> a minimal code example -> a dry-run trace table -> a common bug and its fix -> an extension task.',
      questionSet:
        'Mix "what is the output", "spot the error", "complete the code", and short theory questions. Every code question must contain the actual code, and explanations must trace the execution.',
      worksheet:
        'Sections must be: (A) Predict the output of 4 short snippets, (B) Complete the missing lines, (C) Debug a broken program, (D) Write one small program. Answer key must include the corrected code and why the bug occurred.',
      matrix:
        'Rows are programming competencies (correct logic, syntax accuracy, code readability/naming, handling of edge cases, documentation).',
      cardList:
        'Each card is one snippet or one real application, with the code inline in the body.',
      slides:
        'Code slides must contain the full snippet with line breaks preserved. Follow each code slide with a trace slide.',
      infographic:
        'lawOrFormula holds the syntax pattern or algorithm, with variables naming each part. keyFacts are language rules with real values. examples are short working snippets in the description. applications are real software or systems the student uses.',
    },
  },
  GENERAL: {
    key: 'GENERAL',
    label: 'General',
    icon: '📚',
    persona: 'an experienced Tamil Nadu State Board teacher',
    method:
      'Move from the familiar to the new. Define terms before using them, give one clear example per idea, and check understanding at the end.',
    examplePolicy: 'Use Tamil Nadu classroom contexts. Keep every fact accurate and age-appropriate.',
    kindHints: {
      document: 'Structure as: introduction -> main ideas one at a time -> examples -> summary -> check for understanding.',
      questionSet: 'Spread across recall, understanding and application. Explanations must justify the answer.',
      worksheet:
        'Sections must be: (A) Warm-up recall, (B) Core practice, (C) Application, (D) Challenge. Answer key must be complete.',
      matrix: 'Rows are the assessable criteria for this task; columns are performance bands with observable descriptors.',
      cardList: 'Each card is one self-contained idea or example.',
      slides: 'One idea per slide, with a concrete example on each.',
      infographic:
        'lawOrFormula holds the single most important rule or relationship for this topic, with its parts named. keyFacts are concrete, checkable facts. examples are situations the student has seen.',
    },
  },
};

/**
 * Map a free-text subject name (English or Tamil, TN Board naming) to a pack.
 * Falls back to GENERAL. The teacher can always override in the UI.
 */
export function subjectToPack(subject?: string | null): SubjectPack {
  const s = (subject || '').toLowerCase().trim();
  if (!s) return 'GENERAL';

  const has = (...needles: string[]) => needles.some((n) => s.includes(n));

  if (has('math', 'maths', 'kanitham', 'கணித', 'algebra', 'geometry', 'trigonom', 'statistic', 'calculus'))
    return 'MATHS';
  if (
    has(
      'computer', 'informat', 'programming', 'python', 'java', 'c++', 'coding', 'ict',
      'கணினி', 'software'
    )
  )
    return 'COMPUTER';
  if (
    has(
      'science', 'physic', 'chemis', 'biolog', 'botan', 'zoolog', 'அறிவியல்', 'இயற்பியல்',
      'வேதியியல்', 'உயிரியல்', 'environment'
    )
  )
    return 'SCIENCE';
  if (
    has(
      'social', 'history', 'geograph', 'civic', 'econom', 'political', 'சமூக', 'வரலா',
      'புவியிய', 'குடிமை', 'பொருளிய'
    )
  )
    return 'SOCIAL';
  if (
    has(
      'tamil', 'english', 'language', 'hindi', 'sanskrit', 'french', 'literature', 'grammar',
      'தமிழ்', 'ஆங்கில', 'மொழி'
    )
  )
    return 'LANGUAGE';

  return 'GENERAL';
}

// ---------------------------------------------------------------------------
// Gemini response schemas — one per output kind.
// Uppercase type names match the existing schemas in routes/ai.routes.ts.
// ---------------------------------------------------------------------------

const DOCUMENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    subtitle: { type: 'STRING' },
    summary: { type: 'STRING', description: 'Two or three sentences a teacher can read aloud as an opener' },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          heading: { type: 'STRING' },
          body: { type: 'STRING' },
          bullets: { type: 'ARRAY', items: { type: 'STRING' } },
          durationMins: { type: 'INTEGER', description: 'Minutes for this section; 0 if not time-boxed' },
        },
        required: ['heading', 'body', 'bullets', 'durationMins'],
      },
    },
    keyTerms: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          term: { type: 'STRING' },
          meaning: { type: 'STRING' },
          tamil: { type: 'STRING', description: 'Tamil equivalent; empty string if not applicable' },
        },
        required: ['term', 'meaning', 'tamil'],
      },
    },
    teacherNotes: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'subtitle', 'summary', 'sections', 'keyTerms', 'teacherNotes'],
};

const QUESTION_SET_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    instructions: { type: 'STRING' },
    totalMarks: { type: 'INTEGER' },
    durationMins: { type: 'INTEGER' },
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          number: { type: 'INTEGER' },
          type: { type: 'STRING', description: 'MCQ | Short Answer | Long Answer | True/False | Fill in the Blank' },
          difficulty: { type: 'STRING', description: 'Easy | Medium | Hard' },
          text: { type: 'STRING' },
          options: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'Formatted "A) ..." for MCQ; empty array for non-MCQ',
          },
          answer: { type: 'STRING', description: 'Full text of the correct answer, not just the letter' },
          explanation: { type: 'STRING', description: 'Why this is the answer — include working/reasoning' },
          marks: { type: 'INTEGER' },
        },
        required: ['number', 'type', 'difficulty', 'text', 'options', 'answer', 'explanation', 'marks'],
      },
    },
  },
  required: ['title', 'instructions', 'totalMarks', 'durationMins', 'questions'],
};

const WORKSHEET_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    instructions: { type: 'STRING' },
    estimatedMins: { type: 'INTEGER' },
    passage: {
      type: 'STRING',
      description: 'Source passage, code snippet, source extract or scenario. Empty string when the subject does not need one.',
    },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          heading: { type: 'STRING' },
          intro: { type: 'STRING' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                number: { type: 'INTEGER' },
                prompt: { type: 'STRING' },
                workingLines: { type: 'INTEGER', description: 'Blank lines to leave for the student, 0-12' },
                hint: { type: 'STRING' },
              },
              required: ['number', 'prompt', 'workingLines', 'hint'],
            },
          },
        },
        required: ['heading', 'intro', 'items'],
      },
    },
    answerKey: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          number: { type: 'INTEGER' },
          answer: { type: 'STRING' },
          workedSteps: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['number', 'answer', 'workedSteps'],
      },
    },
    commonErrors: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'instructions', 'estimatedMins', 'passage', 'sections', 'answerKey', 'commonErrors'],
};

const MATRIX_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    columns: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Band or level names, weakest first' },
    rows: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING', description: 'The criterion or the learner group' },
          weight: { type: 'STRING', description: 'Marks or weighting; empty string if not applicable' },
          cells: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Same length and order as columns' },
        },
        required: ['label', 'weight', 'cells'],
      },
    },
    legend: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'description', 'columns', 'rows', 'legend'],
};

const CARD_LIST_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    intro: { type: 'STRING' },
    cards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          body: { type: 'STRING' },
          icon: { type: 'STRING', description: 'A single emoji' },
          tag: { type: 'STRING', description: 'Short label, e.g. the level, theme or duration' },
        },
        required: ['title', 'body', 'icon', 'tag'],
      },
    },
  },
  required: ['title', 'intro', 'cards'],
};

const SLIDES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    slides: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          number: { type: 'INTEGER' },
          title: { type: 'STRING' },
          bullets: { type: 'ARRAY', items: { type: 'STRING' } },
          speakerNotes: { type: 'STRING' },
          visualHint: { type: 'STRING', description: 'What to draw or show on this slide' },
        },
        required: ['number', 'title', 'bullets', 'speakerNotes', 'visualHint'],
      },
    },
  },
  required: ['title', 'slides'],
};

// Mirrors VISUAL_DESIGN_SCHEMA in routes/ai.routes.ts field for field, so the
// payload drops straight into the existing InfographicRenderer.
const INFOGRAPHIC_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    subtitle: { type: 'STRING' },
    introduction: { type: 'STRING' },
    centralImageUrl: {
      type: 'STRING',
      description: 'A single Unsplash search keyword for the hero image, e.g. "leaf" or "galaxy"',
    },
    whatIsIt: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          icon: { type: 'STRING', description: 'A Flaticon uicons name, e.g. fi-rr-leaf, fi-rr-bulb' },
          text: { type: 'STRING' },
        },
        required: ['icon', 'text'],
      },
    },
    lawOrFormula: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        subtitle: { type: 'STRING' },
        formula: { type: 'STRING', description: 'The equation, word equation or key rule. Never leave blank.' },
        variables: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              symbol: { type: 'STRING' },
              explanation: { type: 'STRING' },
            },
            required: ['symbol', 'explanation'],
          },
        },
      },
      required: ['title', 'subtitle', 'formula', 'variables'],
    },
    keyFacts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          icon: { type: 'STRING', description: 'A Flaticon uicons name, e.g. fi-rr-sun' },
          title: { type: 'STRING' },
          description: { type: 'STRING' },
        },
        required: ['icon', 'title', 'description'],
      },
    },
    didYouKnow: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        description: { type: 'STRING' },
      },
      required: ['title', 'description'],
    },
    examples: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          imageKeyword: { type: 'STRING', description: 'A single Unsplash keyword' },
          title: { type: 'STRING' },
          description: { type: 'STRING' },
        },
        required: ['imageKeyword', 'title', 'description'],
      },
    },
    applications: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          icon: { type: 'STRING', description: 'A Flaticon uicons name' },
          title: { type: 'STRING' },
          description: { type: 'STRING' },
        },
        required: ['icon', 'title', 'description'],
      },
    },
    quote: {
      type: 'OBJECT',
      properties: {
        text: { type: 'STRING' },
        author: { type: 'STRING' },
      },
      required: ['text', 'author'],
    },
    remember: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        text: { type: 'STRING' },
      },
      required: ['title', 'text'],
    },
  },
  required: [
    'title', 'subtitle', 'introduction', 'centralImageUrl', 'whatIsIt', 'lawOrFormula',
    'keyFacts', 'didYouKnow', 'examples', 'applications', 'quote', 'remember',
  ],
};

// Icon names the bundled Flaticon uicons-regular-rounded font actually ships.
// The model happily invents plausible-but-absent names (fi-rr-plant,
// fi-rr-atom), which render as blank squares, so anything outside this list is
// swapped for a safe default after generation.
export const SAFE_ICONS = new Set([
  'fi-rr-bulb', 'fi-rr-book', 'fi-rr-book-alt', 'fi-rr-brain', 'fi-rr-leaf', 'fi-rr-sun',
  'fi-rr-water', 'fi-rr-drop', 'fi-rr-flame', 'fi-rr-wind', 'fi-rr-globe', 'fi-rr-tree',
  'fi-rr-flask', 'fi-rr-microscope', 'fi-rr-dna', 'fi-rr-calculator', 'fi-rr-ruler',
  'fi-rr-chart-pie', 'fi-rr-chart-bar', 'fi-rr-stats', 'fi-rr-clock', 'fi-rr-calendar',
  'fi-rr-bolt', 'fi-rr-rocket', 'fi-rr-heart', 'fi-rr-eye', 'fi-rr-star', 'fi-rr-shield',
  'fi-rr-target', 'fi-rr-key', 'fi-rr-lock', 'fi-rr-gem', 'fi-rr-medal', 'fi-rr-trophy',
  'fi-rr-users', 'fi-rr-user', 'fi-rr-home', 'fi-rr-building', 'fi-rr-school', 'fi-rr-bank',
  'fi-rr-map', 'fi-rr-compass', 'fi-rr-marker', 'fi-rr-computer', 'fi-rr-laptop',
  'fi-rr-smartphone', 'fi-rr-camera', 'fi-rr-music', 'fi-rr-palette', 'fi-rr-paint-brush',
  'fi-rr-pencil', 'fi-rr-document', 'fi-rr-folder', 'fi-rr-search', 'fi-rr-settings',
  'fi-rr-tools', 'fi-rr-wrench', 'fi-rr-box', 'fi-rr-coins', 'fi-rr-scale', 'fi-rr-balance-scale-left',
  'fi-rr-fish', 'fi-rr-paw', 'fi-rr-bug', 'fi-rr-mountains', 'fi-rr-restaurant', 'fi-rr-utensils',
  'fi-rr-running', 'fi-rr-walking', 'fi-rr-gym', 'fi-rr-stethoscope', 'fi-rr-medical-star',
  'fi-rr-layer-group', 'fi-rr-layers', 'fi-rr-grid', 'fi-rr-list', 'fi-rr-check', 'fi-rr-info',
]);

const FALLBACK_ICON = 'fi-rr-bulb';

/** Comma-separated list for the prompt, so the model picks from real names. */
export const SAFE_ICON_LIST = Array.from(SAFE_ICONS).join(', ');

/**
 * Post-generation cleanup. Currently only the infographic kind needs it: its
 * icon fields are free text and a wrong name renders as an empty box.
 */
export function sanitizePayload(outputKind: OutputKind, payload: any): any {
  if (outputKind !== 'infographic' || !payload || typeof payload !== 'object') return payload;

  const fixIcon = (v: unknown) => {
    const name = String(v || '').trim().replace(/^fi\s+/, '');
    return SAFE_ICONS.has(name) ? name : FALLBACK_ICON;
  };

  for (const field of ['whatIsIt', 'keyFacts', 'applications'] as const) {
    if (Array.isArray(payload[field])) {
      for (const item of payload[field]) {
        if (item && typeof item === 'object') item.icon = fixIcon(item.icon);
      }
    }
  }
  return payload;
}

export const SCHEMAS: Record<OutputKind, any> = {
  document: DOCUMENT_SCHEMA,
  questionSet: QUESTION_SET_SCHEMA,
  worksheet: WORKSHEET_SCHEMA,
  matrix: MATRIX_SCHEMA,
  cardList: CARD_LIST_SCHEMA,
  slides: SLIDES_SCHEMA,
  infographic: INFOGRAPHIC_SCHEMA,
};

// ---------------------------------------------------------------------------
// Shared input fragments
// ---------------------------------------------------------------------------

const DIFFICULTY_INPUT: SkillInput = {
  key: 'difficulty',
  label: 'Difficulty',
  type: 'select',
  options: ['Easy', 'Mixed', 'Medium', 'Hard'],
  default: 'Mixed',
};

const COUNT_INPUT = (def: number, hint?: string): SkillInput => ({
  key: 'count',
  label: 'How many',
  type: 'number',
  default: def,
  hint,
});

// ---------------------------------------------------------------------------
// The 20 skills
// ---------------------------------------------------------------------------

export const AI_SKILLS: AiSkillDef[] = [
  // ── TEACH ────────────────────────────────────────────────────────────────
  {
    key: 'lesson',
    command: '/lesson',
    label: 'Lesson Plan',
    description: 'Create a complete lesson plan for this topic.',
    group: 'TEACH',
    outputKind: 'document',
    icon: 'fi fi-rr-document',
    accent: 'bg-blue-600',
    preview: 'A period-by-period plan with objectives, timeline, key terms and teacher notes',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 16000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'duration', label: 'Period length', type: 'select', options: ['30 minutes', '40 minutes', '45 minutes', '60 minutes', 'Double period'], default: '45 minutes' },
    ],
    pushTargets: ['smartClass'],
    basePrompt: `Build a complete, teachable lesson plan for "{{topic}}" ({{subject}}, {{class}}), to be delivered in {{duration}}.
Requirements:
- summary: what the teacher is trying to achieve this period, in 2-3 sentences.
- sections: exactly 5 — "Learning Objectives", "The Hook (opening)", "Core Instruction", "Guided Practice", "Wrap-up & Exit Check". Set durationMins on each so they sum to {{duration}}.
- Each section's bullets must be concrete teacher actions ("draw X on the board", "ask: ..."), never generic advice.
- keyTerms: 5 terms the students must leave the period knowing.
- teacherNotes: 4 notes covering pacing, the likely point of confusion, a differentiation move, and materials needed.`,
  },
  {
    key: 'explain',
    command: '/explain',
    label: 'Explain Topic',
    description: 'Explain this topic in a way students can easily understand.',
    group: 'TEACH',
    outputKind: 'document',
    icon: 'fi fi-rr-bulb',
    accent: 'bg-green-600',
    preview: 'A step-by-step explanation the teacher can deliver straight from the screen',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 12000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'depth', label: 'Depth', type: 'select', options: ['Quick overview', 'Standard', 'In depth'], default: 'Standard' },
    ],
    pushTargets: ['smartClass'],
    basePrompt: `Explain "{{topic}}" ({{subject}}, {{class}}) so a student who has never met it can follow. Depth: {{depth}}.
Requirements:
- Build the explanation in order — never use a term before it has been defined.
- sections: 4 to 6, each one step of the explanation, ending with a "Check You've Got It" section containing 3 quick oral questions in its bullets.
- keyTerms: every technical term you used.
- teacherNotes: the two misconceptions students most often bring to this topic, and how to correct each.`,
  },
  {
    key: 'examples',
    command: '/examples',
    label: 'Real-life Examples',
    description: 'Give real-life examples to explain this concept.',
    group: 'TEACH',
    outputKind: 'cardList',
    icon: 'fi fi-rr-apple-whole',
    accent: 'bg-teal-600',
    preview: 'A deck of real-world example cards, each tied back to the concept',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 8000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(8, 'Number of examples')],
    pushTargets: ['smartClass'],
    basePrompt: `Give {{count}} real-life examples that make "{{topic}}" ({{subject}}, {{class}}) click.
Requirements:
- Every example must be something a Tamil Nadu student has actually seen or done.
- Each card body must state the situation first, then name exactly how the concept applies to it.
- Vary the settings: home, market, farm/coast, school, transport, technology, festival.
- tag: the setting. icon: a fitting emoji.`,
  },
  {
    key: 'simplify',
    command: '/simplify',
    label: 'Simplify',
    description: 'Simplify this topic for younger students.',
    group: 'TEACH',
    outputKind: 'cardList',
    icon: 'fi fi-rr-feather',
    accent: 'bg-cyan-500',
    preview: 'The same idea broken into small, plain-language chunks',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 8000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'targetLevel', label: 'Simplify to level of', type: 'select', options: ['Class 3', 'Class 5', 'Class 6', 'Class 8', 'Class 9'], default: 'Class 6' },
    ],
    pushTargets: ['smartClass'],
    basePrompt: `Re-explain "{{topic}}" ({{subject}}, originally {{class}}) so that a {{targetLevel}} student understands it.
Requirements:
- Use only vocabulary a {{targetLevel}} student already has. If a technical term is unavoidable, give the everyday word first and the technical word in brackets.
- Each card is one small chunk, in the order it should be taught, with an analogy in the body.
- Short sentences. No sentence longer than 15 words.
- tag: "Step 1", "Step 2", ... in order.`,
  },
  {
    key: 'presentation',
    command: '/presentation',
    label: 'Presentation',
    description: 'Create a classroom presentation outline.',
    group: 'TEACH',
    outputKind: 'slides',
    icon: 'fi fi-rr-presentation',
    accent: 'bg-emerald-500',
    preview: 'A projector-ready slide deck with speaker notes and board-work hints',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 14000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(10, 'Number of slides')],
    pushTargets: ['smartClass'],
    basePrompt: `Create a {{count}}-slide classroom presentation on "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Slide 1 is the title slide; the last slide is a recap with 3 questions in its bullets.
- Maximum 5 bullets per slide, maximum 12 words per bullet — these go on a projector.
- speakerNotes: what the teacher says on that slide, 2-3 sentences.
- visualHint: exactly what to draw, show or demonstrate. Never leave it empty.`,
  },

  // ── PRACTICE ─────────────────────────────────────────────────────────────
  {
    key: 'worksheet',
    command: '/worksheet',
    label: 'Worksheet',
    description: 'Create a printable worksheet with answers.',
    group: 'PRACTICE',
    outputKind: 'worksheet',
    icon: 'fi fi-rr-file-edit',
    accent: 'bg-purple-600',
    preview: 'A printable student sheet plus a separate answer key with full working',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 20000,
    defaultClassRange: [1, 12],
    inputs: [DIFFICULTY_INPUT, COUNT_INPUT(12, 'Total questions across all sections')],
    pushTargets: ['homework'],
    basePrompt: `Create a printable worksheet on "{{topic}}" ({{subject}}, {{class}}). Difficulty: {{difficulty}}. About {{count}} items in total.
Requirements:
- Number every item continuously across sections, starting at 1.
- workingLines must match the real space needed — 0 for one-word answers, up to 12 for extended work.
- answerKey must cover every numbered item with no gaps.
- commonErrors: at least 4, specific to this topic — not general exam advice.`,
  },
  {
    key: 'activity',
    command: '/activity',
    label: 'Classroom Activity',
    description: 'Create a fun classroom activity for this topic.',
    group: 'PRACTICE',
    outputKind: 'document',
    icon: 'fi fi-rr-puzzle-piece',
    accent: 'bg-orange-600',
    preview: 'A runnable activity with setup, rules, timings and materials',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 10000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'duration', label: 'Time available', type: 'select', options: ['10 minutes', '15 minutes', '20 minutes', '30 minutes'], default: '20 minutes' },
      { key: 'mode', label: 'Grouping', type: 'select', options: ['Whole class', 'Pairs', 'Small groups', 'Individual'], default: 'Small groups' },
    ],
    pushTargets: [],
    basePrompt: `Design a classroom activity that teaches "{{topic}}" ({{subject}}, {{class}}) in {{duration}}, run as {{mode}}.
Requirements:
- sections: "What You Need", "Setup", "How to Run It" (numbered steps with durationMins), "What Students Learn", "If It Goes Wrong".
- Materials must be things a government school in Tamil Nadu actually has — chalk, paper, the blackboard, students themselves. No printing, no devices, no purchased kits.
- The activity must genuinely require the concept; it must not be a generic game with the topic bolted on.
- teacherNotes: how to manage noise, and how to include the quiet students.`,
  },
  {
    key: 'homework',
    command: '/homework',
    label: 'Homework',
    description: 'Create meaningful homework for students.',
    group: 'PRACTICE',
    outputKind: 'worksheet',
    icon: 'fi fi-rr-house-chimney',
    accent: 'bg-rose-600',
    preview: 'A homework set sized to the time you allow, with an answer key',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 14000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'duration', label: 'Should take about', type: 'select', options: ['15 minutes', '20 minutes', '30 minutes', '45 minutes'], default: '30 minutes' },
      DIFFICULTY_INPUT,
    ],
    pushTargets: ['homework'],
    basePrompt: `Create homework on "{{topic}}" ({{subject}}, {{class}}) that takes a typical student {{duration}}. Difficulty: {{difficulty}}.
Requirements:
- It must be completable without internet, a printer, or help from an adult.
- Sections: "Recall" (from today's lesson), "Practice", "Think About It" (one question with no single right answer).
- Keep the total honestly within {{duration}} — fewer, better questions.
- answerKey must be usable by a parent or the student for self-checking.`,
  },
  {
    key: 'revision',
    command: '/revision',
    label: 'Revision Material',
    description: 'Create quick revision material for this topic.',
    group: 'PRACTICE',
    outputKind: 'cardList',
    icon: 'fi fi-rr-refresh',
    accent: 'bg-yellow-600',
    preview: 'Last-minute revision cards — one fact or formula per card',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 10000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(12, 'Number of revision cards')],
    pushTargets: [],
    basePrompt: `Create {{count}} revision cards for "{{topic}}" ({{subject}}, {{class}}) — the night-before-the-exam kind.
Requirements:
- One fact, formula, definition or rule per card. Nothing that needs a paragraph to explain.
- Order them by exam importance, most important first.
- tag: "Must know" / "Should know" / "Bonus".
- Where a formula or date exists, put it in the body exactly as it must be reproduced.`,
  },
  {
    key: 'project',
    command: '/project',
    label: 'Student Project',
    description: 'Create a student project with clear instructions.',
    group: 'PRACTICE',
    outputKind: 'document',
    icon: 'fi fi-rr-diploma',
    accent: 'bg-pink-600',
    preview: 'A project brief with stages, deliverables and an assessment breakdown',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 12000,
    defaultClassRange: [4, 12],
    inputs: [
      { key: 'duration', label: 'Project length', type: 'select', options: ['1 week', '2 weeks', '1 month'], default: '2 weeks' },
      { key: 'mode', label: 'Done by', type: 'select', options: ['Individual', 'Pairs', 'Groups of 4'], default: 'Groups of 4' },
    ],
    pushTargets: [],
    basePrompt: `Design a {{duration}} student project on "{{topic}}" ({{subject}}, {{class}}), done as {{mode}}.
Requirements:
- sections: "The Brief" (what students are asked to produce), "Why It Matters", "Stage 1/2/3" with durationMins, "What To Submit", "How It Will Be Marked" (bullets with mark splits summing to 100).
- The deliverable must be producible with paper, chalk, local observation and interviews — assume no computers at home.
- teacherNotes: checkpoints to catch groups falling behind, and how to handle an absent group member.`,
  },

  // ── ASSESS ───────────────────────────────────────────────────────────────
  {
    key: 'quiz',
    command: '/quiz',
    label: 'Quiz',
    description: 'Create a quiz with different difficulty levels.',
    group: 'ASSESS',
    outputKind: 'questionSet',
    icon: 'fi fi-rr-stopwatch',
    accent: 'bg-cyan-600',
    preview: 'A tiered quiz — easy, medium and hard — with answers and explanations',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 16000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(15, 'Number of questions'), { key: 'duration', label: 'Time limit', type: 'select', options: ['10 minutes', '15 minutes', '20 minutes', '30 minutes'], default: '20 minutes' }],
    pushTargets: ['questionBank'],
    basePrompt: `Create a {{count}}-question quiz on "{{topic}}" ({{subject}}, {{class}}) for {{duration}}.
Requirements:
- Split roughly 40% Easy, 40% Medium, 20% Hard, and set the difficulty field honestly on each.
- Mix the question types — do not make them all MCQ.
- Set marks per question so totalMarks is a round number, and set durationMins to {{duration}}.
- explanation must teach, not just assert: state the rule or step that produces the answer.`,
  },
  {
    key: 'mcq',
    command: '/mcq',
    label: 'MCQ Set',
    description: 'Create multiple-choice questions with answers.',
    group: 'ASSESS',
    outputKind: 'questionSet',
    icon: 'fi fi-rr-list-check',
    accent: 'bg-emerald-600',
    preview: 'MCQs with four plausible options each and the reasoning behind the key',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 18000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(20, 'Number of MCQs'), DIFFICULTY_INPUT],
    pushTargets: ['questionBank'],
    basePrompt: `Create {{count}} multiple-choice questions on "{{topic}}" ({{subject}}, {{class}}). Difficulty: {{difficulty}}.
Requirements:
- Every question has exactly 4 options formatted "A) ...", "B) ...", "C) ...", "D) ...".
- type is "MCQ" for all of them. marks is 1 for all of them.
- The three distractors must be genuinely tempting — each should correspond to a specific mistake a student makes. Never use filler options like "None of these" unless it is the correct answer.
- Spread the correct option across A, B, C and D roughly evenly.
- answer is the full text of the correct option including its letter.`,
  },
  {
    key: 'questions',
    command: '/questions',
    label: 'Important Questions',
    description: 'Create important questions from this chapter.',
    group: 'ASSESS',
    outputKind: 'questionSet',
    icon: 'fi fi-rr-interrogation',
    accent: 'bg-amber-600',
    preview: 'The questions most likely to be asked, ranked by exam importance',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 16000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(15, 'Number of questions')],
    pushTargets: ['questionBank'],
    basePrompt: `List the {{count}} most important exam questions from "{{topic}}" ({{subject}}, {{class}}) for the Tamil Nadu State Board pattern.
Requirements:
- Order them by how likely they are to appear, most likely first.
- Cover the full mark range: 1-mark, 2-mark, 3-mark and 5-mark questions, with marks set accordingly.
- Phrase them the way the board actually phrases questions.
- answer must be a model answer of the right length for the marks awarded, not a hint.
- explanation: state briefly why this question matters / how often it recurs.`,
  },
  {
    key: 'assessment',
    command: '/assessment',
    label: 'Assessment',
    description: 'Create an assessment based on learning objectives.',
    group: 'ASSESS',
    outputKind: 'questionSet',
    icon: 'fi fi-rr-clipboard-list-check',
    accent: 'bg-fuchsia-600',
    preview: 'An objective-aligned test paper with a marking scheme',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 18000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'objectives', label: 'Learning objectives', type: 'textarea', placeholder: 'One per line. Leave blank to derive them from the topic.' },
      { key: 'totalMarks', label: 'Total marks', type: 'number', default: 25 },
    ],
    pushTargets: ['questionBank'],
    basePrompt: `Build an assessment on "{{topic}}" ({{subject}}, {{class}}) worth {{totalMarks}} marks.
Learning objectives to assess:
{{objectives}}
(If no objectives are given above, derive 3-4 from the TN Board curriculum for this topic and assess those.)
Requirements:
- Every question must map to one of the objectives — name the objective it tests at the start of its explanation.
- Cover recall, understanding and application; do not test the same objective twice at the same level.
- marks must sum to exactly {{totalMarks}}.
- instructions: real exam instructions (time, sections, what is compulsory).`,
  },
  {
    key: 'answerkey',
    command: '/answer-key',
    label: 'Answer Key',
    description: 'Create an answer key for these questions.',
    group: 'ASSESS',
    outputKind: 'questionSet',
    icon: 'fi fi-rr-key',
    accent: 'bg-purple-500',
    preview: 'A marking scheme with model answers and step-wise mark allocation',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 18000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'sourceQuestions', label: 'Paste the questions', type: 'textarea', placeholder: 'One question per line, numbered if possible.', hint: 'Required — the key is built from exactly these questions.' },
    ],
    pushTargets: [],
    basePrompt: `Write the answer key and marking scheme for the following questions on "{{topic}}" ({{subject}}, {{class}}):

{{sourceQuestions}}

Requirements:
- Answer exactly these questions, in this order, keeping their numbering. Do not add or drop any.
- If a question is ambiguous, answer the most reasonable reading and say so in its explanation.
- answer: the model answer a full-marks student would write.
- explanation: the step-wise mark split ("1 mark for stating the formula, 1 mark for substitution, 1 for the final value") plus what to accept as an alternative correct answer.
- Set text to the original question and marks to the marks you allocate.`,
  },

  // ── ENGAGE ───────────────────────────────────────────────────────────────
  {
    key: 'discussion',
    command: '/discussion',
    label: 'Discussion Questions',
    description: 'Create classroom discussion questions.',
    group: 'ENGAGE',
    outputKind: 'cardList',
    icon: 'fi fi-rr-comments',
    accent: 'bg-lime-600',
    preview: 'Open questions that actually start a conversation, with follow-up prompts',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [3, 12],
    inputs: [COUNT_INPUT(10, 'Number of discussion questions')],
    pushTargets: [],
    basePrompt: `Write {{count}} discussion questions on "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Every question must be genuinely open — if it has one right answer, it does not belong here.
- Card title is the question itself. Card body gives two follow-up probes ("If a student says X, ask...") and the point the discussion should reach.
- Order from easy-to-answer to challenging, so quiet students can enter early.
- tag: "Opener", "Build", "Challenge", or "Debate".`,
  },
  {
    key: 'engage',
    command: '/engage',
    label: 'Engagement Ideas',
    description: 'Give creative ways to make this lesson more engaging.',
    group: 'ENGAGE',
    outputKind: 'cardList',
    icon: 'fi fi-rr-rocket-lunch',
    accent: 'bg-orange-500',
    preview: 'Quick hooks, energisers and attention resets you can drop into the period',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(8, 'Number of ideas')],
    pushTargets: [],
    basePrompt: `Give {{count}} ways to make a lesson on "{{topic}}" ({{subject}}, {{class}}) more engaging.
Requirements:
- Each must take under 5 minutes and need nothing but chalk, the board, and the students.
- Body must say exactly what the teacher does and says — not "use gamification" but the actual move.
- Cover a spread: an opening hook, a mid-lesson energiser, a physical/movement idea, a storytelling idea, a competition, and a closing hook.
- tag: when in the period to use it ("Start", "Middle", "End", "Anytime").`,
  },

  // ── DIFFERENTIATE ────────────────────────────────────────────────────────
  {
    key: 'differentiate',
    command: '/differentiate',
    label: 'Differentiate Lesson',
    description: 'Adapt this lesson for different learning levels.',
    group: 'DIFFERENTIATE',
    outputKind: 'matrix',
    icon: 'fi fi-rr-users-alt',
    accent: 'bg-sky-600',
    preview: 'A three-tier plan — support, core and stretch — across every part of the lesson',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 12000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'tiers', label: 'Levels', type: 'select', options: ['Support / Core / Stretch', 'Below grade / At grade / Above grade', 'Beginner / Developing / Confident / Advanced'], default: 'Support / Core / Stretch' },
    ],
    pushTargets: [],
    basePrompt: `Build a differentiation plan for teaching "{{topic}}" ({{subject}}, {{class}}) to a mixed-ability class. Levels: {{tiers}}.
Requirements:
- columns are exactly the levels named in {{tiers}}, weakest first.
- rows must be: "Learning goal", "How it is taught", "Task given", "Support provided", "Success looks like", "If they finish early".
- Every cell must be a concrete instruction the teacher can act on today. No cell may say "provide extra support" — say what the support is.
- The whole class must stay on the same topic — differentiate the route, not the destination.
- legend: 3 notes on grouping, on moving students between tiers, and on keeping tiers invisible to students.`,
  },
  {
    key: 'rubric',
    command: '/rubric',
    label: 'Grading Rubric',
    description: 'Create a simple grading rubric for this assignment.',
    group: 'DIFFERENTIATE',
    outputKind: 'matrix',
    icon: 'fi fi-rr-ruler-combined',
    accent: 'bg-indigo-600',
    preview: 'A criteria x bands rubric with observable descriptors and mark weights',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 10000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'task', label: 'The assignment', type: 'textarea', placeholder: 'e.g. A 300-word essay on water conservation' },
      { key: 'totalMarks', label: 'Total marks', type: 'number', default: 20 },
    ],
    pushTargets: [],
    basePrompt: `Create a grading rubric for this assignment on "{{topic}}" ({{subject}}, {{class}}):
{{task}}
(If no assignment is described above, assume a standard written assignment on this topic.)
Total marks: {{totalMarks}}.
Requirements:
- columns: 4 bands, weakest first — "Needs Support", "Developing", "Proficient", "Excellent".
- rows: 4-5 criteria. Set weight to the marks for that criterion; the weights must sum to {{totalMarks}}.
- Cells must be observable and countable ("2 or fewer supporting examples"), never judgemental adjectives ("poor effort").
- Adjacent bands must be clearly distinguishable — a second teacher marking with this rubric should land on the same band.
- legend: how to handle work that sits between two bands.`,
  },

  // ── FEEDBACK ─────────────────────────────────────────────────────────────
  {
    key: 'feedback',
    command: '/feedback',
    label: 'Student Feedback',
    description: "Give constructive feedback on this student's answer.",
    group: 'FEEDBACK',
    outputKind: 'document',
    icon: 'fi fi-rr-comment-check',
    accent: 'bg-violet-600',
    preview: 'Specific, kind, actionable feedback plus a suggested mark',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 10000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'question', label: 'The question asked', type: 'textarea', placeholder: 'What was the student asked?' },
      { key: 'studentAnswer', label: "The student's answer", type: 'textarea', placeholder: 'Paste or type the answer as written.', hint: 'Required.' },
      { key: 'totalMarks', label: 'Marks available', type: 'number', default: 5 },
    ],
    pushTargets: [],
    basePrompt: `Give feedback on a student's answer. Topic: "{{topic}}" ({{subject}}, {{class}}).

Question asked:
{{question}}

Student's answer, exactly as written:
{{studentAnswer}}

Marks available: {{totalMarks}}.

Requirements:
- sections: "What Went Well" (specific — quote the student's own words), "What's Missing or Wrong", "How To Improve It" (2-3 concrete next steps the student can act on), "Suggested Mark" (state the mark out of {{totalMarks}} and justify it against what was written).
- Judge only what the student actually wrote. Do not invent content they did not write, and do not credit them for it.
- Address the student directly as "you". Be warm but honest — do not soften a wrong answer into a right one.
- teacherNotes: what this answer reveals about the student's understanding, and what to reteach.`,
  },

  // ── TEACH (added) ────────────────────────────────────────────────────────
  {
    key: 'infographic',
    command: '/infographic',
    label: 'Infographic',
    description: 'Create an infographic on this topic to explain key points visually.',
    group: 'TEACH',
    outputKind: 'infographic',
    icon: 'fi fi-rr-chart-pie',
    accent: 'bg-sky-500',
    preview: 'A designed visual poster — hero image, formula panel, fact tiles and applications',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 14000,
    defaultClassRange: [1, 12],
    inputs: [
      {
        key: 'focus',
        label: 'Poster style',
        type: 'select',
        options: ['Exam point of view', 'General knowledge', 'Know more'],
        default: 'General knowledge',
      },
    ],
    pushTargets: ['smartClass'],
    basePrompt: `Design a visual infographic poster on "{{topic}}" ({{subject}}, {{class}}). Style: {{focus}}.
This is a POSTER, not an article. Every field is a panel on a wall chart, so text must be short enough to read from across a classroom.
Requirements:
- title: the topic as a poster headline. subtitle: one line naming the class and the angle.
- introduction: 2-3 sentences maximum — the hook a student reads first.
- centralImageUrl: ONE Unsplash search keyword picturing the topic (e.g. "leaf", "dam", "circuit"). One word, lowercase, no spaces.
- whatIsIt: 3-4 definition points, each under 20 words, each with a fitting Flaticon icon name.
- lawOrFormula: the governing rule, equation or word equation for this topic, with every symbol explained in variables. If the topic genuinely has no formula, use its key principle stated as a short rule and name its parts.
- keyFacts: exactly 4 facts, each with a real number, unit, date or measured value. No vague claims.
- examples: 3 real-world examples, each with a one-word Unsplash imageKeyword.
- applications: 3 places this is actually used, each with a Flaticon icon name.
- didYouKnow: one genuinely surprising true fact.
- quote: DO NOT attribute a quotation to a named person unless you are certain that person actually said it. If you are not certain, write a plain statement of the topic's importance and set author to "Tamil Nadu State Board" — a fabricated attribution is worse than no attribution.
- remember: the single thing a student must not forget, in one sentence.
- Every icon field must be chosen from EXACTLY this list, copied character for character. Any other name renders as a blank box: {{iconList}}`,
  },
  {
    key: 'simulation',
    command: '/simulation',
    label: 'Class Simulation',
    description: 'Create a classroom simulation or role-play with instructions.',
    group: 'TEACH',
    outputKind: 'document',
    icon: 'fi fi-rr-chess-knight',
    accent: 'bg-indigo-500',
    preview: 'Roles, scenario, run-sheet and debrief questions for a live simulation',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 11000,
    defaultClassRange: [3, 12],
    inputs: [
      { key: 'duration', label: 'Time available', type: 'select', options: ['20 minutes', '30 minutes', '45 minutes'], default: '30 minutes' },
    ],
    pushTargets: [],
    basePrompt: `Design a classroom simulation or role-play that teaches "{{topic}}" ({{subject}}, {{class}}) in {{duration}}.
Requirements:
- sections: "The Scenario", "Roles" (one bullet per role, with what that role wants), "How To Run It" (numbered, with durationMins), "Debrief Questions", "What Students Should Realise".
- Every student must have a role — include roles for a class of 40, using groups where needed.
- The simulation must make the concept felt, not just described: the outcome should change depending on what students decide.
- Needs nothing but the classroom, chalk and paper slips.`,
  },
  {
    key: 'graphic-organizer',
    command: '/graphic-organizer',
    label: 'Graphic Organizer',
    description: 'Create a graphic organizer to help students organize their thinking.',
    group: 'TEACH',
    outputKind: 'matrix',
    icon: 'fi fi-rr-layer-group',
    accent: 'bg-cyan-600',
    preview: 'A ready-to-draw organizer grid with a worked example in every cell',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'organizer', label: 'Organizer type', type: 'select', options: ['KWL chart', 'Venn diagram', 'Cause and effect', 'Compare and contrast', 'Mind map', 'Sequence / flow chart', 'Frayer model'], default: 'KWL chart' },
    ],
    pushTargets: ['smartClass'],
    basePrompt: `Build a {{organizer}} graphic organizer for "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- columns: the headings of the {{organizer}} as a student would draw them on paper.
- rows: 3-5 rows. Each row is one prompt or one item to compare.
- Every cell must contain a filled-in model answer for "{{topic}}", so the teacher can show a completed example before students make their own blank copy.
- description: how to draw this organizer on the board in under a minute.
- legend: 2 notes on what students usually get wrong with this organizer.`,
  },

  // ── PRACTICE (added) ─────────────────────────────────────────────────────
  {
    key: 'real-world-project',
    command: '/real-world-project',
    label: 'Real-World Project',
    description: 'Suggest a real-world project on this topic with steps and outcomes.',
    group: 'PRACTICE',
    outputKind: 'document',
    icon: 'fi fi-rr-globe',
    accent: 'bg-emerald-600',
    preview: 'A project connecting the topic to something real in the students own town',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 11000,
    defaultClassRange: [4, 12],
    inputs: [
      { key: 'duration', label: 'Project length', type: 'select', options: ['1 week', '2 weeks', '1 month'], default: '2 weeks' },
    ],
    pushTargets: [],
    basePrompt: `Design a real-world project on "{{topic}}" ({{subject}}, {{class}}) lasting {{duration}}.
Requirements:
- The project must engage something real and local — the school, the street, the market, a farm, a water body, a family business — not a hypothetical.
- sections: "The Real Problem", "What Students Investigate", "Steps" (numbered, with durationMins), "What They Produce", "Who Sees The Result".
- Students must collect their own data or observations; the answer must not be findable in the textbook.
- teacherNotes: permissions or safety to arrange, and how to help students who cannot travel.`,
  },
  {
    key: 'literacy-activity',
    command: '/literacy-activity',
    label: 'Literacy Activity',
    description: 'Suggest a literacy activity on this topic to improve reading skills.',
    group: 'PRACTICE',
    outputKind: 'document',
    icon: 'fi fi-rr-book-open-reader',
    accent: 'bg-amber-500',
    preview: 'A reading-and-language activity built on this topic, with materials and assessment',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 10000,
    defaultClassRange: [1, 10],
    inputs: [
      { key: 'focus', label: 'Literacy focus', type: 'select', options: ['Reading fluency', 'Vocabulary', 'Comprehension', 'Speaking', 'Writing'], default: 'Comprehension' },
    ],
    pushTargets: [],
    basePrompt: `Design a literacy activity built around "{{topic}}" ({{subject}}, {{class}}), focused on {{focus}}.
Requirements:
- sections: "Activity Description", "Objectives", "Materials Needed", "How To Run It" (numbered, with durationMins), "How To Assess It".
- Literacy is the skill being built; "{{topic}}" is the content it is practised on. Both must be genuinely served.
- Include the actual text, word list or sentence frames the activity needs — do not tell the teacher to "prepare a passage".
- teacherNotes: how to include a student who is reading well below grade level.`,
  },
  {
    key: 'stem-challenge',
    command: '/stem-challenge',
    label: 'STEM Challenge',
    description: 'Create a STEM challenge related to this topic, with steps and evaluation.',
    group: 'PRACTICE',
    outputKind: 'document',
    icon: 'fi fi-rr-bolt',
    accent: 'bg-orange-600',
    preview: 'A hands-on build-and-test challenge with constraints and judging criteria',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 11000,
    defaultClassRange: [3, 12],
    inputs: [
      { key: 'duration', label: 'Time available', type: 'select', options: ['30 minutes', '45 minutes', '1 period', '2 periods'], default: '45 minutes' },
      { key: 'mode', label: 'Teams of', type: 'select', options: ['Pairs', 'Groups of 4', 'Groups of 6'], default: 'Groups of 4' },
    ],
    pushTargets: [],
    basePrompt: `Design a STEM challenge on "{{topic}}" ({{subject}}, {{class}}) for {{mode}}, completed in {{duration}}.
Requirements:
- sections: "The Challenge", "Constraints" (what they may and may not use), "Materials", "Build Steps" (numbered, with durationMins), "How It Is Tested", "Judging Criteria".
- Materials must be scrap and household items — paper, string, tape, bottles, straws, clay. Nothing purchased.
- There must be a measurable test with a number (height, distance, time, weight held) so teams can compare fairly.
- The challenge must fail in an instructive way if the underlying concept is ignored.`,
  },
  {
    key: 'science-experiment',
    command: '/science-experiment',
    label: 'Science Experiment',
    description: 'Suggest a simple science experiment for this topic with materials and procedure.',
    group: 'PRACTICE',
    outputKind: 'document',
    icon: 'fi fi-rr-flask',
    accent: 'bg-teal-600',
    preview: 'A classroom-safe experiment with materials, procedure, expected result and the science behind it',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 11000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'setting', label: 'Run as', type: 'select', options: ['Teacher demonstration', 'Student groups', 'Individual'], default: 'Teacher demonstration' },
    ],
    pushTargets: [],
    basePrompt: `Design a simple experiment demonstrating "{{topic}}" ({{subject}}, {{class}}), run as {{setting}}.
Requirements:
- sections: "Aim", "Materials", "Procedure" (numbered steps, with durationMins), "Observation Table" (describe the columns), "Expected Result", "The Science Behind It", "Safety".
- Materials must be available in a Tamil Nadu government school or a local shop. No specialised lab apparatus, no hazardous chemicals.
- State the expected result honestly, including roughly how long it takes to appear.
- Safety is mandatory and specific — name the actual hazard, not "be careful".
- teacherNotes: the two most common reasons this experiment fails, and how to recover the lesson if it does.`,
  },
  {
    key: 'math-problem-set',
    command: '/math-problem-set',
    label: 'Math Problem Set',
    description: 'Create a set of math problems on this topic, graded by difficulty.',
    group: 'PRACTICE',
    outputKind: 'worksheet',
    icon: 'fi fi-rr-calculator',
    accent: 'bg-blue-500',
    preview: 'Easy, medium and challenge problems with full working in the key',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 18000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(15, 'Total problems'), DIFFICULTY_INPUT],
    pushTargets: ['homework'],
    basePrompt: `Create a set of about {{count}} problems on "{{topic}}" ({{subject}}, {{class}}). Difficulty: {{difficulty}}.
Requirements:
- Sections must be "Easy Problems", "Medium Problems", "Challenge Problems", in that order, with the count weighted towards the middle.
- Number continuously from 1 across all sections.
- Every problem must be solvable with the methods a {{class}} student has been taught — never require a technique from a later class.
- answerKey must show the full working, one step per entry, not just the final value.
- commonErrors: at least 4 slips specific to this topic.`,
  },

  // ── ASSESS (added) ───────────────────────────────────────────────────────
  {
    key: 'reading-comprehension',
    command: '/reading-comprehension',
    label: 'Reading Comprehension',
    description: 'Create reading comprehension questions for a passage on this topic.',
    group: 'ASSESS',
    outputKind: 'worksheet',
    icon: 'fi fi-rr-book-open-cover',
    accent: 'bg-rose-500',
    preview: 'An original passage with literal, inferential and critical questions plus a key',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 18000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'passageLength', label: 'Passage length', type: 'select', options: ['Short (100 words)', 'Medium (200 words)', 'Long (350 words)'], default: 'Medium (200 words)' },
    ],
    pushTargets: ['homework'],
    basePrompt: `Write a reading comprehension exercise on "{{topic}}" ({{subject}}, {{class}}). Passage length: {{passageLength}}.
Requirements:
- passage: an ORIGINAL passage of the stated length about "{{topic}}", written at {{class}} reading level. Every fact in it must be true.
- Sections must be "Literal Questions" (answer is stated in the passage), "Inferential Questions" (answer must be worked out from it), and "Critical Questions" (opinion, supported by the passage).
- Every question must be answerable from the passage alone — never require outside knowledge.
- answerKey: model answers quoting the relevant line for literal and inferential items.
- commonErrors: what students do when they answer from memory instead of from the text.`,
  },
  {
    key: 'argumentative-writing',
    command: '/argumentative-writing',
    label: 'Argumentative Writing',
    description: 'Give a writing prompt and outline for an argumentative essay on this topic.',
    group: 'ASSESS',
    outputKind: 'document',
    icon: 'fi fi-rr-balance-scale-left',
    accent: 'bg-fuchsia-500',
    preview: 'A debatable prompt, model thesis, paragraph outline and writing tips',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 11000,
    defaultClassRange: [6, 12],
    inputs: [
      { key: 'length', label: 'Essay length', type: 'select', options: ['150 words', '250 words', '400 words'], default: '250 words' },
    ],
    pushTargets: ['homework'],
    basePrompt: `Create an argumentative writing task on "{{topic}}" ({{subject}}, {{class}}), for a {{length}} essay.
Requirements:
- sections: "The Prompt", "Model Thesis Statement", "Outline" (Introduction / Body 1 / Body 2 / Counter-argument / Conclusion, each as a bullet saying what goes in it), "Evidence Students Can Use", "Writing Tips".
- The prompt must be genuinely arguable — a reasonable person could take either side. If "{{topic}}" has no arguable angle, find the closest one and say what it is.
- The counter-argument section is compulsory: name the strongest objection and how to answer it.
- Evidence must be real facts a {{class}} student would know or could look up in the textbook.`,
  },

  // ── ENGAGE (added) ───────────────────────────────────────────────────────
  {
    key: 'character-education',
    command: '/character-education',
    label: 'Character Education',
    description: 'Suggest activities to teach character education alongside this topic.',
    group: 'ENGAGE',
    outputKind: 'cardList',
    icon: 'fi fi-rr-heart',
    accent: 'bg-pink-500',
    preview: 'Value-led discussion and reflection activities tied to the lesson',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'value', label: 'Value to build', type: 'select', options: ['Honesty', 'Respect', 'Responsibility', 'Empathy', 'Perseverance', 'Fairness', 'Teamwork'], default: 'Responsibility' },
      COUNT_INPUT(5, 'Number of activities'),
    ],
    pushTargets: [],
    basePrompt: `Suggest {{count}} character-education activities that build {{value}} through "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each card is one activity: what the teacher says or sets up, and the reflection question that follows.
- The value must arise from the lesson content honestly — do not bolt a moral onto an unrelated topic. If the link is thin, use the way the subject is practised (checking your work honestly, sharing equipment fairly).
- Include at least one activity that is a dilemma with no comfortable answer.
- tag: "Discussion", "Reflection", "Action" or "Story".
- Keep every activity under 10 minutes.`,
  },

  // ── DIFFERENTIATE (added) ────────────────────────────────────────────────
  {
    key: 'differentiated-worksheet',
    command: '/differentiated-worksheet',
    label: 'Differentiated Worksheet',
    description: 'Create three levelled worksheets: easy, medium and hard, for different learners.',
    group: 'DIFFERENTIATE',
    outputKind: 'worksheet',
    icon: 'fi fi-rr-layers',
    accent: 'bg-sky-600',
    preview: 'One worksheet at three levels so every student works on the same idea',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 20000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(6, 'Questions per level')],
    pushTargets: ['homework'],
    basePrompt: `Create a levelled worksheet on "{{topic}}" ({{subject}}, {{class}}) with about {{count}} questions at each level.
Requirements:
- Sections must be exactly "Level 1 — Support", "Level 2 — Core", "Level 3 — Stretch".
- All three levels must cover the SAME concept. Level 1 scaffolds it (worked example given, steps started, sentence frames); Level 2 is grade standard; Level 3 extends it (multi-step, justify, generalise).
- No level may be busywork: a Level 1 student must still do real thinking.
- Number continuously from 1 across all three levels.
- answerKey covers every numbered item.
- commonErrors: one per level, describing what that level's learners typically slip on.`,
  },

  // ── FEEDBACK (added) ─────────────────────────────────────────────────────
  {
    key: 'student-goal-setting',
    command: '/student-goal-setting',
    label: 'Student Goal Setting',
    description: 'Create a goal-setting template for students to track their learning.',
    group: 'FEEDBACK',
    outputKind: 'matrix',
    icon: 'fi fi-rr-bullseye',
    accent: 'bg-lime-600',
    preview: 'A goal tracker students fill in themselves, with a worked example row',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [3, 12],
    inputs: [
      { key: 'horizon', label: 'Goal period', type: 'select', options: ['This week', 'This month', 'This term'], default: 'This month' },
    ],
    pushTargets: [],
    basePrompt: `Create a student goal-setting tracker for "{{topic}}" ({{subject}}, {{class}}), covering {{horizon}}.
Requirements:
- columns: exactly "My goal", "How I will get there", "How I will know I did it", "Check-in".
- rows: 4-5 rows. Row 1 must be a fully worked EXAMPLE row so students see what a good goal looks like; the rest are prompts for the student to complete, phrased in the first person ("I will be able to ...").
- Goals must be specific and checkable by the student without the teacher marking anything.
- description: how the teacher introduces this in 5 minutes.
- legend: how often to revisit, and what to do when a student misses a goal.`,
  },

  // ── PLAN & ORGANISE ──────────────────────────────────────────────────────
  {
    key: 'learning-stations',
    command: '/learning-stations',
    label: 'Learning Stations',
    description: 'Give ideas for learning stations for this topic with rotations.',
    group: 'PLAN',
    outputKind: 'matrix',
    icon: 'fi fi-rr-grid',
    accent: 'bg-violet-500',
    preview: 'Rotating stations laid out as a grid, with timings and materials',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 11000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'stations', label: 'How many stations', type: 'select', options: ['3', '4', '5'], default: '4' },
      { key: 'duration', label: 'Total time', type: 'select', options: ['30 minutes', '40 minutes', '1 period'], default: '40 minutes' },
    ],
    pushTargets: [],
    basePrompt: `Plan {{stations}} learning stations on "{{topic}}" ({{subject}}, {{class}}), rotating within {{duration}}.
Requirements:
- rows: one per station, labelled "Station 1 — <name>" and so on.
- columns: exactly "Activity", "Materials", "Time", "Success looks like".
- weight: the minutes for that station; they must sum to {{duration}} minus 5 minutes of rotation time.
- Each station must teach a different facet of "{{topic}}" and must work without the teacher standing there — a student should be able to read the instruction and start.
- One station must be quiet/individual so the room does not become uniformly loud.
- legend: how to signal rotations, and what to do with a group that finishes early.`,
  },
  {
    key: 'field-trip',
    command: '/field-trip',
    label: 'Field Trip Plan',
    description: 'Plan an educational field trip for this topic with learning objectives.',
    group: 'PLAN',
    outputKind: 'document',
    icon: 'fi fi-rr-compass',
    accent: 'bg-emerald-500',
    preview: 'Destination options, objectives, itinerary, safety and a follow-up task',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 12000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'duration', label: 'Trip length', type: 'select', options: ['Half day', 'Full day', 'Within school grounds'], default: 'Half day' },
    ],
    pushTargets: [],
    basePrompt: `Plan a {{duration}} educational field trip that teaches "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- sections: "Where To Go" (2-3 realistic options in or near a Tamil Nadu town, including a zero-cost option), "Learning Objectives", "Before The Trip", "Itinerary" (with durationMins), "What Students Record", "Safety & Permissions", "After The Trip".
- If travel is not feasible, the "Within school grounds" option must still genuinely teach the topic.
- Students must have a specific recording task — a tally, sketch, interview or measurement — not "observe and enjoy".
- Safety must name real risks (road crossing, water, heat, headcount points) and the staff-to-student ratio.
- teacherNotes: what to do about students who cannot pay or cannot attend.`,
  },
  {
    key: 'substitute-plan',
    command: '/substitute-plan',
    label: 'Substitute Plan',
    description: 'Create an easy-to-follow substitute teacher plan for one class period.',
    group: 'PLAN',
    outputKind: 'document',
    icon: 'fi fi-rr-user-check',
    accent: 'bg-slate-500',
    preview: 'A self-contained period plan any teacher can pick up and run cold',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 11000,
    defaultClassRange: [1, 12],
    inputs: [
      { key: 'duration', label: 'Period length', type: 'select', options: ['30 minutes', '40 minutes', '45 minutes', '60 minutes'], default: '45 minutes' },
    ],
    pushTargets: [],
    basePrompt: `Write a substitute teacher plan for one {{duration}} period on "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Assume the substitute does NOT know this subject. Everything they need must be on this page — no "refer to the textbook chapter", no prior context.
- sections: "Lesson Overview (read this first)", "What To Write On The Board", "Instructions" (numbered, scripted, with durationMins), "Student Work", "If You Finish Early", "Leave A Note For Me".
- Instructions must be literally sayable — write the words, including the questions to ask and the answers to expect.
- Nothing requiring subject judgement, marking, or new teaching of a hard concept. Consolidation only.
- teacherNotes: what the regular teacher should set up in advance for this to run smoothly.`,
  },
  {
    key: 'end-of-lesson',
    command: '/end-of-lesson',
    label: 'End of Lesson',
    description: 'Create engaging wrap-up activities to conclude a lesson.',
    group: 'PLAN',
    outputKind: 'cardList',
    icon: 'fi fi-rr-hourglass',
    accent: 'bg-amber-600',
    preview: 'Quick closers that check understanding before the bell',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 8000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(6, 'Number of wrap-ups')],
    pushTargets: [],
    basePrompt: `Give {{count}} ways to close a lesson on "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each must fit in 3-5 minutes and end with the teacher KNOWING who understood and who did not.
- Body: exactly what the teacher says, and what a correct student response sounds like.
- Vary the form: one written exit ticket, one oral round, one hands-up check, one pair-share, one prediction of next lesson, one summarise-in-one-sentence.
- tag: "Written", "Oral", "Quick check" or "Preview".`,
  },
  {
    key: 'lesson-reflection',
    command: '/lesson-reflection',
    label: 'Lesson Reflection',
    description: 'Create a lesson reflection template to improve future lessons.',
    group: 'PLAN',
    outputKind: 'document',
    icon: 'fi fi-rr-mind-share',
    accent: 'bg-violet-600',
    preview: 'A short post-lesson review the teacher fills in while it is fresh',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [1, 12],
    inputs: [],
    pushTargets: [],
    basePrompt: `Create a post-lesson reflection template for a lesson on "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- sections: "What Went Well", "Where They Struggled", "Evidence I Have", "What I Would Change", "Next Lesson Must Start With".
- Each section's bullets are PROMPTS for the teacher to answer, phrased as specific questions about "{{topic}}" — not generic ones. Reference the parts of this topic students actually find hard.
- Keep it to something a teacher can complete honestly in 5 minutes between periods.
- teacherNotes: the two or three signals during this particular topic that indicate the class has not understood, even when they say they have.`,
  },

  // ── AI STUDIO OPTIONS (11-20) ─────────────────────────────────────────────
  {
    key: 'educational-video',
    command: '/educational-video',
    label: 'Educational Video Ideas',
    description: 'Suggest ideas for educational video topics on this topic for classroom or self-study.',
    group: 'TEACH',
    outputKind: 'cardList',
    icon: 'fi fi-rr-film',
    accent: 'bg-blue-600',
    preview: 'Video concepts with hooks, visual script ideas, key concepts and takeaways',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 10000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(5, 'Number of video ideas')],
    pushTargets: ['smartClass'],
    basePrompt: `Suggest {{count}} educational video topic ideas for teaching "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each card represents one video concept idea.
- Title: Video idea title.
- Body: 1) Video Hook / Opener, 2) Visual concepts & demonstration, 3) Key takeaway points for students.
- Tag: estimated duration (e.g. "3 mins", "5 mins").
- Icon: fitting emoji.`,
  },
  {
    key: 'thinking-questions',
    command: '/thinking-questions',
    label: 'Higher-Order Thinking Questions',
    description: 'Generate higher-order thinking questions on this topic to improve critical thinking.',
    group: 'ASSESS',
    outputKind: 'cardList',
    icon: 'fi fi-rr-brain',
    accent: 'bg-purple-600',
    preview: 'Questions mapped across Bloom\'s Taxonomy: Remembering, Understanding, Applying, Analyzing, Evaluating, Creating',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 12000,
    defaultClassRange: [1, 12],
    inputs: [],
    pushTargets: ['questionBank'],
    basePrompt: `Generate higher-order thinking questions on "{{topic}}" ({{subject}}, {{class}}) to improve student critical thinking.
Requirements:
- Exactly 6 cards, corresponding to Bloom's Taxonomy levels:
  1) Remembering Questions
  2) Understanding Questions
  3) Applying Questions
  4) Analyzing Questions
  5) Evaluating Questions
  6) Creating Questions
- Title: Level name (e.g. "Analyzing Questions").
- Body: 2-3 deep questions for that level, plus guiding notes for classroom facilitation.
- Tag: Bloom's level.
- Icon: fitting emoji.`,
  },
  {
    key: 'projects',
    command: '/projects',
    label: 'Project Ideas',
    description: 'Suggest project ideas on this topic for this grade level with steps and expected outcomes.',
    group: 'PRACTICE',
    outputKind: 'cardList',
    icon: 'fi fi-rr-diploma',
    accent: 'bg-pink-600',
    preview: 'Project ideas with steps to follow, required resources and expected outcomes',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 11000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(4, 'Number of project ideas')],
    pushTargets: [],
    basePrompt: `Suggest {{count}} project ideas on "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each card is one project idea.
- Title: Project title.
- Body: 1) Concept overview, 2) Steps to follow, 3) Expected outcome / deliverable.
- Tag: duration / team mode (e.g. "1 Week - Pairs").
- Icon: fitting emoji.`,
  },
  {
    key: 'lessonhook',
    command: '/lessonhook',
    label: 'Lesson Hook & Starter',
    description: 'Give an attention-grabbing lesson hook or starter activity on this topic.',
    group: 'TEACH',
    outputKind: 'cardList',
    icon: 'fi fi-rr-bolt',
    accent: 'bg-amber-500',
    preview: 'Attention-grabbing lesson starters with usage steps, purpose and expected student responses',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(3, 'Number of hook ideas')],
    pushTargets: ['smartClass'],
    basePrompt: `Give {{count}} attention-grabbing lesson hooks or starter activities on "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each card is one hook/starter idea.
- Title: Hook / Starter Idea.
- Body: 1) How to Use, 2) Purpose, 3) Expected Student Response.
- Tag: duration (e.g. "3 mins", "5 mins").
- Icon: fitting emoji.`,
  },
  {
    key: 'vocabulary',
    command: '/vocabulary',
    label: 'Vocabulary List',
    description: 'List important vocabulary words related to this topic with meanings and examples.',
    group: 'TEACH',
    outputKind: 'cardList',
    icon: 'fi fi-rr-document',
    accent: 'bg-pink-600',
    preview: 'Vocabulary words with student-friendly meanings, Tamil gloss, and example sentences',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(6, 'Number of vocabulary words')],
    pushTargets: ['smartClass'],
    basePrompt: `List {{count}} important vocabulary words related to "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each card represents one vocabulary word.
- Title: Vocabulary word.
- Body: 1) Meaning in simple classroom English, 2) Tamil translation / equivalent, 3) Example sentence in context.
- Tag: difficulty / word type.
- Icon: fitting emoji.`,
  },
  {
    key: 'class-discussion',
    command: '/class-discussion',
    label: 'Class Discussion Topics',
    description: 'Suggest thought-provoking discussion topics on this topic for classroom discussion.',
    group: 'ENGAGE',
    outputKind: 'cardList',
    icon: 'fi fi-rr-comments',
    accent: 'bg-lime-600',
    preview: 'Discussion topics with guiding questions, opposing viewpoints, and facilitation tips',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(5, 'Number of discussion topics')],
    pushTargets: [],
    basePrompt: `Suggest {{count}} thought-provoking discussion topics on "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each card is one discussion topic.
- Title: Discussion Topic.
- Body: 1) Core question / dilemma, 2) Guiding questions to keep the conversation going, 3) Key insights to reach.
- Tag: discussion format (e.g. "Debate", "Open Discussion", "Think-Pair-Share").
- Icon: fitting emoji.`,
  },
  {
    key: 'formative-assessment',
    command: '/formative-assessment',
    label: 'Formative Assessment',
    description: 'Create quick formative assessment ideas to check understanding of this topic.',
    group: 'ASSESS',
    outputKind: 'cardList',
    icon: 'fi fi-rr-check-circle',
    accent: 'bg-emerald-600',
    preview: 'Quick formative check ideas with step-by-step instructions and key observations',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 9000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(5, 'Number of assessment ideas')],
    pushTargets: ['questionBank'],
    basePrompt: `Create {{count}} quick formative assessment ideas to check understanding of "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each card is one formative assessment technique.
- Title: Assessment Idea (e.g. "Exit Slip", "3-2-1 Summary", "Whiteboard Check").
- Body: 1) How to Use, 2) Purpose, 3) What to look for / How to gauge understanding.
- Tag: duration (e.g. "2 mins", "5 mins").
- Icon: fitting emoji.`,
  },
  {
    key: 'remedial-activity',
    command: '/remedial-activity',
    label: 'Remedial Activity',
    description: 'Suggest remedial activities for students who are struggling with this topic.',
    group: 'DIFFERENTIATE',
    outputKind: 'cardList',
    icon: 'fi fi-rr-chart-line-up',
    accent: 'bg-amber-600',
    preview: 'Targeted remedial activities for struggling students with step-by-step guidance',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 10000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(5, 'Number of activities')],
    pushTargets: [],
    basePrompt: `Suggest {{count}} remedial activities for students struggling with "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each card is one remedial activity.
- Title: Activity name.
- Body: 1) Activity steps & scaffolding, 2) Misconception addressed, 3) Implementation tips for the teacher.
- Tag: targeted skill area.
- Icon: fitting emoji.`,
  },
  {
    key: 'enrichment-activity',
    command: '/enrichment-activity',
    label: 'Enrichment Activity',
    description: 'Suggest enrichment activities for advanced learners on this topic.',
    group: 'DIFFERENTIATE',
    outputKind: 'cardList',
    icon: 'fi fi-rr-trophy',
    accent: 'bg-indigo-600',
    preview: 'Challenging enrichment tasks for advanced learners with clear learning outcomes',
    defaultModel: 'gemini-2.5-flash',
    defaultMaxTokens: 10000,
    defaultClassRange: [1, 12],
    inputs: [COUNT_INPUT(5, 'Number of activities')],
    pushTargets: [],
    basePrompt: `Suggest {{count}} enrichment activities for advanced learners on "{{topic}}" ({{subject}}, {{class}}).
Requirements:
- Each card is one enrichment task.
- Title: Activity name.
- Body: 1) Challenge description & steps, 2) Deep-dive concept, 3) Expected Learning Outcome.
- Tag: challenge focus (e.g. "Research", "Design", "Synthesis").
- Icon: fitting emoji.`,
  },
];

export const SKILL_BY_KEY: Record<string, AiSkillDef> = AI_SKILLS.reduce((acc, s) => {
  acc[s.key] = s;
  return acc;
}, {} as Record<string, AiSkillDef>);

// ---------------------------------------------------------------------------
// Prompt composition
// ---------------------------------------------------------------------------

export interface PromptContext {
  className: string;
  grade: number | string;
  subject: string;
  topic: string;
  unit?: string;
  language?: string;
  /** Syllabus / textbook extract, already trimmed by the caller. */
  context?: string;
  /** Values for the skill's declared SkillInputs. */
  extras?: Record<string, string | number | undefined>;
  /** Prior output being refined, plus the teacher's refine instruction. */
  refineOf?: unknown;
  refineInstruction?: string;
}

export interface ResolvedSkillConfig {
  basePrompt: string;
  packDirective: string;
  model: string;
  maxTokens: number;
}

function fillPlaceholders(template: string, ctx: PromptContext, def: AiSkillDef): string {
  const values: Record<string, string> = {
    class: String(ctx.className || `Class ${ctx.grade}`),
    grade: String(ctx.grade ?? ''),
    subject: String(ctx.subject || ''),
    topic: String(ctx.topic || ''),
    unit: String(ctx.unit || ''),
    // Available to any prompt that needs the model to emit real icon names.
    iconList: SAFE_ICON_LIST,
  };
  for (const input of def.inputs) {
    const raw = ctx.extras?.[input.key];
    const value = raw === undefined || raw === null || String(raw).trim() === ''
      ? (input.default !== undefined ? String(input.default) : '')
      : String(raw);
    values[input.key] = value;
  }
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
}

/**
 * Compose the final prompt: pack persona -> class context -> skill brief ->
 * pack structural directive -> language rule -> refine instruction.
 *
 * `overrides.basePrompt` / `overrides.packDirective` come from AiSkillConfig so
 * a superadmin can retune a skill without a deploy.
 */
export function renderPrompt(
  def: AiSkillDef,
  pack: SubjectPack,
  ctx: PromptContext,
  overrides?: { basePrompt?: string; packDirective?: string }
): string {
  const p = SUBJECT_PACKS[pack] || SUBJECT_PACKS.GENERAL;
  const isTamil = (ctx.language || 'english').toLowerCase() === 'tamil';

  const brief = fillPlaceholders(overrides?.basePrompt || def.basePrompt, ctx, def);
  const packDirective = fillPlaceholders(
    overrides?.packDirective || p.kindHints[def.outputKind],
    ctx,
    def
  );

  const parts: string[] = [
    `You are ${p.persona}.`,
    `TEACHING METHOD YOU MUST FOLLOW:\n${p.method}`,
    `EXAMPLES POLICY:\n${p.examplePolicy}`,
    `CLASS CONTEXT:\n- Board: Tamil Nadu State Board\n- Class: ${ctx.className || ctx.grade}\n- Subject: ${ctx.subject}${ctx.unit ? `\n- Unit: ${ctx.unit}` : ''}\n- Topic: ${ctx.topic}`,
    `TASK (${def.command} — ${def.label}):\n${brief}`,
    `SUBJECT-SPECIFIC STRUCTURE (${p.label}) — this overrides any generic structure above:\n${packDirective}`,
  ];

  if (ctx.context && ctx.context.trim()) {
    parts.push(
      `SYLLABUS / TEXTBOOK EXTRACT — use only the parts about "${ctx.topic}" and ignore other chapters. If "${ctx.topic}" is not covered here, fall back to the standard TN Board curriculum:\n${ctx.context.trim()}`
    );
  }

  parts.push(
    isTamil
      ? `LANGUAGE: Write all student-facing content in natural classroom Tamil. Keep technical terms in English inside brackets after the Tamil term on first use. Field names in the JSON stay in English.`
      : `LANGUAGE: Write in clear English suited to ${ctx.className || `Class ${ctx.grade}`}. Give the Tamil equivalent for key technical terms where a tamil field exists.`
  );

  if (ctx.refineInstruction && ctx.refineOf) {
    parts.push(
      `REVISION PASS — you previously produced the JSON below. Produce a corrected version that applies this instruction: "${ctx.refineInstruction}". Keep everything that was already good; change only what the instruction requires. Return the full object again, not a diff.\n\nPREVIOUS OUTPUT:\n${JSON.stringify(
        ctx.refineOf
      ).slice(0, 24000)}`
    );
  }

  parts.push(
    `OUTPUT RULES:\n- Return JSON matching the provided schema exactly. Populate every required field.\n- All content must be specifically about "${ctx.topic}". No placeholders, no "e.g. insert example here", no lorem text.\n- Every fact, date, formula, constant and code output must be correct. If you are unsure of a value, use a form that is definitely true rather than inventing a precise-sounding one.`
  );

  return parts.join('\n\n');
}

/** Grade number from a className like "Class 10", "10", "Grade 9 B". */
export function gradeFromClassName(className?: string | null): number {
  const m = String(className || '').match(/\d{1,2}/);
  const n = m ? parseInt(m[0], 10) : NaN;
  return Number.isFinite(n) ? n : 0;
}
