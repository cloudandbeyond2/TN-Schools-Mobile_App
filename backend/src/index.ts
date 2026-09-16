import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv'; // trigger nodemon reload
import { connectMongoDB } from './config/db';
import { prisma } from './config/prisma';
import fs from 'fs';
import path from 'path';

// Route imports
import aiRoutes from './routes/ai.routes';
import aiStudioRoutes from './routes/aiStudio.routes';
import superadminAiSkillsRoutes from './routes/superadmin.aiSkills.routes';
import portfolioRoutes from './routes/portfolio.routes';
import sportsRoutes from './routes/sports.routes';
import petSportsRoutes from './routes/petSports.routes';
import petAwardsRoutes from './routes/petAwards.routes';
import petFitnessRoutes from './routes/petFitness.routes';
import petInventoryRoutes from './routes/petInventory.routes';
import wellnessRoutes from './routes/wellness.routes';
import studentRoutes from './routes/student.routes';
import languageCoachingRoutes from './routes/languageCoaching.routes';
import activitiesRoutes from './routes/activities.routes';
import attendanceRoutes from './routes/attendance.routes';
import schoolRoutes from './routes/school.routes';
import schoolPortalRoutes from './routes/schoolPortal.routes';
import headmasterRoutes from './routes/headmaster.routes';
import schoolHistoryRoutes from './routes/schoolHistory.routes';
import pageRoutes from './routes/page.routes';
import featureRoutes from './routes/feature.routes';
import superadminSettingsRoutes from './routes/superadmin.settings.routes';
import integrationRoutes from './routes/integration.routes';
import superadminAdminsRoutes from './routes/superadmin.admins.routes';
import userRoutes from './routes/user.routes';
import teacherRoutes from './routes/teacher.routes';
import notificationRoutes from './routes/notification.routes';
import classRoutes from './routes/class.routes';
import parentRoutes from './routes/parent.routes';
import centralContentRoutes from './routes/centralContent.routes';
import celebrationRoutes from './routes/celebration.routes';
import socialActivitiesRoutes from './routes/socialActivities.routes';
import culturalEventsRoutes from './routes/culturalEvents.routes';
import computerEducationRoutes from './routes/computerEducation.routes';
import storiesRoutes from './routes/stories.routes';
import digitalLibraryRoutes from './routes/digitalLibrary.routes';
import digitalLibraryUploadRoutes from './routes/digitalLibraryUpload.routes';
import personalGuideRoutes from './routes/personalGuide.routes';
import neetPrepRoutes from './routes/neetPrep.routes';
import competitiveExamsRoutes from './routes/competitiveExams.routes';
import libraryProgressRoutes from './routes/libraryProgress.routes';
import flashcardRoutes from './routes/flashcards.routes';
import promotionRoutes from './routes/promotion.routes';
import analyticsRoutes from './routes/analytics.routes';
import scienceLabsRoutes from './routes/scienceLabs.routes';
import timetableRoutes from './routes/timetable.routes';
import examScheduleRoutes from './routes/examSchedule.routes';
import studyPlannerRoutes from './routes/studyPlanner.routes';
import superadminAcademicsRoutes from './routes/superadmin.academics.routes';
import superadminDashboardRoutes from './routes/superadmin.dashboard.routes';
import hierarchyRoutes from './routes/hierarchy.routes';
import ministerRoutes from './routes/minister.routes';
import commissionerRoutes from './routes/commissioner.routes';
import sslcPrepRoutes from './routes/sslcPrep.routes';
import scholarshipRoutes from './routes/scholarship.routes';
import deoRoutes from './routes/deo.routes';
import counsellorRoutes from './routes/counsellor.routes';
import mockTestsRoutes from './routes/mock-tests.routes';
import announcementRoutes from './routes/announcement.routes';
import materialsRoutes from './routes/materials.routes';
import supportRoutes from './routes/support.routes';
// Trigger nodemon restart after prisma client generation
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

// ─── Vercel Serverless Path Normalization ────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-forwarded-url'] || req.headers['x-invoke-path']) as string | undefined;

  if (req.originalUrl && req.originalUrl !== '/src/index.ts' && !req.originalUrl.startsWith('/src/index.ts?')) {
    req.url = req.originalUrl;
  } else if (matchedPath && matchedPath !== '/src/index.ts' && !matchedPath.startsWith('/src/index.ts?')) {
    req.url = matchedPath;
  } else if (req.url.startsWith('/src/index.ts')) {
    req.url = req.url.replace(/^\/src\/index\.ts/, '') || '/';
  }
  next();
});

// ─── CORS Configuration ──────────────────────────────────────────────
// Define allowed origins based on environment
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://tn-schools.vercel.app",
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
];

const corsOptions: cors.CorsOptions = {
  origin: '*',
  credentials: false, // must be false when origin is '*'
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
    "Cache-Control",
    "Pragma"
  ]
};

app.use(cors(corsOptions));

// Handle all OPTIONS preflight requests immediately so browser preflight never fails or hits 404/401
app.options(/(.*)/, cors(corsOptions));
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ─── Security Headers ────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  frameguard: false,
}));

// ─── Rate Limiting ───────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 999999 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts, please try again later.' },
});
app.use('/api/users/auth', loginLimiter);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 999999 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// ─── Other Middleware ──────────────────────────────────────────────
// Large binary uploads go through multer (with per-route size caps), so JSON
// bodies only need headroom for base64 image payloads used by a few AI flows.
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ limit: '250mb', extended: true }));

import os from 'os';

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, '../uploads');
const tmpUploadsDir = path.join(os.tmpdir(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (error) {
  console.warn('[Warning] Could not create uploads directory (likely running in a read-only environment like Vercel).');
}
try {
  if (!fs.existsSync(tmpUploadsDir)) {
    fs.mkdirSync(tmpUploadsDir, { recursive: true });
  }
} catch {
  // Ignore
}
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(tmpUploadsDir));

// Serve audio cache statically
const audioCacheDir = path.join(__dirname, '../public/audio_cache');
const tmpAudioCacheDir = path.join(os.tmpdir(), 'audio_cache');
try {
  if (!fs.existsSync(audioCacheDir)) {
    fs.mkdirSync(audioCacheDir, { recursive: true });
  }
} catch (error) {
  console.warn('[Warning] Could not create audio_cache directory.');
}
try {
  if (!fs.existsSync(tmpAudioCacheDir)) {
    fs.mkdirSync(tmpAudioCacheDir, { recursive: true });
  }
} catch {
  // Ignore
}
app.use('/audio_cache', cors({ origin: '*' }), express.static(audioCacheDir));
app.use('/audio_cache', cors({ origin: '*' }), express.static(tmpAudioCacheDir));



// ─── Connect Databases ───────────────────────────────────────
connectMongoDB();  // MongoDB Atlas

// ─── Health Check ────────────────────────────────────────────
app.get('/', async (req: Request, res: Response) => {
  let pgStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    pgStatus = 'connected';
  } catch {
    pgStatus = 'disconnected (check POSTGRES_URI in .env)';
  }
  res.json({
    status: 'ok',
    message: 'TN Schools AI Ecosystem API',
    version: '2.0.0-test-deploy',
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
});

import { authenticate } from './middleware/auth.middleware';

// ─── Public API Whitelist ──────────────────────────────────────
const PUBLIC_PATHS = [
  '/',
  '/api/users/auth',
  '/api/users/login',
  '/api/users/student-login',
  '/api/headmaster/seed-excel',
  '/api/features/effective',
  '/api/pages',
];

// ─── Global Authentication Guard (Fail-Closed) ─────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const checkPath = (req.originalUrl || req.url || req.path || '').split('?')[0];
  if (
    checkPath === '/' ||
    checkPath.startsWith('/uploads/') ||
    checkPath.startsWith('/api/portfolio') ||
    checkPath.startsWith('/api/counsellor') ||
    checkPath.startsWith('/api/superadmin/academics') ||
    checkPath.startsWith('/api/centralized-content') ||
    (req.method === 'GET' && (
      checkPath.startsWith('/api/exam-schedule') ||
      checkPath.startsWith('/api/digital-library') ||
      checkPath.startsWith('/api/digital-library-upload') ||
      checkPath.startsWith('/api/timetable') ||
      checkPath.startsWith('/api/students') ||
      checkPath.startsWith('/api/analytics') ||
      checkPath.startsWith('/api/notifications') ||
      checkPath.startsWith('/api/headmaster/model-exams')
    )) ||
    checkPath.startsWith('/api/ai/chat') ||
    checkPath === '/api/ai/chat-tutor' ||
    checkPath === '/api/ai/homework-ideas' ||
    req.method === 'OPTIONS' ||
    PUBLIC_PATHS.includes(checkPath) ||
    PUBLIC_PATHS.includes(req.path)
  ) {
    return next();
  }
  return authenticate(req, res, next);
});

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/ai', aiRoutes);
app.use('/api/ai-studio', aiStudioRoutes);
app.use('/api/superadmin/ai-skills', superadminAiSkillsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/pet/fitness-records', petFitnessRoutes);
app.use('/api/pet/inventory', petInventoryRoutes);
app.use('/api/pet/sports-conducted', petSportsRoutes);
app.use('/api/pet/awards', petAwardsRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/language-coaching', languageCoachingRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/school-portal', schoolPortalRoutes);
app.use('/api/headmaster/history', schoolHistoryRoutes);
app.use('/api/headmaster', headmasterRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/superadmin/settings', superadminSettingsRoutes);
app.use('/api/superadmin/integrations', integrationRoutes);
app.use('/api/superadmin/admins', superadminAdminsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/centralized-content', centralContentRoutes);
app.use('/api/celebrations', celebrationRoutes);
app.use('/api/social-activities', socialActivitiesRoutes);
app.use('/api/teacher/cultural-events', culturalEventsRoutes);
app.use('/api/teacher/computer-education', computerEducationRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/digital-library', digitalLibraryRoutes);
app.use('/api/digital-library-upload', digitalLibraryUploadRoutes);
app.use('/api/personal-guide', personalGuideRoutes);
app.use('/api/neet-prep', neetPrepRoutes);
app.use('/api/competitive-exams', competitiveExamsRoutes);
app.use('/api/digital-library/progress', libraryProgressRoutes);
app.use('/api/digital-library/flashcards', flashcardRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/science', scienceLabsRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/exam-schedule', examScheduleRoutes);
app.use('/api/student', studyPlannerRoutes);
app.use('/api/superadmin/academics', superadminAcademicsRoutes);
app.use('/api/superadmin/dashboard', superadminDashboardRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/minister', ministerRoutes);
app.use('/api/commissioner', commissionerRoutes);
app.use('/api/sslc-prep', sslcPrepRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/deo', deoRoutes);
app.use('/api/counsellor', counsellorRoutes);
app.use('/api/mock-tests', mockTestsRoutes);
app.use('/api/support', supportRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE')) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File size exceeds the 500 MB limit.' });
    }
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }
  console.error('[Error]', err?.message || err);
  res.status(err?.status || 500).json({ success: false, error: err?.message || 'Internal Server Error' });
});

// ─── Start Server ─────────────────────────────────────────────
let server: any;
if (!process.env.VERCEL) {
  server = app.listen(Number(port), '0.0.0.0', () => {
    console.log(`\n🚀  TN Schools API → http://localhost:${port}`);
    console.log(`📱  LAN Access : http://192.168.1.7:${port}  ← use this on real mobile`);
    console.log(`📦  MongoDB   : Atlas Cluster`);
    console.log(`🐘  PostgreSQL: Google Cloud SQL`);
    console.log(`🌍  Env       : ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒  CORS      : ${allowedOrigins.join(', ')}\n`);
  });

  // ─── Auto-recover from port conflict ─────────────────────────────
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌  Port ${port} is still in use. Run: npm run kill\n`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  // ─── Graceful shutdown ────────────────────────────────────────────
  process.on('SIGTERM', async () => {
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default app;// trigger restart
