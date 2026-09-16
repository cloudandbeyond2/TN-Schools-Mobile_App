"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const https = __importStar(require("https"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const hscGroups_1 = require("../constants/hscGroups");
const pdfUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf')
            cb(null, true);
        else
            cb(new Error('Only PDF files are allowed'));
    }
});
const generalUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});
const materialsStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const cleanedOriginal = path_1.default.basename(file.originalname, path_1.default.extname(file.originalname))
            .replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `${cleanedOriginal}-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const materialsUpload = (0, multer_1.default)({
    storage: materialsStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.pdf', '.docx', '.pptx', '.png', '.jpg', '.jpeg', '.txt', '.md'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file type: ${ext}`));
        }
    }
});
const router = (0, express_1.Router)();
// ===========================================================================
// Rich Fallback Data Set (matching PostgreSQL schema structure)
// ===========================================================================
const fallbackSubjects = [
    {
        id: "sub-math-10",
        class: "10",
        name: "Mathematics",
        icon: "📐",
        color: "#6366f1",
        applicableGroups: [],
    },
    {
        id: "sub-sci-10",
        class: "10",
        name: "Science",
        icon: "🔬",
        color: "#10b981",
        applicableGroups: [],
    },
    {
        id: "sub-soc-10",
        class: "10",
        name: "Social Science",
        icon: "🌍",
        color: "#ec4899",
        applicableGroups: [],
    },
    {
        id: "sub-eng-10",
        class: "10",
        name: "English",
        icon: "📖",
        color: "#f59e0b",
        applicableGroups: [],
    },
    {
        id: "sub-tam-10",
        class: "10",
        name: "Tamil",
        icon: "🗣️",
        color: "#d97706",
        applicableGroups: [],
    },
    {
        id: "sub-chem-10",
        class: "10",
        name: "Chemistry",
        icon: "🧪",
        color: "#db2777",
        applicableGroups: ["Biology", "Computer Science"],
    },
    {
        id: "sub-bio-10",
        class: "10",
        name: "Biology",
        icon: "🧬",
        color: "#22c55e",
        applicableGroups: ["Biology"],
    },
    {
        id: "sub-hist-10",
        class: "10",
        name: "History",
        icon: "📜",
        color: "#b45309",
        applicableGroups: [],
    },
    {
        id: "sub-phy-11",
        class: "11",
        name: "Physics",
        icon: "🔬",
        color: "#8b5cf6",
        applicableGroups: ["Biology", "Computer Science"],
    },
    {
        id: "sub-comp-11",
        class: "11",
        name: "Computer Science",
        icon: "💻",
        color: "#3b82f6",
        applicableGroups: ["Computer Science"],
    }
];
const fallbackUnits = {
    "sub-math-10": [
        {
            id: "u1-math",
            name: "Relations and Functions",
            unitNumber: 1,
            topics: [
                { id: "t1-math", name: "Cartesian Product", topicNumber: 1 },
                { id: "t2-math", name: "Relations & Domain", topicNumber: 2 }
            ]
        },
        {
            id: "u2-math",
            name: "Algebra",
            unitNumber: 2,
            topics: [
                { id: "t3-math", name: "Quadratic Equations", topicNumber: 1 }
            ]
        }
    ],
    "sub-sci-10": [
        {
            id: "u1-sci",
            name: "Laws of Motion",
            unitNumber: 1,
            topics: [
                { id: "t1-sci", name: "Newton's First Law and Inertia", topicNumber: 1 }
            ]
        }
    ],
    "sub-soc-10": [
        {
            id: "u1-soc",
            name: "History: Outbreak of World War I",
            unitNumber: 1,
            topics: [
                { id: "t1-soc", name: "Causes of World War I", topicNumber: 1 }
            ]
        }
    ],
    "sub-phy-11": [
        {
            id: "u1-phy-11",
            name: "Nature of Physical World and Measurement",
            unitNumber: 1,
            topics: [
                { id: "t1-phy-11", name: "Errors in Measurement", topicNumber: 1 }
            ]
        }
    ],
    "sub-comp-11": [
        {
            id: "u1-comp-11",
            name: "Introduction to Computers",
            unitNumber: 1,
            topics: [
                { id: "t1-comp-11", name: "Generations of Computers11", topicNumber: 1 }
            ]
        }
    ]
};
const fallbackContents = {
    "t1-math": [
        {
            id: "c1-math",
            contentType: "SUMMARY",
            title: "AI Concept Summary: Cartesian Product",
            fileContent: "The Cartesian product of two non-empty sets A and B is the set of all ordered pairs (a, b) such that a belongs to A and b belongs to B. It is denoted by A × B. Conceptually, it represents all possible pairings between two categories, akin to coordinates on a grid or matrix. The number of elements in A × B is the product of the number of elements in A and B (i.e., n(A × B) = n(A) × n(B))."
        },
        {
            id: "c2-math",
            contentType: "NOTES",
            title: "Revision Notes: Cartesian Product Rules",
            fileContent: "✏️ Key Formulas & Properties:\n\n1. Definition: A × B = { (a, b) | a ∈ A, b ∈ B }\n2. Non-Commutativity: In general, A × B ≠ B × A. They are equal if and only if A = B.\n3. Empty Set: If either A or B is empty (Ø), then A × B = Ø.\n4. Cardinality: If n(A) = p and n(B) = q, then n(A × B) = pq.\n5. Graphical representation: Can be plotted on a Cartesian coordinate plane as discrete points."
        },
        {
            id: "c3-math",
            contentType: "PDF",
            title: "Official TN Board Chapter Extract - Relations & Functions",
            fileUrl: "https://www.textbookcorp.tn.gov.in/pdf/10th-Maths-EM.pdf"
        },
        {
            id: "c4-math",
            contentType: "PPT",
            title: "Visual Guide: Interactive Cartesian Pairs",
            fileUrl: "https://www.slideshare.net/placeholder-tn-maths-cartesian"
        },
        {
            id: "c5-math",
            contentType: "MCQ",
            title: "Mastery Quiz: Cartesian Products",
            mcqs: [
                {
                    question: "If A = {1, 2} and B = {a, b}, what is the set A × B?",
                    options: [
                        "A) {(1, a), (1, b), (2, a), (2, b)}",
                        "B) {(a, 1), (b, 1), (a, 2), (b, 2)}",
                        "C) {(1, 2), (a, b)}",
                        "D) {(1, a), (2, b)}"
                    ],
                    answer: "A) {(1, a), (1, b), (2, a), (2, b)}",
                    rationale: "By definition, A × B contains ordered pairs where the first element is from A and the second element is from B. Pairing 1 with a and b gives (1,a), (1,b). Pairing 2 with a and b gives (2,a), (2,b)."
                },
                {
                    question: "If n(A × B) = 15 and n(A) = 3, then what is n(B)?",
                    options: [
                        "A) 3",
                        "B) 5",
                        "C) 12",
                        "D) 45"
                    ],
                    answer: "B) 5",
                    rationale: "We know that n(A × B) = n(A) × n(B). Given 15 = 3 × n(B), dividing both sides by 3 yields n(B) = 5."
                },
                {
                    question: "If A × B = Ø, which of the following is true?",
                    options: [
                        "A) Both A and B must be non-empty",
                        "B) Either A = Ø or B = Ø (or both)",
                        "C) A = B",
                        "D) A and B are equal to {0}"
                    ],
                    answer: "B) Either A = Ø or B = Ø (or both)",
                    rationale: "The Cartesian product is empty if and only if there are no elements to pair. This happens if at least one of the sets is empty."
                }
            ]
        }
    ],
    "t2-math": [
        {
            id: "c6-math",
            contentType: "SUMMARY",
            title: "AI Concept Summary: Relations & Functions",
            fileContent: "A relation R from a non-empty set A to a non-empty set B is a subset of the Cartesian product A × B. The relation is established by specifying a connection between the first element and the second element of the ordered pairs in A × B. The domain of R is the set of all first components, and the range is the set of all second components."
        },
        {
            id: "c7-math",
            contentType: "MCQ",
            title: "Mastery Quiz: Domain and Range",
            mcqs: [
                {
                    question: "Let A = {1, 2, 3} and B = {4, 5}. If R = {(1, 4), (2, 5)}, what is the Domain of R?",
                    options: [
                        "A) {4, 5}",
                        "B) {1, 2}",
                        "C) {1, 2, 3}",
                        "D) {1, 4}"
                    ],
                    answer: "B) {1, 2}",
                    rationale: "The domain of a relation R is the set of all first components of the ordered pairs. Here, the first components are 1 and 2, so Domain(R) = {1, 2}."
                }
            ]
        }
    ],
    "t3-math": [
        {
            id: "c8-math",
            contentType: "SUMMARY",
            title: "AI Concept Summary: Quadratic Equations",
            fileContent: "A quadratic equation is a second-degree polynomial equation in a single variable, written in the standard form: ax² + bx + c = 0, where a, b, and c are real constants and a ≠ 0. The solutions to a quadratic equation are called roots or zeros, and they can be found using the quadratic formula: x = [-b ± √(b² - 4ac)] / (2a)."
        },
        {
            id: "c9-math",
            contentType: "NOTES",
            title: "Revision Notes: Nature of Roots",
            fileContent: "🔍 Nature of Roots rules based on Discriminant Δ = b² - 4ac:\n\n1. If Δ > 0: Roots are real and unequal.\n2. If Δ = 0: Roots are real and equal.\n3. If Δ < 0: Roots are non-real/imaginary (no real roots exist)."
        },
        {
            id: "c10-math",
            contentType: "MCQ",
            title: "Mastery Quiz: Quadratic Equations",
            mcqs: [
                {
                    question: "What is the discriminant of the quadratic equation 2x² - 5x + 3 = 0?",
                    options: [
                        "A) 1",
                        "B) 49",
                        "C) -1",
                        "D) 25"
                    ],
                    answer: "A) 1",
                    rationale: "Here, a=2, b=-5, c=3. The discriminant Δ = b² - 4ac = (-5)² - 4(2)(3) = 25 - 24 = 1."
                }
            ]
        }
    ],
    "t1-sci": [
        {
            id: "c1-sci",
            contentType: "SUMMARY",
            title: "AI Concept Summary: Newton's First Law",
            fileContent: "Newton's First Law of Motion, also known as the Law of Inertia, states that every body continues in its state of rest or of uniform motion in a straight line unless it is compelled to change that state by forces impressed upon it."
        },
        {
            id: "c2-sci",
            contentType: "NOTES",
            title: "Revision Notes: Inertia",
            fileContent: "🏃‍♂️ Inertia can be classified into:\n1. Inertia of Rest (resists moving)\n2. Inertia of Motion (resists stopping)\n3. Inertia of Direction (resists turning)"
        },
        {
            id: "c3-sci",
            contentType: "MCQ",
            title: "Mastery Quiz: Inertia",
            mcqs: [
                {
                    question: "Which physical quantity is a measure of inertia?",
                    options: [
                        "A) Velocity",
                        "B) Acceleration",
                        "C) Mass",
                        "D) Force"
                    ],
                    answer: "C) Mass",
                    rationale: "Mass is the quantitative measure of inertia. A heavier body has more inertia compared to a lighter body."
                }
            ]
        }
    ],
    "t1-soc": [
        {
            id: "c1-soc",
            contentType: "SUMMARY",
            title: "AI Concept Summary: World War I Origins",
            fileContent: "World War I (1914–1918) was a global conflict triggered by a complex network of alliances, imperial rivalry, militarism, and nationalism in Europe. The immediate cause of the war was the assassination of Archduke Franz Ferdinand of Austria-Hungary on June 28, 1914."
        },
        {
            id: "c2-soc",
            contentType: "MCQ",
            title: "Mastery Quiz: World War I",
            mcqs: [
                {
                    question: "What was the immediate spark that triggered World War I?",
                    options: [
                        "A) Sinking of the Lusitania",
                        "B) Assassination of Archduke Franz Ferdinand",
                        "C) Treaty of Versailles",
                        "D) Invasion of Belgium"
                    ],
                    answer: "B) Assassination of Archduke Franz Ferdinand",
                    rationale: "The assassination of Archduke Franz Ferdinand of Austria-Hungary by a Serbian nationalist on June 28, 1914 set off a chain reaction of alliances leading to war."
                }
            ]
        }
    ],
    "t1-phy-11": [
        {
            id: "c1-phy-11",
            contentType: "SUMMARY",
            title: "AI Concept Summary: Errors in Measurement",
            fileContent: "Error in measurement is the difference between the true value and the measured value of a physical quantity. Errors are broadly classified into:\n\n1. Systematic Errors: Instrumental, personal, external, or procedural errors which are reproducible and have a definite pattern.\n2. Random Errors: Irregular errors caused by unpredictable fluctuations in experimental conditions.\n3. Gross Errors: Caused by sheer carelessness of the observer.\n\nTo minimize errors, measurements should be repeated multiple times and the arithmetic mean should be calculated."
        },
        {
            id: "c2-phy-11",
            contentType: "NOTES",
            title: "Revision Notes: Errors Calculations",
            fileContent: "📐 Key Mathematical Formulas for Errors:\n\n1. Absolute Error: Δa_i = |a_mean - a_i|\n2. Mean Absolute Error: Δa_mean = (Σ|Δa_i|) / n\n3. Relative Error: (Δa_mean) / a_mean\n4. Percentage Error: (Δa_mean / a_mean) * 100%\n\n💡 Tip: Systemic errors are constant and can be eliminated by standardizing instruments, whereas random errors can only be minimized by taking a large number of readings and computing their average."
        },
        {
            id: "c3-phy-11",
            contentType: "PDF",
            title: "TN 11th Physics Book Extract - Measurement Chapter",
            fileUrl: "https://www.textbookcorp.tn.gov.in/pdf/11th-Physics-Vol1-EM.pdf"
        },
        {
            id: "c4-phy-11",
            contentType: "MCQ",
            title: "Mastery Quiz: Errors in Measurement",
            mcqs: [
                {
                    question: "Which of the following errors can be eliminated by modifying instruments or calibration?",
                    options: [
                        "A) Random Error",
                        "B) Systematic Error",
                        "C) Gross Error",
                        "D) Absolute Error"
                    ],
                    answer: "B) Systematic Error",
                    rationale: "Systematic errors are reproducible and constant, occurring due to faults in instruments or experimental methods. Hence, recalibrating the instruments can completely eliminate them."
                },
                {
                    question: "If a measurement is repeated multiple times, the average of all measurements helps minimize:",
                    options: [
                        "A) Systematic Error",
                        "B) Random Error",
                        "C) Personal Error",
                        "D) Instrumental Error"
                    ],
                    answer: "B) Random Error",
                    rationale: "Random errors are irregular and follow normal distribution. Taking the arithmetic mean of a large number of readings reduces the net random error."
                }
            ]
        }
    ],
    "t1-comp-11": [
        {
            id: "c1-comp-11",
            contentType: "SUMMARY",
            title: "AI Concept Summary: Generations of Computers",
            fileContent: "Computer history is divided into five generations, each marked by a key technological leap in component size, processing power, and software interfaces:\n\n- First Generation (1940-1956): Vacuum Tubes (ENIAC, UNIVAC)\n- Second Generation (1956-1963): Transistors (IBM 1401, COBOL/FORTRAN)\n- Third Generation (1963-1971): Integrated Circuits (ICs)\n- Fourth Generation (1971-Present): Microprocessors (VLSI/ULSI, Personal Computers)\n- Fifth Generation (Now/Future): Artificial Intelligence & Parallel Processing"
        },
        {
            id: "c2-comp-11",
            contentType: "NOTES",
            title: "Revision Notes: Computer Components Timeline",
            fileContent: "💻 Quick Tech Reference Map:\n\n- Vacuum Tubes (1st Gen): Generates intense heat, requires massive space.\n- Transistors (2nd Gen): Replaced vacuum tubes; smaller, faster, and more energy-efficient.\n- Integrated Circuits (3rd Gen): Placed multiple transistors on silicon chips, introducing keyboards, monitors, and OS.\n- Microprocessors (4th Gen): Placed millions of circuits on a single chip; birth of the Internet and PCs.\n- AI / ULSI (5th Gen): Voice activation, robotics, neural networks."
        },
        {
            id: "c3-comp-11",
            contentType: "MCQ",
            title: "Mastery Quiz: Computer Generations",
            mcqs: [
                {
                    question: "Which electronic component characterizes the third generation of computers?",
                    options: [
                        "A) Vacuum Tubes",
                        "B) Transistors",
                        "C) Integrated Circuits",
                        "D) Microprocessors"
                    ],
                    answer: "C) Integrated Circuits",
                    rationale: "Integrated Circuits (ICs) were introduced in the third generation, placing multiple electrical components onto small silicon chips."
                }
            ]
        }
    ]
};
// ===========================================================================
// Routes with Database Fail-safe checks
// ===========================================================================
function getSubjectNamesForGroup(groupNameOrCode) {
    const normalized = groupNameOrCode.trim().toLowerCase();
    // 1. Direct group names
    if (normalized === 'biology') {
        return ['tamil', 'english', 'mathematics', 'physics', 'chemistry', 'biology', 'bio-botany', 'bio-zoology', 'botany', 'zoology'];
    }
    if (normalized === 'computer science') {
        return ['tamil', 'english', 'mathematics', 'physics', 'chemistry', 'computer science'];
    }
    if (normalized === 'commerce') {
        return ['tamil', 'english', 'mathematics', 'commerce', 'accountancy', 'economics'];
    }
    // 2. DGE Group Codes (e.g. 2503)
    const hscGroup = (0, hscGroups_1.getGroup)(groupNameOrCode);
    if (hscGroup) {
        const list = ['tamil', 'english'];
        hscGroup.partIIISubjects.forEach(sub => {
            const s = sub.toLowerCase();
            if (s === 'biology') {
                list.push('biology', 'bio-botany', 'bio-zoology', 'botany', 'zoology');
            }
            else {
                list.push(s);
            }
        });
        return list;
    }
    // 3. Blank / Unknown group -> Return common subjects
    return ['tamil', 'english', 'mathematics'];
}
// GET /api/centralized-content/academics-dashboard — Aggregated data for Academics Page
router.get('/academics-dashboard', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { class: cls, studentId, group } = req.query;
        if (!cls) {
            return res.status(400).json({
                success: false,
                error: "class parameter is required (e.g., ?class=10)"
            });
        }
        const classStr = String(cls);
        const isHigherSecondary = classStr === '11' || classStr === '12';
        // Try to query PostgreSQL
        const subjects = yield prisma_1.prisma.centralSubject.findMany({
            where: {
                class: classStr
            },
            include: {
                units: {
                    include: {
                        topics: {
                            include: {
                                contents: true
                            },
                            orderBy: { topicNumber: 'asc' }
                        }
                    },
                    orderBy: { unitNumber: 'asc' }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        let filteredSubjects = subjects;
        if (isHigherSecondary) {
            let studentGroup = group ? String(group).trim() : "";
            if (studentId) {
                const student = yield prisma_1.prisma.student.findUnique({
                    where: { id: String(studentId) },
                    select: { group: true }
                });
                if (student && student.group) {
                    studentGroup = student.group.trim();
                }
            }
            const allowedSubjects = getSubjectNamesForGroup(studentGroup);
            filteredSubjects = subjects.filter(sub => allowedSubjects.includes(sub.name.trim().toLowerCase()));
        }
        res.json({
            success: true,
            data: filteredSubjects
        });
    }
    catch (err) {
        console.warn("⚠️ Database query failed for academics-dashboard, falling back. Error:", err.message || err);
        const { class: cls, studentId, group } = req.query;
        const classStr = String(cls);
        const isHigherSecondary = classStr === '11' || classStr === '12';
        let filtered = fallbackSubjects.filter(sub => sub.class === classStr);
        if (isHigherSecondary) {
            let studentGroup = group ? String(group).trim() : "";
            if (studentId) {
                try {
                    const student = yield prisma_1.prisma.student.findUnique({
                        where: { id: String(studentId) },
                        select: { group: true }
                    });
                    if (student && student.group) {
                        studentGroup = student.group.trim();
                    }
                }
                catch (dbErr) {
                    console.warn("⚠️ Failed to fetch student group from DB in fallback path:", dbErr);
                }
            }
            const allowedSubjects = getSubjectNamesForGroup(studentGroup);
            filtered = filtered.filter(sub => allowedSubjects.includes(sub.name.trim().toLowerCase()));
        }
        // Attach units and contents from fallbacks
        const aggregatedFallback = filtered.map(sub => {
            const units = (fallbackUnits[sub.id] || []).map(unit => {
                const topics = (unit.topics || []).map((topic) => {
                    const contents = fallbackContents[topic.id] || [];
                    return Object.assign(Object.assign({}, topic), { contents });
                });
                return Object.assign(Object.assign({}, unit), { topics });
            });
            return Object.assign(Object.assign({}, sub), { units });
        });
        res.json({
            success: true,
            isFallback: true,
            data: aggregatedFallback
        });
    }
}));
// GET /api/centralized-content/subjects — Get all centralized subjects for a class
router.get('/subjects', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { class: cls, studentId, group } = req.query;
        if (!cls) {
            return res.status(400).json({
                success: false,
                error: "class parameter is required (e.g., ?class=10)"
            });
        }
        const classStr = String(cls);
        const isHigherSecondary = classStr === '11' || classStr === '12';
        // Try to query PostgreSQL
        const subjects = yield prisma_1.prisma.centralSubject.findMany({
            where: {
                class: classStr
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        let filteredSubjects = subjects;
        if (isHigherSecondary) {
            let studentGroup = group ? String(group).trim() : "";
            if (studentId) {
                const student = yield prisma_1.prisma.student.findUnique({
                    where: { id: String(studentId) },
                    select: { group: true }
                });
                if (student && student.group) {
                    studentGroup = student.group.trim();
                }
            }
            const allowedSubjects = getSubjectNamesForGroup(studentGroup);
            filteredSubjects = subjects.filter(sub => allowedSubjects.includes(sub.name.trim().toLowerCase()));
        }
        res.json({
            success: true,
            data: filteredSubjects
        });
    }
    catch (err) {
        console.warn("⚠️ Database query failed, falling back to local seed data. Error:", err.message || err);
        const { class: cls, studentId, group } = req.query;
        const classStr = String(cls);
        const isHigherSecondary = classStr === '11' || classStr === '12';
        let filtered = fallbackSubjects.filter(sub => sub.class === classStr);
        if (isHigherSecondary) {
            let studentGroup = group ? String(group).trim() : "";
            if (studentId) {
                try {
                    const student = yield prisma_1.prisma.student.findUnique({
                        where: { id: String(studentId) },
                        select: { group: true }
                    });
                    if (student && student.group) {
                        studentGroup = student.group.trim();
                    }
                }
                catch (dbErr) {
                    console.warn("⚠️ Failed to fetch student group from DB in fallback path:", dbErr);
                }
            }
            const allowedSubjects = getSubjectNamesForGroup(studentGroup);
            filtered = filtered.filter(sub => allowedSubjects.includes(sub.name.trim().toLowerCase()));
        }
        res.json({
            success: true,
            isFallback: true,
            data: filtered
        });
    }
}));
// GET /api/centralized-content/subjects/:id/units — Get all units and nested topics for a subject
router.get('/subjects/:id/units', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const approvedOnly = req.query.approvedOnly === 'true';
        // Try to query PostgreSQL
        const units = yield prisma_1.prisma.centralUnit.findMany({
            where: Object.assign({ subjectId: id }, (approvedOnly ? { isApproved: true } : {})),
            include: {
                topics: {
                    orderBy: {
                        topicNumber: 'asc'
                    }
                }
            },
            orderBy: {
                unitNumber: 'asc'
            }
        });
        res.json({
            success: true,
            data: units
        });
    }
    catch (err) {
        console.warn(`⚠️ Database query failed for units of subject ${req.params.id}, falling back. Error:`, err.message || err);
        // Fail-safe: retrieve from local mock map
        const subjectId = req.params.id;
        const units = fallbackUnits[subjectId] || [];
        res.json({
            success: true,
            isFallback: true,
            data: units
        });
    }
}));
// GET /api/centralized-content/topics/:id/contents — Get all materials/summaries/MCQs for a topic
router.get('/topics/:id/contents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Try to query PostgreSQL
        const contents = yield prisma_1.prisma.centralContent.findMany({
            where: {
                topicId: id
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        res.json({
            success: true,
            data: contents
        });
    }
    catch (err) {
        console.warn(`⚠️ Database query failed for topic ${req.params.id} contents, falling back. Error:`, err.message || err);
        // Fail-safe: retrieve from local mock map
        const topicId = req.params.id;
        const contents = fallbackContents[topicId] || [];
        res.json({
            success: true,
            isFallback: true,
            data: contents
        });
    }
}));
// POST /api/centralized-content/subjects — Create a centralized subject
router.post('/subjects', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { class: cls, name, icon, color } = req.body;
        if (!cls || !name) {
            return res.status(400).json({ success: false, error: "Class and name are required" });
        }
        const subject = yield prisma_1.prisma.centralSubject.create({
            data: { class: String(cls), name, icon, color }
        });
        res.status(201).json({ success: true, data: subject });
    }
    catch (err) {
        console.error("Error creating subject", err);
        res.status(500).json({ success: false, error: err.message || "Failed to create subject" });
    }
}));
// POST /api/centralized-content/units — Create a centralized unit
router.post('/units', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subjectId, name, unitNumber } = req.body;
        if (!subjectId || !name || unitNumber === undefined) {
            return res.status(400).json({ success: false, error: "Subject ID, name, and unit number are required" });
        }
        const unit = yield prisma_1.prisma.centralUnit.create({
            data: { subjectId, name, unitNumber: Number(unitNumber) }
        });
        res.status(201).json({ success: true, data: unit });
    }
    catch (err) {
        console.error("Error creating unit", err);
        res.status(500).json({ success: false, error: err.message || "Failed to create unit" });
    }
}));
// POST /api/centralized-content/topics — Create a centralized topic
router.post('/topics', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { unitId, name, topicNumber } = req.body;
        if (!unitId || !name || topicNumber === undefined) {
            return res.status(400).json({ success: false, error: "Unit ID, name, and topic number are required" });
        }
        const topic = yield prisma_1.prisma.centralTopic.create({
            data: { unitId, name, topicNumber: Number(topicNumber) }
        });
        res.status(201).json({ success: true, data: topic });
    }
    catch (err) {
        console.error("Error creating topic", err);
        res.status(500).json({ success: false, error: err.message || "Failed to create topic" });
    }
}));
// POST /api/centralized-content/contents — Create/Upload centralized content
router.post('/contents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { topicId, contentType, title, fileUrl, fileContent, mcqs } = req.body;
        if (!topicId || !contentType || !title) {
            return res.status(400).json({ success: false, error: "Topic ID, content type, and title are required" });
        }
        const content = yield prisma_1.prisma.centralContent.create({
            data: {
                topicId,
                contentType,
                title,
                fileUrl,
                fileContent,
                mcqs: mcqs ? mcqs : undefined
            }
        });
        res.status(201).json({ success: true, data: content });
    }
    catch (err) {
        console.error("Error creating content", err);
        res.status(500).json({ success: false, error: err.message || "Failed to create content" });
    }
}));
// PUT /api/centralized-content/subjects/:id — Update a centralized subject
router.put('/subjects/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, icon, color, class: cls } = req.body;
        const subject = yield prisma_1.prisma.centralSubject.update({
            where: { id },
            data: {
                name,
                icon,
                color,
                class: cls ? String(cls) : undefined
            }
        });
        res.json({ success: true, data: subject });
    }
    catch (err) {
        console.error("Error updating subject", err);
        res.status(500).json({ success: false, error: err.message || "Failed to update subject" });
    }
}));
// DELETE /api/centralized-content/subjects/:id — Delete a centralized subject
router.delete('/subjects/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.centralSubject.delete({
            where: { id }
        });
        res.json({ success: true, message: "Subject deleted successfully" });
    }
    catch (err) {
        console.error("Error deleting subject", err);
        res.status(500).json({ success: false, error: err.message || "Failed to delete subject" });
    }
}));
// PUT /api/centralized-content/units/:id — Update a centralized unit
router.put('/units/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, unitNumber, isApproved, isAiMapped } = req.body;
        const unit = yield prisma_1.prisma.centralUnit.update({
            where: { id },
            data: {
                name,
                unitNumber: unitNumber !== undefined ? Number(unitNumber) : undefined,
                isApproved: isApproved !== undefined ? Boolean(isApproved) : undefined,
                isAiMapped: isAiMapped !== undefined ? Boolean(isAiMapped) : undefined
            }
        });
        res.json({ success: true, data: unit });
    }
    catch (err) {
        console.error("Error updating unit", err);
        res.status(500).json({ success: false, error: err.message || "Failed to update unit" });
    }
}));
// DELETE /api/centralized-content/units/:id — Delete a centralized unit
router.delete('/units/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.centralUnit.delete({
            where: { id }
        });
        res.json({ success: true, message: "Unit deleted successfully" });
    }
    catch (err) {
        console.error("Error deleting unit", err);
        res.status(500).json({ success: false, error: err.message || "Failed to delete unit" });
    }
}));
// PUT /api/centralized-content/topics/:id — Update a centralized topic (subunit)
router.put('/topics/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, topicNumber } = req.body;
        const topic = yield prisma_1.prisma.centralTopic.update({
            where: { id },
            data: {
                name,
                topicNumber: topicNumber !== undefined ? Number(topicNumber) : undefined
            }
        });
        res.json({ success: true, data: topic });
    }
    catch (err) {
        console.error("Error updating topic/subunit", err);
        res.status(500).json({ success: false, error: err.message || "Failed to update topic/subunit" });
    }
}));
// DELETE /api/centralized-content/topics/:id — Delete a centralized topic
router.delete('/topics/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.prisma.centralTopic.delete({
            where: { id }
        });
        res.json({ success: true, message: "Topic deleted successfully" });
    }
    catch (err) {
        console.error("Error deleting topic", err);
        res.status(500).json({ success: false, error: err.message || "Failed to delete topic" });
    }
}));
// DELETE /api/centralized-content/contents/:id — Delete centralized content
router.delete('/contents/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Retrieve record first to find the fileUrl
        const content = yield prisma_1.prisma.centralContent.findUnique({ where: { id } });
        if (content) {
            // Delete from database
            yield prisma_1.prisma.centralContent.delete({ where: { id } });
            // Delete from disk if it was a file upload
            if (content.fileUrl && content.fileUrl.startsWith('/uploads/')) {
                const filename = content.fileUrl.replace('/uploads/', '');
                const filePath = path_1.default.join(__dirname, '../../uploads', filename);
                try {
                    if (fs_1.default.existsSync(filePath)) {
                        yield fs_1.default.promises.unlink(filePath);
                        console.log(`Deleted file from disk: ${filePath}`);
                    }
                }
                catch (delErr) {
                    console.warn(`Could not delete file ${filePath}:`, delErr);
                }
            }
        }
        res.json({ success: true, message: "Content deleted successfully" });
    }
    catch (err) {
        console.error("Error deleting content", err);
        res.status(500).json({ success: false, error: err.message || "Failed to delete content" });
    }
}));
// POST /api/centralized-content/upload-materials — Multi-file upload for subunit workspace
router.post('/upload-materials', (req, res, next) => {
    materialsUpload.array('files', 10)(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, error: 'File size limit exceeded. Maximum size is 25MB.' });
            }
            return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
        }
        else if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
        next();
    });
}, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: "No files uploaded" });
        }
        const metadataList = JSON.parse(req.body.metadata || '[]');
        const uploader = req.body.uploader || 'Super Admin';
        const uploaderRole = req.body.uploaderRole || 'SUPERADMIN';
        const createdContents = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const metadata = metadataList[i] || {};
            const topicId = metadata.topicId || req.body.topicId;
            if (!topicId) {
                return res.status(400).json({ success: false, error: `Topic ID is missing for file ${file.originalname}` });
            }
            const title = metadata.title || path_1.default.basename(file.originalname, path_1.default.extname(file.originalname));
            const contentType = metadata.type || 'Reference';
            let fileSizeStr = `${(file.size / 1024).toFixed(1)} KB`;
            if (file.size >= 1024 * 1024) {
                fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
            }
            const fileUrl = `/uploads/${file.filename}`;
            const content = yield prisma_1.prisma.centralContent.create({
                data: {
                    topicId,
                    contentType,
                    title,
                    fileUrl,
                    // @ts-ignore – stale Prisma client; run prisma generate
                    fileSize: fileSizeStr,
                    // @ts-ignore
                    uploader,
                    // @ts-ignore
                    uploaderRole
                }
            });
            createdContents.push(content);
        }
        res.status(201).json({
            success: true,
            message: `Successfully uploaded ${createdContents.length} material(s)`,
            data: createdContents
        });
    }
    catch (err) {
        console.error("Error saving uploaded materials:", err);
        res.status(500).json({ success: false, error: err.message || "Failed to save uploaded materials" });
    }
}));
// PUT /api/centralized-content/contents/:id/replace — Replace an existing material file
router.put('/contents/:id/replace', (req, res, next) => {
    materialsUpload.single('file')(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, error: 'File size limit exceeded. Maximum size is 25MB.' });
            }
            return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
        }
        else if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
        next();
    });
}, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, error: "No file uploaded for replacement" });
        }
        const existing = yield prisma_1.prisma.centralContent.findUnique({ where: { id } });
        if (!existing) {
            if (fs_1.default.existsSync(file.path)) {
                yield fs_1.default.promises.unlink(file.path);
            }
            return res.status(404).json({ success: false, error: "Material not found" });
        }
        let fileSizeStr = `${(file.size / 1024).toFixed(1)} KB`;
        if (file.size >= 1024 * 1024) {
            fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        }
        const fileUrl = `/uploads/${file.filename}`;
        if (existing.fileUrl && existing.fileUrl.startsWith('/uploads/')) {
            const oldFilename = existing.fileUrl.replace('/uploads/', '');
            const oldPath = path_1.default.join(__dirname, '../../uploads', oldFilename);
            try {
                if (fs_1.default.existsSync(oldPath)) {
                    yield fs_1.default.promises.unlink(oldPath);
                    console.log(`Deleted old replaced file: ${oldPath}`);
                }
            }
            catch (delErr) {
                console.warn(`Could not delete old file ${oldPath}:`, delErr);
            }
        }
        // @ts-ignore – stale Prisma client; run prisma generate
        const uploader = req.body.uploader || existing.uploader || 'Super Admin';
        // @ts-ignore
        const uploaderRole = req.body.uploaderRole || existing.uploaderRole || 'SUPERADMIN';
        const title = req.body.title || path_1.default.basename(file.originalname, path_1.default.extname(file.originalname));
        const contentType = req.body.type || existing.contentType;
        const updated = yield prisma_1.prisma.centralContent.update({
            where: { id },
            data: {
                fileUrl,
                // @ts-ignore – stale Prisma client; run prisma generate
                fileSize: fileSizeStr,
                title,
                contentType,
                // @ts-ignore
                uploader,
                // @ts-ignore
                uploaderRole,
                updatedAt: new Date()
            }
        });
        res.json({
            success: true,
            message: "Material replaced successfully",
            data: updated
        });
    }
    catch (err) {
        console.error("Error replacing material:", err);
        res.status(500).json({ success: false, error: err.message || "Failed to replace material" });
    }
}));
function extractTextFromPDF(buffer) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pdfParse = require('pdf-parse');
            if (typeof pdfParse === 'function') {
                const data = yield pdfParse(buffer);
                return {
                    text: data.text || '',
                    numpages: data.numpages || 0
                };
            }
            else if (pdfParse && typeof pdfParse.PDFParse === 'function') {
                const parser = new pdfParse.PDFParse({ data: buffer });
                const textObj = yield parser.getText();
                return {
                    text: textObj.text || '',
                    numpages: textObj.total || 0
                };
            }
            else {
                throw new Error("Unsupported pdf-parse module structure.");
            }
        }
        catch (err) {
            console.error("extractTextFromPDF failed:", err);
            throw err;
        }
    });
}
function callGeminiMultimodal(prompt, base64Image, mimeType) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is missing. Please add it to your environment.');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        // Clean base64 data if it has header prefix like data:image/png;base64,
        let cleanBase64 = base64Image;
        if (base64Image.includes(';base64,')) {
            cleanBase64 = base64Image.split(';base64,')[1];
        }
        const payload = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType || 'image/png',
                                data: cleanBase64
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 8192
            }
        };
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(payload);
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'x-goog-api-key': apiKey,
                },
            };
            const req = https.request(url, options, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    var _a, _b, _c, _d, _e;
                    const body = Buffer.concat(chunks).toString('utf8');
                    if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                        reject(new Error(`Gemini API error ${res.statusCode}: ${body}`));
                        return;
                    }
                    try {
                        const parsed = JSON.parse(body);
                        const text = (_e = (_d = (_c = (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                        if (!text) {
                            reject(new Error('Empty content from Gemini.'));
                            return;
                        }
                        resolve(JSON.parse(text));
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse response: ${String(e)}`));
                    }
                });
            });
            req.on('error', (err) => reject(err));
            req.setTimeout(60000, () => req.destroy(new Error('Gemini API timed out')));
            req.write(postData);
            req.end();
        });
    });
}
// POST /api/centralized-content/subjects/:subjectId/parse-syllabus-ai — Parse units from image using AI
router.post('/subjects/:subjectId/parse-syllabus-ai', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subjectId } = req.params;
        const { image, mimeType } = req.body;
        if (!image) {
            return res.status(400).json({ success: false, error: "Image base64 data is required." });
        }
        const prompt = `Analyze this syllabus image (which lists chapters/units for a course) and extract all the units listed. Return a JSON array containing objects with keys 'name' (the title/name of the unit) and 'unitNumber' (the sequential number of the unit, e.g., 1, 2, 3). Do not include any formatting, markdown, backticks, or code blocks. Return a raw JSON array: [ {"unitNumber": 1, "name": "..."} ]`;
        console.log("Calling Gemini multimodal to parse syllabus screenshot...");
        const parsedData = yield callGeminiMultimodal(prompt, image, mimeType || 'image/png');
        if (!Array.isArray(parsedData)) {
            throw new Error("Invalid response format from AI. Expected JSON array.");
        }
        console.log(`Gemini parsed ${parsedData.length} units. Upserting to PostgreSQL database...`);
        const createdUnits = [];
        for (const u of parsedData) {
            const unitNum = Number(u.unitNumber);
            if (!u.name || isNaN(unitNum))
                continue;
            try {
                const created = yield prisma_1.prisma.centralUnit.create({
                    data: {
                        subjectId,
                        name: u.name,
                        unitNumber: unitNum
                    }
                });
                createdUnits.push(created);
            }
            catch (err) {
                // If it already exists, update the name!
                try {
                    const updated = yield prisma_1.prisma.centralUnit.update({
                        where: {
                            subjectId_unitNumber: {
                                subjectId,
                                unitNumber: unitNum
                            }
                        },
                        data: {
                            name: u.name
                        }
                    });
                    createdUnits.push(updated);
                }
                catch (updateErr) {
                    console.error(`Failed to update unit ${unitNum}`, updateErr);
                }
            }
        }
        res.json({
            success: true,
            message: `Successfully processed screenshot. Created/updated ${createdUnits.length} units.`,
            data: createdUnits
        });
    }
    catch (err) {
        console.error("AI Syllabus Parser Error:", err);
        res.status(500).json({ success: false, error: err.message || "Failed to process syllabus image with AI" });
    }
}));
// POST /api/centralized-content/subjects/:subjectId/parse-full-syllabus-ai — Parse both units and subunits from image using AI
router.post('/subjects/:subjectId/parse-full-syllabus-ai', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subjectId } = req.params;
        const { image, mimeType } = req.body;
        if (!image) {
            return res.status(400).json({ success: false, error: "Image base64 data is required." });
        }
        const prompt = `Analyze this syllabus image (which lists chapters/units and their sub-chapters/subunits/topics) and extract the entire structure. Return a JSON array of Units, where each unit has 'unitNumber' (sequential integer), 'name' (string), and 'subunits' (an array of subunits belonging to this unit, each subunit having 'subunitNumber' (sequential integer) and 'name' (string)). Do not include any formatting, markdown, backticks, or code blocks. Return a raw JSON array: [ { "unitNumber": 1, "name": "Relations and Functions", "subunits": [ { "subunitNumber": 1, "name": "Cartesian Product" } ] } ]`;
        console.log("Calling Gemini multimodal to parse full syllabus screenshot...");
        const parsedData = yield callGeminiMultimodal(prompt, image, mimeType || 'image/png');
        if (!Array.isArray(parsedData)) {
            throw new Error("Invalid response format from AI. Expected JSON array of units.");
        }
        console.log(`Gemini parsed ${parsedData.length} units with their subunits. Syncing to PostgreSQL...`);
        const results = [];
        for (const u of parsedData) {
            const unitNum = Number(u.unitNumber);
            if (!u.name || isNaN(unitNum))
                continue;
            let unitId = "";
            // 1. Find or create the Unit
            try {
                const createdUnit = yield prisma_1.prisma.centralUnit.create({
                    data: {
                        subjectId,
                        name: u.name,
                        unitNumber: unitNum
                    }
                });
                unitId = createdUnit.id;
                results.push({ unit: createdUnit, subunits: [] });
            }
            catch (err) {
                // If Unit already exists (same subject and unit number), update the name
                try {
                    const updatedUnit = yield prisma_1.prisma.centralUnit.update({
                        where: {
                            subjectId_unitNumber: {
                                subjectId,
                                unitNumber: unitNum
                            }
                        },
                        data: {
                            name: u.name
                        }
                    });
                    unitId = updatedUnit.id;
                    results.push({ unit: updatedUnit, subunits: [] });
                }
                catch (updateErr) {
                    console.error(`Failed to find/update unit ${unitNum}`, updateErr);
                    continue; // Skip subunits if unit creation/lookup failed
                }
            }
            // 2. Add subunits (topics) to this Unit
            const subunitsList = u.subunits || [];
            const currentUnitResult = results[results.length - 1];
            for (const sub of subunitsList) {
                const subNum = Number(sub.subunitNumber);
                if (!sub.name || isNaN(subNum))
                    continue;
                try {
                    const createdSubunit = yield prisma_1.prisma.centralTopic.create({
                        data: {
                            unitId,
                            name: sub.name,
                            topicNumber: subNum
                        }
                    });
                    currentUnitResult.subunits.push(createdSubunit);
                }
                catch (err) {
                    // If Subunit already exists (same unit and subunit number), update the name
                    try {
                        const updatedSubunit = yield prisma_1.prisma.centralTopic.update({
                            where: {
                                unitId_topicNumber: {
                                    unitId,
                                    topicNumber: subNum
                                }
                            },
                            data: {
                                name: sub.name
                            }
                        });
                        currentUnitResult.subunits.push(updatedSubunit);
                    }
                    catch (updateSubunitErr) {
                        console.error(`Failed to update subunit ${subNum} under unit ${unitNum}`, updateSubunitErr);
                    }
                }
            }
        }
        res.json({
            success: true,
            message: `Successfully processed full syllabus screenshot. Imported ${results.length} units with their subunits.`,
            data: results
        });
    }
    catch (err) {
        console.error("AI Full Syllabus Parser Error:", err);
        res.status(500).json({ success: false, error: err.message || "Failed to process full syllabus image with AI" });
    }
}));
// ===========================================================================
// Unit Detail — live AI-generated lesson insights + teacher approval gate
// ===========================================================================
function callGeminiJSON(prompt, schema) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is missing. Please add it to backend/.env');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 16384,
                responseMimeType: 'application/json',
                responseSchema: schema
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        };
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(payload);
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData), 'x-goog-api-key': apiKey }
            };
            const req = https.request(url, options, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    var _a, _b, _c, _d, _e, _f, _g;
                    const body = Buffer.concat(chunks).toString('utf8');
                    if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                        reject(new Error(`Gemini API error ${res.statusCode}: ${body.substring(0, 500)}`));
                        return;
                    }
                    try {
                        const parsed = JSON.parse(body);
                        const text = (_e = (_d = (_c = (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                        if (!text) {
                            reject(new Error(`Empty content from Gemini. Finish reason: ${((_g = (_f = parsed === null || parsed === void 0 ? void 0 : parsed.candidates) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.finishReason) || 'UNKNOWN'}`));
                            return;
                        }
                        resolve(JSON.parse(text));
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse Gemini response: ${String(e)}`));
                    }
                });
            });
            req.on('error', (err) => reject(err));
            req.setTimeout(120000, () => req.destroy(new Error('Gemini API timed out')));
            req.write(postData);
            req.end();
        });
    });
}
const LANG_DETAIL_PROPS = {
    keyConcepts: { type: 'ARRAY', items: { type: 'STRING' } },
    realLifeConnections: { type: 'ARRAY', items: { type: 'STRING' } },
    commonMisconceptions: { type: 'ARRAY', items: { type: 'STRING' } },
    teachingFlow: {
        type: 'ARRAY',
        items: {
            type: 'OBJECT',
            properties: {
                step: { type: 'STRING' },
                minutes: { type: 'NUMBER' },
                description: { type: 'STRING' }
            },
            required: ['step', 'minutes', 'description']
        }
    },
    teacherScript: { type: 'STRING' },
    studentKeyPoints: { type: 'ARRAY', items: { type: 'STRING' } }
};
const LANG_DETAIL_REQUIRED = ['keyConcepts', 'realLifeConnections', 'commonMisconceptions', 'teachingFlow', 'teacherScript', 'studentKeyPoints'];
// Bilingual: the model returns the full insight set in both English and Tamil in one call.
const UNIT_DETAIL_SCHEMA = {
    type: 'OBJECT',
    properties: {
        en: { type: 'OBJECT', properties: LANG_DETAIL_PROPS, required: LANG_DETAIL_REQUIRED },
        ta: { type: 'OBJECT', properties: LANG_DETAIL_PROPS, required: LANG_DETAIL_REQUIRED }
    },
    required: ['en', 'ta']
};
// Records written before bilingual support store the English fields at the top
// level; wrap them so every consumer sees the same { en, ta } shape.
function normalizeUnitDetail(raw) {
    if (!raw)
        return null;
    if (raw.en)
        return raw;
    return { en: raw, ta: null };
}
function findOrCreateOverviewTopic(unitId) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma_1.prisma.centralTopic.findFirst({ where: { unitId, topicNumber: 1 } });
        if (existing)
            return existing;
        return prisma_1.prisma.centralTopic.create({ data: { unitId, topicNumber: 1, name: 'Unit Overview' } });
    });
}
// GET /api/centralized-content/units/:id — Single unit with subject + infographic + AI detail (if generated)
router.get('/units/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const unit = yield prisma_1.prisma.centralUnit.findUnique({ where: { id }, include: { subject: true } });
        if (!unit) {
            return res.status(404).json({ success: false, error: 'Unit not found' });
        }
        const topic = yield prisma_1.prisma.centralTopic.findFirst({ where: { unitId: unit.id, topicNumber: 1 } });
        let infographic = null;
        let unitDetail = null;
        if (topic) {
            const contents = yield prisma_1.prisma.centralContent.findMany({ where: { topicId: topic.id } });
            const infographicRow = contents.find((c) => c.contentType === 'INFOGRAPHIC');
            const detailRow = contents.find((c) => c.contentType === 'UNIT_DETAIL');
            infographic = infographicRow ? { fileUrl: infographicRow.fileUrl, fileContent: infographicRow.fileContent } : null;
            unitDetail = (detailRow === null || detailRow === void 0 ? void 0 : detailRow.fileContent) ? normalizeUnitDetail(JSON.parse(detailRow.fileContent)) : null;
        }
        res.json({ success: true, data: { unit, infographic, unitDetail } });
    }
    catch (err) {
        console.error('Error fetching unit detail:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to fetch unit' });
    }
}));
// POST /api/centralized-content/units/:id/generate-detail — Live AI lesson insights for a unit
router.post('/units/:id/generate-detail', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const regenerate = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.regenerate) === true;
        const unit = yield prisma_1.prisma.centralUnit.findUnique({ where: { id }, include: { subject: true } });
        if (!unit) {
            return res.status(404).json({ success: false, error: 'Unit not found' });
        }
        const topic = yield findOrCreateOverviewTopic(unit.id);
        const existing = yield prisma_1.prisma.centralContent.findFirst({ where: { topicId: topic.id, contentType: 'UNIT_DETAIL' } });
        if (existing && !regenerate) {
            return res.json({ success: true, cached: true, data: normalizeUnitDetail(JSON.parse(existing.fileContent || '{}')) });
        }
        // Ground the prompt in the same summary/tip already shown on the unit's infographic card, if present.
        const infographic = yield prisma_1.prisma.centralContent.findFirst({ where: { topicId: topic.id, contentType: 'INFOGRAPHIC' } });
        const prompt = `You are an experienced bilingual Tamil Nadu State Board teacher preparing to introduce a new unit to your class. You teach comfortably in both English and Tamil.

Subject: ${unit.subject.name}
Class: ${unit.subject.class}th Standard
Unit ${unit.unitNumber}: ${unit.name}
${(infographic === null || infographic === void 0 ? void 0 : infographic.fileContent) ? `Existing short summary: ${infographic.fileContent}` : ''}

Generate practical, classroom-ready lesson insights for this unit as a JSON object with TWO top-level keys, "en" (English) and "ta" (Tamil). Each of "en" and "ta" contains the SAME structure:
- keyConcepts: 4-6 short bullet points (core ideas a student must walk away understanding)
- realLifeConnections: 2-3 concrete, India/Tamil-Nadu-relevant real-life examples that make this unit relatable
- commonMisconceptions: 2-3 mistakes or confusions students commonly have with this topic, so the teacher can pre-empt them
- teachingFlow: an ordered lesson plan of 4-5 steps (e.g. Hook, Explain, Activity, Check Understanding, Wrap-up), each with a "step" name, "minutes" (rough duration out of a ~45 minute period), and a one-sentence "description" of what happens in that step
- teacherScript: a warm, first-person paragraph (150-250 words) of how the teacher would actually open and explain this unit out loud to the class -- natural spoken classroom language, not textbook prose
- studentKeyPoints: 5-8 short, simple takeaways written directly for a ${unit.subject.class}th-grade student to revise from (simpler language than keyConcepts)

Rules for the Tamil ("ta") version:
- Write natural, fluent, spoken classroom Tamil in Tamil script -- the way a real Tamil-medium teacher actually speaks, NOT a stiff word-for-word machine translation.
- Technical and scientific terms may keep their common English form where that is what Tamil Nadu classrooms genuinely use (e.g. "rational numbers", "photosynthesis").
- The "minutes" numbers and the number/order of teachingFlow steps must be identical across "en" and "ta".

Keep everything concise and classroom-practical. Return only the JSON object.`;
        const result = yield callGeminiJSON(prompt, UNIT_DETAIL_SCHEMA);
        if (existing) {
            yield prisma_1.prisma.centralContent.update({
                where: { id: existing.id },
                data: { fileContent: JSON.stringify(result) }
            });
        }
        else {
            yield prisma_1.prisma.centralContent.create({
                data: {
                    topicId: topic.id,
                    contentType: 'UNIT_DETAIL',
                    title: `AI Lesson Insights: ${unit.name}`,
                    fileContent: JSON.stringify(result)
                }
            });
        }
        res.json({ success: true, cached: false, data: result });
    }
    catch (err) {
        console.error('Error generating unit detail:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to generate unit detail' });
    }
}));
// PUT /api/centralized-content/units/:id/approve — Publish/unpublish a unit to students
router.put('/units/:id/approve', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isApproved, editedDetail } = req.body;
        if (typeof isApproved !== 'boolean') {
            return res.status(400).json({ success: false, error: 'isApproved (boolean) is required' });
        }
        const unit = yield prisma_1.prisma.centralUnit.findUnique({ where: { id } });
        if (!unit) {
            return res.status(404).json({ success: false, error: 'Unit not found' });
        }
        if (editedDetail) {
            const topic = yield findOrCreateOverviewTopic(unit.id);
            const existing = yield prisma_1.prisma.centralContent.findFirst({ where: { topicId: topic.id, contentType: 'UNIT_DETAIL' } });
            if (existing) {
                yield prisma_1.prisma.centralContent.update({ where: { id: existing.id }, data: { fileContent: JSON.stringify(editedDetail) } });
            }
            else {
                yield prisma_1.prisma.centralContent.create({
                    data: { topicId: topic.id, contentType: 'UNIT_DETAIL', title: `AI Lesson Insights: ${unit.name}`, fileContent: JSON.stringify(editedDetail) }
                });
            }
        }
        const updated = yield prisma_1.prisma.centralUnit.update({ where: { id }, data: { isApproved } });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        console.error('Error updating unit approval:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to update unit approval' });
    }
}));
// ===========================================================================
// PDF Syllabus Upload — extract structure from a textbook PDF via AI and
// build the SAME syllabus-board design as the seeded units: each unit gets a
// meaningful title, a Tamil name, a short description, a study tip, and a
// generated infographic card (so the board never shows "No visual available").
// ===========================================================================
const PDF_SYLLABUS_SCHEMA = {
    type: 'OBJECT',
    properties: {
        language: { type: 'STRING', description: 'The primary language the textbook is written in, e.g. "Tamil", "English".' },
        subjectName: { type: 'STRING', description: 'The subject name detected from the PDF (e.g. தமிழ், Mathematics, Science).' },
        units: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    unitNumber: { type: 'INTEGER', description: 'Sequential unit number starting at 1' },
                    titleTamil: { type: 'STRING', description: 'The unit/chapter heading in Tamil script. For a Tamil book this is the EXACT heading printed in the book (e.g. இயல் theme "தமிழ் இன்பம்"). For an English book, a faithful Tamil translation.' },
                    titleEnglish: { type: 'STRING', description: 'The unit/chapter heading in English. For an English book this is the exact heading; for a Tamil book, an accurate English translation of the Tamil heading.' },
                    description: { type: 'STRING', description: 'A 1-2 sentence student-facing summary of what this unit covers, written in the same language as the textbook.' },
                    tip: { type: 'STRING', description: 'One short, practical study tip for this unit (under 90 characters), in the textbook language.' },
                    emoji: { type: 'STRING', description: 'A single emoji that best represents this unit.' },
                    lessons: {
                        type: 'ARRAY',
                        items: {
                            type: 'OBJECT',
                            properties: {
                                name: { type: 'STRING', description: 'The lesson/section title EXACTLY as printed in the book (original script).' },
                                nameEnglish: { type: 'STRING', description: 'English translation of the lesson title (same as name for an English book).' }
                            },
                            required: ['name', 'nameEnglish']
                        },
                        description: 'The lessons/sections inside this unit, in order, exactly as printed in the table of contents.'
                    }
                },
                required: ['unitNumber', 'titleTamil', 'titleEnglish', 'description', 'tip', 'emoji', 'lessons']
            }
        }
    },
    required: ['language', 'subjectName', 'units']
};
// Call Gemini with a PDF document inline (vision) + a responseSchema. Used to
// read the real script off the rendered pages, bypassing broken font encodings
// that garble text extraction (common in TN Tamil textbooks).
function callGeminiWithPdf(prompt, base64Pdf, schema) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is missing. Please add it to backend/.env');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        const payload = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'application/pdf', data: base64Pdf } }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: 16384,
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        };
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(payload);
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'x-goog-api-key': apiKey
                }
            };
            const req = https.request(url, options, (resp) => {
                const chunks = [];
                resp.on('data', (chunk) => chunks.push(chunk));
                resp.on('end', () => {
                    var _a, _b, _c, _d, _e;
                    const body = Buffer.concat(chunks).toString('utf8');
                    if (resp.statusCode && (resp.statusCode < 200 || resp.statusCode >= 300)) {
                        reject(new Error(`Gemini API error ${resp.statusCode}: ${body}`));
                        return;
                    }
                    try {
                        const parsed = JSON.parse(body);
                        const text = (_e = (_d = (_c = (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                        if (!text) {
                            reject(new Error('Empty content from Gemini.'));
                            return;
                        }
                        resolve(JSON.parse(text));
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse Gemini PDF response: ${String(e)}`));
                    }
                });
            });
            req.on('error', (err) => reject(err));
            req.setTimeout(120000, () => req.destroy(new Error('Gemini PDF request timed out')));
            req.write(postData);
            req.end();
        });
    });
}
// Slice the first `maxPages` pages of a PDF into a small sub-PDF (base64) so we
// can send just the table-of-contents region to Gemini inline (<20MB limit).
function slicePdfPages(buffer, maxPages) {
    return __awaiter(this, void 0, void 0, function* () {
        const { PDFDocument } = require('pdf-lib');
        const src = yield PDFDocument.load(buffer, { ignoreEncryption: true });
        const total = src.getPageCount();
        const count = Math.min(maxPages, total);
        const out = yield PDFDocument.create();
        const indices = Array.from({ length: count }, (_, i) => i);
        const pages = yield out.copyPages(src, indices);
        pages.forEach((p) => out.addPage(p));
        const bytes = yield out.save();
        return Buffer.from(bytes).toString('base64');
    });
}
// Remove NULL bytes and C0 control chars (keeping tab/newline/CR) — Postgres
// text columns reject NUL, and stray control chars slip in from AI/PDF output.
// Also cleans up duplicate Tamil combining diacritics and double characters caused by PDF stream overlaps.
function cleanStr(s) {
    const str = String(s == null ? '' : s);
    let out = '';
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 127))
            out += str[i];
    }
    // 1. Fix consecutive duplicate Tamil diacritics (e.g. க்் -> க், ரோோ -> ரோ, ம்் -> ம்)
    out = out.replace(/([\u0BBE-\u0BCD])\1+/g, '$1');
    // 2. Fix consecutive duplicate Tamil letters caused by overlapping PDF rendering text layers
    out = out.replace(/றற/g, 'ற');
    out = out.replace(/னன/g, 'ன');
    return out.trim();
}
// Escape text for safe embedding inside SVG/XML.
function svgEscape(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
// Word-wrap a string into at most `maxLines` lines of ~`maxChars` characters.
function wrapText(text, maxChars, maxLines) {
    const words = String(text || '').trim().split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
        if ((current + ' ' + word).trim().length <= maxChars) {
            current = (current + ' ' + word).trim();
        }
        else {
            if (current)
                lines.push(current);
            current = word;
            if (lines.length === maxLines - 1)
                break;
        }
    }
    if (current && lines.length < maxLines)
        lines.push(current);
    // If we truncated, add an ellipsis to the last line.
    if (lines.length === maxLines) {
        const consumed = lines.join(' ').split(/\s+/).length;
        if (consumed < words.length)
            lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;]?$/, '…');
    }
    return lines;
}
// Build an infographic SVG card matching the seeded syllabus-board design.
// primaryTitle is the big heading (original script — Tamil for a Tamil book),
// secondaryTitle is the italic subtitle (the translation).
function buildInfographicSVG(opts) {
    const { unitNumber, primaryTitle, secondaryTitle, description, tip, emoji, color } = opts;
    const c = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6366f1';
    const descLines = wrapText(description, 44, 3);
    const descTspans = descLines
        .map((ln, i) => `<tspan x="24" dy="${i === 0 ? 0 : 15}">${svgEscape(ln)}</tspan>`)
        .join('');
    const tipLines = wrapText(tip, 50, 2);
    const tipTspans = tipLines
        .map((ln, i) => `<tspan x="52" dy="${i === 0 ? 0 : 14}">${svgEscape(i === 0 ? 'Tip: ' + ln : ln)}</tspan>`)
        .join('');
    const titleText = svgEscape(primaryTitle.length > 32 ? primaryTitle.slice(0, 31) + '…' : primaryTitle);
    const subText = svgEscape(secondaryTitle.length > 50 ? secondaryTitle.slice(0, 49) + '…' : secondaryTitle);
    return `<svg viewBox="0 0 420 270" xmlns="http://www.w3.org/2000/svg" font-family="'Segoe UI', 'Nirmala UI', 'Latha', Arial, sans-serif">
  <defs>
    <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c}"/>
      <stop offset="100%" stop-color="${c}cc"/>
    </linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="417" height="267" rx="18" fill="#ffffff" stroke="${c}" stroke-width="2"/>
  <rect x="1.5" y="1.5" width="417" height="6" rx="3" fill="${c}"/>
  <circle cx="40" cy="46" r="20" fill="url(#badgeGrad)"/>
  <text x="40" y="52" font-size="18" font-weight="800" fill="#ffffff" text-anchor="middle">${unitNumber}</text>
  <rect x="352" y="26" width="44" height="44" rx="12" fill="${c}1a"/>
  <text x="374" y="55" font-size="24" text-anchor="middle">${svgEscape(emoji || '📘')}</text>
  <text x="24" y="92" font-size="18" font-weight="800" fill="#0f172a"><tspan x="24" dy="0">${titleText}</tspan></text>
  <text x="24" y="110" font-size="12" fill="#64748b" font-style="italic">${subText}</text>
  <text x="24" y="134" font-size="12.5" fill="#334155">${descTspans}</text>
  <rect x="24" y="195" width="372" height="54" rx="10" fill="${c}12" stroke="${c}33" stroke-width="1"/>
  <text x="34" y="217" font-size="16">💡</text>
  <text x="52" y="216" font-size="11" font-weight="600" fill="${c}">${tipTspans}</text>
</svg>`;
}
function svgToDataUri(svg) {
    return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}
router.post('/upload-syllabus-pdf', pdfUpload.single('pdf'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, error: 'PDF file is required' });
        }
        const { className, subjectName, icon, color } = req.body;
        if (!className) {
            return res.status(400).json({ success: false, error: 'className is required' });
        }
        const promptBase = `You are analyzing a Tamil Nadu State Board school textbook for Class ${className}.

Read the table of contents / unit pages and extract the syllabus EXACTLY as printed — do NOT invent, rename, reorder, or translate away the original headings. Preserve the book's own unit and lesson titles in their original script.

For each UNIT (in a Tamil book these are "இயல்"; in others they may be chapters/units):
- "unitNumber": sequential number starting at 1.
- "titleTamil" and "titleEnglish": the unit heading in Tamil script AND English. For a Tamil book, titleTamil must be the EXACT printed heading and titleEnglish an accurate translation. For an English book, titleEnglish is the exact heading and titleTamil a translation.
- "description": 1-2 sentence student-facing summary of the unit, in the textbook's language.
- "tip": one short study tip (under 90 chars), in the textbook language.
- "emoji": one relevant emoji.
- "lessons": every lesson/section under the unit, in order, each with "name" (EXACT original-script title as printed) and "nameEnglish" (translation).
- Also return top-level "language" (e.g. "Tamil") and "subjectName" (e.g. "தமிழ்").${subjectName ? ` The subject is: ${subjectName}.` : ''}

Skip covers, preface, acknowledgements, anthem, index and glossary — only real academic units/lessons.`;
        let parsed = null;
        let pdfPages = 0;
        // --- Primary path: let Gemini read the PDF pages (accurate for Tamil script) ---
        try {
            const base64Pdf = yield slicePdfPages(file.buffer, 150);
            console.log(`[PDF Upload] Sending first pages to Gemini (vision) for Class ${className}...`);
            parsed = yield callGeminiWithPdf(promptBase, base64Pdf, PDF_SYLLABUS_SCHEMA);
        }
        catch (visionErr) {
            console.warn('[PDF Upload] PDF-vision path failed, will fall back to text:', visionErr.message);
        }
        // --- Fallback path: text extraction (garbles Tamil, but better than nothing) ---
        if (!parsed || !Array.isArray(parsed.units) || parsed.units.length === 0) {
            const pdfData = yield extractTextFromPDF(file.buffer);
            pdfPages = pdfData.numpages;
            const extractedText = (pdfData.text || '').trim();
            if (extractedText.length < 50) {
                return res.status(400).json({ success: false, error: 'Could not read this PDF. It may be a scanned image with no selectable text.' });
            }
            console.log('[PDF Upload] Falling back to text extraction...');
            parsed = yield callGeminiJSON(`${promptBase}\n\nTextbook text (may be imperfectly encoded):\n${extractedText.substring(0, 250000)}`, PDF_SYLLABUS_SCHEMA);
        }
        if (!parsed || !Array.isArray(parsed.units) || parsed.units.length === 0) {
            return res.status(422).json({ success: false, error: 'AI could not identify any units in the PDF. Try a different PDF or ensure it contains a table of contents.' });
        }
        const language = cleanStr(parsed.language) || 'English';
        const tamilPrimary = /tamil|தமிழ/i.test(language) || /tamil|தமிழ/i.test(cleanStr(parsed.subjectName));
        const finalSubjectName = cleanStr(subjectName || parsed.subjectName) || (tamilPrimary ? 'தமிழ்' : 'Subject');
        const finalColor = color || '#6366f1';
        const finalIcon = cleanStr(icon) || '📚';
        // Normalise: pick primary/secondary titles by language; keep lessons faithful.
        const units = parsed.units
            .map((u) => {
            var _a;
            const unitNumber = Number(u.unitNumber);
            const titleTamil = cleanStr(u.titleTamil);
            const titleEnglish = cleanStr(u.titleEnglish);
            const lessons = Array.isArray(u.lessons)
                ? u.lessons
                    .map((l) => ({ name: cleanStr(l === null || l === void 0 ? void 0 : l.name), nameEnglish: cleanStr(l === null || l === void 0 ? void 0 : l.nameEnglish) }))
                    .filter((l) => l.name)
                : [];
            let primaryTitle = tamilPrimary ? titleTamil : titleEnglish;
            let secondaryTitle = tamilPrimary ? titleEnglish : titleTamil;
            if (!primaryTitle)
                primaryTitle = secondaryTitle || ((_a = lessons[0]) === null || _a === void 0 ? void 0 : _a.name) || `Unit ${unitNumber}`;
            return {
                unitNumber,
                primaryTitle,
                secondaryTitle,
                titleTamil,
                titleEnglish,
                description: cleanStr(u.description) || (lessons.length ? lessons.slice(0, 4).map((l) => l.name).join(', ') : ''),
                tip: cleanStr(u.tip) || 'Read the lessons in order and note the key ideas.',
                emoji: cleanStr(u.emoji) || finalIcon,
                lessons
            };
        })
            .filter((u) => !isNaN(u.unitNumber) && u.primaryTitle);
        // Preview mode — return the parsed structure for review, no DB writes
        if (req.body.previewOnly === 'true') {
            return res.json({
                success: true,
                preview: true,
                data: {
                    language,
                    subjectName: finalSubjectName,
                    className,
                    icon: finalIcon,
                    color: finalColor,
                    units,
                    pdfPages,
                    totalUnits: units.length,
                    totalTopics: units.reduce((sum, u) => { var _a; return sum + (((_a = u.lessons) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0)
                }
            });
        }
        // Create/upsert CentralSubject
        let subject = yield prisma_1.prisma.centralSubject.findFirst({
            where: { class: className, name: finalSubjectName }
        });
        if (!subject) {
            subject = yield prisma_1.prisma.centralSubject.create({
                data: { class: className, name: finalSubjectName, icon: finalIcon, color: finalColor }
            });
        }
        else {
            subject = yield prisma_1.prisma.centralSubject.update({
                where: { id: subject.id },
                data: { icon: finalIcon, color: finalColor }
            });
        }
        // For each unit: upsert unit → "Unit Overview" topic (holds infographic) →
        // lesson topics (2..N, faithful names) → infographic content on topic 1.
        const results = [];
        for (const u of units) {
            let unitRecord;
            try {
                unitRecord = yield prisma_1.prisma.centralUnit.create({
                    data: { subjectId: subject.id, name: u.primaryTitle, unitNumber: u.unitNumber }
                });
            }
            catch (_a) {
                unitRecord = yield prisma_1.prisma.centralUnit.update({
                    where: { subjectId_unitNumber: { subjectId: subject.id, unitNumber: u.unitNumber } },
                    data: { name: u.primaryTitle }
                });
            }
            // Topic 1 = Unit Overview (holds the card image)
            let overview = yield prisma_1.prisma.centralTopic.findFirst({
                where: { unitId: unitRecord.id, topicNumber: 1 }
            });
            if (!overview) {
                overview = yield prisma_1.prisma.centralTopic.create({
                    data: { unitId: unitRecord.id, topicNumber: 1, name: 'Unit Overview' }
                });
            }
            else {
                yield prisma_1.prisma.centralTopic.update({ where: { id: overview.id }, data: { name: 'Unit Overview' } });
            }
            // Topics 2..N = the real lessons (faithful, editable)
            for (let i = 0; i < u.lessons.length; i++) {
                const topicNumber = i + 2;
                const lessonName = u.lessons[i].name;
                try {
                    yield prisma_1.prisma.centralTopic.create({
                        data: { unitId: unitRecord.id, topicNumber, name: lessonName }
                    });
                }
                catch (_b) {
                    yield prisma_1.prisma.centralTopic.update({
                        where: { unitId_topicNumber: { unitId: unitRecord.id, topicNumber } },
                        data: { name: lessonName }
                    });
                }
            }
            // Infographic on the Unit Overview topic (data-URI SVG)
            const svg = buildInfographicSVG({
                unitNumber: u.unitNumber,
                primaryTitle: u.primaryTitle,
                secondaryTitle: u.secondaryTitle,
                description: u.description,
                tip: u.tip,
                emoji: u.emoji,
                color: finalColor
            });
            const fileUrl = svgToDataUri(svg);
            const lessonList = u.lessons.map((l) => l.name).join(', ');
            const fileContent = `${u.primaryTitle}${u.secondaryTitle ? ` (${u.secondaryTitle})` : ''}\n${u.description}\nTip: ${u.tip}${lessonList ? `\nLessons: ${lessonList}` : ''}`;
            const existing = yield prisma_1.prisma.centralContent.findFirst({
                where: { topicId: overview.id, contentType: 'INFOGRAPHIC' }
            });
            if (existing) {
                yield prisma_1.prisma.centralContent.update({
                    where: { id: existing.id },
                    data: { title: `Unit ${u.unitNumber}: ${u.primaryTitle}`, fileUrl, fileContent }
                });
            }
            else {
                yield prisma_1.prisma.centralContent.create({
                    data: { topicId: overview.id, contentType: 'INFOGRAPHIC', title: `Unit ${u.unitNumber}: ${u.primaryTitle}`, fileUrl, fileContent }
                });
            }
            results.push({ unit: unitRecord, lessons: u.lessons.length });
        }
        console.log(`[PDF Upload] Done! Built ${results.length} unit cards for ${finalSubjectName} Class ${className}`);
        res.json({
            success: true,
            message: `Successfully extracted and built ${results.length} unit cards from the PDF.`,
            data: {
                subject,
                language,
                units: results,
                totalUnits: results.length,
                totalTopics: units.reduce((sum, u) => { var _a; return sum + (((_a = u.lessons) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0)
            }
        });
    }
    catch (err) {
        console.error('[PDF Upload] Error:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to process PDF' });
    }
}));
// JSON schema for AI visual study infographic mapping
const INFOGRAPHIC_SCHEMA = {
    type: 'OBJECT',
    properties: {
        topicTitle: { type: 'STRING', description: 'Subject Standard and Topic name' },
        overallSummary: { type: 'STRING', description: 'A brief, high-impact summary of what this subunit teaches.' },
        visualFlow: {
            type: 'ARRAY',
            description: 'A step-by-step visual process flow or concept map nodes that explains the logic/steps of this topic sequentially.',
            items: {
                type: 'OBJECT',
                properties: {
                    stepNumber: { type: 'INTEGER' },
                    title: { type: 'STRING', description: 'Title of this step (e.g. Cartesian Definition)' },
                    description: { type: 'STRING', description: 'Brief explanation of this step (both in Tamil and English).' },
                    icon: { type: 'STRING', description: 'A single emoji representing this step (e.g. 🎒, 🧬, 📐)' }
                },
                required: ['stepNumber', 'title', 'description', 'icon']
            }
        },
        keyFormulasOrFacts: {
            type: 'ARRAY',
            description: 'Core rules, formulas, equations, or key historical facts to remember.',
            items: {
                type: 'OBJECT',
                properties: {
                    concept: { type: 'STRING', description: 'The rule/formula name (e.g. A x B = {(a,b) | a in A, b in B})' },
                    importance: { type: 'STRING', description: 'Why this rule is important or when to use it.' }
                },
                required: ['concept', 'importance']
            }
        },
        mnemonics: {
            type: 'ARRAY',
            description: 'Creative learning tricks, rhymes, or acronyms to easily remember this concept.',
            items: {
                type: 'OBJECT',
                properties: {
                    phrase: { type: 'STRING', description: 'The mnemonic acronym or phrase (e.g. SOH CAH TOA)' },
                    meaning: { type: 'STRING', description: 'What the acronym stands for and how it applies to this topic.' }
                },
                required: ['phrase', 'meaning']
            }
        },
        flashcards: {
            type: 'ARRAY',
            description: 'A set of 4 interactive study flashcards (Question on front, Answer/Explanation on back) for active recall.',
            items: {
                type: 'OBJECT',
                properties: {
                    front: { type: 'STRING', description: 'A quick conceptual question' },
                    back: { type: 'STRING', description: 'The brief, accurate answer/formula to memorize' }
                },
                required: ['front', 'back']
            }
        }
    },
    required: ['topicTitle', 'overallSummary', 'visualFlow', 'keyFormulasOrFacts', 'mnemonics', 'flashcards']
};
// POST /api/centralized-content/topics/:id/generate-infographic — Generate a smart concept map / infographic using Gemini from uploaded PDFs/materials
router.post('/topics/:id/generate-infographic', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // 1. Get Topic (subunit) info
        const topic = yield prisma_1.prisma.centralTopic.findUnique({
            where: { id },
            include: {
                unit: {
                    include: {
                        subject: true
                    }
                },
                contents: true
            }
        });
        if (!topic) {
            return res.status(404).json({ success: false, error: "Subunit not found" });
        }
        // 2. Extract content text from materials
        let materialsText = "";
        for (const content of topic.contents) {
            if (content.fileContent) {
                materialsText += `\n[Material Title: ${content.title}]\n${content.fileContent}\n`;
            }
            // If it is a file URL, try to read the file
            if (content.fileUrl && content.fileUrl.startsWith('/uploads/')) {
                const filename = content.fileUrl.replace('/uploads/', '');
                const filePath = path_1.default.join(__dirname, '../../uploads', filename);
                try {
                    if (fs_1.default.existsSync(filePath)) {
                        const ext = path_1.default.extname(filename).toLowerCase();
                        if (ext === '.txt' || ext === '.md') {
                            const txt = yield fs_1.default.promises.readFile(filePath, 'utf8');
                            materialsText += `\n[Text File: ${content.title}]\n${txt}\n`;
                        }
                        else if (ext === '.pdf') {
                            try {
                                const fileBuffer = yield fs_1.default.promises.readFile(filePath);
                                const pdfData = yield extractTextFromPDF(fileBuffer);
                                materialsText += `\n[PDF File: ${content.title}]\n${pdfData.text || ""}\n`;
                            }
                            catch (pdfErr) {
                                console.warn("pdf-parse failed, skipping full text extract for PDF:", filename);
                            }
                        }
                    }
                }
                catch (fileErr) {
                    console.warn(`Could not read physical file ${filePath}:`, fileErr.message);
                }
            }
        }
        // fallback base context
        const baseContext = `Topic: ${topic.name} (Subunit ${topic.topicNumber}), Unit: ${topic.unit.name} (Unit ${topic.unit.unitNumber}), Subject: ${topic.unit.subject.name}, Grade: Class ${topic.unit.subject.class}th`;
        console.log(`[Infographic AI] Generating concept map for Topic ID ${id}. Context length: ${materialsText.length}`);
        // 3. Formulate Prompt
        const prompt = `You are a professional educational curriculum designer AI. Your task is to generate a comprehensive, highly structured visual study map / infographic JSON configuration for the subunit topic described below.
    
    Subunit Syllabus Details:
    ${baseContext}
    
    Uploaded Study Materials (Parsed Text Extract):
    ${materialsText ? materialsText.substring(0, 45000) : "No study materials uploaded yet. Use master board standard syllabus information for this topic."}
    
    Instructions:
    1. Read and analyze the uploaded study materials text. Extract the core concepts, logic flows, rules, formulas, and facts.
    2. Write a brief overallSummary of the topic.
    3. Generate a sequential, step-by-step visualFlow showing how a student should learn this concept step-by-step. Write short, clear descriptions in both English and Tamil (bilingual).
    4. Compile keyFormulasOrFacts that are crucial to memorize for this topic.
    5. Invent 2 or 3 memorable mnemonics or learning tricks (acronyms, word associations) to help students memorize key aspects of the topic.
    6. Formulate 4 Q&A active recall flashcards (front = question, back = answer/formula).
    7. All generated content MUST be tailored to the grade level (${topic.unit.subject.class}th standard). Ensure the output strictly conforms to the requested JSON schema.`;
        const result = yield callGeminiJSON(prompt, INFOGRAPHIC_SCHEMA);
        // Find or upsert database record
        let contentRecord = yield prisma_1.prisma.centralContent.findFirst({
            where: {
                topicId: id,
                contentType: "INFOGRAPHIC"
            }
        });
        const { uploader, uploaderRole } = req.body;
        if (contentRecord) {
            contentRecord = yield prisma_1.prisma.centralContent.update({
                where: { id: contentRecord.id },
                data: {
                    title: `${topic.name} AI Infographic Map`,
                    // @ts-ignore – stale Prisma client; run prisma generate
                    infographic: result,
                    // @ts-ignore
                    uploader: uploader || "Super Admin",
                    // @ts-ignore
                    uploaderRole: uploaderRole || "SUPERADMIN"
                }
            });
        }
        else {
            contentRecord = yield prisma_1.prisma.centralContent.create({
                data: {
                    topicId: id,
                    contentType: "INFOGRAPHIC",
                    title: `${topic.name} AI Infographic Map`,
                    // @ts-ignore – stale Prisma client; run prisma generate
                    infographic: result,
                    // @ts-ignore
                    uploader: uploader || "Super Admin",
                    // @ts-ignore
                    uploaderRole: uploaderRole || "SUPERADMIN"
                }
            });
        }
        res.json({
            success: true,
            // @ts-ignore – stale Prisma client; run prisma generate
            data: contentRecord.infographic
        });
    }
    catch (err) {
        console.error("Error generating AI infographic:", err);
        res.status(500).json({ success: false, error: err.message || "Failed to generate AI concept map" });
    }
}));
// JSON schema for AI visual presentation slides configuration
const PRESENTATION_SCHEMA = {
    type: 'OBJECT',
    properties: {
        presentationTitle: { type: 'STRING', description: 'Title of the presentation (tailored to unit/subunit and grade standard)' },
        slides: {
            type: 'ARRAY',
            description: 'A list of 6-8 structured educational slides covering the concepts in depth with pictorial layout guidance.',
            items: {
                type: 'OBJECT',
                properties: {
                    slideNumber: { type: 'INTEGER' },
                    title: { type: 'STRING', description: 'Slide Title (e.g. Cartesian Product Properties)' },
                    bulletPoints: {
                        type: 'ARRAY',
                        items: { type: 'STRING' },
                        description: '3-4 core takeaways, bullet points, formulas, or key lessons.'
                    },
                    visualLayoutDescription: {
                        type: 'STRING',
                        description: 'Highly descriptive guidance for drawing diagrams, pictorial maps, flow charts, or tables on this slide to explain the concepts visually.'
                    },
                    speakerNotes: {
                        type: 'STRING',
                        description: 'Detailed bilingual explanation in English and Tamil (pedagogical explanation for student understanding).'
                    }
                },
                required: ['slideNumber', 'title', 'bulletPoints', 'visualLayoutDescription', 'speakerNotes']
            }
        }
    },
    required: ['presentationTitle', 'slides']
};
// POST /api/centralized-content/topics/:id/generate-presentation — Generate a smart presentation slides deck using Gemini from uploaded materials
router.post('/topics/:id/generate-presentation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // 1. Get Topic (subunit) info
        const topic = yield prisma_1.prisma.centralTopic.findUnique({
            where: { id },
            include: {
                unit: {
                    include: {
                        subject: true
                    }
                },
                contents: true
            }
        });
        if (!topic) {
            return res.status(404).json({ success: false, error: "Subunit not found" });
        }
        // 2. Extract content text from materials
        let materialsText = "";
        for (const content of topic.contents) {
            if (content.fileContent) {
                materialsText += `\n[Material Title: ${content.title}]\n${content.fileContent}\n`;
            }
            // If it is a file URL, try to read the file
            if (content.fileUrl && content.fileUrl.startsWith('/uploads/')) {
                const filename = content.fileUrl.replace('/uploads/', '');
                const filePath = path_1.default.join(__dirname, '../../uploads', filename);
                try {
                    if (fs_1.default.existsSync(filePath)) {
                        const ext = path_1.default.extname(filename).toLowerCase();
                        if (ext === '.txt' || ext === '.md') {
                            const txt = yield fs_1.default.promises.readFile(filePath, 'utf8');
                            materialsText += `\n[Text File: ${content.title}]\n${txt}\n`;
                        }
                        else if (ext === '.pdf') {
                            try {
                                const fileBuffer = yield fs_1.default.promises.readFile(filePath);
                                const pdfData = yield extractTextFromPDF(fileBuffer);
                                materialsText += `\n[PDF File: ${content.title}]\n${pdfData.text || ""}\n`;
                            }
                            catch (pdfErr) {
                                console.warn("pdf-parse failed, skipping full text extract for PDF:", filename);
                            }
                        }
                    }
                }
                catch (fileErr) {
                    console.warn(`Could not read physical file ${filePath}:`, fileErr.message);
                }
            }
        }
        // fallback base context
        const baseContext = `Topic: ${topic.name} (Subunit ${topic.topicNumber}), Unit: ${topic.unit.name} (Unit ${topic.unit.unitNumber}), Subject: ${topic.unit.subject.name}, Grade: Class ${topic.unit.subject.class}th`;
        console.log(`[Presentation AI] Generating presentation slides for Topic ID ${id}. Context length: ${materialsText.length}`);
        // 3. Formulate Prompt
        const prompt = `You are a professional educational curriculum designer AI. Your task is to generate a comprehensive, highly structured visual educational presentation (slides configuration) for the subunit topic described below.
    
    Subunit Syllabus Details:
    ${baseContext}
    
    Uploaded Study Materials (Parsed Text Extract):
    ${materialsText ? materialsText.substring(0, 45000) : "No study materials uploaded yet. Use master board standard syllabus information for this topic."}
    
    Instructions:
    1. Read and analyze the uploaded study materials text. Extract the core concepts, definitions, rules, formulas, and visual workflows.
    2. Design 6 to 8 structured presentation slides.
    3. For each slide, write a clear title.
    4. Formulate 3-4 bulletPoints detailing the core conceptual points.
    5. Write a detailed visualLayoutDescription that tells the system how to display the slides visually (describing diagrams, shapes, flowcharts, cartesian graphs, or pictorial arrows to map items).
    6. Write detailed bilingual speakerNotes (in Tamil and English) explaining the slide's content pedagogically.
    7. All generated content MUST be tailored to the grade level (${topic.unit.subject.class}th standard). Ensure the output strictly conforms to the requested JSON schema.`;
        const result = yield callGeminiJSON(prompt, PRESENTATION_SCHEMA);
        // Find or upsert database record
        let contentRecord = yield prisma_1.prisma.centralContent.findFirst({
            where: {
                topicId: id,
                contentType: "PRESENTATION"
            }
        });
        const { uploader, uploaderRole } = req.body;
        if (contentRecord) {
            contentRecord = yield prisma_1.prisma.centralContent.update({
                where: { id: contentRecord.id },
                data: {
                    title: `${topic.name} AI Slides Presentation`,
                    presentation: result,
                    uploader: uploader || "Super Admin",
                    uploaderRole: uploaderRole || "SUPERADMIN"
                }
            });
        }
        else {
            contentRecord = yield prisma_1.prisma.centralContent.create({
                data: {
                    topicId: id,
                    contentType: "PRESENTATION",
                    title: `${topic.name} AI Slides Presentation`,
                    presentation: result,
                    uploader: uploader || "Super Admin",
                    uploaderRole: uploaderRole || "SUPERADMIN"
                }
            });
        }
        res.json({
            success: true,
            data: contentRecord.presentation
        });
    }
    catch (err) {
        console.error("Error generating AI presentation:", err);
        res.status(500).json({ success: false, error: err.message || "Failed to generate AI presentation slides" });
    }
}));
exports.default = router;
