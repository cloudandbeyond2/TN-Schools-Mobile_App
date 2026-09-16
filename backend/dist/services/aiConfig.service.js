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
exports.invalidateAiConfigCache = invalidateAiConfigCache;
exports.getGeminiApiKey = getGeminiApiKey;
const mongo_1 = require("../models/mongo");
const secretVault_1 = require("../utils/secretVault");
// Resolves AI provider keys with the superadmin-managed DB config taking
// precedence over environment variables. Cached for 60s; the integrations
// router invalidates on writes.
const CACHE_TTL_MS = 60000;
let geminiCache = null;
function invalidateAiConfigCache() {
    geminiCache = null;
}
/** DB key from the superadmin AI config ('ai:global-gemini'), falling back to GEMINI_API_KEY env. */
function getGeminiApiKey() {
    return __awaiter(this, void 0, void 0, function* () {
        if (geminiCache && Date.now() - geminiCache.at < CACHE_TTL_MS)
            return geminiCache.key;
        let key;
        try {
            const doc = yield mongo_1.IntegrationConfig.findOne({ type: 'AI', key: 'ai:global-gemini' });
            if (doc && doc.isEnabled) {
                const secrets = doc.secrets instanceof Map ? Object.fromEntries(doc.secrets) : doc.secrets || {};
                if (secrets.apiKey) {
                    try {
                        key = (0, secretVault_1.decryptSecret)(secrets.apiKey);
                    }
                    catch (_a) {
                        key = undefined;
                    }
                }
            }
        }
        catch (_b) {
            key = undefined;
        }
        if (!key)
            key = process.env.GEMINI_API_KEY;
        geminiCache = { key, at: Date.now() };
        return key;
    });
}
