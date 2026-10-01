import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PRICING_PLANS } from '../../data/pricingPlans';
import { billingService } from '../../services/billingService';
import { PlanType, BillingCycle } from '../../types';
import {
  CreditCard,
  Check,
  Clock,
  Download,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Zap,
  TrendingUp,
  Users,
  RefreshCw,
  Calendar
} from 'lucide-react';

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active:     { label: 'Active',        className: 'bg-emerald-500/10 text-success border-emerald-500/20' },
    trialing:   { label: 'Trialing',      className: 'bg-indigo-500/10  text-accent  border-indigo-500/20'  },
    past_due:   { label: 'Past Due',      className: 'bg-amber-500/10   text-warning   border-amber-500/20'   },
    canceled:   { label: 'Canceled',      className: 'bg-red-500/10     text-danger     border-red-500/20'     },
    incomplete: { label: 'Incomplete',    className: 'bg-ink/5 text-muted border-line' }
  };
  const cfg = map[status] || map.incomplete;
  return (
    <span className={`text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Past-Due / Grace Period Banner ─────────────────────────────────────────

function PastDueBanner({
  gracePeriodEndsAt,
  onUpdatePayment,
}: {
  gracePeriodEndsAt?: string;
  onUpdatePayment: () => Promise<void>;
}) {
  const daysLeft = useMemo(() => {
    if (!gracePeriodEndsAt) return null;
    const diff = new Date(gracePeriodEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }, [gracePeriodEndsAt]);

  return (
    <div className="p-4 rounded-2xl bg-warning-surface border border-warning/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-warning shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-ink">Payment Failed – Action Required</h4>
          <p className="text-[11px] text-warning/80 mt-0.5">
            Your last payment could not be processed. Your account is in a 14-day grace period.
            {daysLeft !== null && (
              <span className="font-bold text-warning"> {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining.</span>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={onUpdatePayment}
        className="shrink-0 text-xs font-semibold text-amber-950 bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-xl cursor-pointer transition-colors"
      >
        Update Payment Method
      </button>
    </div>
  );
}

// ─── Cancel-at-Period-End Banner ─────────────────────────────────────────────

function CancelScheduledBanner({ periodEnd }: { periodEnd?: string }) {
  const formatted = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'period end';
  return (
    <div className="p-4 rounded-2xl bg-danger-surface border border-danger/40 flex items-start gap-3">
      <div className="p-2 rounded-xl bg-red-500/20 text-danger shrink-0 mt-0.5">
        <XCircle className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-ink">Cancellation Scheduled</h4>
        <p className="text-[11px] text-danger/80 mt-0.5">
          Your subscription is active until <strong className="text-danger">{formatted}</strong>. 
          After that, your workspace will move to the free plan. Your profiles and data are preserved.
        </p>
      </div>
    </div>
  );
}

// ─── Trial Banner ─────────────────────────────────────────────────────────────

function TrialBanner({ periodEnd }: { periodEnd?: string }) {
  const formatted = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'October 12, 2026';
  return (
    <div className="p-4 rounded-2xl bg-accent-surface border border-accent/40 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/20 text-accent-soft">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-ink">14-Day Free Pro Trial Active</h4>
          <p className="text-[11px] text-accent-soft/80">
            You have unrestricted access to all Pro features until <strong className="text-accent-soft">{formatted}</strong>.
          </p>
        </div>
      </div>
      <span className="text-xs font-mono font-bold text-success bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
        Trial Active
      </span>
    </div>
  );
}

// ─── Entitlement Usage Card ───────────────────────────────────────────────────

function EntitlementUsage({ workspace }: { workspace: ReturnType<typeof useApp>['workspace'] }) {
  const entitlements = billingService.getWorkspaceEntitlements(workspace);
  const profileCount = workspace.profiles?.length ?? 0;
  const profileMax = entitlements.maxProfiles;
  const pct = typeof profileMax === 'number' ? Math.min(100, Math.round((profileCount / profileMax) * 100)) : 0;

  const features = [
    { label: 'Custom Domains',     enabled: entitlements.customDomains,      icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { label: 'Lead Forms',         enabled: entitlements.leadForms,           icon: <Users className="w-3.5 h-3.5" /> },
    { label: 'Remove Branding',    enabled: entitlements.removeBranding,      icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { label: 'Custom Themes',      enabled: entitlements.customThemes,        icon: <Zap className="w-3.5 h-3.5" /> },
    { label: 'Analytics History',  enabled: true,                              icon: <Calendar className="w-3.5 h-3.5" />, suffix: `${entitlements.analyticsHistoryDays}d` }
  ];

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line space-y-4">
      <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-accent" />
        Current Entitlements
      </h4>

      {/* Profile usage meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Profiles Used</span>
          <span className="text-ink font-mono">
            {profileCount} / {typeof profileMax === 'number' ? profileMax : '∞'}
          </span>
        </div>
        {typeof profileMax === 'number' && (
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Feature flags */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {features.map(f => (
          <div
            key={f.label}
            className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl border ${
              f.enabled
                ? 'bg-surface-2 border-line-strong text-ink-strong'
                : 'bg-surface border-line text-subtle line-through'
            }`}
          >
            <span className={f.enabled ? 'text-accent' : 'text-subtle'}>{f.icon}</span>
            {f.label}
            {f.suffix && <span className="ml-auto font-mono text-[10px] text-accent">{f.suffix}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Confirm Cancel Modal ─────────────────────────────────────────────────────

function CancelConfirmModal({ onConfirm, onClose }: { onConfirm: () => Promise<boolean>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title">
      <div
        className="w-full max-w-md bg-surface border border-line rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-danger">
            <XCircle className="w-5 h-5" />
          </div>
          <h3 id="cancel-subscription-title" className="text-base font-bold text-ink tracking-tight">Cancel Subscription</h3>
        </div>
        <p className="text-xs text-muted mb-2">
          Your subscription will remain <strong className="text-ink">fully active</strong> until the end of the current billing period.
        </p>
        <p className="text-xs text-subtle mb-5">
          All your profiles, links, and analytics data are preserved. You can resubscribe at any time.
        </p>
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted hover:text-ink bg-surface-2 rounded-lg cursor-pointer"
          >
            Keep Subscription
          </button>
          <button
            onClick={async () => { if (await onConfirm()) onClose(); }}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer shadow-md"
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Checkout Confirmation Modal ──────────────────────────────────────────────

function CheckoutModal({
  planId,
  cycle,
  onConfirm,
  onClose,
}: {
  planId: PlanType;
  cycle: BillingCycle;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}) {
  const plan = PRICING_PLANS.find(p => p.id === planId);
  if (!plan) return null;
  const price = cycle === 'annual'
    ? { display: `$${plan.annualBilledTotal}.00`, sub: `$${plan.annualMonthlyPrice}/mo billed annually` }
    : { display: `$${plan.monthlyPrice}.00/mo`, sub: 'Billed monthly' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="activate-plan-title">
      <div
        className="w-full max-w-md bg-surface border border-line rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="activate-plan-title" className="text-base font-bold text-ink tracking-tight mb-1">
          Activate {plan.name}
        </h3>
        <p className="text-xs text-muted mb-4">
          Billing cycle: <strong className="text-ink capitalize">{cycle}</strong>. 14-day risk-free trial included.
        </p>

        <div className="p-4 rounded-xl bg-canvas border border-line space-y-3 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Plan</span>
            <span className="text-ink font-semibold">{plan.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Billing</span>
            <span className="text-ink font-mono">{price.sub}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-line pt-2">
            <span className="text-muted">Due Today</span>
            <span className="text-success font-mono font-bold">$0.00 (Trial period)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">After Trial</span>
            <span className="text-ink font-mono font-bold">{price.display}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-subtle mb-5">
          <ShieldCheck className="w-3.5 h-3.5 text-subtle shrink-0" />
          Payment processed securely via Stripe. Cancel any time before trial ends with no charge.
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted hover:text-ink bg-surface-2 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={async () => { if (await onConfirm()) onClose(); }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer shadow-md"
          >
            Confirm &amp; Start Trial
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const BillingSettings: React.FC = () => {
  const { workspace, upgradePlan, cancelSubscription, openBillingPortal, showToast } = useApp();
  const [cycle, setCycle] = useState<BillingCycle>(workspace.billingCycle || 'annual');
  const [checkoutPlan, setCheckoutPlan] = useState<PlanType | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const isActive = workspace.status === 'active';
  const isTrialing = workspace.status === 'trialing';
  const isPastDue = workspace.status === 'past_due';
  const isCanceled = workspace.status === 'canceled';

  const plans = PRICING_PLANS.map(plan => {
    const isCurrent = workspace.plan === plan.id;
    let cta = isCurrent ? 'Current Plan' : plan.id === 'free' ? 'Downgrade to Starter' : `Upgrade to ${plan.name}`;
    if (plan.id === 'pro' && !isCurrent) cta = 'Start 14-Day Free Trial';
    return { ...plan, isCurrent, cta };
  });

  return (
    <div className="studio-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" />
            <span>Subscription &amp; Billing</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Transparent pricing. No hidden fees. Downgrade preserves all your data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Current plan + status */}
          <div className="flex items-center gap-2 bg-surface border border-line rounded-xl px-3 py-1.5 text-xs font-mono">
            <span className="text-muted">Plan:</span>
            <span className="text-ink font-bold uppercase">{workspace.plan}</span>
            <StatusBadge status={workspace.status || 'active'} />
          </div>

          {/* Monthly / Annual toggle */}
          <div className="flex items-center bg-surface p-1 rounded-xl border border-line text-xs">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                cycle === 'monthly' ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle('annual')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                cycle === 'annual' ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <span>Annual</span>
              <span className="text-[10px] text-success font-bold font-mono">SAVE 22%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Banners — mutually exclusive, based on authoritative workspace.status */}
      {isTrialing && <TrialBanner periodEnd={workspace.currentPeriodEnd} />}
      {isPastDue && (
        <PastDueBanner
          gracePeriodEndsAt={workspace.gracePeriodEndsAt}
          onUpdatePayment={openBillingPortal}
        />
      )}
      {isCanceled && workspace.cancelAtPeriodEnd && (
        <CancelScheduledBanner periodEnd={workspace.currentPeriodEnd} />
      )}

      {/* Entitlement Usage */}
      <EntitlementUsage workspace={workspace} />

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const price = cycle === 'annual'
            ? `$${p.annualMonthlyPrice}`
            : `$${p.monthlyPrice}`;
          const annualNote = cycle === 'annual' && p.annualBilledTotal > 0
            ? `$${p.annualBilledTotal} billed annually`
            : undefined;

          return (
            <div
              key={p.id}
              className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 relative ${
                p.isCurrent
                  ? 'bg-surface border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-xl'
                  : 'bg-surface/60 border-line hover:border-line-strong'
              }`}
            >
              {p.badge && (
                <div className="absolute -top-3 right-6 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-indigo-600 text-white shadow-md">
                  {p.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-ink tracking-tight">{p.name}</h3>
                  {p.isCurrent && <StatusBadge status={workspace.status || 'active'} />}
                </div>

                <p className="text-xs text-muted mb-4 min-h-[32px]">{p.description}</p>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-ink font-mono tabular-nums">{price}</span>
                    <span className="text-xs text-muted">/ month</span>
                  </div>
                  {annualNote && (
                    <div className="text-[11px] text-subtle font-mono mt-0.5">{annualNote}</div>
                  )}
                </div>

                <div className="space-y-2.5 pt-4 border-t border-line mb-6">
                  {p.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-body">
                      <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled={p.isCurrent}
                onClick={() => !p.isCurrent && setCheckoutPlan(p.id)}
                className={`w-full py-2.5 px-4 text-xs font-semibold rounded-xl transition-all ${
                  p.isCurrent
                    ? 'bg-surface-2 text-subtle cursor-default'
                    : p.id === 'pro'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer'
                    : 'bg-inverse hover:bg-inverse-hover text-inverse-text shadow-sm cursor-pointer'
                }`}
              >
                {p.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Cancel Subscription (only for paid, active/trialing subscriptions) */}
      {(isActive || isTrialing) && workspace.plan !== 'free' && !workspace.cancelAtPeriodEnd && (
        <div className="p-4 rounded-2xl bg-surface border border-line flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-ink">Cancel Subscription</p>
            <p className="text-[11px] text-subtle mt-0.5">
              Your access remains until the end of the billing period. All data is preserved.
            </p>
          </div>
          <button
            onClick={() => setShowCancelModal(true)}
            className="shrink-0 text-xs font-medium text-danger hover:text-danger border border-danger/40 hover:border-danger/40 px-4 py-2 rounded-xl cursor-pointer transition-colors"
          >
            Cancel Plan
          </button>
        </div>
      )}

      {/* Invoice Ledger */}
      <div className="p-6 rounded-2xl bg-surface border border-line space-y-3">
        <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-accent" />
          Invoices &amp; Billing History
        </h4>

        {(workspace.invoices || []).length === 0 ? (
          <p className="text-xs text-subtle py-4 text-center">No invoices yet. Invoices appear after each billing cycle.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-muted font-medium">
                <tr>
                  <th className="pb-2.5">Invoice ID</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Description</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 font-mono">
                {(workspace.invoices || []).map(inv => (
                  <tr key={inv.id} className="hover:bg-surface-2/30">
                    <td className="py-2.5 text-ink">{inv.id}</td>
                    <td className="py-2.5 text-muted">{inv.date}</td>
                    <td className="py-2.5 text-body">{inv.plan}</td>
                    <td className="py-2.5 text-ink font-bold">{inv.amount}</td>
                    <td className="py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/10 text-success border-emerald-500/20'
                          : inv.status === 'failed'
                          ? 'bg-red-500/10 text-danger border-red-500/20'
                          : 'bg-amber-500/10 text-warning border-amber-500/20'
                      }`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {inv.pdfUrl && inv.pdfUrl !== '#' ? (
                        <a href={inv.pdfUrl} target="_blank" rel="noreferrer" download className="text-muted hover:text-ink p-1 inline-block" title="Download PDF receipt" aria-label={`Download receipt ${inv.id}`}>
                          <Download className="w-3.5 h-3.5 inline" />
                        </a>
                      ) : (
                        <span className="text-subtle p-1 inline-block" title="Receipt not available yet" aria-label={`Receipt ${inv.id} not available`}>
                          <Download className="w-3.5 h-3.5 inline" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutPlan && (
        <CheckoutModal
          planId={checkoutPlan}
          cycle={cycle}
          onConfirm={() => upgradePlan(checkoutPlan, cycle)}
          onClose={() => setCheckoutPlan(null)}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <CancelConfirmModal
          onConfirm={cancelSubscription}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
};
