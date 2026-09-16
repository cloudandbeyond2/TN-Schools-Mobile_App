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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv")); // trigger nodemon reload
const db_1 = require("./config/db");
const prisma_1 = require("./config/prisma");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Route imports
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const portfolio_routes_1 = __importDefault(require("./routes/portfolio.routes"));
const sports_routes_1 = __importDefault(require("./routes/sports.routes"));
const petSports_routes_1 = __importDefault(require("./routes/petSports.routes"));
const petFitness_routes_1 = __importDefault(require("./routes/petFitness.routes"));
const petInventory_routes_1 = __importDefault(require("./routes/petInventory.routes"));
const wellness_routes_1 = __importDefault(require("./routes/wellness.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const languageCoaching_routes_1 = __importDefault(require("./routes/languageCoaching.routes"));
const activities_routes_1 = __importDefault(require("./routes/activities.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const school_routes_1 = __importDefault(require("./routes/school.routes"));
const schoolPortal_routes_1 = __importDefault(require("./routes/schoolPortal.routes"));
const headmaster_routes_1 = __importDefault(require("./routes/headmaster.routes"));
const schoolHistory_routes_1 = __importDefault(require("./routes/schoolHistory.routes"));
const page_routes_1 = __importDefault(require("./routes/page.routes"));
const feature_routes_1 = __importDefault(require("./routes/feature.routes"));
const superadmin_settings_routes_1 = __importDefault(require("./routes/superadmin.settings.routes"));
const integration_routes_1 = __importDefault(require("./routes/integration.routes"));
const superadmin_admins_routes_1 = __importDefault(require("./routes/superadmin.admins.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const teacher_routes_1 = __importDefault(require("./routes/teacher.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const class_routes_1 = __importDefault(require("./routes/class.routes"));
const parent_routes_1 = __importDefault(require("./routes/parent.routes"));
const centralContent_routes_1 = __importDefault(require("./routes/centralContent.routes"));
const celebration_routes_1 = __importDefault(require("./routes/celebration.routes"));
const socialActivities_routes_1 = __importDefault(require("./routes/socialActivities.routes"));
const culturalEvents_routes_1 = __importDefault(require("./routes/culturalEvents.routes"));
const computerEducation_routes_1 = __importDefault(require("./routes/computerEducation.routes"));
const stories_routes_1 = __importDefault(require("./routes/stories.routes"));
const digitalLibrary_routes_1 = __importDefault(require("./routes/digitalLibrary.routes"));
const digitalLibraryUpload_routes_1 = __importDefault(require("./routes/digitalLibraryUpload.routes"));
const personalGuide_routes_1 = __importDefault(require("./routes/personalGuide.routes"));
const neetPrep_routes_1 = __importDefault(require("./routes/neetPrep.routes"));
const competitiveExams_routes_1 = __importDefault(require("./routes/competitiveExams.routes"));
const libraryProgress_routes_1 = __importDefault(require("./routes/libraryProgress.routes"));
const flashcards_routes_1 = __importDefault(require("./routes/flashcards.routes"));
const promotion_routes_1 = __importDefault(require("./routes/promotion.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const scienceLabs_routes_1 = __importDefault(require("./routes/scienceLabs.routes"));
const timetable_routes_1 = __importDefault(require("./routes/timetable.routes"));
const examSchedule_routes_1 = __importDefault(require("./routes/examSchedule.routes"));
const studyPlanner_routes_1 = __importDefault(require("./routes/studyPlanner.routes"));
const superadmin_academics_routes_1 = __importDefault(require("./routes/superadmin.academics.routes"));
const hierarchy_routes_1 = __importDefault(require("./routes/hierarchy.routes"));
const minister_routes_1 = __importDefault(require("./routes/minister.routes"));
const commissioner_routes_1 = __importDefault(require("./routes/commissioner.routes"));
const sslcPrep_routes_1 = __importDefault(require("./routes/sslcPrep.routes"));
const scholarship_routes_1 = __importDefault(require("./routes/scholarship.routes"));
const deo_routes_1 = __importDefault(require("./routes/deo.routes"));
const counsellor_routes_1 = __importDefault(require("./routes/counsellor.routes"));
const mock_tests_routes_1 = __importDefault(require("./routes/mock-tests.routes"));
// Trigger nodemon restart after prisma client generation
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// ─── CORS Configuration ──────────────────────────────────────────────
// Define allowed origins based on environment
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://tn-schools.vercel.app",
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            /^https:\/\/tn-schools(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ]
};
app.use((0, cors_1.default)(corsOptions));
// Preflight must use the same strict options as regular requests
app.options("*", (0, cors_1.default)(corsOptions));
// ─── Security Headers ────────────────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    frameguard: false,
}));
// ─── Rate Limiting ───────────────────────────────────────────────
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 999999 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts, please try again later.' },
});
app.use('/api/users/auth', loginLimiter);
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 999999 : 300,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', globalLimiter);
// ─── Other Middleware ──────────────────────────────────────────────
// Large binary uploads go through multer (with per-route size caps), so JSON
// bodies only need headroom for base64 image payloads used by a few AI flows.
app.use(express_1.default.json({ limit: '25mb' }));
app.use(express_1.default.urlencoded({ limit: '25mb', extended: true }));
// Serve uploaded files statically
const uploadsDir = path_1.default.join(__dirname, '../uploads');
try {
    if (!fs_1.default.existsSync(uploadsDir)) {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
}
catch (error) {
    console.warn('[Warning] Could not create uploads directory (likely running in a read-only environment like Vercel).');
}
app.use('/uploads', express_1.default.static(uploadsDir));
// ─── Connect Databases ───────────────────────────────────────
(0, db_1.connectMongoDB)(); // MongoDB Atlas
// ─── Health Check ────────────────────────────────────────────
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let pgStatus = 'unknown';
    try {
        yield prisma_1.prisma.$queryRaw `SELECT 1`;
        pgStatus = 'connected';
    }
    catch (_a) {
        pgStatus = 'disconnected (check POSTGRES_URI in .env)';
    }
    res.json({
        status: 'ok',
        message: 'TN Schools AI Ecosystem API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        databases: {
            mongodb: 'connected',
            postgresql: pgStatus,
        },
        cors: {
            allowedOrigins: allowedOrigins,
            environment: process.env.NODE_ENV || 'development'
        }
    });
}));
const auth_middleware_1 = require("./middleware/auth.middleware");
// ─── Public API Whitelist ──────────────────────────────────────
const PUBLIC_PATHS = [
    '/',
    '/api/users/auth',
    '/api/users/login',
    '/api/users/student-login',
];
// ─── Global Authentication Guard (Fail-Closed) ─────────────────
app.use((req, res, next) => {
    if (req.path === '/' ||
        req.path.startsWith('/uploads/') ||
        req.method === 'OPTIONS' ||
        PUBLIC_PATHS.includes(req.path)) {
        return next();
    }
    return (0, auth_middleware_1.authenticate)(req, res, next);
});
// ─── API Routes ──────────────────────────────────────────────
app.use('/api/ai', ai_routes_1.default);
app.use('/api/portfolio', portfolio_routes_1.default);
app.use('/api/sports', sports_routes_1.default);
app.use('/api/pet/fitness-records', petFitness_routes_1.default);
app.use('/api/pet/inventory', petInventory_routes_1.default);
app.use('/api/pet/sports-conducted', petSports_routes_1.default);
app.use('/api/wellness', wellness_routes_1.default);
app.use('/api/students', student_routes_1.default);
app.use('/api/language-coaching', languageCoaching_routes_1.default);
app.use('/api/activities', activities_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/schools', school_routes_1.default);
app.use('/api/school-portal', schoolPortal_routes_1.default);
app.use('/api/headmaster/history', schoolHistory_routes_1.default);
app.use('/api/headmaster', headmaster_routes_1.default);
app.use('/api/pages', page_routes_1.default);
app.use('/api/features', feature_routes_1.default);
app.use('/api/superadmin/settings', superadmin_settings_routes_1.default);
app.use('/api/superadmin/integrations', integration_routes_1.default);
app.use('/api/superadmin/admins', superadmin_admins_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/teacher', teacher_routes_1.default);
app.use('/api/parent', parent_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/classes', class_routes_1.default);
app.use('/api/centralized-content', centralContent_routes_1.default);
app.use('/api/celebrations', celebration_routes_1.default);
app.use('/api/social-activities', socialActivities_routes_1.default);
app.use('/api/teacher/cultural-events', culturalEvents_routes_1.default);
app.use('/api/teacher/computer-education', computerEducation_routes_1.default);
app.use('/api/stories', stories_routes_1.default);
app.use('/api/digital-library', digitalLibrary_routes_1.default);
app.use('/api/digital-library-upload', digitalLibraryUpload_routes_1.default);
app.use('/api/personal-guide', personalGuide_routes_1.default);
app.use('/api/neet-prep', neetPrep_routes_1.default);
app.use('/api/competitive-exams', competitiveExams_routes_1.default);
app.use('/api/digital-library/progress', libraryProgress_routes_1.default);
app.use('/api/digital-library/flashcards', flashcards_routes_1.default);
app.use('/api/promotions', promotion_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/science', scienceLabs_routes_1.default);
app.use('/api/timetable', timetable_routes_1.default);
app.use('/api/exam-schedule', examSchedule_routes_1.default);
app.use('/api/student', studyPlanner_routes_1.default);
app.use('/api/superadmin/academics', superadmin_academics_routes_1.default);
app.use('/api/hierarchy', hierarchy_routes_1.default);
app.use('/api/minister', minister_routes_1.default);
app.use('/api/commissioner', commissioner_routes_1.default);
app.use('/api/sslc-prep', sslcPrep_routes_1.default);
app.use('/api/scholarships', scholarship_routes_1.default);
app.use('/api/deo', deo_routes_1.default);
app.use('/api/counsellor', counsellor_routes_1.default);
app.use('/api/mock-tests', mock_tests_routes_1.default);
// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
});
// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[Error]', err.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
});
// ─── Start Server ─────────────────────────────────────────────
let server;
if (!process.env.VERCEL) {
    server = app.listen(port, () => {
        console.log(`\n🚀  TN Schools API → http://localhost:${port}`);
        console.log(`📦  MongoDB   : Atlas Cluster`);
        console.log(`🐘  PostgreSQL: Google Cloud SQL`);
        console.log(`🌍  Env       : ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔒  CORS      : ${allowedOrigins.join(', ')}\n`);
    });
    // ─── Auto-recover from port conflict ─────────────────────────────
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n❌  Port ${port} is still in use. Run: npm run kill\n`);
            process.exit(1);
        }
        else {
            throw err;
        }
    });
    // ─── Graceful shutdown ────────────────────────────────────────────
    process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
        if (server)
            server.close();
        yield prisma_1.prisma.$disconnect();
        process.exit(0);
    }));
    process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
        if (server)
            server.close();
        yield prisma_1.prisma.$disconnect();
        process.exit(0);
    }));
}
exports.default = app; // trigger restart
