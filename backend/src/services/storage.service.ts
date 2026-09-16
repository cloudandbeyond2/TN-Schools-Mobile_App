import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { IntegrationConfig } from '../models/mongo';
import { decryptSecret } from '../utils/secretVault';

// Central upload abstraction. Upload routes call uploadBuffer() and never
// care which provider is active. Provider config lives in the Mongo
// IntegrationConfig doc with key 'storage' (managed via
// /api/superadmin/integrations/storage); secrets are AES-256-GCM encrypted.

export interface ResolvedStorageConfig {
  provider: 'LOCAL' | 'S3' | 'CUSTOM';
  isEnabled: boolean;
  region?: string;
  bucket?: string;
  publicBaseUrl?: string;
  baseUrl?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  apiKey?: string;
}

const LOCAL_CONFIG: ResolvedStorageConfig = { provider: 'LOCAL', isEnabled: true };
const CACHE_TTL_MS = 60_000;

let cached: { config: ResolvedStorageConfig; at: number } | null = null;

export function invalidateStorageCache(): void {
  cached = null;
}

function tryDecrypt(blob: string | undefined): string | undefined {
  if (!blob) return undefined;
  try {
    return decryptSecret(blob);
  } catch {
    return undefined;
  }
}

export async function getStorageConfig(): Promise<ResolvedStorageConfig> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.config;

  let config = LOCAL_CONFIG;
  try {
    const doc = await IntegrationConfig.findOne({ type: 'STORAGE', key: 'storage' });
    if (doc && doc.isEnabled && (doc.provider === 'S3' || doc.provider === 'CUSTOM')) {
      const secrets: Record<string, string> =
        doc.secrets instanceof Map ? Object.fromEntries(doc.secrets) : (doc.secrets as any) || {};
      const cfg = (doc.config || {}) as Record<string, string>;
      config = {
        provider: doc.provider as 'S3' | 'CUSTOM',
        isEnabled: true,
        region: cfg.region,
        bucket: cfg.bucket,
        publicBaseUrl: cfg.publicBaseUrl,
        baseUrl: cfg.baseUrl,
        accessKeyId: tryDecrypt(secrets.accessKeyId),
        secretAccessKey: tryDecrypt(secrets.secretAccessKey),
        apiKey: tryDecrypt(secrets.apiKey),
      };
    }
  } catch {
    // Config DB unavailable — fall back to local disk rather than failing uploads.
    config = LOCAL_CONFIG;
  }

  cached = { config, at: Date.now() };
  return config;
}

export interface UploadParams {
  buffer: Buffer;
  originalName: string;
  mimeType?: string;
  folder?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  provider: ResolvedStorageConfig['provider'];
}

function safeFileName(originalName: string): string {
  // basename() strips client-supplied directory components (path traversal)
  const base = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}-${base}`;
}

function buildS3Client(cfg: ResolvedStorageConfig): S3Client {
  return new S3Client({
    region: cfg.region || 'ap-south-1',
    credentials: {
      accessKeyId: cfg.accessKeyId || '',
      secretAccessKey: cfg.secretAccessKey || '',
    },
  });
}

function s3PublicUrl(cfg: ResolvedStorageConfig, key: string): string {
  if (cfg.publicBaseUrl) {
    return `${cfg.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
  }
  return `https://${cfg.bucket}.s3.${cfg.region || 'ap-south-1'}.amazonaws.com/${key}`;
}

async function uploadLocal(params: UploadParams): Promise<UploadResult> {
  const folder = params.folder ? params.folder.replace(/[^a-zA-Z0-9_-]/g, '') : '';
  const uploadDir = path.join(__dirname, '../../uploads', folder);
  fs.mkdirSync(uploadDir, { recursive: true });
  const name = safeFileName(params.originalName);
  fs.writeFileSync(path.join(uploadDir, name), params.buffer);
  const key = folder ? `${folder}/${name}` : name;
  return { url: `/uploads/${key}`, key, provider: 'LOCAL' };
}

async function uploadS3(cfg: ResolvedStorageConfig, params: UploadParams): Promise<UploadResult> {
  const client = buildS3Client(cfg);
  const key = `${params.folder || 'uploads'}/${safeFileName(params.originalName)}`;
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.mimeType || 'application/octet-stream',
    })
  );
  return { url: s3PublicUrl(cfg, key), key, provider: 'S3' };
}

async function uploadCustom(cfg: ResolvedStorageConfig, params: UploadParams): Promise<UploadResult> {
  const base = (cfg.baseUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('Custom storage baseUrl is not configured');

  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(params.buffer)], { type: params.mimeType || 'application/octet-stream' }),
    path.basename(params.originalName)
  );
  if (params.folder) form.append('folder', params.folder);

  const res = await fetch(`${base}/upload`, {
    method: 'POST',
    headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Custom storage upload failed: HTTP ${res.status}`);
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string; fileUrl?: string; key?: string };
  const url = data.url || data.fileUrl;
  if (!url) throw new Error('Custom storage server did not return a url');
  return { url, key: data.key || url, provider: 'CUSTOM' };
}

export async function uploadBuffer(params: UploadParams): Promise<UploadResult> {
  const cfg = await getStorageConfig();
  if (cfg.provider === 'S3') return uploadS3(cfg, params);
  if (cfg.provider === 'CUSTOM') return uploadCustom(cfg, params);
  return uploadLocal(params);
}

export interface TestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
}

export async function testConnection(cfg: ResolvedStorageConfig): Promise<TestResult> {
  const started = Date.now();
  try {
    if (cfg.provider === 'S3') {
      if (!cfg.bucket) return { ok: false, message: 'Bucket name is required', latencyMs: 0 };
      const client = buildS3Client(cfg);
      await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
      return { ok: true, message: `Connected to bucket "${cfg.bucket}"`, latencyMs: Date.now() - started };
    }
    if (cfg.provider === 'CUSTOM') {
      const base = (cfg.baseUrl || '').replace(/\/+$/, '');
      if (!base) return { ok: false, message: 'Base URL is required', latencyMs: 0 };
      const res = await fetch(base, {
        method: 'GET',
        headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : undefined,
      });
      return {
        ok: res.ok,
        message: res.ok ? `Server reachable (HTTP ${res.status})` : `Server returned HTTP ${res.status}`,
        latencyMs: Date.now() - started,
      };
    }
    // LOCAL: confirm the uploads directory is writable
    const uploadDir = path.join(__dirname, '../../uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    const probe = path.join(uploadDir, `.write-test-${Date.now()}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return { ok: true, message: 'Local uploads directory is writable', latencyMs: Date.now() - started };
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode;
    let message: string;
    if (status === 403 || err?.name === 'CredentialsProviderError') {
      message = 'Authentication failed — check the access key and secret';
    } else if (status === 404 || err?.name === 'NotFound') {
      message = 'Bucket not found — check the bucket name';
    } else if (status === 301) {
      message = 'Bucket exists in a different region — check the region';
    } else if (status === 400) {
      message = 'Request rejected — check the access key format and region';
    } else {
      message = String(err?.message || err);
    }
    return { ok: false, message, latencyMs: Date.now() - started };
  }
}
