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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const STORE_DIR = path_1.default.join(__dirname, '../../store');
// Default initial milestones if no file exists
const DEFAULT_MILESTONES = [
    { id: 1, year: "1955", title: "School Founding Year", details: "GHS Coimbatore established in a single-room thatch roof hut with 15 students and 1 teacher.", icon: "🏫" },
    { id: 2, year: "1972", title: "High School Roster Status", details: "Formally recognized by Tamil Nadu State Education Department as a government High School (Class 6-10).", icon: "📐" },
    { id: 3, year: "1991", title: "Science Lab Wing Built", details: "First brick-and-mortar wing built for laboratory experimentation with basic glassware.", icon: "🔬" },
    { id: 4, year: "2011", title: "Computer Lab Center", details: "Inaugurated our first computer laboratory with 15 donated desktops and basic typing tutor sessions.", icon: "💻" },
    { id: 5, year: "2022", title: "AI Smart Classrooms Setup", details: "Installation of the first smart screen boards and tablets for interactive digital learning models.", icon: "🤖" },
];
function getFilePath(schoolId) {
    return path_1.default.join(STORE_DIR, `history_${schoolId}.json`);
}
// GET /api/headmaster/history?schoolId=...
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        }
        if (!fs_1.default.existsSync(STORE_DIR)) {
            fs_1.default.mkdirSync(STORE_DIR, { recursive: true });
        }
        const filepath = getFilePath(schoolId);
        if (!fs_1.default.existsSync(filepath)) {
            fs_1.default.writeFileSync(filepath, JSON.stringify(DEFAULT_MILESTONES, null, 2));
        }
        const data = fs_1.default.readFileSync(filepath, 'utf8');
        res.json({ success: true, data: JSON.parse(data) });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/headmaster/history
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { schoolId, year, title, details, icon } = req.body;
        if (!schoolId || !year || !title || !details) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const filepath = getFilePath(schoolId);
        let milestones = [];
        if (fs_1.default.existsSync(filepath)) {
            milestones = JSON.parse(fs_1.default.readFileSync(filepath, 'utf8'));
        }
        else {
            milestones = [...DEFAULT_MILESTONES];
        }
        const newMilestone = {
            id: Date.now(),
            year: String(year),
            title,
            details,
            icon: icon || "📜"
        };
        milestones.push(newMilestone);
        milestones.sort((a, b) => Number(a.year) - Number(b.year));
        fs_1.default.writeFileSync(filepath, JSON.stringify(milestones, null, 2));
        res.json({ success: true, data: newMilestone });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/headmaster/history/:id?schoolId=...
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { schoolId } = req.query;
        if (!schoolId) {
            return res.status(400).json({ success: false, error: 'schoolId is required' });
        }
        const filepath = getFilePath(schoolId);
        if (!fs_1.default.existsSync(filepath)) {
            return res.status(404).json({ success: false, error: 'History file not found' });
        }
        let milestones = JSON.parse(fs_1.default.readFileSync(filepath, 'utf8'));
        const initialLength = milestones.length;
        milestones = milestones.filter((ms) => String(ms.id) !== String(id));
        if (milestones.length === initialLength) {
            return res.status(404).json({ success: false, error: 'Milestone not found' });
        }
        fs_1.default.writeFileSync(filepath, JSON.stringify(milestones, null, 2));
        res.json({ success: true, message: 'Milestone removed' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/headmaster/history/:id
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { schoolId, year, title, details, icon } = req.body;
        if (!schoolId || !year || !title || !details) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const filepath = getFilePath(schoolId);
        if (!fs_1.default.existsSync(filepath)) {
            return res.status(404).json({ success: false, error: 'History file not found' });
        }
        const milestones = JSON.parse(fs_1.default.readFileSync(filepath, 'utf8'));
        const index = milestones.findIndex((ms) => String(ms.id) === String(id));
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Milestone not found' });
        }
        milestones[index] = Object.assign(Object.assign({}, milestones[index]), { year: String(year), title,
            details, icon: icon || milestones[index].icon || "📜" });
        milestones.sort((a, b) => Number(a.year) - Number(b.year));
        fs_1.default.writeFileSync(filepath, JSON.stringify(milestones, null, 2));
        res.json({ success: true, data: milestones[index] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
