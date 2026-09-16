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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const router = (0, express_1.Router)();
// ─── GET /api/minister/kpis ───────────────────────────────────────────────────
router.get('/kpis', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const kpis = yield prisma_1.prisma.ministerKPI.findMany({ orderBy: { id: 'asc' } });
        res.json({ success: true, data: kpis });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/minister/budget ─────────────────────────────────────────────────
router.get('/budget', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const budget = yield prisma_1.prisma.ministerBudget.findMany({ orderBy: { id: 'asc' } });
        res.json({ success: true, data: budget });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/minister/schemes ────────────────────────────────────────────────
router.get('/schemes', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const schemes = yield prisma_1.prisma.ministerScheme.findMany({ orderBy: { id: 'asc' } });
        res.json({ success: true, data: schemes });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/minister/grievances ────────────────────────────────────────────
router.get('/grievances', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const grievances = yield prisma_1.prisma.ministerGrievance.findMany({ orderBy: { id: 'asc' } });
        res.json({ success: true, data: grievances });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/minister/infrastructure ────────────────────────────────────────
router.get('/infrastructure', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projects = yield prisma_1.prisma.ministerInfrastructureProject.findMany({ orderBy: { id: 'asc' } });
        res.json({ success: true, data: projects });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/minister/policy ─────────────────────────────────────────────────
router.get('/policy', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const policies = yield prisma_1.prisma.ministerPolicyBrief.findMany({ orderBy: { id: 'asc' } });
        res.json({ success: true, data: policies });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/minister/predictions ───────────────────────────────────────────
router.get('/predictions', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const predictions = yield prisma_1.prisma.ministerPrediction.findMany({ orderBy: { id: 'asc' } });
        res.json({ success: true, data: predictions });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── GET /api/minister/media ──────────────────────────────────────────────────
router.get('/media', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const media = yield prisma_1.prisma.ministerMedia.findMany({ orderBy: { id: 'asc' } });
        res.json({ success: true, data: media });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
