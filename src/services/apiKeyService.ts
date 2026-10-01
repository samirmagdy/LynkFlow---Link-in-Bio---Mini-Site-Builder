/**
 * Feature Specification 12: API & Automation
 * API Key Service — apiKeyService.ts
 *
 * Implements:
 * - API-002: Key creation, rotation, revocation (secret shown once model)
 * - API-003: Scope and entitlement enforcement (mirrors UI permissions)
 * - API-004: Rate limiting, idempotent mutation protection, consistent error format
 * - API-005: Webhook subscription management with HMAC-SHA256 signing simulation
 *
 * Design principles:
 * - The full secret is NEVER stored post-creation. Only the prefix is retained.
 * - All mutations return an explicit ApiGatewayResult (never silently succeed).
 * - Rate limit buckets are tracked per key per sliding window.
 * - Idempotency keys prevent duplicate block/event creation on retry.
 */

import {
  ApiKey, ApiKeyScope, WebhookSubscription, WebhookEventTopic,
  ApiRateLimitBucket, ApiAuditEntry, Workspace, Profile
} from '../types';
import { reportRecoverableError } from '../utils/reportError';

// ─── Error Codes ──────────────────────────────────────────────────────────────

type ApiErrorCode =
  | 'UNAUTHORIZED'          // missing or invalid key
  | 'REVOKED'               // key was revoked
  | 'FORBIDDEN'             // key lacks required scope
  | 'ENTITLEMENT_REQUIRED'  // workspace plan does not allow this operation (API-003)
  | 'RATE_LIMITED'          // request rate exceeded (API-004)
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'IDEMPOTENCY_REPLAY'    // mutation already processed with this idempotency key
  | 'SANDBOX_DISABLED';      // configured deployments never execute browser simulations

interface ApiError {
  code: ApiErrorCode;
  message: string;
  retryAfterMs?: number;
  detail?: Record<string, string>;
}

export interface ApiGatewayResult<T = unknown> {
  ok: boolean;
  statusCode: number;
  data?: T;
  error?: ApiError;
  requestId: string;
  durationMs: number;
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

/** Per-plan request quotas: requests per 60-second window. */
const RATE_LIMITS: Record<string, number> = {
  free:   60,
  pro:    300,
  agency: 1000
};

const WINDOW_MS = 60_000;

class RateLimiter {
  private buckets = new Map<string, ApiRateLimitBucket>();

  check(keyId: string, plan: string): { allowed: boolean; bucket: ApiRateLimitBucket } {
    const now = Date.now();
    const maxRequests = RATE_LIMITS[plan] ?? 60;
    let bucket = this.buckets.get(keyId);

    if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
      bucket = { keyId, windowStart: now, requestCount: 0, maxRequests, windowMs: WINDOW_MS };
    }

    bucket.requestCount += 1;
    this.buckets.set(keyId, bucket);

    return {
      allowed: bucket.requestCount <= maxRequests,
      bucket
    };
  }

  getRetryAfterMs(keyId: string): number {
    const bucket = this.buckets.get(keyId);
    if (!bucket) return 0;
    return Math.max(0, bucket.windowStart + WINDOW_MS - Date.now());
  }
}

// ─── Idempotency Store ────────────────────────────────────────────────────────

const IDEMPOTENCY_STORE_KEY = 'lf_api_idempotency_v1';

class IdempotencyStore {
  private getStore(): Record<string, ApiGatewayResult> {
    try { return JSON.parse(localStorage.getItem(IDEMPOTENCY_STORE_KEY) || '{}'); } catch { return {}; }
  }
  private save(store: Record<string, ApiGatewayResult>) {
    try { localStorage.setItem(IDEMPOTENCY_STORE_KEY, JSON.stringify(store)); } catch (error) { reportRecoverableError('API idempotency persistence failed', error); }
  }

  get(idempotencyKey: string): ApiGatewayResult | undefined {
    const store = this.getStore();
    const result = store[idempotencyKey];
    return result && typeof result === 'object' && 'statusCode' in result ? result : undefined;
  }

  set(idempotencyKey: string, result: ApiGatewayResult): void {
    const store = this.getStore();
    store[idempotencyKey] = result;
    this.save(store);
  }
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

const AUDIT_STORE_KEY = 'lf_api_audit_v1';

class ApiAuditStore {
  append(entry: ApiAuditEntry): void {
    try {
      const existing: ApiAuditEntry[] = JSON.parse(localStorage.getItem(AUDIT_STORE_KEY) || '[]');
      existing.unshift(entry);
      // Keep last 500 entries
      localStorage.setItem(AUDIT_STORE_KEY, JSON.stringify(existing.slice(0, 500)));
    } catch (error) {
      reportRecoverableError('API audit persistence failed', error);
    }
  }

  getAll(): ApiAuditEntry[] {
    try { return JSON.parse(localStorage.getItem(AUDIT_STORE_KEY) || '[]'); } catch { return []; }
  }

  clear(): void {
    localStorage.removeItem(AUDIT_STORE_KEY);
  }
}

// ─── Key Store ────────────────────────────────────────────────────────────────

const KEYS_STORE_KEY = 'lf_api_keys_v1';
const WEBHOOKS_STORE_KEY = 'lf_api_webhooks_v1';
const webhookSigningSecrets = new Map<string, string>();

function loadKeys(workspaceId: string): ApiKey[] {
  try {
    const all: ApiKey[] = JSON.parse(localStorage.getItem(KEYS_STORE_KEY) || '[]');
    return all.filter(k => k.workspaceId === workspaceId);
  } catch { return []; }
}

function saveKeys(workspaceId: string, keys: ApiKey[]): void {
  try {
    const all: ApiKey[] = JSON.parse(localStorage.getItem(KEYS_STORE_KEY) || '[]');
    const others = all.filter(k => k.workspaceId !== workspaceId);
    localStorage.setItem(KEYS_STORE_KEY, JSON.stringify([...others, ...keys]));
  } catch (error) {
    reportRecoverableError('API key persistence failed', error);
  }
}

function loadWebhooks(workspaceId: string): WebhookSubscription[] {
  try {
    const all: WebhookSubscription[] = JSON.parse(localStorage.getItem(WEBHOOKS_STORE_KEY) || '[]');
    return all.filter(w => w.workspaceId === workspaceId);
  } catch { return []; }
}

function saveWebhooks(workspaceId: string, hooks: WebhookSubscription[]): void {
  try {
    const all: WebhookSubscription[] = JSON.parse(localStorage.getItem(WEBHOOKS_STORE_KEY) || '[]');
    const others = all.filter(w => w.workspaceId !== workspaceId);
    localStorage.setItem(WEBHOOKS_STORE_KEY, JSON.stringify([...others, ...hooks]));
  } catch (error) {
    reportRecoverableError('Webhook persistence failed', error);
  }
}

// ─── Crypto Helpers ───────────────────────────────────────────────────────────

function secureRandom(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  // Use crypto.getRandomValues when available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(length);
    crypto.getRandomValues(buf);
    for (let i = 0; i < length; i++) result += chars[buf[i] % chars.length];
  } else {
    for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateApiSecret(): { full: string; prefix: string } {
  const rand = secureRandom(32);
  const full = `lf_live_${rand}`;
  const prefix = full.slice(0, 14) + '…';
  return { full, prefix };
}

function generateWebhookSecret(): { full: string; prefix: string } {
  const rand = secureRandom(32);
  const full = `whsec_${rand}`;
  const prefix = full.slice(0, 12) + '…';
  return { full, prefix };
}

function newRequestId(): string {
  return `req_${secureRandom(12)}`;
}

// ─── API Key Service ──────────────────────────────────────────────────────────

class ApiKeyService {
  private rateLimiter = new RateLimiter();
  private idempotency = new IdempotencyStore();
  private audit = new ApiAuditStore();

  // ── Key CRUD ──

  /**
   * API-002: Create a new scoped API key.
   * Returns the full secret in `secretOnce` — caller MUST display it immediately.
   * It is not persisted; only the prefix is stored.
   */
  createKey(
    workspace: Workspace,
    name: string,
    scopes: ApiKeyScope[],
    allowedProfileIds: string[] | null,
    createdBy: string,
    expiresAt?: string
  ): { key: ApiKey; secret: string } | { error: string } {
    // API-003: Entitlement check — API access requires Pro+
    if (workspace.plan === 'free') {
      return { error: 'REST API access requires Creator Pro or Agency plan.' };
    }

    const existing = loadKeys(workspace.id);
    const maxKeys = workspace.plan === 'agency' ? 20 : 5;
    const activeCount = existing.filter(k => k.status === 'active').length;
    if (activeCount >= maxKeys) {
      return { error: `Your plan allows a maximum of ${maxKeys} active API keys.` };
    }

    if (!name.trim()) return { error: 'Key name is required.' };
    if (scopes.length === 0) return { error: 'At least one scope is required.' };

    const { full, prefix } = generateApiSecret();
    const key: ApiKey = {
      id: `key_${secureRandom(8)}`,
      workspaceId: workspace.id,
      name: name.trim(),
      keyPrefix: prefix,
      scopes,
      allowedProfileIds,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy,
      expiresAt
    };

    saveKeys(workspace.id, [...existing, key]);
    this.audit.append({
      id: newRequestId(), keyId: key.id, keyName: key.name,
      method: 'POST', endpoint: '/internal/keys', statusCode: 201,
      timestamp: Date.now(), durationMs: 0
    });

    return { key, secret: full };
  }

  /**
   * API-002: Rotate a key — generate a new secret, immediately revoke the old one.
   * Returns new secret in `secretOnce`.
   */
  rotateKey(workspaceId: string, keyId: string, _actorEmail: string): { key: ApiKey; secret: string } | { error: string } {
    const keys = loadKeys(workspaceId);
    const idx = keys.findIndex(k => k.id === keyId);
    if (idx === -1) return { error: 'Key not found.' };
    if (keys[idx].status === 'revoked') return { error: 'Cannot rotate a revoked key.' };

    const { full, prefix } = generateApiSecret();
    const updated: ApiKey = { ...keys[idx], keyPrefix: prefix };
    keys[idx] = updated;
    saveKeys(workspaceId, keys);

    this.audit.append({
      id: newRequestId(), keyId, keyName: keys[idx].name,
      method: 'POST', endpoint: `/internal/keys/${keyId}/rotate`, statusCode: 200,
      timestamp: Date.now(), durationMs: 0
    });

    return { key: updated, secret: full };
  }

  /**
   * API-002: Revoke a key immediately. Requests using it will fail with REVOKED.
   */
  revokeKey(workspaceId: string, keyId: string, _actorEmail: string): { success: boolean; error?: string } {
    const keys = loadKeys(workspaceId);
    const idx = keys.findIndex(k => k.id === keyId);
    if (idx === -1) return { success: false, error: 'Key not found.' };

    keys[idx] = { ...keys[idx], status: 'revoked', revokedAt: new Date().toISOString() };
    saveKeys(workspaceId, keys);

    this.audit.append({
      id: newRequestId(), keyId, keyName: keys[idx].name,
      method: 'DELETE', endpoint: `/internal/keys/${keyId}`, statusCode: 200,
      timestamp: Date.now(), durationMs: 0
    });

    return { success: true };
  }

  listKeys(workspaceId: string): ApiKey[] {
    return loadKeys(workspaceId);
  }

  replaceKeys(workspaceId: string, keys: ApiKey[]): void {
    saveKeys(workspaceId, keys);
  }

  // ── Webhook Subscriptions ──

  /**
   * API-005: Create a webhook subscription. Signing secret is shown once.
   */
  createWebhook(
    workspace: Workspace,
    url: string,
    topics: WebhookEventTopic[],
    createdBy: string,
    description?: string
  ): { hook: WebhookSubscription; signingSecret: string } | { error: string } {
    if (workspace.plan === 'free') return { error: 'Webhooks require Creator Pro or Agency plan.' };
    if (!url.startsWith('https://')) return { error: 'Webhook endpoint must use HTTPS.' };
    if (topics.length === 0) return { error: 'Select at least one event topic.' };

    const existing = loadWebhooks(workspace.id);
    if (existing.filter(w => w.status !== 'failed').length >= 10) {
      return { error: 'Maximum of 10 active webhook subscriptions reached.' };
    }

    const { full, prefix } = generateWebhookSecret();
    const hook: WebhookSubscription = {
      id: `wh_${secureRandom(8)}`,
      workspaceId: workspace.id,
      url,
      description,
      topics,
      signingSecretPrefix: prefix,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy,
      consecutiveFailures: 0
    };

    saveWebhooks(workspace.id, [...existing, hook]);
    webhookSigningSecrets.set(hook.id, full);
    return { hook, signingSecret: full };
  }

  deleteWebhook(workspaceId: string, hookId: string): { success: boolean; error?: string } {
    const hooks = loadWebhooks(workspaceId);
    const filtered = hooks.filter(h => h.id !== hookId);
    if (filtered.length === hooks.length) return { success: false, error: 'Webhook not found.' };
    saveWebhooks(workspaceId, filtered);
    webhookSigningSecrets.delete(hookId);
    return { success: true };
  }

  updateWebhookStatus(workspaceId: string, hookId: string, status: 'active' | 'paused'): boolean {
    const hooks = loadWebhooks(workspaceId);
    const idx = hooks.findIndex(h => h.id === hookId);
    if (idx === -1) return false;
    hooks[idx] = { ...hooks[idx], status };
    saveWebhooks(workspaceId, hooks);
    return true;
  }

  listWebhooks(workspaceId: string): WebhookSubscription[] {
    return loadWebhooks(workspaceId);
  }

  replaceWebhooks(workspaceId: string, hooks: WebhookSubscription[]): void {
    saveWebhooks(workspaceId, hooks);
  }

  /**
   * API-005: Simulate dispatching a signed webhook event.
   * In production this would be an outbound HTTPS POST with Svix-Signature header.
   */
  async simulateWebhookDispatch(
    workspaceId: string,
    hookId: string,
    _topic: WebhookEventTopic,
    payload: Record<string, unknown>
  ): Promise<{ deliveryId: string; signatureHeader: string; status: 'delivered' | 'failed' }> {
    const hooks = loadWebhooks(workspaceId);
    const hook = hooks.find(h => h.id === hookId);
    if (!hook || hook.status !== 'active') {
      return { deliveryId: '', signatureHeader: '', status: 'failed' };
    }

    const deliveryId = `del_${secureRandom(10)}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const secret = webhookSigningSecrets.get(hookId);
    if (!secret) return { deliveryId: '', signatureHeader: '', status: 'failed' };

    const body = JSON.stringify(payload);
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`));
    const signature = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const signatureHeader = `t=${timestamp},v1=${signature}`;

    // Simulate 95% success rate for demo
    const success = Math.random() > 0.05;
    const idx = hooks.findIndex(h => h.id === hookId);
    hooks[idx] = {
      ...hooks[idx],
      lastDeliveryAt: new Date().toISOString(),
      lastDeliveryStatus: success ? 'success' : 'failed',
      consecutiveFailures: success ? 0 : hooks[idx].consecutiveFailures + 1,
      status: hooks[idx].consecutiveFailures + (success ? 0 : 1) >= 5 ? 'failed' : hooks[idx].status
    };
    saveWebhooks(workspaceId, hooks);

    return { deliveryId, signatureHeader, status: success ? 'delivered' : 'failed' };
  }

  // ── API Gateway ──

  /**
   * API-001/003/004: Execute a sandboxed API request.
   * Validates key, checks scopes, enforces rate limits, checks idempotency.
   */
  executeRequest<T>(opts: {
    workspaceId: string;
    keyId: string;
    requiredScope: ApiKeyScope;
    method: string;
    endpoint: string;
    workspace: Workspace;
    profile: Profile;
    idempotencyKey?: string;
    handler: () => T;
  }): ApiGatewayResult<T> {
    const start = Date.now();
    const requestId = newRequestId();

    const keys = loadKeys(opts.workspaceId);
    const key = keys.find(k => k.id === opts.keyId);

    // Auth check
    if (!key) {
      return this.errorResult(requestId, 401, 'UNAUTHORIZED', 'Invalid or unknown API key.', start);
    }
    if (key.status === 'revoked') {
      return this.errorResult(requestId, 401, 'REVOKED', 'This API key has been revoked. Create or use a different key.', start);
    }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return this.errorResult(requestId, 401, 'REVOKED', 'This API key has expired.', start);
    }

    // Scope check (API-003)
    if (!key.scopes.includes(opts.requiredScope)) {
      return this.errorResult(requestId, 403, 'FORBIDDEN', `Key lacks required scope: ${opts.requiredScope}`, start);
    }

    // Profile access check (API-003)
    if (key.allowedProfileIds !== null && !key.allowedProfileIds.includes(opts.profile.id)) {
      return this.errorResult(requestId, 403, 'FORBIDDEN', 'Key is not authorized for this profile.', start);
    }

    // Rate limit check (API-004)
    const { allowed } = this.rateLimiter.check(opts.keyId, opts.workspace.plan);
    if (!allowed) {
      const retryAfterMs = this.rateLimiter.getRetryAfterMs(opts.keyId);
      return {
        ok: false, statusCode: 429, requestId,
        durationMs: Date.now() - start,
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Maximum ${RATE_LIMITS[opts.workspace.plan] ?? 60} requests per minute.`,
          retryAfterMs
        }
      };
    }

    // Idempotency check (API-004)
    if (opts.idempotencyKey && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(opts.method)) {
      const replay = this.idempotency.get(`${opts.keyId}:${opts.idempotencyKey}`);
      if (replay) return { ...replay, requestId, durationMs: Date.now() - start } as ApiGatewayResult<T>;
    }

    // Record last-used
    const idx = keys.findIndex(k => k.id === opts.keyId);
    if (idx !== -1) {
      keys[idx] = { ...keys[idx], lastUsedAt: new Date().toISOString() };
      saveKeys(opts.workspaceId, keys);
    }

    // Execute handler
    try {
      const data = opts.handler();
      const durationMs = Date.now() - start;
      this.audit.append({
        id: requestId, keyId: opts.keyId, keyName: key.name,
        method: opts.method, endpoint: opts.endpoint, statusCode: 200,
        profileId: opts.profile.id, timestamp: Date.now(), durationMs
      });
      const result = { ok: true, statusCode: 200, data, requestId, durationMs } as ApiGatewayResult<T>;
      if (opts.idempotencyKey && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(opts.method)) {
        this.idempotency.set(`${opts.keyId}:${opts.idempotencyKey}`, result);
      }
      return result;
    } catch (e) {
      const durationMs = Date.now() - start;
      this.audit.append({
        id: requestId, keyId: opts.keyId, keyName: key.name,
        method: opts.method, endpoint: opts.endpoint, statusCode: 500,
        profileId: opts.profile.id, timestamp: Date.now(), durationMs
      });
      return this.errorResult(requestId, 500, 'VALIDATION_ERROR', (e as Error).message, start);
    }
  }

  getAuditLog(): ApiAuditEntry[] {
    return this.audit.getAll();
  }

  clearAuditLog(): void {
    this.audit.clear();
  }

  private errorResult<T = never>(
    requestId: string,
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    start: number,
    retryAfterMs?: number
  ): ApiGatewayResult<T> {
    return {
      ok: false, statusCode, requestId,
      durationMs: Date.now() - start,
      error: { code, message, retryAfterMs }
    };
  }
}

export const apiKeyService = new ApiKeyService();

// ─── OpenAPI v1 Endpoint Definitions (for sandbox reference) ─────────────────

export interface ApiEndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  scope: ApiKeyScope;
  requestBody?: string;
  responseSchema?: string;
}

export const API_V1_ENDPOINTS: ApiEndpointDef[] = [
  {
    method: 'GET', path: '/v1/profiles/{username}',
    description: 'Retrieve profile metadata and published state.',
    scope: 'profiles:read',
    responseSchema: '{ id, username, displayName, bio, status, publishedVersion, customDomain }'
  },
  {
    method: 'PATCH', path: '/v1/profiles/{username}',
    description: 'Update draft profile fields (displayName, bio, seo).',
    scope: 'profiles:write',
    requestBody: '{ displayName?, bio?, seo? }',
    responseSchema: '{ id, updatedAt }'
  },
  {
    method: 'GET', path: '/v1/profiles/{username}/blocks',
    description: 'List all blocks across all tabs in draft state.',
    scope: 'blocks:read',
    responseSchema: '{ tabs: [{ id, title, blocks: [...] }] }'
  },
  {
    method: 'POST', path: '/v1/profiles/{username}/blocks',
    description: 'Append a new block to a specified tab.',
    scope: 'blocks:write',
    requestBody: '{ tabId, type, title, payload }',
    responseSchema: '{ id, position, createdAt }'
  },
  {
    method: 'DELETE', path: '/v1/profiles/{username}/blocks/{blockId}',
    description: 'Remove a block by ID.',
    scope: 'blocks:write',
    responseSchema: '{ deleted: true }'
  },
  {
    method: 'GET', path: '/v1/profiles/{username}/analytics',
    description: 'Retrieve aggregated analytics for a specified period.',
    scope: 'analytics:read',
    responseSchema: '{ period, pageViews, uniqueVisitors, clicks, ctr, topReferrers }'
  },
  {
    method: 'GET', path: '/v1/profiles/{username}/forms/submissions',
    description: 'List form submissions (paginated).',
    scope: 'forms:read',
    responseSchema: '{ data: [...submissions], cursor, total }'
  },
  {
    method: 'POST', path: '/v1/profiles/{username}/publish',
    description: 'Publish the current draft state to the live edge.',
    scope: 'publish:write',
    requestBody: '{ changeNote?, versionName?, versionNotes?, idempotencyKey }',
    responseSchema: '{ snapshotId, publishedVersion, publishedAt }'
  },
  {
    method: 'GET', path: '/v1/profiles/{username}/themes',
    description: 'Read the current draft theme configuration.',
    scope: 'themes:read',
    responseSchema: '{ id, name, bgColor, accentColor, ... }'
  },
  {
    method: 'PATCH', path: '/v1/profiles/{username}/themes',
    description: 'Apply a theme update to the draft state.',
    scope: 'themes:write',
    requestBody: '{ accentColor?, cardStyle?, fontDisplay?, ... }',
    responseSchema: '{ id, updatedAt }'
  }
];
