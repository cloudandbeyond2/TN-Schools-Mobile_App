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
const mongo_1 = require("../models/mongo");
const auth_middleware_1 = require("../middleware/auth.middleware");
const secretVault_1 = require("../utils/secretVault");
const storage_service_1 = require("../services/storage.service");
const aiConfig_service_1 = require("../services/aiConfig.service");
// Superadmin-only integration configs: external storage + AI services.
// Secrets are stored encrypted and only ever returned masked.
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireRole)(['SUPERADMIN']));
const STORAGE_SECRET_FIELDS = ['accessKeyId', 'secretAccessKey', 'apiKey'];
function secretsToObject(secrets) {
    if (secrets instanceof Map)
        return Object.fromEntries(secrets);
    if (secrets && typeof secrets === 'object')
        return secrets;
    return {};
}
function maskedSecrets(doc) {
    const stored = secretsToObject(doc === null || doc === void 0 ? void 0 : doc.secrets);
    const out = {};
    for (const [k, blob] of Object.entries(stored)) {
        out[k] = (0, secretVault_1.maskStoredSecret)(blob);
    }
    return out;
}
/** Merge submitted secrets over stored ones: masked/empty values keep the stored blob. */
function mergeSecrets(stored, submitted, allowedFields) {
    const merged = Object.assign({}, stored);
    if (!submitted)
        return merged;
    for (const field of allowedFields) {
        const value = submitted[field];
        if (value === undefined || value === null || value === '')
            continue;
        if ((0, secretVault_1.isMaskedValue)(value))
            continue; // unchanged in the UI
        merged[field] = (0, secretVault_1.encryptSecret)(String(value));
    }
    return merged;
}
// ─── Storage ──────────────────────────────────────────────────
// GET /api/superadmin/integrations/storage
router.get('/storage', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doc = yield mongo_1.IntegrationConfig.findOne({ type: 'STORAGE', key: 'storage' });
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/superadmin/integrations/storage
router.put('/storage', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { provider, isEnabled, config, secrets } = req.body;
        if (provider && !['LOCAL', 'S3', 'CUSTOM'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'provider must be LOCAL, S3, or CUSTOM' });
        }
        const existing = yield mongo_1.IntegrationConfig.findOne({ type: 'STORAGE', key: 'storage' });
        const mergedSecrets = mergeSecrets(secretsToObject(existing === null || existing === void 0 ? void 0 : existing.secrets), secrets, STORAGE_SECRET_FIELDS);
        const doc = yield mongo_1.IntegrationConfig.findOneAndUpdate({ type: 'STORAGE', key: 'storage' }, {
            $set: {
                type: 'STORAGE',
                key: 'storage',
                provider: provider || (existing === null || existing === void 0 ? void 0 : existing.provider) || 'LOCAL',
                isEnabled: isEnabled !== undefined ? isEnabled === true : (_a = existing === null || existing === void 0 ? void 0 : existing.isEnabled) !== null && _a !== void 0 ? _a : false,
                config: config !== undefined ? config : (existing === null || existing === void 0 ? void 0 : existing.config) || {},
                secrets: mergedSecrets,
                updatedBy: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id),
            },
        }, { upsert: true, new: true });
        (0, storage_service_1.invalidateStorageCache)();
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/superadmin/integrations/storage/test — test candidate or saved config.
// Masked/omitted secrets in the body are resolved from the stored doc.
router.post('/storage/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { provider, config, secrets } = req.body;
        const existing = yield mongo_1.IntegrationConfig.findOne({ type: 'STORAGE', key: 'storage' });
        const stored = secretsToObject(existing === null || existing === void 0 ? void 0 : existing.secrets);
        const resolveSecret = (field) => {
            const submitted = secrets === null || secrets === void 0 ? void 0 : secrets[field];
            if (submitted && !(0, secretVault_1.isMaskedValue)(submitted))
                return String(submitted);
            const blob = stored[field];
            if (!blob)
                return undefined;
            try {
                return (0, secretVault_1.decryptSecret)(blob);
            }
            catch (_a) {
                return undefined;
            }
        };
        const cfg = (config || (existing === null || existing === void 0 ? void 0 : existing.config) || {});
        const candidate = {
            provider: provider || (existing === null || existing === void 0 ? void 0 : existing.provider) || 'LOCAL',
            isEnabled: true,
            region: cfg.region,
            bucket: cfg.bucket,
            publicBaseUrl: cfg.publicBaseUrl,
            baseUrl: cfg.baseUrl,
            accessKeyId: resolveSecret('accessKeyId'),
            secretAccessKey: resolveSecret('secretAccessKey'),
            apiKey: resolveSecret('apiKey'),
        };
        const result = yield (0, storage_service_1.testConnection)(candidate);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// ─── AI services ──────────────────────────────────────────────
// GET /api/superadmin/integrations/ai — all AI service configs, keys masked
router.get('/ai', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docs = yield mongo_1.IntegrationConfig.find({ type: 'AI' }).sort({ key: 1 });
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// PUT /api/superadmin/integrations/ai/:key — upsert one AI service config
router.put('/ai/:key', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const key = `ai:${req.params.key}`;
        const { provider, isEnabled, config, secrets } = req.body;
        const existing = yield mongo_1.IntegrationConfig.findOne({ type: 'AI', key });
        const mergedSecrets = mergeSecrets(secretsToObject(existing === null || existing === void 0 ? void 0 : existing.secrets), secrets, ['apiKey']);
        const doc = yield mongo_1.IntegrationConfig.findOneAndUpdate({ type: 'AI', key }, {
            $set: {
                type: 'AI',
                key,
                provider: provider || (existing === null || existing === void 0 ? void 0 : existing.provider) || 'GEMINI',
                isEnabled: isEnabled !== undefined ? isEnabled === true : (_a = existing === null || existing === void 0 ? void 0 : existing.isEnabled) !== null && _a !== void 0 ? _a : true,
                config: config !== undefined ? config : (existing === null || existing === void 0 ? void 0 : existing.config) || {},
                secrets: mergedSecrets,
                updatedBy: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id),
            },
        }, { upsert: true, new: true });
        (0, aiConfig_service_1.invalidateAiConfigCache)();
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// DELETE /api/superadmin/integrations/ai/:key
router.delete('/ai/:key', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield mongo_1.IntegrationConfig.findOneAndDelete({ type: 'AI', key: `ai:${req.params.key}` });
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'AI service config not found' });
        }
        (0, aiConfig_service_1.invalidateAiConfigCache)();
        res.json({ success: true, message: 'Deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
// POST /api/superadmin/integrations/ai/:key/test — probe the provider with the
// stored (or submitted) key. The key never leaves the backend.
router.post('/ai/:key/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const key = `ai:${req.params.key}`;
        const existing = yield mongo_1.IntegrationConfig.findOne({ type: 'AI', key });
        let apiKey;
        const submitted = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.secrets) === null || _b === void 0 ? void 0 : _b.apiKey;
        if (submitted && !(0, secretVault_1.isMaskedValue)(submitted)) {
            apiKey = String(submitted);
        }
        else {
            const stored = secretsToObject(existing === null || existing === void 0 ? void 0 : existing.secrets);
            if (stored.apiKey) {
                try {
                    apiKey = (0, secretVault_1.decryptSecret)(stored.apiKey);
                }
                catch (_e) {
                    apiKey = undefined;
                }
            }
        }
        const provider = ((_c = req.body) === null || _c === void 0 ? void 0 : _c.provider) || (existing === null || existing === void 0 ? void 0 : existing.provider) || 'GEMINI';
        // Gemini services without their own key fall back to the global key
        // (DB 'ai:global-gemini', then GEMINI_API_KEY env) — same as runtime.
        if (!apiKey && provider === 'GEMINI') {
            apiKey = yield (0, aiConfig_service_1.getGeminiApiKey)();
        }
        if (!apiKey) {
            return res.json({ success: true, data: { ok: false, message: 'No API key configured', latencyMs: 0 } });
        }
        const started = Date.now();
        let probe;
        if (provider === 'OPENAI') {
            probe = yield fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
        }
        else {
            probe = yield fetch('https://generativelanguage.googleapis.com/v1beta/models', {
                headers: { 'x-goog-api-key': apiKey },
            });
        }
        const latencyMs = Date.now() - started;
        if (probe.ok) {
            return res.json({ success: true, data: { ok: true, message: `${provider} key is valid`, latencyMs } });
        }
        const body = yield probe.text().catch(() => '');
        let message = `${provider} returned HTTP ${probe.status}`;
        try {
            const parsed = JSON.parse(body);
            if ((_d = parsed === null || parsed === void 0 ? void 0 : parsed.error) === null || _d === void 0 ? void 0 : _d.message)
                message += `: ${parsed.error.message}`;
        }
        catch (_f) {
            /* keep the status-only message */
        }
        res.json({ success: true, data: { ok: false, message, latencyMs } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
}));
exports.default = router;
