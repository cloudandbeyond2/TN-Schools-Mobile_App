import { IntegrationConfig } from '../models/mongo';
import { decryptSecret } from '../utils/secretVault';

// Resolves AI provider keys with the superadmin-managed DB config taking
// precedence over environment variables. Cached for 60s; the integrations
// router invalidates on writes.

const CACHE_TTL_MS = 60_000;

let geminiCache: { key: string | undefined; at: number } | null = null;

export function invalidateAiConfigCache(): void {
  geminiCache = null;
}

/** DB key from the superadmin AI config ('ai:global-gemini'), falling back to GEMINI_API_KEY env. */
export async function getGeminiApiKey(): Promise<string | undefined> {
  if (geminiCache && Date.now() - geminiCache.at < CACHE_TTL_MS) return geminiCache.key;

  let key: string | undefined;
  try {
    const doc = await IntegrationConfig.findOne({ type: 'AI', key: 'ai:global-gemini' });
    if (doc && doc.isEnabled) {
      const secrets: Record<string, string> =
        doc.secrets instanceof Map ? Object.fromEntries(doc.secrets) : (doc.secrets as any) || {};
      if (secrets.apiKey) {
        try {
          key = decryptSecret(secrets.apiKey);
        } catch {
          key = undefined;
        }
      }
    }
  } catch {
    key = undefined;
  }

  if (!key) key = process.env.GEMINI_API_KEY;
  geminiCache = { key, at: Date.now() };
  return key;
}
