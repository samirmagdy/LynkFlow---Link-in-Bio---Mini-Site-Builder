/**
 * Feature Specification 12: API & Automation
 * ApiExplorer.tsx — production-grade developer portal
 *
 * Implements:
 * - API-001: Versioned endpoint reference and interactive sandbox
 * - API-002: Create / rotate / revoke scoped keys (secret shown once modal)
 * - API-003: Entitlement gate (Free plan blocked)
 * - API-004: Live rate-limit and error feedback in sandbox
 * - API-005: Webhook subscription management + test dispatch
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Terminal, Key, Webhook, Play, Copy, Check, Shield, Plus, Trash2,
  RefreshCw, AlertTriangle, ChevronDown, ChevronRight, Pause,
  Activity, Eye, EyeOff, Clock, Zap, Globe
} from 'lucide-react';
import { ApiKey, ApiKeyScope, WebhookEventTopic, ALL_API_SCOPES } from '../../types';
import { API_V1_ENDPOINTS, ApiEndpointDef } from '../../services/apiKeyService';

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge: React.FC<{ label: string; color: 'green' | 'yellow' | 'red' | 'blue' | 'indigo' | 'neutral' }> = ({ label, color }) => {
  const map = {
    green:   'bg-emerald-500/10 text-success border-emerald-500/20',
    yellow:  'bg-amber-500/10 text-warning border-amber-500/20',
    red:     'bg-red-500/10 text-danger border-red-500/20',
    blue:    'bg-sky-500/10 text-info border-sky-500/20',
    indigo:  'bg-indigo-500/10 text-accent-soft border-indigo-500/20',
    neutral: 'bg-ink/5 text-muted border-line'
  };
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${map[color]}`}>
      {label}
    </span>
  );
};

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const map: Record<string, string> = {
    GET:    'text-success',
    POST:   'text-info',
    PATCH:  'text-warning',
    PUT:    'text-warning',
    DELETE: 'text-danger',
  };
  return <span className={`font-mono text-xs font-bold w-14 shrink-0 ${map[method] ?? 'text-muted'}`}>{method}</span>;
};

/** Modal that shows the secret exactly once and lets the user copy it. */
const SecretRevealModal: React.FC<{
  title: string;
  prefix: string;
  secret: string;
  onClose: () => void;
}> = ({ title, prefix, secret, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="api-secret-title">
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-amber-500/30 shadow-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 id="api-secret-title" className="text-sm font-bold text-ink">{title}</h3>
            <p className="text-xs text-warning mt-0.5">
              This secret will <strong>never be shown again</strong>. Copy it now and store it securely.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-canvas border border-line p-4 space-y-3">
          <p className="text-[10px] font-mono text-subtle uppercase tracking-wider">Key prefix (safe to display)</p>
          <code className="text-xs text-body font-mono">{prefix}</code>

          <div className="border-t border-line pt-3">
            <p className="text-[10px] font-mono text-subtle uppercase tracking-wider mb-2">Full secret (show once)</p>
            <div className="flex items-center gap-2">
              <code className={`flex-1 text-xs font-mono break-all transition-all ${revealed ? 'text-success' : 'blur-sm text-success select-none'}`}>
                {secret}
              </code>
              <button
                onClick={() => setRevealed(r => !r)}
                aria-label={revealed ? 'Hide API secret' : 'Show API secret'}
                aria-pressed={revealed}
                className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-muted transition-colors"
              >
                {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copy}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Secret'}
          </button>
          <button
            onClick={onClose}
            disabled={!copied}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${copied ? 'bg-surface-3 hover:bg-surface-3 text-ink' : 'bg-surface-2 text-subtle cursor-not-allowed'}`}
          >
            Done
          </button>
        </div>
        {!copied && (
          <p className="text-[11px] text-subtle text-center">
            You must copy the secret before closing this dialog.
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ApiExplorer: React.FC = () => {
  const {
    workspace, user, activeProfile,
    apiKeys, createApiKey, revokeApiKey, rotateApiKey,
    webhookSubscriptions, createWebhookSubscription, deleteWebhookSubscription,
    toggleWebhookStatus, dispatchTestWebhook,
    executeApiRequest, apiAuditLog,
    showToast
  } = useApp();

  const isFreePlan = workspace.plan === 'free';

  // ── Tab state ──
  type Tab = 'keys' | 'sandbox' | 'webhooks' | 'audit';
  const [activeTab, setActiveTab] = useState<Tab>('keys');

  // ── Secret reveal modal ──
  const [revealModal, setRevealModal] = useState<{ title: string; prefix: string; secret: string } | null>(null);

  // ── Key creation form ──
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<Set<ApiKeyScope>>(new Set(['profiles:read', 'blocks:read']));
  const [newKeyExpires, setNewKeyExpires] = useState('');

  const toggleScope = (s: ApiKeyScope) => {
    setNewKeyScopes(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const handleCreateKey = async () => {
    const result = await createApiKey(newKeyName, Array.from(newKeyScopes), null, newKeyExpires || undefined);
    if ('error' in result) return;
    setRevealModal({ title: `Secret for "${result.key.name}"`, prefix: result.key.keyPrefix, secret: result.secret });
    setNewKeyName('');
    setNewKeyScopes(new Set(['profiles:read', 'blocks:read']));
    setNewKeyExpires('');
    setShowCreateKey(false);
  };

  const handleRotate = async (key: ApiKey) => {
    if (!confirm(`Rotate key "${key.name}"? The current secret will be invalidated immediately.`)) return;
    const result = await rotateApiKey(key.id);
    if ('error' in result) return;
    setRevealModal({ title: `New secret for "${result.key.name}"`, prefix: result.key.keyPrefix, secret: result.secret });
  };

  const handleRevoke = (key: ApiKey) => {
    if (!confirm(`Revoke key "${key.name}"? This cannot be undone.`)) return;
    revokeApiKey(key.id);
  };

  // ── Sandbox ──
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointDef>(API_V1_ENDPOINTS[0]);
  const [sandboxKeyId, setSandboxKeyId] = useState<string>('');
  const [sandboxResult, setSandboxResult] = useState<string | null>(null);
  const [sandboxStatus, setSandboxStatus] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

  const activeKeys = apiKeys.filter(k => k.status === 'active');

  const handleSandboxExecute = () => {
    if (!sandboxKeyId) { showToast('Select an API key to use for this request.'); return; }
    setIsSending(true);
    setTimeout(() => {
      const result = executeApiRequest(sandboxKeyId, selectedEndpoint.scope, selectedEndpoint.method, selectedEndpoint.path);
      setSandboxStatus(result.statusCode);
      setSandboxResult(JSON.stringify(result.ok ? result.data : result.error, null, 2));
      setIsSending(false);
    }, 200);
  };

  const toggleEndpointExpand = (path: string) => {
    setExpandedEndpoints(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  // ── Webhooks ──
  const [showCreateHook, setShowCreateHook] = useState(false);
  const [newHookUrl, setNewHookUrl] = useState('');
  const [newHookDesc, setNewHookDesc] = useState('');
  const [newHookTopics, setNewHookTopics] = useState<Set<WebhookEventTopic>>(new Set(['profile.published', 'form.submitted']));

  const ALL_TOPICS: WebhookEventTopic[] = ['profile.published', 'profile.updated', 'form.submitted', 'subscriber.created', 'domain.verified', 'domain.ssl_failed'];

  const toggleTopic = (t: WebhookEventTopic) => {
    setNewHookTopics(prev => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; });
  };

  const handleCreateHook = async () => {
    const result = await createWebhookSubscription(newHookUrl, Array.from(newHookTopics), newHookDesc || undefined);
    if ('error' in result) return;
    setRevealModal({ title: 'Webhook Signing Secret', prefix: result.hook.signingSecretPrefix, secret: result.signingSecret });
    setNewHookUrl(''); setNewHookDesc('');
    setNewHookTopics(new Set(['profile.published', 'form.submitted']));
    setShowCreateHook(false);
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'keys',     label: 'API Keys',       icon: <Key className="w-3.5 h-3.5" /> },
    { id: 'sandbox',  label: 'Sandbox',         icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'webhooks', label: 'Webhooks',        icon: <Webhook className="w-3.5 h-3.5" /> },
    { id: 'audit',    label: 'Audit Log',       icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-accent" />
            <span>Developer Platform</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            REST API v1 — Scoped keys, signed webhooks, interactive sandbox and audit trail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge label={`${workspace.plan.toUpperCase()} plan`} color={isFreePlan ? 'neutral' : 'indigo'} />
          <Badge label="API v1.0" color="blue" />
        </div>
      </div>

      {/* Entitlement Gate */}
      {isFreePlan && (
        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">API access requires Creator Pro or Agency</p>
            <p className="text-xs text-muted mt-1">
              Upgrade to create API keys, configure webhooks, and integrate external tools. Free workspaces cannot create or use API keys.
            </p>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 bg-surface border border-line rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted hover:text-ink hover:bg-surface-2'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── API Keys Tab ── */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''} · secrets stored as prefix only
            </p>
            <button
              onClick={() => setShowCreateKey(true)}
              disabled={isFreePlan}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Key
            </button>
          </div>

          {/* Create key form */}
          {showCreateKey && !isFreePlan && (
            <div className="p-5 rounded-2xl bg-surface border border-indigo-500/30 space-y-4">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">New API Key</h3>
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Key name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="e.g. Zapier Integration, GitHub Actions"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink placeholder-subtle focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-body mb-2">Scopes</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_API_SCOPES.map(scope => (
                    <button
                      key={scope}
                      onClick={() => toggleScope(scope)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-left transition-colors cursor-pointer border ${
                        newKeyScopes.has(scope)
                          ? 'bg-indigo-600/20 text-accent-soft border-indigo-500/40'
                          : 'bg-canvas text-subtle border-line hover:border-line-strong'
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Expiry date (optional)</label>
                <input
                  type="date"
                  value={newKeyExpires}
                  onChange={e => setNewKeyExpires(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim() || newKeyScopes.size === 0}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Create Key
                </button>
                <button
                  onClick={() => setShowCreateKey(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-body text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Key list */}
          {apiKeys.length === 0 && !isFreePlan && (
            <div className="p-8 rounded-2xl bg-surface border border-line text-center">
              <Key className="w-8 h-8 text-subtle mx-auto mb-3" />
              <p className="text-sm text-subtle">No API keys yet. Create one to get started.</p>
            </div>
          )}
          {apiKeys.map(key => (
            <div key={key.id} className={`p-5 rounded-2xl bg-surface border transition-colors ${key.status === 'revoked' ? 'border-red-500/20 opacity-60' : 'border-line'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink truncate">{key.name}</span>
                    <Badge label={key.status === 'active' ? 'Active' : 'Revoked'} color={key.status === 'active' ? 'green' : 'red'} />
                  </div>
                  <code className="text-[11px] font-mono text-muted">{key.keyPrefix}</code>
                  <div className="flex flex-wrap gap-1">
                    {key.scopes.map(s => <Badge key={s} label={s} color="neutral" />)}
                  </div>
                  <p className="text-[11px] text-subtle">
                    Created {new Date(key.createdAt).toLocaleDateString()} by {key.createdBy}
                    {key.lastUsedAt ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : ' · Never used'}
                    {key.expiresAt ? ` · Expires ${new Date(key.expiresAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                {key.status === 'active' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleRotate(key)}
                      title="Rotate key"
                      aria-label="Rotate API key"
                      className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-muted hover:text-warning transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRevoke(key)}
                      title="Revoke key"
                      aria-label="Revoke API key"
                      className="p-2 rounded-lg bg-surface-2 hover:bg-red-500/20 text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="p-4 rounded-xl bg-surface/50 border border-line flex items-start gap-3">
            <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-subtle leading-relaxed">
              Secrets are hashed immediately after creation and <strong className="text-muted">cannot be retrieved</strong>. 
              Rotate if compromised. All key mutations are recorded in the Audit Log tab.
              Bearer token format: <code className="text-muted">Authorization: Bearer lf_live_...</code>
            </p>
          </div>
        </div>
      )}

      {/* ── Sandbox Tab ── */}
      {activeTab === 'sandbox' && (
        <div className="space-y-4">
          {/* Endpoint reference */}
          <div className="p-5 rounded-2xl bg-surface border border-line space-y-2">
            <h3 className="text-xs font-bold text-body uppercase tracking-wider font-mono mb-3">API v1 Endpoints</h3>
            {API_V1_ENDPOINTS.map(ep => {
              const isExpanded = expandedEndpoints.has(ep.path + ep.method);
              const isSelected = selectedEndpoint === ep;
              return (
                <div key={ep.method + ep.path} className={`rounded-xl border transition-colors ${isSelected ? 'border-indigo-500/40 bg-indigo-600/5' : 'border-line bg-canvas'}`}>
                  <button
                    onClick={() => { setSelectedEndpoint(ep); setSandboxResult(null); setSandboxStatus(null); toggleEndpointExpand(ep.path + ep.method); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
                  >
                    <MethodBadge method={ep.method} />
                    <code className="text-xs text-ink-strong flex-1">{ep.path.replace('{username}', activeProfile.username)}</code>
                    <Badge label={ep.scope} color="indigo" />
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-subtle" /> : <ChevronRight className="w-3.5 h-3.5 text-subtle" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-1.5 border-t border-line pt-3">
                      <p className="text-xs text-muted">{ep.description}</p>
                      {ep.requestBody && <p className="text-[11px] font-mono text-warning">Body: {ep.requestBody}</p>}
                      {ep.responseSchema && <p className="text-[11px] font-mono text-success">Response: {ep.responseSchema}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Execute panel */}
          <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
            <h3 className="text-xs font-bold text-body uppercase tracking-wider font-mono">Send Request</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={sandboxKeyId}
                onChange={e => setSandboxKeyId(e.target.value)}
                disabled={isFreePlan || activeKeys.length === 0}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 disabled:opacity-40"
              >
                <option value="">
                  {isFreePlan ? 'API access requires Pro plan' : activeKeys.length === 0 ? 'Create an API key first' : 'Select API key…'}
                </option>
                {activeKeys.map(k => <option key={k.id} value={k.id}>{k.name} ({k.keyPrefix})</option>)}
              </select>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas border border-line text-xs font-mono text-body shrink-0">
                <MethodBadge method={selectedEndpoint.method} />
                <span className="text-muted truncate max-w-[180px]">{selectedEndpoint.path.replace('{username}', activeProfile.username)}</span>
              </div>
              <button
                onClick={handleSandboxExecute}
                disabled={isSending || isFreePlan || !sandboxKeyId}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isSending ? 'Sending…' : 'Send'}
              </button>
            </div>

            <div className="rounded-xl bg-canvas border border-line p-4 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] border-b border-line pb-2 mb-2">
                <span className={sandboxStatus ? (sandboxStatus < 300 ? 'text-success' : sandboxStatus < 500 ? 'text-warning' : 'text-danger') : 'text-subtle'}>
                  {sandboxStatus ? `HTTP/1.1 ${sandboxStatus}` : 'HTTP/1.1 —'}
                </span>
                <span className="text-subtle">Content-Type: application/json</span>
              </div>
              <pre className={`overflow-x-auto max-h-72 whitespace-pre-wrap ${sandboxStatus && sandboxStatus >= 400 ? 'text-danger' : 'text-success'}`}>
                {sandboxResult || '// Select a key and click "Send" to test this endpoint'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Webhooks Tab ── */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              {webhookSubscriptions.length} subscription{webhookSubscriptions.length !== 1 ? 's' : ''} · HMAC-SHA256 signed
            </p>
            <button
              onClick={() => setShowCreateHook(true)}
              disabled={isFreePlan}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Subscribe
            </button>
          </div>

          {showCreateHook && !isFreePlan && (
            <div className="p-5 rounded-2xl bg-surface border border-emerald-500/30 space-y-4">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">New Webhook Subscription</h3>
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Endpoint URL (HTTPS required)</label>
                <input
                  type="url"
                  value={newHookUrl}
                  onChange={e => setNewHookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhooks/lynkflow"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink placeholder-subtle focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={newHookDesc}
                  onChange={e => setNewHookDesc(e.target.value)}
                  placeholder="e.g. CRM sync"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink placeholder-subtle focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-body mb-2">Event topics</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TOPICS.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleTopic(t)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                        newHookTopics.has(t)
                          ? 'bg-emerald-600/20 text-success border-emerald-500/40'
                          : 'bg-canvas text-subtle border-line hover:border-line-strong'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreateHook} disabled={!newHookUrl || newHookTopics.size === 0} className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer">
                  Create Subscription
                </button>
                <button onClick={() => setShowCreateHook(false)} className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-body text-xs font-medium transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {webhookSubscriptions.length === 0 && !isFreePlan && (
            <div className="p-8 rounded-2xl bg-surface border border-line text-center">
              <Webhook className="w-8 h-8 text-subtle mx-auto mb-3" />
              <p className="text-sm text-subtle">No webhook subscriptions. Subscribe to receive signed events.</p>
            </div>
          )}

          {webhookSubscriptions.map(hook => (
            <div key={hook.id} className="p-5 rounded-2xl bg-surface border border-line space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Globe className="w-3.5 h-3.5 text-subtle shrink-0" />
                    <code className="text-xs text-ink-strong truncate">{hook.url}</code>
                    <Badge label={hook.status} color={hook.status === 'active' ? 'green' : hook.status === 'paused' ? 'yellow' : 'red'} />
                  </div>
                  {hook.description && <p className="text-[11px] text-subtle">{hook.description}</p>}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {hook.topics.map(t => <Badge key={t} label={t} color="neutral" />)}
                  </div>
                  <p className="text-[11px] text-subtle">
                    Created {new Date(hook.createdAt).toLocaleDateString()}
                    {hook.lastDeliveryAt ? ` · Last delivery: ${hook.lastDeliveryStatus === 'success' ? '✓' : '✗'} ${new Date(hook.lastDeliveryAt).toLocaleTimeString()}` : ' · No deliveries yet'}
                    {hook.consecutiveFailures > 0 ? ` · ⚠ ${hook.consecutiveFailures} consecutive failure(s)` : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleWebhookStatus(hook.id, hook.status === 'active' ? 'paused' : 'active')}
                    title={hook.status === 'active' ? 'Pause' : 'Resume'}
                    className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-muted hover:text-warning transition-colors cursor-pointer"
                  >
                    {hook.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => dispatchTestWebhook(hook.id, hook.topics[0])}
                    title="Send test event"
                    className="p-2 rounded-lg bg-surface-2 hover:bg-emerald-500/20 text-muted hover:text-success transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Remove this webhook subscription?')) deleteWebhookSubscription(hook.id); }}
                    title="Delete"
                    aria-label="Delete webhook subscription"
                    className="p-2 rounded-lg bg-surface-2 hover:bg-red-500/20 text-muted hover:text-danger transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-canvas border border-line">
                <Shield className="w-3.5 h-3.5 text-accent shrink-0" />
                <code className="text-[11px] text-subtle font-mono">Signing secret: {hook.signingSecretPrefix}</code>
                <span className="text-[10px] text-subtle ml-auto">HMAC-SHA256</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Audit Log Tab ── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">{apiAuditLog.length} entries (last 500 retained)</p>
          </div>
          {apiAuditLog.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface border border-line text-center">
              <Activity className="w-8 h-8 text-subtle mx-auto mb-3" />
              <p className="text-sm text-subtle">No API activity yet. Create a key and send a request.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-surface border border-line overflow-hidden">
              <div className="grid grid-cols-[80px_1fr_80px_80px_90px] gap-x-3 px-4 py-2.5 border-b border-line text-[10px] font-mono text-subtle uppercase tracking-wider">
                <span>Method</span>
                <span>Endpoint</span>
                <span>Status</span>
                <span>Duration</span>
                <span>Time</span>
              </div>
              {apiAuditLog.slice(0, 50).map(entry => (
                <div key={entry.id} className="grid grid-cols-[80px_1fr_80px_80px_90px] gap-x-3 px-4 py-2.5 border-b border-line/50 last:border-0 hover:bg-surface-2/30 transition-colors">
                  <MethodBadge method={entry.method} />
                  <code className="text-xs text-body truncate">{entry.endpoint}</code>
                  <span className={`text-xs font-mono ${entry.statusCode < 300 ? 'text-success' : entry.statusCode < 500 ? 'text-warning' : 'text-danger'}`}>
                    {entry.statusCode}
                  </span>
                  <span className="text-xs font-mono text-subtle">{entry.durationMs}ms</span>
                  <span className="text-[11px] text-subtle">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Secret reveal modal */}
      {revealModal && (
        <SecretRevealModal
          title={revealModal.title}
          prefix={revealModal.prefix}
          secret={revealModal.secret}
          onClose={() => setRevealModal(null)}
        />
      )}
    </div>
  );
};
