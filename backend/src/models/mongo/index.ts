import mongoose, { Schema, Document } from 'mongoose';

// AI Tutor Chat Log
export interface IAIChat extends Document {
  studentId: string;
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  subject?: string;
  language: 'tamil' | 'english' | 'bilingual';
  createdAt: Date;
}

const AIChatSchema = new Schema<IAIChat>({
  studentId:  { type: String, required: true, index: true },
  sessionId:  { type: String, required: true },
  messages: [{
    role:      { type: String, enum: ['user', 'assistant'], required: true },
    content:   { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  subject:   { type: String },
  language:  { type: String, enum: ['tamil', 'english', 'bilingual'], default: 'bilingual' },
}, { timestamps: true });

export const AIChat = mongoose.models.AIChat || mongoose.model<IAIChat>('AIChat', AIChatSchema);

// Digital Portfolio
export interface IPortfolio extends Document {
  studentId:  string;
  academics:  Array<{ title: string; grade: string; year: number; }>;
  projects:   Array<{ title: string; description: string; url?: string; }>;
  certificates: Array<{ name: string; issuedBy: string; date: Date; fileUrl?: string; }>;
  achievements: Array<{ title: string; description: string; date: Date; }>;
  digiLockerLinked: boolean;
  updatedAt: Date;
}

const PortfolioSchema = new Schema<IPortfolio>({
  studentId:        { type: String, required: true, unique: true },
  academics:        [{ title: String, grade: String, year: Number }],
  projects:         [{ title: String, description: String, url: String }],
  certificates:     [{ name: String, issuedBy: String, date: Date, fileUrl: String }],
  achievements:     [{ title: String, description: String, date: Date }],
  digiLockerLinked: { type: Boolean, default: false },
}, { timestamps: true });

export const Portfolio = mongoose.models.Portfolio || mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);

// Wellness / Mood Tracking
export interface IWellness extends Document {
  studentId: string;
  mood: 'great' | 'good' | 'okay' | 'stressed' | 'tired';
  stressScore: number;
  notes?: string;
  status?: string;
  counselingReferred: boolean;
  date: Date;
}
const WellnessSchema = new Schema<IWellness>({
  studentId: { type: String, required: true, index: true },

  mood: {
    type: String,
    enum: ['great', 'good', 'okay', 'stressed', 'tired'],
    required: true
  },

  stressScore: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },

  notes: {
    type: String
  },

  status: {
    type: String,
    default: 'PENDING'
  },

  counselingReferred: {
    type: Boolean,
    default: false
  },

  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export const Wellness = mongoose.models.Wellness || mongoose.model<IWellness>('Wellness', WellnessSchema);

// Learning Path
export interface ILearningPath extends Document {
  studentId:      string;
  weakSubjects:   string[];
  weakChapters:   Array<{ subject: string; chapter: string; score: number; }>;
  studyPlan:      Array<{ day: string; tasks: string[]; }>;
  weeklyGoals:    string[];
  updatedAt:      Date;
}

const LearningPathSchema = new Schema<ILearningPath>({
  studentId:    { type: String, required: true, unique: true },
  weakSubjects: [String],
  weakChapters: [{ subject: String, chapter: String, score: Number }],
  studyPlan:    [{ day: String, tasks: [String] }],
  weeklyGoals:  [String],
}, { timestamps: true });

export const LearningPath = mongoose.models.LearningPath || mongoose.model<ILearningPath>('LearningPath', LearningPathSchema);

// ─── Super Admin Dynamic Page Management ──────────────────────

export interface IManagedPage extends Document {
  title: string;
  route: string;
  icon: string;
  roles: string[];
  portal: string;
  isEnabled: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ManagedPageSchema = new Schema<IManagedPage>({
  title: { type: String, required: true },
  route: { type: String, required: true, unique: true },
  icon: { type: String, required: true },
  roles: { type: [String], default: [] },
  portal: { type: String, default: 'STUDENT' },
  isEnabled: { type: Boolean, default: true },
  description: { type: String },
}, { timestamps: true });

export const ManagedPage = mongoose.models.ManagedPage || mongoose.model<IManagedPage>('ManagedPage', ManagedPageSchema);

// ─── AI Personal Guide self-care habits tracking & rewards ──────────

export interface IPersonalGuideHabitLog extends Document {
  studentId: string;
  date: string; // YYYY-MM-DD
  reflectionJournal?: string;
  screenTimeBreak: boolean;
  sleepHours: number;
  pointsEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalGuideHabitLogSchema = new Schema<IPersonalGuideHabitLog>({
  studentId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  reflectionJournal: { type: String },
  screenTimeBreak: { type: Boolean, default: false },
  sleepHours: { type: Number, default: 0 },
  pointsEarned: { type: Number, default: 0 },
}, { timestamps: true });

// Ensure unique habit logging per student per day
PersonalGuideHabitLogSchema.index({ studentId: 1, date: 1 }, { unique: true });

export const PersonalGuideHabitLog = mongoose.models.PersonalGuideHabitLog || mongoose.model<IPersonalGuideHabitLog>('PersonalGuideHabitLog', PersonalGuideHabitLogSchema);

export interface IPersonalGuideReward extends Document {
  studentId: string;
  points: number;
  streak: number;
  badges: string[];
  lastLoggedDate?: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const PersonalGuideRewardSchema = new Schema<IPersonalGuideReward>({
  studentId: { type: String, required: true, unique: true },
  points: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  lastLoggedDate: { type: String },
}, { timestamps: true });

export const PersonalGuideReward = mongoose.models.PersonalGuideReward || mongoose.model<IPersonalGuideReward>('PersonalGuideReward', PersonalGuideRewardSchema);

// Board Prep Progress & Goals
export interface IBoardPrep extends Document {
  studentId: string;
  class: string; // "9" or "10"
  syllabusProgress: Array<{
    subject: string;
    completed: number;
    totalChapters: number;
  }>;
  goals: Array<{
    task: string;
    done: boolean;
  }>;
  targetScore?: number;
  targetAmbition?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BoardPrepSchema = new Schema<IBoardPrep>({
  studentId: { type: String, required: true, index: true },
  class: { type: String, required: true },
  syllabusProgress: [{
    subject: { type: String, required: true },
    completed: { type: Number, required: true },
    totalChapters: { type: Number, required: true }
  }],
  goals: [{
    task: { type: String, required: true },
    done: { type: Boolean, default: false }
  }],
  targetScore: { type: Number },
  targetAmbition: { type: String }
}, { timestamps: true });

BoardPrepSchema.index({ studentId: 1, class: 1 }, { unique: true });

export const BoardPrep = mongoose.models.BoardPrep || mongoose.model<IBoardPrep>('BoardPrep', BoardPrepSchema);

// ─── SSLC Board Preparation Hub (Classes 9 & 10) ───────────────────
// Question papers, subject prep plans, mock tests + attempts and
// AI revision plans. Writes are role-guarded in sslcPrep.routes.ts.

export interface ISSLCQuestionPaper extends Document {
  schoolId?: string; // null/undefined = state-wide paper visible to every school
  class: string; // "9" | "10"
  subject: string;
  year: string; // e.g. "2024"
  paperType: string; // Board | Model | Quarterly | Half-Yearly | Annual
  title: string;
  fileUrl?: string;
  durationMinutes: number;
  maxMarks: number;
  uploadedById?: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

const SSLCQuestionPaperSchema = new Schema<ISSLCQuestionPaper>({
  schoolId:       { type: String, index: true },
  class:          { type: String, required: true, index: true },
  subject:        { type: String, required: true },
  year:           { type: String, required: true },
  paperType:      { type: String, default: 'Board' },
  title:          { type: String, required: true },
  fileUrl:        { type: String },
  durationMinutes:{ type: Number, default: 180 },
  maxMarks:       { type: Number, default: 100 },
  uploadedById:   { type: String },
  uploadedByName: { type: String },
  uploadedByRole: { type: String },
  downloads:      { type: Number, default: 0 },
}, { timestamps: true });

export const SSLCQuestionPaper = mongoose.models.SSLCQuestionPaper || mongoose.model<ISSLCQuestionPaper>('SSLCQuestionPaper', SSLCQuestionPaperSchema);

export interface ISSLCPrepPlan extends Document {
  schoolId: string;
  class: string; // "9" | "10"
  subject: string;
  title: string;
  description?: string;
  teacherId?: string;
  teacherName?: string;
  published: boolean;
  weeks: Array<{
    week: number;
    focus: string;
    topics: string[];
    activities: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const SSLCPrepPlanSchema = new Schema<ISSLCPrepPlan>({
  schoolId:    { type: String, required: true, index: true },
  class:       { type: String, required: true, index: true },
  subject:     { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String },
  teacherId:   { type: String },
  teacherName: { type: String },
  published:   { type: Boolean, default: false },
  weeks: [{
    week:       { type: Number, required: true },
    focus:      { type: String, required: true },
    topics:     { type: [String], default: [] },
    activities: { type: [String], default: [] },
  }],
}, { timestamps: true });

export const SSLCPrepPlan = mongoose.models.SSLCPrepPlan || mongoose.model<ISSLCPrepPlan>('SSLCPrepPlan', SSLCPrepPlanSchema);

export interface ISSLCMockTest extends Document {
  schoolId?: string; // null = available to all schools
  class: string; // "9" | "10"
  subject: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  published: boolean;
  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
  questions: Array<{
    qid: string;
    type: 'mcq' | 'short';
    text: string;
    options: string[];
    answer: string;
    marks: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const SSLCMockTestSchema = new Schema<ISSLCMockTest>({
  schoolId:        { type: String, index: true },
  class:           { type: String, required: true, index: true },
  subject:         { type: String, required: true },
  title:           { type: String, required: true },
  durationMinutes: { type: Number, default: 180 },
  totalMarks:      { type: Number, default: 100 },
  difficulty:      { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  published:       { type: Boolean, default: false },
  createdById:     { type: String },
  createdByName:   { type: String },
  createdByRole:   { type: String },
  questions: [{
    qid:     { type: String, required: true },
    type:    { type: String, enum: ['mcq', 'short'], required: true },
    text:    { type: String, required: true },
    options: { type: [String], default: [] },
    answer:  { type: String, required: true },
    marks:   { type: Number, default: 1 },
  }],
}, { timestamps: true });

export const SSLCMockTest = mongoose.models.SSLCMockTest || mongoose.model<ISSLCMockTest>('SSLCMockTest', SSLCMockTestSchema);

export interface ISSLCMockAttempt extends Document {
  testId: string;
  studentId: string;
  studentName?: string;
  schoolId?: string;
  class: string;
  subject: string;
  testTitle: string;
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  questionCount: number;
  timeTakenSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SSLCMockAttemptSchema = new Schema<ISSLCMockAttempt>({
  testId:           { type: String, required: true, index: true },
  studentId:        { type: String, required: true, index: true },
  studentName:      { type: String },
  schoolId:         { type: String, index: true },
  class:            { type: String, required: true },
  subject:          { type: String, required: true },
  testTitle:        { type: String, required: true },
  answers:          { type: Schema.Types.Mixed, default: {} },
  score:            { type: Number, required: true },
  maxScore:         { type: Number, required: true },
  percentage:       { type: Number, required: true },
  correctCount:     { type: Number, default: 0 },
  questionCount:    { type: Number, default: 0 },
  timeTakenSeconds: { type: Number },
}, { timestamps: true });

export const SSLCMockAttempt = mongoose.models.SSLCMockAttempt || mongoose.model<ISSLCMockAttempt>('SSLCMockAttempt', SSLCMockAttemptSchema);

export interface ISSLCRevisionPlan extends Document {
  studentId: string;
  class: string; // "9" | "10"
  dailyMinutes: number;
  focusAreas: Array<{
    subject: string;
    reason: string;
    priority: 'High' | 'Medium' | 'Low';
    averagePercent: number;
  }>;
  days: Array<{
    day: number;
    subject: string;
    focus: string;
    tasks: Array<{ text: string; done: boolean }>;
  }>;
  source: string; // 'ai'
  createdAt: Date;
  updatedAt: Date;
}

const SSLCRevisionPlanSchema = new Schema<ISSLCRevisionPlan>({
  studentId:    { type: String, required: true, index: true },
  class:        { type: String, required: true },
  dailyMinutes: { type: Number, default: 90 },
  focusAreas: [{
    subject:        { type: String, required: true },
    reason:         { type: String, required: true },
    priority:       { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    averagePercent: { type: Number, default: 0 },
  }],
  days: [{
    day:     { type: Number, required: true },
    subject: { type: String, required: true },
    focus:   { type: String, required: true },
    tasks: [{
      text: { type: String, required: true },
      done: { type: Boolean, default: false },
    }],
  }],
  source: { type: String, default: 'ai' },
}, { timestamps: true });

SSLCRevisionPlanSchema.index({ studentId: 1, class: 1 }, { unique: true });

export const SSLCRevisionPlan = mongoose.models.SSLCRevisionPlan || mongoose.model<ISSLCRevisionPlan>('SSLCRevisionPlan', SSLCRevisionPlanSchema);

// Language Coaching Progress
export interface ILanguageCoachingProgress extends Document {
  studentId: string;
  sentencesSpoken: number;
  newWordsCount: number;
  grammarScore: number;
  recentWords: string[];
  lastWordOfDay: string;
  createdAt: Date;
  updatedAt: Date;
}

const LanguageCoachingProgressSchema = new Schema<ILanguageCoachingProgress>({
  studentId:      { type: String, required: true, unique: true },
  sentencesSpoken:{ type: Number, default: 0 },
  newWordsCount:  { type: Number, default: 0 },
  grammarScore:   { type: Number, default: 80 },
  recentWords:    { type: [String], default: [] },
  lastWordOfDay:  { type: String, default: '' }
}, { timestamps: true });

export const LanguageCoachingProgress = mongoose.models.LanguageCoachingProgress || mongoose.model<ILanguageCoachingProgress>('LanguageCoachingProgress', LanguageCoachingProgressSchema);


// ─── Personal Guide Task & Response Models ────────────────────────────────────

export interface IPersonalGuideTask extends Document {
  teacherId: string;
  studentId: string;
  schoolId: string;
  title: string;
  question: string;
  taskType: 'reflection' | 'goal' | 'question' | 'custom';
  status: 'pending' | 'answered' | 'reviewed';
  dueDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalGuideTaskSchema = new Schema<IPersonalGuideTask>({
  teacherId:  { type: String, required: true, index: true },
  studentId:  { type: String, required: true, index: true },
  schoolId:   { type: String, required: true, index: true },
  title:      { type: String, required: true },
  question:   { type: String, required: true },
  taskType:   { type: String, enum: ['reflection', 'goal', 'question', 'custom'], default: 'question' },
  status:     { type: String, enum: ['pending', 'answered', 'reviewed'], default: 'pending' },
  dueDate:    { type: String },
}, { timestamps: true });

export const PersonalGuideTask = mongoose.models.PersonalGuideTask || mongoose.model<IPersonalGuideTask>('PersonalGuideTask', PersonalGuideTaskSchema);


export interface IMessage {
  sender: 'student' | 'teacher';
  text: string;
  timestamp: Date;
}

export interface IPersonalGuideResponse extends Document {
  taskId: string;
  studentId: string;
  teacherId: string;
  responseText: string;
  teacherFeedback?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  messages?: IMessage[];
}

const PersonalGuideResponseSchema = new Schema<IPersonalGuideResponse>({
  taskId:          { type: String, required: true, index: true },
  studentId:       { type: String, required: true },
  teacherId:       { type: String, required: true },
  responseText:    { type: String, required: true },
  teacherFeedback: { type: String },
  submittedAt:     { type: Date, default: Date.now },
  reviewedAt:      { type: Date },
  messages:        [{
    sender:    { type: String, enum: ['student', 'teacher'], required: true },
    text:      { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
});

export const PersonalGuideResponse = mongoose.models.PersonalGuideResponse || mongoose.model<IPersonalGuideResponse>('PersonalGuideResponse', PersonalGuideResponseSchema);

// ─── Digital Library AI Study Companion Cache ──────────────────────

export interface ILibraryCompanion extends Document {
  resourceId: string;
  summary: string;
  keyPoints: string[];
  formulas: string[];
  mindMap: string;
  examQuestions: Array<{
    question: string;
    answerKey: string;
    marks: number;
  }>;
  flashcards?: Array<{
    id: string;
    front: string;
    back: string;
  }>;
  visualMindMap?: {
    topic: string;
    branches: Array<{
      title: string;
      details: string[];
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LibraryCompanionSchema = new Schema<ILibraryCompanion>({
  resourceId:    { type: String, required: true, unique: true, index: true },
  summary:       { type: String, required: true },
  keyPoints:     { type: [String], default: [] },
  formulas:      { type: [String], default: [] },
  mindMap:       { type: String, default: "" },
  examQuestions: [{
    question:    { type: String, required: true },
    answerKey:   { type: String, required: true },
    marks:       { type: Number, default: 1 }
  }],
  flashcards:    { type: [Schema.Types.Mixed], default: [] },
  visualMindMap: { type: Schema.Types.Mixed, default: null }
}, { timestamps: true });

export const LibraryCompanion = mongoose.models.LibraryCompanion || mongoose.model<ILibraryCompanion>('LibraryCompanion', LibraryCompanionSchema);

// ─── Digital Library Flashcard Bookmarks ───────────────────────────

export interface IFlashcardBookmark extends Document {
  studentId: string;
  resourceId: string;
  flashcardId: string;
  front: string;
  back: string;
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardBookmarkSchema = new Schema<IFlashcardBookmark>({
  studentId:   { type: String, required: true, index: true },
  resourceId:  { type: String, required: true, index: true },
  flashcardId: { type: String, required: true },
  front:       { type: String, required: true },
  back:        { type: String, required: true }
}, { timestamps: true });

// Ensure uniqueness of a bookmark per student per resource per flashcard
FlashcardBookmarkSchema.index({ studentId: 1, resourceId: 1, flashcardId: 1 }, { unique: true });

export const FlashcardBookmark = mongoose.models.FlashcardBookmark || mongoose.model<IFlashcardBookmark>('FlashcardBookmark', FlashcardBookmarkSchema);

// ─── Student Digital Library Learning Progress ─────────────────────

export interface ILibraryProgress extends Document {
  studentId: string;
  resourceId: string;
  resourceTitle: string;
  subject: string;
  type: string;
  lastChapter: string;
  progressPercent: number;
  timeSpentSeconds: number;
  lastOpenedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LibraryProgressSchema = new Schema<ILibraryProgress>({
  studentId:        { type: String, required: true, index: true },
  resourceId:       { type: String, required: true, index: true },
  resourceTitle:    { type: String, required: true },
  subject:          { type: String, required: true },
  type:             { type: String, required: true },
  lastChapter:      { type: String, default: "Summary" },
  progressPercent:  { type: Number, default: 0, min: 0, max: 100 },
  timeSpentSeconds: { type: Number, default: 0 },
  lastOpenedAt:     { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure unique progress tracking per student per resource
LibraryProgressSchema.index({ studentId: 1, resourceId: 1 }, { unique: true });

export const LibraryProgress = mongoose.models.LibraryProgress || mongoose.model<ILibraryProgress>('LibraryProgress', LibraryProgressSchema);

// ─── Counsellor Session Booking ──────────────────────────────────────────────

export interface ICounsellorBooking extends Document {
  studentId: string;
  slot: string;
  topic?: string;
  isAnonymous: boolean;
  status: 'booked' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const CounsellorBookingSchema = new Schema<ICounsellorBooking>({
  studentId:   { type: String, required: true, index: true },
  slot:        { type: String, required: true },
  topic:       { type: String },
  isAnonymous: { type: Boolean, default: false },
  status:      { type: String, enum: ['booked', 'completed', 'cancelled'], default: 'booked' }
}, { timestamps: true });

export const CounsellorBooking = mongoose.models.CounsellorBooking || mongoose.model<ICounsellorBooking>('CounsellorBooking', CounsellorBookingSchema);

export interface ICounsellorSlot extends Document {
  schoolId: string; // To associate slots with a specific school's counsellor
  dayEn: string; // e.g., "Monday"
  dayTa: string; // e.g., "திங்கள்"
  time: string; // e.g., "10:00 AM"
  isBooked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CounsellorSlotSchema = new Schema<ICounsellorSlot>({
  schoolId: { type: String, required: true, index: true },
  dayEn:    { type: String, required: true },
  dayTa:    { type: String, required: true },
  time:     { type: String, required: true },
  isBooked: { type: Boolean, default: false },
}, { timestamps: true });

export const CounsellorSlot = mongoose.models.CounsellorSlot || mongoose.model<ICounsellorSlot>('CounsellorSlot', CounsellorSlotSchema);

// ─── Super Admin Feature / Module Toggles ─────────────────────
// A "feature" is a module with 0–1 routes; enforcement unions this
// with ManagedPage at read time (GET /api/features/effective).

export interface IFeatureModule extends Document {
  key: string;
  name: string;
  icon?: string;
  description?: string;
  category?: string;
  kind: 'FEATURE' | 'MODULE';
  routes: string[];
  portals: Map<string, boolean>;
  isEnabled: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureModuleSchema = new Schema<IFeatureModule>({
  key:         { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  icon:        { type: String },
  description: { type: String },
  category:    { type: String },
  kind:        { type: String, enum: ['FEATURE', 'MODULE'], default: 'MODULE' },
  routes:      { type: [String], default: [] },
  portals:     { type: Map, of: Boolean, default: {} },
  isEnabled:   { type: Boolean, default: true },
  updatedBy:   { type: String },
}, { timestamps: true });

export const FeatureModule = mongoose.models.FeatureModule || mongoose.model<IFeatureModule>('FeatureModule', FeatureModuleSchema);

// ─── Super Admin Integration Configs (storage / AI secrets) ───
// secrets values are AES-256-GCM blobs ("v1:iv:tag:ct") — see utils/secretVault.ts.

export interface IIntegrationConfig extends Document {
  type: 'STORAGE' | 'AI';
  key: string;
  provider: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  secrets: Map<string, string>;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationConfigSchema = new Schema<IIntegrationConfig>({
  type:      { type: String, enum: ['STORAGE', 'AI'], required: true },
  key:       { type: String, required: true, unique: true },
  provider:  { type: String, required: true },
  isEnabled: { type: Boolean, default: false },
  config:    { type: Schema.Types.Mixed, default: {} },
  secrets:   { type: Map, of: String, default: {} },
  updatedBy: { type: String },
}, { timestamps: true });

export const IntegrationConfig = mongoose.models.IntegrationConfig || mongoose.model<IIntegrationConfig>('IntegrationConfig', IntegrationConfigSchema);

// ─── Super Admin Platform Settings (single doc, key 'global') ─

export interface IPlatformSetting extends Document {
  key: string;
  maintenanceMode: boolean;
  allowDemoLogin: boolean;
  enableAiFeatures: boolean;
  enableNotifications: boolean;
  enableBeoPortal: boolean;
  enableDeoPortal: boolean;
  enableCommissionerPortal: boolean;
  enableMinisterPortal: boolean;
  enablePetPortal: boolean;
  sessionTimeout: string;
  maxUploadSize: string;
  defaultLanguage: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSettingSchema = new Schema<IPlatformSetting>({
  key:                      { type: String, required: true, unique: true, default: 'global' },
  maintenanceMode:          { type: Boolean, default: false },
  allowDemoLogin:           { type: Boolean, default: true },
  enableAiFeatures:         { type: Boolean, default: true },
  enableNotifications:      { type: Boolean, default: true },
  enableBeoPortal:          { type: Boolean, default: true },
  enableDeoPortal:          { type: Boolean, default: true },
  enableCommissionerPortal: { type: Boolean, default: true },
  enableMinisterPortal:     { type: Boolean, default: true },
  enablePetPortal:          { type: Boolean, default: true },
  sessionTimeout:           { type: String, default: '30' },
  maxUploadSize:            { type: String, default: '10' },
  defaultLanguage:          { type: String, default: 'English' },
  updatedBy:                { type: String },
}, { timestamps: true });

export const PlatformSetting = mongoose.models.PlatformSetting || mongoose.model<IPlatformSetting>('PlatformSetting', PlatformSettingSchema);

// ─── Saved 3D Model ─

export interface ISaved3DModel extends Document {
  userId: string;
  name: string;
  subject: string;
  color?: string;
  sketchfabUid?: string;
  shapes?: any;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const Saved3DModelSchema = new Schema<ISaved3DModel>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  color: { type: String },
  sketchfabUid: { type: String },
  shapes: { type: Schema.Types.Mixed },
  description: { type: String }
}, { timestamps: true });

export const Saved3DModel = mongoose.models.Saved3DModel || mongoose.model<ISaved3DModel>('Saved3DModel', Saved3DModelSchema);



// ─── AI Content Studio: per-skill superadmin overrides ───────
// Registry defaults live in constants/aiSkills.ts. A doc here overrides them.
// No doc for a key == that skill runs on its declared defaults, so
// "Reset to default" in the superadmin UI is simply a delete.

export interface IAiSkillConfig extends Document {
  key: string;
  isEnabled: boolean;
  classMin?: number;
  classMax?: number;
  /** Named modelId, not model: Mongoose Document already owns `model`. */
  modelId?: string;
  maxTokens?: number;
  tokensUsed?: number;
  totalGenerations?: number;
  /** Replaces AiSkillDef.basePrompt when set. */
  promptOverride?: string;
  /** Per-subject-pack structural directive override, keyed by SubjectPack. */
  packOverrides: Map<string, string>;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AiSkillConfigSchema = new Schema<IAiSkillConfig>({
  key:              { type: String, required: true, unique: true },
  isEnabled:        { type: Boolean, default: true },
  classMin:         { type: Number },
  classMax:         { type: Number },
  modelId:          { type: String },
  maxTokens:        { type: Number },
  tokensUsed:       { type: Number, default: 0 },
  totalGenerations: { type: Number, default: 0 },
  promptOverride:   { type: String },
  packOverrides:    { type: Map, of: String, default: {} },
  updatedBy:        { type: String },
}, { timestamps: true });

export const AiSkillConfig = mongoose.models.AiSkillConfig || mongoose.model<IAiSkillConfig>('AiSkillConfig', AiSkillConfigSchema);

// ─── AI Content Studio: Per-topic token usage audit ───────────
export interface IAiTopicUsage extends Document {
  skillKey: string;
  topic: string;
  subject?: string;
  className?: string;
  section?: string;
  unit?: string;
  promptTokens: number;
  completionTokens: number;
  tokensUsed: number;
  modelId: string;
  userId?: string;
  userName?: string;
  schoolId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AiTopicUsageSchema = new Schema<IAiTopicUsage>({
  skillKey:         { type: String, required: true, index: true },
  topic:            { type: String, required: true, index: true },
  subject:          { type: String },
  className:        { type: String },
  section:          { type: String },
  unit:             { type: String },
  promptTokens:     { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  tokensUsed:       { type: Number, default: 0 },
  modelId:          { type: String },
  userId:           { type: String, index: true },
  userName:         { type: String },
  schoolId:         { type: String },
}, { timestamps: true });

AiTopicUsageSchema.index({ skillKey: 1, createdAt: -1 });

export const AiTopicUsage = mongoose.models.AiTopicUsage || mongoose.model<IAiTopicUsage>('AiTopicUsage', AiTopicUsageSchema);

// ─── System Announcements Model ───────────────
export interface IAnnouncement extends Document {
  title: string;
  body: string;
  priority: 'info' | 'warning' | 'critical';
  target: 'All' | 'Student' | 'Teacher' | 'Parent' | 'Headmaster' | 'BEO' | 'DEO' | 'Commissioner' | 'Minister';
  createdBy: string;
  expiresAt?: Date;
  status: 'active' | 'scheduled' | 'expired';
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>({
  title:     { type: String, required: true },
  body:      { type: String, required: true },
  priority:  { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  target:    { type: String, required: true, default: 'All' },
  createdBy: { type: String, default: 'Super Admin' },
  expiresAt: { type: Date },
  status:    { type: String, enum: ['active', 'scheduled', 'expired'], default: 'active' },
  views:     { type: Number, default: 0 },
}, { timestamps: true });

export const Announcement = mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

// ─── Learning Materials Model ───────────────
export interface ILearningMaterial extends Document {
  title: string;
  type: 'PDF' | 'Video' | 'Slides' | 'Audio' | 'Image';
  subject: string;
  class: string;
  chapter: string;
  portal: 'Student' | 'Teacher' | 'Parent' | 'Headmaster' | 'All';
  size: string;
  uploadedBy: string;
  status: 'active' | 'draft' | 'archived';
  aiTagged: boolean;
  fileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LearningMaterialSchema = new Schema<ILearningMaterial>({
  title: { type: String, required: true },
  type: { type: String, enum: ['PDF', 'Video', 'Slides', 'Audio', 'Image'], default: 'PDF' },
  subject: { type: String, required: true },
  class: { type: String, required: true },
  chapter: { type: String, default: '—' },
  portal: { type: String, default: 'Student' },
  size: { type: String, default: '1.5 MB' },
  uploadedBy: { type: String, default: 'Super Admin' },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  aiTagged: { type: Boolean, default: false },
  fileUrl: { type: String },
}, { timestamps: true });

export const LearningMaterial = mongoose.models.LearningMaterial || mongoose.model<ILearningMaterial>('LearningMaterial', LearningMaterialSchema);


// ─── Help & Support Requests ──────────────────────────────────
// Submitted from the /support page. POST is role-aware (captures the
// logged-in user when a token is present); listing/updating is admin-only.

export interface ISupportRequest extends Document {
  name: string;
  contact?: string;            // email or mobile the user wants a reply on
  category: string;
  message: string;
  userId?: string;             // captured from the auth token when present
  role?: string;               // reporter's role at submission time
  schoolId?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const SupportRequestSchema = new Schema<ISupportRequest>({
  name:     { type: String, required: true },
  contact:  { type: String },
  category: { type: String, default: 'Other' },
  message:  { type: String, required: true },
  userId:   { type: String, index: true },
  role:     { type: String },
  schoolId: { type: String, index: true },
  status:   { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
}, { timestamps: true });

export const SupportRequest = mongoose.models.SupportRequest || mongoose.model<ISupportRequest>('SupportRequest', SupportRequestSchema);
