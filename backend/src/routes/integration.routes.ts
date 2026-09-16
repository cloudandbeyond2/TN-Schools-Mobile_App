import { Router, Request, Response } from 'express';
import { IntegrationConfig } from '../models/mongo';
import { requireRole } from '../middleware/auth.middleware';
import { encryptSecret, isMaskedValue, maskStoredSecret, decryptSecret } from '../utils/secretVault';
import { invalidateStorageCache, testConnection, ResolvedStorageConfig } from '../services/storage.service';
import { invalidateAiConfigCache, getGeminiApiKey } from '../services/aiConfig.service';

// Superadmin-only integration configs: external storage + AI services.
// Secrets are stored encrypted and only ever returned masked.
const router = Router();

router.use(requireRole(['SUPERADMIN']));

const STORAGE_SECRET_FIELDS = ['accessKeyId', 'secretAccessKey', 'apiKey'] as const;

function secretsToObject(secrets: unknown): Record<string, string> {
  if (secrets instanceof Map) return Object.fromEntries(secrets);
  if (secrets && typeof secrets === 'object') return secrets as Record<string, string>;
  return {};
}

function maskedSecrets(doc: { secrets?: unknown } | null): Record<string, string> {
  const stored = secretsToObject(doc?.secrets);
  const out: Record<string, string> = {};
  for (const [k, blob] of Object.entries(stored)) {
    out[k] = maskStoredSecret(blob);
  }
  return out;
}

/** Merge submitted secrets over stored ones: masked/empty values keep the stored blob. */
function mergeSecrets(
  stored: Record<string, string>,
  submitted: Record<string, unknown> | undefined,
  allowedFields: readonly string[]
): Record<string, string> {
  const merged: Record<string, string> = { ...stored };
  if (!submitted) return merged;
  for (const field of allowedFields) {
    const value = submitted[field];
    if (value === undefined || value === null || value === '') continue;
    if (isMaskedValue(value)) continue; // unchanged in the UI
    merged[field] = encryptSecret(String(value));
  }
  return merged;
}

// ─── Storage ──────────────────────────────────────────────────

// GET /api/superadmin/integrations/storage
router.get('/storage', async (_req: Request, res: Response) => {
  try {
    const doc = await IntegrationConfig.findOne({ type: 'STORAGE', key: 'storage' });
    if (!doc) {
      return res.json({
        success: true,
        data: { provider: 'LOCAL', isEnabled: false, config: {}, secrets: {} },
      });
    }
    res.json({
      success: true,
      data: {
        provider: doc.provider,
        isEnabled: doc.isEnabled,
        config: doc.config || {},
        secrets: maskedSecrets(doc),
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/superadmin/integrations/storage
router.put('/storage', async (req: Request, res: Response) => {
  try {
    const { provider, isEnabled, config, secrets } = req.body;
    if (provider && !['LOCAL', 'S3', 'CUSTOM'].includes(provider)) {
      return res.status(400).json({ success: false, error: 'provider must be LOCAL, S3, or CUSTOM' });
    }

    const existing = await IntegrationConfig.findOne({ type: 'STORAGE', key: 'storage' });
    const mergedSecrets = mergeSecrets(secretsToObject(existing?.secrets), secrets, STORAGE_SECRET_FIELDS);

    const doc = await IntegrationConfig.findOneAndUpdate(
      { type: 'STORAGE', key: 'storage' },
      {
        $set: {
          type: 'STORAGE',
          key: 'storage',
          provider: provider || existing?.provider || 'LOCAL',
          isEnabled: isEnabled !== undefined ? isEnabled === true : existing?.isEnabled ?? false,
          config: config !== undefined ? config : existing?.config || {},
          secrets: mergedSecrets,
          updatedBy: req.user?.name || req.user?.id,
        },
      },
      { upsert: true, new: true }
    );

    invalidateStorageCache();
    res.json({
      success: true,
      data: {
        provider: doc.provider,
        isEnabled: doc.isEnabled,
        config: doc.config || {},
        secrets: maskedSecrets(doc),
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/superadmin/integrations/storage/test — test candidate or saved config.
// Masked/omitted secrets in the body are resolved from the stored doc.
router.post('/storage/test', async (req: Request, res: Response) => {
  try {
    const { provider, config, secrets } = req.body;
    const existing = await IntegrationConfig.findOne({ type: 'STORAGE', key: 'storage' });
    const stored = secretsToObject(existing?.secrets);

    const resolveSecret = (field: string): string | undefined => {
      const submitted = secrets?.[field];
      if (submitted && !isMaskedValue(submitted)) return String(submitted);
      const blob = stored[field];
      if (!blob) return undefined;
      try {
        return decryptSecret(blob);
      } catch {
        return undefined;
      }
    };

    const cfg = (config || existing?.config || {}) as Record<string, string>;
    const candidate: ResolvedStorageConfig = {
      provider: provider || existing?.provider || 'LOCAL',
      isEnabled: true,
      region: cfg.region,
      bucket: cfg.bucket,
      publicBaseUrl: cfg.publicBaseUrl,
      baseUrl: cfg.baseUrl,
      accessKeyId: resolveSecret('accessKeyId'),
      secretAccessKey: resolveSecret('secretAccessKey'),
      apiKey: resolveSecret('apiKey'),
    };

    const result = await testConnection(candidate);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── AI services ──────────────────────────────────────────────

// GET /api/superadmin/integrations/ai — all AI service configs, keys masked
router.get('/ai', async (_req: Request, res: Response) => {
  try {
    const docs = await IntegrationConfig.find({ type: 'AI' }).sort({ key: 1 });
    res.json({
      success: true,
      count: docs.length,
      data: docs.map((doc) => ({
        key: doc.key.replace(/^ai:/, ''),
        provider: doc.provider,
        isEnabled: doc.isEnabled,
        config: doc.config || {},
        secrets: maskedSecrets(doc),
        updatedAt: doc.updatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/superadmin/integrations/ai/:key — upsert one AI service config
router.put('/ai/:key', async (req: Request, res: Response) => {
  try {
    const key = `ai:${req.params.key}`;
    const { provider, isEnabled, config, secrets } = req.body;

    const existing = await IntegrationConfig.findOne({ type: 'AI', key });
    const mergedSecrets = mergeSecrets(secretsToObject(existing?.secrets), secrets, ['apiKey']);

    const doc = await IntegrationConfig.findOneAndUpdate(
      { type: 'AI', key },
      {
        $set: {
          type: 'AI',
          key,
          provider: provider || existing?.provider || 'GEMINI',
          isEnabled: isEnabled !== undefined ? isEnabled === true : existing?.isEnabled ?? true,
          config: config !== undefined ? config : existing?.config || {},
          secrets: mergedSecrets,
          updatedBy: req.user?.name || req.user?.id,
        },
      },
      { upsert: true, new: true }
    );

    invalidateAiConfigCache();
    res.json({
      success: true,
      data: {
        key: doc.key.replace(/^ai:/, ''),
        provider: doc.provider,
        isEnabled: doc.isEnabled,
        config: doc.config || {},
        secrets: maskedSecrets(doc),
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/superadmin/integrations/ai/:key
router.delete('/ai/:key', async (req: Request, res: Response) => {
  try {
    const deleted = await IntegrationConfig.findOneAndDelete({ type: 'AI', key: `ai:${req.params.key}` });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'AI service config not found' });
    }
    invalidateAiConfigCache();
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/superadmin/integrations/ai/:key/test — probe the provider with the
// stored (or submitted) key. The key never leaves the backend.
router.post('/ai/:key/test', async (req: Request, res: Response) => {
  try {
    const key = `ai:${req.params.key}`;
    const existing = await IntegrationConfig.findOne({ type: 'AI', key });

    let apiKey: string | undefined;
    const submitted = req.body?.secrets?.apiKey;
    if (submitted && !isMaskedValue(submitted)) {
      apiKey = String(submitted);
    } else {
      const stored = secretsToObject(existing?.secrets);
      if (stored.apiKey) {
        try {
          apiKey = decryptSecret(stored.apiKey);
        } catch {
          apiKey = undefined;
        }
      }
    }
    const provider = req.body?.provider || existing?.provider || 'GEMINI';

    // Gemini services without their own key fall back to the global key
    // (DB 'ai:global-gemini', then GEMINI_API_KEY env) — same as runtime.
    if (!apiKey && provider === 'GEMINI') {
      apiKey = await getGeminiApiKey();
    }
    if (!apiKey) {
      return res.json({ success: true, data: { ok: false, message: 'No API key configured', latencyMs: 0 } });
    }
    const started = Date.now();
    let probe: globalThis.Response;
    if (provider === 'OPENAI') {
      probe = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    } else {
      probe = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': apiKey },
      });
    }
    const latencyMs = Date.now() - started;

    if (probe.ok) {
      return res.json({ success: true, data: { ok: true, message: `${provider} key is valid`, latencyMs } });
    }
    const body = await probe.text().catch(() => '');
    let message = `${provider} returned HTTP ${probe.status}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error?.message) message += `: ${parsed.error.message}`;
    } catch {
      /* keep the status-only message */
    }
    res.json({ success: true, data: { ok: false, message, latencyMs } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
