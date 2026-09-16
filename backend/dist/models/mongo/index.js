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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Saved3DModel = exports.PlatformSetting = exports.IntegrationConfig = exports.FeatureModule = exports.CounsellorSlot = exports.CounsellorBooking = exports.LibraryProgress = exports.FlashcardBookmark = exports.LibraryCompanion = exports.PersonalGuideResponse = exports.PersonalGuideTask = exports.LanguageCoachingProgress = exports.SSLCRevisionPlan = exports.SSLCMockAttempt = exports.SSLCMockTest = exports.SSLCPrepPlan = exports.SSLCQuestionPaper = exports.BoardPrep = exports.PersonalGuideReward = exports.PersonalGuideHabitLog = exports.ManagedPage = exports.LearningPath = exports.Wellness = exports.Portfolio = exports.AIChat = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AIChatSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    messages: [{
            role: { type: String, enum: ['user', 'assistant'], required: true },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
        }],
    subject: { type: String },
    language: { type: String, enum: ['tamil', 'english', 'bilingual'], default: 'bilingual' },
}, { timestamps: true });
exports.AIChat = mongoose_1.default.models.AIChat || mongoose_1.default.model('AIChat', AIChatSchema);
const PortfolioSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, unique: true },
    academics: [{ title: String, grade: String, year: Number }],
    projects: [{ title: String, description: String, url: String }],
    certificates: [{ name: String, issuedBy: String, date: Date, fileUrl: String }],
    achievements: [{ title: String, description: String, date: Date }],
    digiLockerLinked: { type: Boolean, default: false },
}, { timestamps: true });
exports.Portfolio = mongoose_1.default.models.Portfolio || mongoose_1.default.model('Portfolio', PortfolioSchema);
const WellnessSchema = new mongoose_1.Schema({
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
    counselingReferred: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });
exports.Wellness = mongoose_1.default.models.Wellness || mongoose_1.default.model('Wellness', WellnessSchema);
const LearningPathSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, unique: true },
    weakSubjects: [String],
    weakChapters: [{ subject: String, chapter: String, score: Number }],
    studyPlan: [{ day: String, tasks: [String] }],
    weeklyGoals: [String],
}, { timestamps: true });
exports.LearningPath = mongoose_1.default.models.LearningPath || mongoose_1.default.model('LearningPath', LearningPathSchema);
const ManagedPageSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    route: { type: String, required: true, unique: true },
    icon: { type: String, required: true },
    roles: { type: [String], default: [] },
    portal: { type: String, default: 'STUDENT' },
    isEnabled: { type: Boolean, default: true },
    description: { type: String },
}, { timestamps: true });
exports.ManagedPage = mongoose_1.default.models.ManagedPage || mongoose_1.default.model('ManagedPage', ManagedPageSchema);
const PersonalGuideHabitLogSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    reflectionJournal: { type: String },
    screenTimeBreak: { type: Boolean, default: false },
    sleepHours: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
}, { timestamps: true });
// Ensure unique habit logging per student per day
PersonalGuideHabitLogSchema.index({ studentId: 1, date: 1 }, { unique: true });
exports.PersonalGuideHabitLog = mongoose_1.default.models.PersonalGuideHabitLog || mongoose_1.default.model('PersonalGuideHabitLog', PersonalGuideHabitLogSchema);
const PersonalGuideRewardSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    lastLoggedDate: { type: String },
}, { timestamps: true });
exports.PersonalGuideReward = mongoose_1.default.models.PersonalGuideReward || mongoose_1.default.model('PersonalGuideReward', PersonalGuideRewardSchema);
const BoardPrepSchema = new mongoose_1.Schema({
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
exports.BoardPrep = mongoose_1.default.models.BoardPrep || mongoose_1.default.model('BoardPrep', BoardPrepSchema);
const SSLCQuestionPaperSchema = new mongoose_1.Schema({
    schoolId: { type: String, index: true },
    class: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    year: { type: String, required: true },
    paperType: { type: String, default: 'Board' },
    title: { type: String, required: true },
    fileUrl: { type: String },
    durationMinutes: { type: Number, default: 180 },
    maxMarks: { type: Number, default: 100 },
    uploadedById: { type: String },
    uploadedByName: { type: String },
    uploadedByRole: { type: String },
    downloads: { type: Number, default: 0 },
}, { timestamps: true });
exports.SSLCQuestionPaper = mongoose_1.default.models.SSLCQuestionPaper || mongoose_1.default.model('SSLCQuestionPaper', SSLCQuestionPaperSchema);
const SSLCPrepPlanSchema = new mongoose_1.Schema({
    schoolId: { type: String, required: true, index: true },
    class: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    teacherId: { type: String },
    teacherName: { type: String },
    published: { type: Boolean, default: false },
    weeks: [{
            week: { type: Number, required: true },
            focus: { type: String, required: true },
            topics: { type: [String], default: [] },
            activities: { type: [String], default: [] },
        }],
}, { timestamps: true });
exports.SSLCPrepPlan = mongoose_1.default.models.SSLCPrepPlan || mongoose_1.default.model('SSLCPrepPlan', SSLCPrepPlanSchema);
const SSLCMockTestSchema = new mongoose_1.Schema({
    schoolId: { type: String, index: true },
    class: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    durationMinutes: { type: Number, default: 180 },
    totalMarks: { type: Number, default: 100 },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    published: { type: Boolean, default: false },
    createdById: { type: String },
    createdByName: { type: String },
    createdByRole: { type: String },
    questions: [{
            qid: { type: String, required: true },
            type: { type: String, enum: ['mcq', 'short'], required: true },
            text: { type: String, required: true },
            options: { type: [String], default: [] },
            answer: { type: String, required: true },
            marks: { type: Number, default: 1 },
        }],
}, { timestamps: true });
exports.SSLCMockTest = mongoose_1.default.models.SSLCMockTest || mongoose_1.default.model('SSLCMockTest', SSLCMockTestSchema);
const SSLCMockAttemptSchema = new mongoose_1.Schema({
    testId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    studentName: { type: String },
    schoolId: { type: String, index: true },
    class: { type: String, required: true },
    subject: { type: String, required: true },
    testTitle: { type: String, required: true },
    answers: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    correctCount: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number },
}, { timestamps: true });
exports.SSLCMockAttempt = mongoose_1.default.models.SSLCMockAttempt || mongoose_1.default.model('SSLCMockAttempt', SSLCMockAttemptSchema);
const SSLCRevisionPlanSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, index: true },
    class: { type: String, required: true },
    dailyMinutes: { type: Number, default: 90 },
    focusAreas: [{
            subject: { type: String, required: true },
            reason: { type: String, required: true },
            priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
            averagePercent: { type: Number, default: 0 },
        }],
    days: [{
            day: { type: Number, required: true },
            subject: { type: String, required: true },
            focus: { type: String, required: true },
            tasks: [{
                    text: { type: String, required: true },
                    done: { type: Boolean, default: false },
                }],
        }],
    source: { type: String, default: 'ai' },
}, { timestamps: true });
SSLCRevisionPlanSchema.index({ studentId: 1, class: 1 }, { unique: true });
exports.SSLCRevisionPlan = mongoose_1.default.models.SSLCRevisionPlan || mongoose_1.default.model('SSLCRevisionPlan', SSLCRevisionPlanSchema);
const LanguageCoachingProgressSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, unique: true },
    sentencesSpoken: { type: Number, default: 0 },
    newWordsCount: { type: Number, default: 0 },
    grammarScore: { type: Number, default: 80 },
    recentWords: { type: [String], default: [] },
    lastWordOfDay: { type: String, default: '' }
}, { timestamps: true });
exports.LanguageCoachingProgress = mongoose_1.default.models.LanguageCoachingProgress || mongoose_1.default.model('LanguageCoachingProgress', LanguageCoachingProgressSchema);
const PersonalGuideTaskSchema = new mongoose_1.Schema({
    teacherId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    schoolId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    question: { type: String, required: true },
    taskType: { type: String, enum: ['reflection', 'goal', 'question', 'custom'], default: 'question' },
    status: { type: String, enum: ['pending', 'answered', 'reviewed'], default: 'pending' },
    dueDate: { type: String },
}, { timestamps: true });
exports.PersonalGuideTask = mongoose_1.default.models.PersonalGuideTask || mongoose_1.default.model('PersonalGuideTask', PersonalGuideTaskSchema);
const PersonalGuideResponseSchema = new mongoose_1.Schema({
    taskId: { type: String, required: true, index: true },
    studentId: { type: String, required: true },
    teacherId: { type: String, required: true },
    responseText: { type: String, required: true },
    teacherFeedback: { type: String },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
});
exports.PersonalGuideResponse = mongoose_1.default.models.PersonalGuideResponse || mongoose_1.default.model('PersonalGuideResponse', PersonalGuideResponseSchema);
const LibraryCompanionSchema = new mongoose_1.Schema({
    resourceId: { type: String, required: true, unique: true, index: true },
    summary: { type: String, required: true },
    keyPoints: { type: [String], default: [] },
    formulas: { type: [String], default: [] },
    mindMap: { type: String, default: "" },
    examQuestions: [{
            question: { type: String, required: true },
            answerKey: { type: String, required: true },
            marks: { type: Number, default: 1 }
        }],
    flashcards: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    visualMindMap: { type: mongoose_1.Schema.Types.Mixed, default: null }
}, { timestamps: true });
exports.LibraryCompanion = mongoose_1.default.models.LibraryCompanion || mongoose_1.default.model('LibraryCompanion', LibraryCompanionSchema);
const FlashcardBookmarkSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, index: true },
    resourceId: { type: String, required: true, index: true },
    flashcardId: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true }
}, { timestamps: true });
// Ensure uniqueness of a bookmark per student per resource per flashcard
FlashcardBookmarkSchema.index({ studentId: 1, resourceId: 1, flashcardId: 1 }, { unique: true });
exports.FlashcardBookmark = mongoose_1.default.models.FlashcardBookmark || mongoose_1.default.model('FlashcardBookmark', FlashcardBookmarkSchema);
const LibraryProgressSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, index: true },
    resourceId: { type: String, required: true, index: true },
    resourceTitle: { type: String, required: true },
    subject: { type: String, required: true },
    type: { type: String, required: true },
    lastChapter: { type: String, default: "Summary" },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    timeSpentSeconds: { type: Number, default: 0 },
    lastOpenedAt: { type: Date, default: Date.now }
}, { timestamps: true });
// Ensure unique progress tracking per student per resource
LibraryProgressSchema.index({ studentId: 1, resourceId: 1 }, { unique: true });
exports.LibraryProgress = mongoose_1.default.models.LibraryProgress || mongoose_1.default.model('LibraryProgress', LibraryProgressSchema);
const CounsellorBookingSchema = new mongoose_1.Schema({
    studentId: { type: String, required: true, index: true },
    slot: { type: String, required: true },
    topic: { type: String },
    isAnonymous: { type: Boolean, default: false },
    status: { type: String, enum: ['booked', 'completed', 'cancelled'], default: 'booked' }
}, { timestamps: true });
exports.CounsellorBooking = mongoose_1.default.models.CounsellorBooking || mongoose_1.default.model('CounsellorBooking', CounsellorBookingSchema);
const CounsellorSlotSchema = new mongoose_1.Schema({
    schoolId: { type: String, required: true, index: true },
    dayEn: { type: String, required: true },
    dayTa: { type: String, required: true },
    time: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
}, { timestamps: true });
exports.CounsellorSlot = mongoose_1.default.models.CounsellorSlot || mongoose_1.default.model('CounsellorSlot', CounsellorSlotSchema);
const FeatureModuleSchema = new mongoose_1.Schema({
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    icon: { type: String },
    description: { type: String },
    category: { type: String },
    kind: { type: String, enum: ['FEATURE', 'MODULE'], default: 'MODULE' },
    routes: { type: [String], default: [] },
    portals: { type: Map, of: Boolean, default: {} },
    isEnabled: { type: Boolean, default: true },
    updatedBy: { type: String },
}, { timestamps: true });
exports.FeatureModule = mongoose_1.default.models.FeatureModule || mongoose_1.default.model('FeatureModule', FeatureModuleSchema);
const IntegrationConfigSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['STORAGE', 'AI'], required: true },
    key: { type: String, required: true, unique: true },
    provider: { type: String, required: true },
    isEnabled: { type: Boolean, default: false },
    config: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    secrets: { type: Map, of: String, default: {} },
    updatedBy: { type: String },
}, { timestamps: true });
exports.IntegrationConfig = mongoose_1.default.models.IntegrationConfig || mongoose_1.default.model('IntegrationConfig', IntegrationConfigSchema);
const PlatformSettingSchema = new mongoose_1.Schema({
    key: { type: String, required: true, unique: true, default: 'global' },
    maintenanceMode: { type: Boolean, default: false },
    allowDemoLogin: { type: Boolean, default: true },
    enableAiFeatures: { type: Boolean, default: true },
    enableNotifications: { type: Boolean, default: true },
    sessionTimeout: { type: String, default: '30' },
    maxUploadSize: { type: String, default: '10' },
    defaultLanguage: { type: String, default: 'English' },
    updatedBy: { type: String },
}, { timestamps: true });
exports.PlatformSetting = mongoose_1.default.models.PlatformSetting || mongoose_1.default.model('PlatformSetting', PlatformSettingSchema);
const Saved3DModelSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    color: { type: String },
    sketchfabUid: { type: String },
    shapes: { type: mongoose_1.Schema.Types.Mixed },
    description: { type: String }
}, { timestamps: true });
exports.Saved3DModel = mongoose_1.default.models.Saved3DModel || mongoose_1.default.model('Saved3DModel', Saved3DModelSchema);
