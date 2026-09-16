"use strict";
// Tamil Nadu Higher Secondary (HSC) group codes for school students.
// Source: Directorate of Government Examinations — Higher Secondary
// First/Second Year Examinations booklet, Annexure I (New Syllabus).
// Every student takes Part I (Language) + Part II (English) + the four
// Part III subjects listed here.
Object.defineProperty(exports, "__esModule", { value: true });
exports.HSC_GROUP_MAP = exports.HSC_GROUPS = exports.STREAM_LABELS = void 0;
exports.getGroup = getGroup;
exports.groupSubjectsWithEquivalents = groupSubjectsWithEquivalents;
exports.hasPCM = hasPCM;
exports.hasPCB = hasPCB;
exports.STREAM_LABELS = {
    SCIENCE_MATHS: 'Science (with Mathematics)',
    SCIENCE_BIOLOGY: 'Science (with Biology)',
    COMMERCE: 'Commerce',
    ARTS: 'Arts / Humanities',
    VOCATIONAL: 'Vocational',
};
const g = (code, partIIISubjects, streamCategory) => ({
    code,
    name: `${code} — ${partIIISubjects.join(', ')}`,
    partIIISubjects,
    streamCategory,
});
exports.HSC_GROUPS = [
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
    g('2921', ['Mathematics', 'Basic Mechanical Engineering (Theory)', 'Computer Technology', 'Basic Mechanical Engineering (Practical)'], 'VOCATIONAL'),
    g('2922', ['Mathematics', 'Basic Electrical Engineering (Theory)', 'Computer Technology', 'Basic Electrical Engineering (Practical)'], 'VOCATIONAL'),
    g('2923', ['Mathematics', 'Basic Electronics Engineering (Theory)', 'Computer Technology', 'Basic Electronics Engineering (Practical)'], 'VOCATIONAL'),
    g('2924', ['Mathematics', 'Basic Civil Engineering (Theory)', 'Computer Technology', 'Basic Civil Engineering (Practical)'], 'VOCATIONAL'),
    g('2925', ['Mathematics', 'Basic Automobile Engineering (Theory)', 'Computer Technology', 'Basic Automobile Engineering (Practical)'], 'VOCATIONAL'),
    g('2926', ['Mathematics', 'Textile Technology (Theory)', 'Computer Technology', 'Textile Technology (Practical)'], 'VOCATIONAL'),
    g('2931', ['Biology', 'Nursing (Theory)', 'Computer Technology', 'Nursing (Practical)'], 'VOCATIONAL'),
    g('2941', ['Home Science', 'Textile and Dress Designing (Theory)', 'Computer Technology', 'Textile and Dress Designing (Practical)'], 'VOCATIONAL'),
    g('2942', ['Home Science', 'Food Service Management (Theory)', 'Computer Technology', 'Food Service Management (Practical)'], 'VOCATIONAL'),
    g('2951', ['Biology', 'Agricultural Science (Theory)', 'Computer Technology', 'Agricultural Science (Practical)'], 'VOCATIONAL'),
    g('2961', ['Commerce', 'Accountancy (Theory)', 'Office Management and Secretaryship (Theory)', 'Typography and Computer Applications (Practical)'], 'VOCATIONAL'),
    g('2962', ['Commerce', 'Accountancy (Theory)', 'Computer Applications', 'Auditing (Practical)'], 'VOCATIONAL'),
];
exports.HSC_GROUP_MAP = new Map(exports.HSC_GROUPS.map((grp) => [grp.code, grp]));
function getGroup(code) {
    if (!code)
        return null;
    return exports.HSC_GROUP_MAP.get(String(code).trim()) || null;
}
// Botany + Zoology (2608) is treated as equivalent to Biology.
function groupSubjectsWithEquivalents(grp) {
    const subjects = new Set(grp.partIIISubjects);
    if (subjects.has('Botany') && subjects.has('Zoology'))
        subjects.add('Biology');
    return subjects;
}
function hasPCM(grp) {
    const s = groupSubjectsWithEquivalents(grp);
    return s.has('Physics') && s.has('Chemistry') && s.has('Mathematics');
}
function hasPCB(grp) {
    const s = groupSubjectsWithEquivalents(grp);
    return s.has('Physics') && s.has('Chemistry') && s.has('Biology');
}
