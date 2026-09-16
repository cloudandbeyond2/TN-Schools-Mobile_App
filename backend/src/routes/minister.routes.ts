import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

// ─── GET /api/minister/kpis ───────────────────────────────────────────────────
router.get('/kpis', async (_req: Request, res: Response) => {
  try {
    const kpis = await prisma.ministerKPI.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: kpis });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/minister/budget ─────────────────────────────────────────────────
router.get('/budget', async (_req: Request, res: Response) => {
  try {
    const budget = await prisma.ministerBudget.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: budget });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/minister/schemes ────────────────────────────────────────────────
router.get('/schemes', async (_req: Request, res: Response) => {
  try {
    const schemes = await prisma.ministerScheme.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: schemes });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/minister/grievances ────────────────────────────────────────────
router.get('/grievances', async (_req: Request, res: Response) => {
  try {
    const grievances = await prisma.ministerGrievance.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: grievances });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/minister/infrastructure ────────────────────────────────────────
router.get('/infrastructure', async (_req: Request, res: Response) => {
  try {
    const projects = await prisma.ministerInfrastructureProject.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/minister/policy ─────────────────────────────────────────────────
router.get('/policy', async (_req: Request, res: Response) => {
  try {
    const policies = await prisma.ministerPolicyBrief.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: policies });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/minister/predictions ───────────────────────────────────────────
router.get('/predictions', async (_req: Request, res: Response) => {
  try {
    const predictions = await prisma.ministerPrediction.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: predictions });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── GET /api/minister/media ──────────────────────────────────────────────────
router.get('/media', async (_req: Request, res: Response) => {
  try {
    const media = await prisma.ministerMedia.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: media });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
