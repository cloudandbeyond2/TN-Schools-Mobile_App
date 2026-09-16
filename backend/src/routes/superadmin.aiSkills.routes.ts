import { Router, Request, Response } from 'express';
import { AiSkillConfig, AiTopicUsage } from '../models/mongo';
import { requireRole } from '../middleware/auth.middleware';
import { loadEffectiveSkills, loadEffectiveSkill } from './aiStudio.routes';
import {
  AI_SKILLS,
  SKILL_BY_KEY,
  SKILL_GROUPS,
  SUBJECT_PACKS,
  renderPrompt,
  SubjectPack,
} from '../constants/aiSkills';

// Superadmin control plane for the AI Content Studio skills.
// Same shape as integration.routes.ts / feature.routes.ts.
const router = Router();
router.use(requireRole(['SUPERADMIN']));

/** Full view including prompts — superadmin only, unlike GET /api/ai-studio/skills. */
function toAdminSkill(s: Awaited<ReturnType<typeof loadEffectiveSkill>>) {
  if (!s) return null;
  return {
    key: s.def.key,
    command: s.def.command,
    label: s.def.label,
    description: s.def.description,
    group: s.def.group,
    outputKind: s.def.outputKind,
    icon: s.def.icon,
    accent: s.def.accent,
    preview: s.def.preview,
    inputs: s.def.inputs,
    pushTargets: s.def.pushTargets,

    isEnabled: s.isEnabled,
    classMin: s.classMin,
    classMax: s.classMax,
    model: s.model,
    maxTokens: s.maxTokens,
    tokensUsed: s.tokensUsed || 0,
    totalGenerations: s.totalGenerations || 0,

    // Effective text plus the shipped default, so the UI can show "modified"
    // and offer a meaningful reset.
    basePrompt: s.promptOverride || s.def.basePrompt,
    defaultBasePrompt: s.def.basePrompt,
    isPromptModified: Boolean(s.promptOverride),

    packDirectives: Object.values(SUBJECT_PACKS).reduce((acc, p) => {
      const def = p.kindHints[s.def.outputKind];
      acc[p.key] = {
        label: p.label,
        icon: p.icon,
        value: s.packOverrides[p.key] || def,
        default: def,
        isModified: Boolean(s.packOverrides[p.key]),
      };
      return acc;
    }, {} as Record<string, { label: string; icon: string; value: string; default: string; isModified: boolean }>),

    defaults: {
      model: s.def.defaultModel,
      maxTokens: s.def.defaultMaxTokens,
      classMin: s.def.defaultClassRange[0],
      classMax: s.def.defaultClassRange[1],
    },
    updatedBy: s.updatedBy,
    updatedAt: s.updatedAt,
  };
}

// GET /api/superadmin/ai-skills
router.get('/', async (_req: Request, res: Response) => {
  try {
    const skills = await loadEffectiveSkills();
    res.json({
      success: true,
      count: skills.length,
      data: {
        groups: Object.values(SKILL_GROUPS),
        packs: Object.values(SUBJECT_PACKS).map((p) => ({ key: p.key, label: p.label, icon: p.icon })),
        skills: skills.map((s) => toAdminSkill(s)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/superadmin/ai-skills/bulk — { keys: string[], isEnabled: boolean }
router.put('/bulk', async (req: Request, res: Response) => {
  try {
    const { keys, isEnabled } = req.body || {};
    if (!Array.isArray(keys) || keys.length === 0 || typeof isEnabled !== 'boolean') {
      return res
        .status(400)
        .json({ success: false, error: 'keys array and isEnabled boolean are required' });
    }
    const valid = keys.filter((k: string) => SKILL_BY_KEY[k]);
    await AiSkillConfig.bulkWrite(
      valid.map((key: string) => ({
        updateOne: {
          filter: { key },
          update: { $set: { isEnabled, updatedBy: req.user?.name || req.user?.id } },
          upsert: true,
        },
      }))
    );
    const skills = await loadEffectiveSkills();
    res.json({ success: true, modified: valid.length, data: skills.map((s) => toAdminSkill(s)) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/superadmin/ai-skills/:key
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const def = SKILL_BY_KEY[req.params.key];
    if (!def) return res.status(404).json({ success: false, error: 'Unknown skill' });

    const { isEnabled, classMin, classMax, model, maxTokens, basePrompt, packDirectives } =
      req.body || {};

    const $set: Record<string, unknown> = { updatedBy: req.user?.name || req.user?.id };
    const $unset: Record<string, unknown> = {};

    if (isEnabled !== undefined) $set.isEnabled = isEnabled === true;

    if (classMin !== undefined || classMax !== undefined) {
      const lo = Number(classMin ?? def.defaultClassRange[0]);
      const hi = Number(classMax ?? def.defaultClassRange[1]);
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < 1 || hi > 12 || lo > hi) {
        return res
          .status(400)
          .json({ success: false, error: 'Class range must be between 1 and 12, with min <= max.' });
      }
      $set.classMin = lo;
      $set.classMax = hi;
    }

    if (model !== undefined) {
      if (typeof model !== 'string' || !model.trim()) {
        return res.status(400).json({ success: false, error: 'model must be a non-empty string' });
      }
      $set.modelId = model.trim();
    }

    if (maxTokens !== undefined) {
      const n = Number(maxTokens);
      if (!Number.isFinite(n) || n < 512 || n > 65536) {
        return res
          .status(400)
          .json({ success: false, error: 'maxTokens must be between 512 and 65536.' });
      }
      $set.maxTokens = n;
    }

    // Empty string / null means "revert this field to the shipped default".
    if (basePrompt !== undefined) {
      const text = typeof basePrompt === 'string' ? basePrompt.trim() : '';
      if (!text || text === def.basePrompt.trim()) $unset.promptOverride = '';
      else $set.promptOverride = text;
    }

    if (packDirectives && typeof packDirectives === 'object') {
      for (const [packKey, raw] of Object.entries(packDirectives)) {
        const pack = SUBJECT_PACKS[packKey as SubjectPack];
        if (!pack) continue;
        const shipped = pack.kindHints[def.outputKind];
        const text = typeof raw === 'string' ? raw.trim() : '';
        if (!text || text === shipped.trim()) $unset[`packOverrides.${packKey}`] = '';
        else $set[`packOverrides.${packKey}`] = text;
      }
    }

    await AiSkillConfig.findOneAndUpdate(
      { key: def.key },
      { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) },
      { new: true, upsert: true }
    );

    const updated = await loadEffectiveSkill(def.key);
    res.json({ success: true, data: toAdminSkill(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/superadmin/ai-skills/:key — reset to shipped defaults
router.delete('/:key', async (req: Request, res: Response) => {
  try {
    const def = SKILL_BY_KEY[req.params.key];
    if (!def) return res.status(404).json({ success: false, error: 'Unknown skill' });
    await AiSkillConfig.findOneAndDelete({ key: def.key });
    const reset = await loadEffectiveSkill(def.key);
    res.json({ success: true, data: toAdminSkill(reset) });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/superadmin/ai-skills/:key/preview
// Renders the exact prompt that would be sent, for a sample context. Accepts
// unsaved edits in the body so an admin can see the effect before saving.
router.post('/:key/preview', async (req: Request, res: Response) => {
  try {
    const def = SKILL_BY_KEY[req.params.key];
    if (!def) return res.status(404).json({ success: false, error: 'Unknown skill' });

    const { pack, className, subject, topic, language, extras, basePrompt, packDirective } =
      req.body || {};

    const packKey: SubjectPack = SUBJECT_PACKS[pack as SubjectPack] ? (pack as SubjectPack) : 'GENERAL';
    const stored = await loadEffectiveSkill(def.key);

    const prompt = renderPrompt(
      def,
      packKey,
      {
        className: className || 'Class 10',
        grade: 10,
        subject: subject || SUBJECT_PACKS[packKey].label,
        topic: topic || 'Sample Topic',
        language: language || 'english',
        extras: extras || {},
      },
      {
        basePrompt: basePrompt ?? stored?.promptOverride,
        packDirective: packDirective ?? stored?.packOverrides[packKey],
      }
    );

    res.json({
      success: true,
      data: { prompt, model: stored?.model || def.defaultModel, maxTokens: stored?.maxTokens || def.defaultMaxTokens },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/superadmin/ai-skills/:key/topics — recent topic generations and token usage
router.get('/:key/topics', async (req: Request, res: Response) => {
  try {
    const def = SKILL_BY_KEY[req.params.key];
    if (!def) return res.status(404).json({ success: false, error: 'Unknown skill' });

    const usages = await AiTopicUsage.find({ skillKey: def.key })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: usages,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/superadmin/ai-skills/catalog — registry only, no DB read
router.get('/catalog', async (_req: Request, res: Response) => {
  res.json({ success: true, data: AI_SKILLS.map((s) => ({ key: s.key, command: s.command, label: s.label, group: s.group })) });
});

export default router;
