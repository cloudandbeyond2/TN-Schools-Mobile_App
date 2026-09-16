// Tamil Nadu Higher Secondary (HSC) group codes for school students.
// Source: Directorate of Government Examinations — Higher Secondary
// First/Second Year Examinations booklet, Annexure I (New Syllabus).
// Every student takes Part I (Language) + Part II (English) + the four
// Part III subjects listed here.

export type StreamCategory =
  | 'SCIENCE_MATHS'
  | 'SCIENCE_BIOLOGY'
  | 'COMMERCE'
  | 'ARTS'
  | 'VOCATIONAL';

export interface HscGroup {
  code: string;
  name: string;
  partIIISubjects: string[];
  streamCategory: StreamCategory;
}

export const STREAM_LABELS: Record<StreamCategory, string> = {
  SCIENCE_MATHS: 'Science (with Mathematics)',
  SCIENCE_BIOLOGY: 'Science (with Biology)',
  COMMERCE: 'Commerce',
  ARTS: 'Arts / Humanities',
  VOCATIONAL: 'Vocational',
};

const g = (code: string, partIIISubjects: string[], streamCategory: StreamCategory): HscGroup => ({
  code,
  name: `${code} — ${partIIISubjects.join(', ')}`,
  partIIISubjects,
  streamCategory,
});

export const HSC_GROUPS: HscGroup[] = [
  // ── 25xx: Science with Mathematics ──────────────────────────────
  g('2501', ['Physics', 'Chemistry', 'Statistics', 'Mathematics'], 'SCIENCE_MATHS'),
  g('2502', ['Physics', 'Chemistry', 'Computer Science', 'Mathematics'], 'SCIENCE_MATHS'),
  g('2503', ['Physics', 'Chemistry', 'Biology', 'Mathematics'], 'SCIENCE_MATHS'),
  g('2504', ['Physics', 'Chemistry', 'Bio-Chemistry', 'Mathematics'], 'SCIENCE_MATHS'),
  g('2505', ['Physics', 'Chemistry', 'Communicative English', 'Mathematics'], 'SCIENCE_MATHS'),
  g('2506', ['Physics', 'Chemistry', 'Mathematics', 'Home Science'], 'SCIENCE_MATHS'),
  // ── 26xx: Science with Biology ──────────────────────────────────
  g('2601', ['Physics', 'Chemistry', 'Biology', 'Computer Science'], 'SCIENCE_BIOLOGY'),
  g('2602', ['Physics', 'Chemistry', 'Biology', 'Micro-Biology'], 'SCIENCE_BIOLOGY'),
  g('2603', ['Physics', 'Chemistry', 'Biology', 'Bio-Chemistry'], 'SCIENCE_BIOLOGY'),
  g('2604', ['Physics', 'Chemistry', 'Biology', 'General Nursing'], 'SCIENCE_BIOLOGY'),
  g('2605', ['Physics', 'Chemistry', 'Biology', 'Nutrition and Dietetics'], 'SCIENCE_BIOLOGY'),
  g('2606', ['Physics', 'Chemistry', 'Biology', 'Communicative English'], 'SCIENCE_BIOLOGY'),
  g('2607', ['Physics', 'Chemistry', 'Biology', 'Home Science'], 'SCIENCE_BIOLOGY'),
  g('2608', ['Physics', 'Chemistry', 'Botany', 'Zoology'], 'SCIENCE_BIOLOGY'),
  // ── 27xx: Commerce ──────────────────────────────────────────────
  g('2701', ['Statistics', 'Economics', 'Commerce', 'Accountancy'], 'COMMERCE'),
  g('2702', ['Economics', 'Commerce', 'Accountancy', 'Computer Applications'], 'COMMERCE'),
  g('2703', ['Communicative English', 'Economics', 'Commerce', 'Accountancy'], 'COMMERCE'),
  g('2704', ['History', 'Economics', 'Commerce', 'Accountancy'], 'COMMERCE'),
  g('2705', ['Economics', 'Political Science', 'Commerce', 'Accountancy'], 'COMMERCE'),
  g('2706', ['Economics', 'Commerce', 'Accountancy', 'Ethics and Indian Culture'], 'COMMERCE'),
  g('2707', ['Economics', 'Commerce', 'Accountancy', 'Advanced Language (Tamil)'], 'COMMERCE'),
  g('2708', ['Economics', 'Commerce', 'Accountancy', 'Business Mathematics and Statistics'], 'COMMERCE'),
  // ── 28xx: Arts / Humanities ─────────────────────────────────────
  g('2801', ['Statistics', 'Geography', 'History', 'Economics'], 'ARTS'),
  g('2802', ['Geography', 'History', 'Economics', 'Computer Applications'], 'ARTS'),
  g('2803', ['Geography', 'Communicative English', 'History', 'Economics'], 'ARTS'),
  g('2804', ['Geography', 'History', 'Economics', 'Political Science'], 'ARTS'),
  g('2805', ['Geography', 'History', 'Economics', 'Ethics and Indian Culture'], 'ARTS'),
  g('2806', ['Geography', 'History', 'Economics', 'Advanced Language (Tamil)'], 'ARTS'),
  // ── 29xx: Vocational ────────────────────────────────────────────
  g('2971', ['Mathematics', 'Basic Mechanical Engineering (Theory)', 'Basic Mechanical Engineering (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2972', ['Mathematics', 'Basic Electrical Engineering (Theory)', 'Basic Electrical Engineering (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2973', ['Mathematics', 'Basic Electronics Engineering (Theory)', 'Basic Electronics Engineering (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2974', ['Mathematics', 'Basic Civil Engineering (Theory)', 'Basic Civil Engineering (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2975', ['Mathematics', 'Basic Automobile Engineering (Theory)', 'Basic Automobile Engineering (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2976', ['Mathematics', 'Textile Technology (Theory)', 'Textile Technology (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2977', ['Biology', 'Nursing (Theory)', 'Nursing (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2978', ['Home Science', 'Textile and Dress Designing (Theory)', 'Textile and Dress Designing (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2979', ['Home Science', 'Food Service Management (Theory)', 'Food Service Management (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2980', ['Biology', 'Agricultural Science (Theory)', 'Agricultural Science (Practical)', 'Employability Skills'], 'VOCATIONAL'),
  g('2981', ['Commerce', 'Accountancy (Theory)', 'Office Management and Secretaryship (Theory)', 'Typography and Computer Applications (Practical)'], 'VOCATIONAL'),
  g('2982', ['Commerce', 'Accountancy', 'Auditing (Practical)', 'Employability Skills'], 'VOCATIONAL'),
];

export const HSC_GROUP_MAP: Map<string, HscGroup> = new Map(HSC_GROUPS.map((grp) => [grp.code, grp]));

export function getGroup(code: string | null | undefined): HscGroup | null {
  if (!code) return null;
  return HSC_GROUP_MAP.get(String(code).trim()) || null;
}

// Botany + Zoology (2608) is treated as equivalent to Biology.
export function groupSubjectsWithEquivalents(grp: HscGroup): Set<string> {
  const subjects = new Set(grp.partIIISubjects);
  if (subjects.has('Botany') && subjects.has('Zoology')) subjects.add('Biology');
  return subjects;
}

export function hasPCM(grp: HscGroup): boolean {
  const s = groupSubjectsWithEquivalents(grp);
  return s.has('Physics') && s.has('Chemistry') && s.has('Mathematics');
}

export function hasPCB(grp: HscGroup): boolean {
  const s = groupSubjectsWithEquivalents(grp);
  return s.has('Physics') && s.has('Chemistry') && s.has('Biology');
}
