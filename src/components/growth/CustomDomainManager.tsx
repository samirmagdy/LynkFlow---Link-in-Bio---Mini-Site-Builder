/**
 * Feature Specification 11: Custom Domain Manager (Rebuilt)
 * PRO-003: Verified-only serving enforcement
 * PRO-004: SSL certificate state machine (provisioning → active → renewal_failed)
 *
 * Replaces the naive version that only had a single "verify" call.
 */
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { billingService } from '../../services/billingService';
import { validateHostname, DOMAIN_CNAME_TARGET, DOMAIN_A_RECORD } from '../../services/domainService';
import {
  Globe,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Clock,
  ExternalLink
} from 'lucide-react';
import { ProductIllustration } from '../illustration/ProductIllustration';

// ─── SSL Status Badge ─────────────────────────────────────────────────────────

function SslBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono text-success bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
        <Lock className="w-2.5 h-2.5" /> SSL Active
      </span>
    );
  }
  if (status === 'provisioning') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono text-warning bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
        <Clock className="w-2.5 h-2.5 animate-spin" /> Provisioning
      </span>
    );
  }
  if (status === 'renewal_failed') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-mono text-danger bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-2.5 h-2.5" /> Renewal Failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono text-danger bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
      <Unlock className="w-2.5 h-2.5" /> SSL Failed
    </span>
  );
}

// ─── Domain Status Card ───────────────────────────────────────────────────────

function DomainStatusCard({
  customDomain,
  onRecheck,
  onRemove,
  profileId,
  isRechecking
}: {
  customDomain: NonNullable<ReturnType<typeof useApp>['activeProfile']['customDomain']>;
  onRecheck: () => void;
  onRemove: () => void;
  profileId: string;
  isRechecking: boolean;
}) {
  const { status, sslStatus, domain, lastCheckedAt, failureReason, nextRenewalAt, conflictOwnerId } = customDomain;

  const isVerified = status === 'verified' && sslStatus === 'active';
  const isConflict = status === 'conflict';
  const isFailed = status === 'failed' || sslStatus === 'failed' || sslStatus === 'renewal_failed';

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${
      isVerified ? 'bg-success-surface border-success/40' :
      isConflict ? 'bg-danger-surface border-danger/40' :
      isFailed   ? 'bg-warning-surface border-warning/40' :
                   'bg-surface border-line'
    }`}>
      {/* Domain row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isVerified ? 'bg-emerald-500/10 text-success' :
            isConflict ? 'bg-red-500/10 text-danger' :
                         'bg-amber-500/10 text-warning'
          }`}>
            {isVerified ? <ShieldCheck className="w-5 h-5" /> :
             isConflict ? <AlertCircle className="w-5 h-5" /> :
                          <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-sm font-bold text-ink font-mono">{domain}</div>
            <div className="text-[11px] text-muted mt-0.5 capitalize">
              DNS: <span className="text-ink">{status}</span>
              {' · '}
              <SslBadge status={sslStatus} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRecheck}
            disabled={isRechecking}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
              isRechecking ? 'bg-surface-2 text-subtle cursor-wait' : 'bg-surface-2 hover:bg-surface-3 text-body hover:text-ink'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isRechecking ? 'animate-spin' : ''}`} />
            {isRechecking ? 'Checking…' : 'Re-check DNS'}
          </button>
          <button
            onClick={onRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-surface-2 hover:bg-red-500/20 text-muted hover:text-danger cursor-pointer transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Disconnect
          </button>
        </div>
      </div>

      {/* Failure / Conflict detail */}
      {failureReason && (
        <div className="flex items-start gap-2 text-[11px] bg-canvas/60 border border-line rounded-xl p-3">
          <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <span className="text-body">{failureReason}</span>
        </div>
      )}

      {isConflict && conflictOwnerId && (
        <div className="text-[11px] text-danger bg-danger-surface border border-danger/40 rounded-xl p-3">
          <strong className="text-ink">Conflict:</strong> This hostname is already registered to another workspace.
          Contact support if you own this domain.
        </div>
      )}

      {/* SSL renewal warning */}
      {sslStatus === 'renewal_failed' && (
        <div className="text-[11px] text-warning bg-warning-surface border border-warning/40 rounded-xl p-3 space-y-1.5">
          <p className="font-semibold text-warning">SSL Certificate Renewal Failed</p>
          <p>Automatic renewal could not complete. Click <strong>Re-check DNS</strong> to trigger a retry after verifying DNS records are intact.</p>
        </div>
      )}

      {/* SSL renewal date */}
      {isVerified && nextRenewalAt && (
        <div className="text-[10px] text-subtle font-mono flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Next SSL renewal: {new Date(nextRenewalAt).toLocaleDateString()}
          {' · '}Last checked: {new Date(lastCheckedAt).toLocaleTimeString()}
        </div>
      )}

      {/* Unverified warning — content MUST NOT be served */}
      {!isVerified && !isConflict && (
        <div className="text-[11px] text-warning bg-warning-surface border border-warning/40 rounded-xl p-3">
          <strong>Domain is not verified.</strong> Your LynkFlow page will not be served on{' '}
          <span className="font-mono text-ink">{domain}</span> until DNS verification succeeds.
        </div>
      )}

      {/* Visit link (only when fully verified) */}
      {isVerified && (
        <a
          href={`https://${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent hover:text-accent-soft transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Visit https://{domain}
        </a>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const CustomDomainManager: React.FC = () => {
  const { activeProfile, workspace, verifyDomain, removeDomain, recheckDomain, showToast, setCurrentView } = useApp();
  const [domainInput, setDomainInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);
  const [validationError, setValidationError] = useState('');

  const customDomain = activeProfile.customDomain;
  const entitlements = billingService.getWorkspaceEntitlements(workspace);
  const canUseDomain = entitlements.customDomains;

  const handleVerify = async () => {
    const { valid, cleaned, reason } = validateHostname(domainInput);
    if (!valid) {
      setValidationError(reason || 'Invalid hostname.');
      return;
    }
    setValidationError('');
    setIsVerifying(true);
    const result = await verifyDomain(activeProfile.id, cleaned);
    setIsVerifying(false);
    if (result.success) setDomainInput('');
  };

  const handleRecheck = async () => {
    setIsRechecking(true);
    await recheckDomain(activeProfile.id);
    setIsRechecking(false);
  };

  const handleRemove = () => {
    removeDomain(activeProfile.id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    showToast(`Copied "${text}" to clipboard`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">

      {/* Header */}
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            <span>Custom Domain</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Connect your own domain to <span className="font-mono text-accent">@{activeProfile.username}</span>.
            Free automated SSL included on Pro and Agency plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canUseDomain ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-success border border-emerald-500/20">
              ✓ Custom Domains Enabled
            </span>
          ) : (
            <button
              onClick={() => setCurrentView('billing')}
              className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-amber-500/10 text-warning border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer transition-colors"
            >
              Pro Feature — Upgrade →
            </button>
          )}
        </div>
      </div>

      <div className="max-w-xl rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-2">
        <ProductIllustration variant="domain" />
      </div>

      {/* Entitlement gate */}
      {!canUseDomain && (
        <div className="p-5 rounded-2xl bg-surface border border-line text-center space-y-3">
          <div className="inline-flex p-3 bg-indigo-500/10 rounded-2xl text-accent mb-1">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-ink">Custom domains are a Pro feature</h3>
          <p className="text-xs text-muted max-w-xs mx-auto">
            Upgrade to Creator Pro or Agency to connect your own branded domain with free SSL.
          </p>
          <button
            onClick={() => setCurrentView('billing')}
            className="mt-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl cursor-pointer"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* Active domain status */}
      {canUseDomain && customDomain && (
        <DomainStatusCard
          customDomain={customDomain}
          onRecheck={handleRecheck}
          onRemove={handleRemove}
          profileId={activeProfile.id}
          isRechecking={isRechecking}
        />
      )}

      {/* Connect new domain */}
      {canUseDomain && !customDomain && (
        <div className="p-6 rounded-2xl bg-surface border border-line space-y-5">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Your Custom Domain or Subdomain
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="e.g. links.yourbrand.com or yourname.bio"
                  value={domainInput}
                  onChange={e => { setDomainInput(e.target.value); setValidationError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !isVerifying) handleVerify(); }}
                  className={`w-full px-3.5 py-2 text-xs rounded-xl bg-canvas border text-ink font-mono focus:outline-none transition-colors ${
                    validationError ? 'border-red-500/70 focus:border-red-500' : 'border-line focus:border-indigo-500'
                  }`}
                />
                {validationError && (
                  <p className="text-[11px] text-danger">{validationError}</p>
                )}
              </div>
              <button
                onClick={handleVerify}
                disabled={isVerifying || !domainInput.trim()}
                className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isVerifying
                    ? 'bg-surface-2 text-muted cursor-wait'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                }`}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying DNS…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connect & Verify</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* DNS Configuration Table */}
          <div className="pt-3 border-t border-line space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Required DNS Configuration
            </h4>
            <p className="text-xs text-muted">
              Add the following record(s) in your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.),
              then click <strong className="text-ink">Connect & Verify</strong>.
              DNS propagation can take up to 48 hours.
            </p>

            <div className="rounded-xl border border-line overflow-hidden bg-canvas">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-line text-muted font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Name / Host</th>
                    <th className="py-2.5 px-3">Value / Target</th>
                    <th className="py-2.5 px-3 text-right">TTL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-mono">
                  <tr>
                    <td className="py-2.5 px-3 text-accent font-bold">CNAME</td>
                    <td className="py-2.5 px-3 text-ink">links (or @)</td>
                    <td className="py-2.5 px-3 text-body">
                      <span className="flex items-center justify-between">
                        <span>{DOMAIN_CNAME_TARGET}</span>
                        <button
                          onClick={() => copyToClipboard(DOMAIN_CNAME_TARGET)}
                          aria-label="Copy CNAME target"
                          className="p-1 hover:text-ink text-subtle cursor-pointer ml-2"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted">Auto / 3600</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-accent font-bold">A</td>
                    <td className="py-2.5 px-3 text-ink">@ (Apex)</td>
                    <td className="py-2.5 px-3 text-body">
                      <span className="flex items-center justify-between">
                        <span>{DOMAIN_A_RECORD}</span>
                        <button
                          onClick={() => copyToClipboard(DOMAIN_A_RECORD)}
                          aria-label="Copy A record target"
                          className="p-1 hover:text-ink text-subtle cursor-pointer ml-2"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted">Auto / 3600</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-subtle bg-canvas border border-line rounded-xl p-3">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />
              <span>
                <strong className="text-body">Important:</strong> Your profile will not be served on this domain until verification succeeds.
                Do not remove existing DNS records until the CNAME is confirmed.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Replaced domain — show connect form even when domain exists but is failed/conflict */}
      {canUseDomain && customDomain && (customDomain.status === 'failed' || customDomain.status === 'conflict') && (
        <div className="p-5 rounded-2xl bg-surface border border-line space-y-3">
          <h4 className="text-xs font-bold text-ink">Try a Different Domain</h4>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="text"
                placeholder="e.g. links.yourbrand.com"
                value={domainInput}
                onChange={e => { setDomainInput(e.target.value); setValidationError(''); }}
                className={`w-full px-3.5 py-2 text-xs rounded-xl bg-canvas border text-ink font-mono focus:outline-none transition-colors ${
                  validationError ? 'border-red-500/70' : 'border-line focus:border-indigo-500'
                }`}
              />
              {validationError && <p className="text-[11px] text-danger">{validationError}</p>}
            </div>
            <button
              onClick={handleVerify}
              disabled={isVerifying || !domainInput.trim()}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer disabled:cursor-wait disabled:opacity-60 flex items-center gap-2"
            >
              {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isVerifying ? 'Verifying…' : 'Try This Domain'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
