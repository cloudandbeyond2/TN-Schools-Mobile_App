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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateStorageCache = invalidateStorageCache;
exports.getStorageConfig = getStorageConfig;
exports.uploadBuffer = uploadBuffer;
exports.testConnection = testConnection;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_s3_1 = require("@aws-sdk/client-s3");
const mongo_1 = require("../models/mongo");
const secretVault_1 = require("../utils/secretVault");
const LOCAL_CONFIG = { provider: 'LOCAL', isEnabled: true };
const CACHE_TTL_MS = 60000;
let cached = null;
function invalidateStorageCache() {
    cached = null;
}
function tryDecrypt(blob) {
    if (!blob)
        return undefined;
    try {
        return (0, secretVault_1.decryptSecret)(blob);
    }
    catch (_a) {
        return undefined;
    }
}
function getStorageConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        if (cached && Date.now() - cached.at < CACHE_TTL_MS)
            return cached.config;
        let config = LOCAL_CONFIG;
        try {
            const doc = yield mongo_1.IntegrationConfig.findOne({ type: 'STORAGE', key: 'storage' });
            if (doc && doc.isEnabled && (doc.provider === 'S3' || doc.provider === 'CUSTOM')) {
                const secrets = doc.secrets instanceof Map ? Object.fromEntries(doc.secrets) : doc.secrets || {};
                const cfg = (doc.config || {});
                config = {
                    provider: doc.provider,
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
        }
        catch (_a) {
            // Config DB unavailable — fall back to local disk rather than failing uploads.
            config = LOCAL_CONFIG;
        }
        cached = { config, at: Date.now() };
        return config;
    });
}
function safeFileName(originalName) {
    // basename() strips client-supplied directory components (path traversal)
    const base = path_1.default.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${Date.now()}-${base}`;
}
function buildS3Client(cfg) {
    return new client_s3_1.S3Client({
        region: cfg.region || 'ap-south-1',
        credentials: {
            accessKeyId: cfg.accessKeyId || '',
            secretAccessKey: cfg.secretAccessKey || '',
        },
    });
}
function s3PublicUrl(cfg, key) {
    if (cfg.publicBaseUrl) {
        return `${cfg.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
    }
    return `https://${cfg.bucket}.s3.${cfg.region || 'ap-south-1'}.amazonaws.com/${key}`;
}
function uploadLocal(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const folder = params.folder ? params.folder.replace(/[^a-zA-Z0-9_-]/g, '') : '';
        const uploadDir = path_1.default.join(__dirname, '../../uploads', folder);
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
        const name = safeFileName(params.originalName);
        fs_1.default.writeFileSync(path_1.default.join(uploadDir, name), params.buffer);
        const key = folder ? `${folder}/${name}` : name;
        return { url: `/uploads/${key}`, key, provider: 'LOCAL' };
    });
}
function uploadS3(cfg, params) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = buildS3Client(cfg);
        const key = `${params.folder || 'uploads'}/${safeFileName(params.originalName)}`;
        yield client.send(new client_s3_1.PutObjectCommand({
            Bucket: cfg.bucket,
            Key: key,
            Body: params.buffer,
            ContentType: params.mimeType || 'application/octet-stream',
        }));
        return { url: s3PublicUrl(cfg, key), key, provider: 'S3' };
    });
}
function uploadCustom(cfg, params) {
    return __awaiter(this, void 0, void 0, function* () {
        const base = (cfg.baseUrl || '').replace(/\/+$/, '');
        if (!base)
            throw new Error('Custom storage baseUrl is not configured');
        const form = new FormData();
        form.append('file', new Blob([new Uint8Array(params.buffer)], { type: params.mimeType || 'application/octet-stream' }), path_1.default.basename(params.originalName));
        if (params.folder)
            form.append('folder', params.folder);
        const res = yield fetch(`${base}/upload`, {
            method: 'POST',
            headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : undefined,
            body: form,
        });
        if (!res.ok) {
            throw new Error(`Custom storage upload failed: HTTP ${res.status}`);
        }
        const data = (yield res.json().catch(() => ({})));
        const url = data.url || data.fileUrl;
        if (!url)
            throw new Error('Custom storage server did not return a url');
        return { url, key: data.key || url, provider: 'CUSTOM' };
    });
}
function uploadBuffer(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const cfg = yield getStorageConfig();
        if (cfg.provider === 'S3')
            return uploadS3(cfg, params);
        if (cfg.provider === 'CUSTOM')
            return uploadCustom(cfg, params);
        return uploadLocal(params);
    });
}
function testConnection(cfg) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const started = Date.now();
        try {
            if (cfg.provider === 'S3') {
                if (!cfg.bucket)
                    return { ok: false, message: 'Bucket name is required', latencyMs: 0 };
                const client = buildS3Client(cfg);
                yield client.send(new client_s3_1.HeadBucketCommand({ Bucket: cfg.bucket }));
                return { ok: true, message: `Connected to bucket "${cfg.bucket}"`, latencyMs: Date.now() - started };
            }
            if (cfg.provider === 'CUSTOM') {
                const base = (cfg.baseUrl || '').replace(/\/+$/, '');
                if (!base)
                    return { ok: false, message: 'Base URL is required', latencyMs: 0 };
                const res = yield fetch(base, {
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
            const uploadDir = path_1.default.join(__dirname, '../../uploads');
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
            const probe = path_1.default.join(uploadDir, `.write-test-${Date.now()}`);
            fs_1.default.writeFileSync(probe, 'ok');
            fs_1.default.unlinkSync(probe);
            return { ok: true, message: 'Local uploads directory is writable', latencyMs: Date.now() - started };
        }
        catch (err) {
            const status = (_a = err === null || err === void 0 ? void 0 : err.$metadata) === null || _a === void 0 ? void 0 : _a.httpStatusCode;
            let message;
            if (status === 403 || (err === null || err === void 0 ? void 0 : err.name) === 'CredentialsProviderError') {
                message = 'Authentication failed — check the access key and secret';
            }
            else if (status === 404 || (err === null || err === void 0 ? void 0 : err.name) === 'NotFound') {
                message = 'Bucket not found — check the bucket name';
            }
            else if (status === 301) {
                message = 'Bucket exists in a different region — check the region';
            }
            else if (status === 400) {
                message = 'Request rejected — check the access key format and region';
            }
            else {
                message = String((err === null || err === void 0 ? void 0 : err.message) || err);
            }
            return { ok: false, message, latencyMs: Date.now() - started };
        }
    });
}
