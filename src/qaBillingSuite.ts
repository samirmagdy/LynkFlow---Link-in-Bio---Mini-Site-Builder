/**
 * Feature Specification 10: Billing Plans and Entitlements
 * QA Test Suite — qaBillingSuite.ts
 *
 * Validates:
 *   BIL-001  Server-controlled plan catalog
 *   BIL-002  Idempotent webhook processing
 *   BIL-003  Feature gating (entitlement checks)
 *   BIL-004  Billing lifecycle (trial, renewal, failure, grace, cancel)
 *   BIL-005  Non-destructive downgrade protection
 *
 * Usage (browser console):
 *   import { runBillingSuite } from './qaBillingSuite';
 *   runBillingSuite().then(console.table);
 */

// Minimal storage polyfill for Node runtime
if (typeof localStorage === 'undefined' || !localStorage.getItem) {
  const memoryStorage: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => { memoryStorage[key] = String(val); },
    removeItem: (key: string) => { delete memoryStorage[key]; },
    clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
  };
}

import { billingService, BILLING_STORAGE_KEYS } from './services/billingService';
import { Workspace, ProviderWebhookPayload, PlanType } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: `ws-qa-${Date.now()}`,
    name: 'QA Workspace',
    plan: 'free',
    billingCycle: 'annual',
    status: 'active',
    profiles: [],
    invoices: [],
    ...overrides
  };
}

function makeWebhook(
  type: ProviderWebhookPayload['type'],
  workspaceId: string,
  planId: PlanType = 'pro',
  extra: Partial<ProviderWebhookPayload['data']> = {}
): ProviderWebhookPayload {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    created: Date.now(),
    data: {
      workspaceId,
      customerId: `cus_qa_${Math.random().toString(36).substr(2, 6)}`,
      planId,
      billingCycle: 'annual',
      status: 'active',
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      amountPaid: '$84.00',
      ...extra
    }
  };
}

interface TestResult {
  id: string;
  description: string;
  status: 'PASS' | 'FAIL';
  detail?: string;
}

function assert(
  results: TestResult[],
  id: string,
  description: string,
  condition: boolean,
  detail?: string
) {
  results.push({
    id,
    description,
    status: condition ? 'PASS' : 'FAIL',
    detail
  });
  if (!condition) {
    console.error(`[QA FAIL] ${id}: ${description}`, detail);
  }
}

// ─── BIL-001: Plan Catalog ────────────────────────────────────────────────────

function testPlanCatalog(results: TestResult[]): void {
  const catalog = billingService.getPlanCatalog();

  assert(results, 'BIL-001-A', 'Plan catalog returns at least 3 plans', catalog.length >= 3);
  assert(results, 'BIL-001-B', 'Catalog includes "free" plan', catalog.some(p => p.id === 'free'));
  assert(results, 'BIL-001-C', 'Catalog includes "pro" plan', catalog.some(p => p.id === 'pro'));
  assert(results, 'BIL-001-D', 'Catalog includes "agency" plan', catalog.some(p => p.id === 'agency'));

  const pro = billingService.getPlanConfig('pro');
  assert(results, 'BIL-001-E', 'Pro plan has a monthlyPrice > 0', pro.monthlyPrice > 0, `Got: ${pro.monthlyPrice}`);
  assert(results, 'BIL-001-F', 'Pro plan annual price is less than 12x monthly', pro.annualBilledTotal < pro.monthlyPrice * 12, `${pro.annualBilledTotal} < ${pro.monthlyPrice * 12}`);

  try {
    billingService.getPlanConfig('invalid_plan' as PlanType);
    assert(results, 'BIL-001-G', 'getPlanConfig throws for unknown plan', false, 'Expected error not thrown');
  } catch {
    assert(results, 'BIL-001-G', 'getPlanConfig throws for unknown plan', true);
  }
}

// ─── BIL-002: Idempotent Webhook Processing ───────────────────────────────────

function testWebhookIdempotency(results: TestResult[]): void {
  // Clear state
  localStorage.removeItem(BILLING_STORAGE_KEYS.PROCESSED_WEBHOOKS);
  localStorage.removeItem(BILLING_STORAGE_KEYS.WORKSPACE);

  const ws = makeWorkspace({ id: 'ws-idempotency-test' });
  localStorage.setItem(BILLING_STORAGE_KEYS.WORKSPACE, JSON.stringify(ws));

  const event = makeWebhook('checkout.session.completed', ws.id, 'pro');

  const r1 = billingService.processWebhookEvent(event);
  assert(results, 'BIL-002-A', 'First webhook event is processed successfully', r1.success, r1.message);
  assert(results, 'BIL-002-B', 'First webhook is not a duplicate', !r1.duplicate);
  assert(results, 'BIL-002-C', 'Workspace plan updated to pro after checkout', r1.updatedWorkspace?.plan === 'pro', `Got: ${r1.updatedWorkspace?.plan}`);

  const r2 = billingService.processWebhookEvent(event);
  assert(results, 'BIL-002-D', 'Second identical webhook is flagged as duplicate', r2.duplicate, r2.message);
  assert(results, 'BIL-002-E', 'Duplicate webhook still returns success=true', r2.success);
  assert(results, 'BIL-002-F', 'Duplicate webhook returns no updatedWorkspace mutation', r2.updatedWorkspace === undefined);

  // Signature verification failure
  const badSig = billingService.processWebhookEvent(
    makeWebhook('invoice.payment_succeeded', ws.id),
    'invalid_signature'
  );
  assert(results, 'BIL-002-G', 'Invalid signature webhook rejected', !badSig.success, badSig.message);
}

// ─── BIL-003: Feature Entitlement Gating ─────────────────────────────────────

function testEntitlementGating(results: TestResult[]): void {
  const freeWs = makeWorkspace({ plan: 'free', profiles: new Array(1).fill({ id: 'p1' }) as unknown[] as [] });
  const proWs  = makeWorkspace({ plan: 'pro',  profiles: [] });

  // Free plan: max 1 profile
  const addProfile = billingService.checkFeatureEntitlement(freeWs, 'create_profile', { currentProfileCount: 1 });
  assert(results, 'BIL-003-A', 'Free plan blocks adding profile at limit', !addProfile.allowed, addProfile.reason);
  assert(results, 'BIL-003-B', 'Free plan block includes upgradeRequiredPlan', addProfile.upgradeRequiredPlan === 'pro');

  const addUnder = billingService.checkFeatureEntitlement(freeWs, 'create_profile', { currentProfileCount: 0 });
  assert(results, 'BIL-003-C', 'Free plan allows first profile', addUnder.allowed);

  // Custom domain gating
  const domFree = billingService.checkFeatureEntitlement(freeWs, 'custom_domain');
  assert(results, 'BIL-003-D', 'Free plan blocks custom_domain', !domFree.allowed);

  const domPro = billingService.checkFeatureEntitlement(proWs, 'custom_domain');
  assert(results, 'BIL-003-E', 'Pro plan allows custom_domain', domPro.allowed);

  // Lead form gating
  const formFree = billingService.checkFeatureEntitlement(freeWs, 'lead_form');
  assert(results, 'BIL-003-F', 'Free plan blocks lead_form', !formFree.allowed);

  const formPro = billingService.checkFeatureEntitlement(proWs, 'lead_form');
  assert(results, 'BIL-003-G', 'Pro plan allows lead_form', formPro.allowed);

  // Analytics history
  const hist7Free = billingService.checkFeatureEntitlement(freeWs, 'analytics_history', { requestedHistoryDays: 7 });
  assert(results, 'BIL-003-H', 'Free plan allows ≤7 day analytics', hist7Free.allowed);

  const hist30Free = billingService.checkFeatureEntitlement(freeWs, 'analytics_history', { requestedHistoryDays: 30 });
  assert(results, 'BIL-003-I', 'Free plan blocks >7 day analytics', !hist30Free.allowed);

  const hist365Pro = billingService.checkFeatureEntitlement(proWs, 'analytics_history', { requestedHistoryDays: 365 });
  assert(results, 'BIL-003-J', 'Pro plan allows 365 day analytics', hist365Pro.allowed);

  // Canceled subscription falls back to free entitlements
  const canceledPastEnd: Workspace = {
    ...makeWorkspace({ plan: 'pro', status: 'canceled' }),
    currentPeriodEnd: new Date(Date.now() - 1000).toISOString() // expired
  };
  const domCanceled = billingService.checkFeatureEntitlement(canceledPastEnd, 'custom_domain');
  assert(results, 'BIL-003-K', 'Expired canceled subscription falls back to free entitlements', !domCanceled.allowed, domCanceled.reason);
}

// ─── BIL-004: Billing Lifecycle ───────────────────────────────────────────────

function testBillingLifecycle(results: TestResult[]): void {
  localStorage.removeItem(BILLING_STORAGE_KEYS.PROCESSED_WEBHOOKS);
  const ws = makeWorkspace({ id: 'ws-lifecycle-test' });
  localStorage.setItem(BILLING_STORAGE_KEYS.WORKSPACE, JSON.stringify(ws));

  // Payment succeeded → active, invoice appended
  const successEvt = makeWebhook('invoice.payment_succeeded', ws.id, 'pro');
  const r1 = billingService.processWebhookEvent(successEvt);
  assert(results, 'BIL-004-A', 'Payment succeeded sets status to active', r1.updatedWorkspace?.status === 'active', `Got: ${r1.updatedWorkspace?.status}`);
  assert(results, 'BIL-004-B', 'Payment succeeded appends a paid invoice', r1.updatedWorkspace?.invoices[0]?.status === 'paid');

  // Payment failed → past_due, grace period set
  const failEvt = makeWebhook('invoice.payment_failed', ws.id, 'pro');
  localStorage.setItem(BILLING_STORAGE_KEYS.WORKSPACE, JSON.stringify(r1.updatedWorkspace));
  const r2 = billingService.processWebhookEvent(failEvt);
  assert(results, 'BIL-004-C', 'Payment failed sets status to past_due', r2.updatedWorkspace?.status === 'past_due', `Got: ${r2.updatedWorkspace?.status}`);
  assert(results, 'BIL-004-D', 'Payment failed sets gracePeriodEndsAt', !!r2.updatedWorkspace?.gracePeriodEndsAt);
  assert(results, 'BIL-004-E', 'Payment failed appends a failed invoice', !!r2.updatedWorkspace?.invoices.some(i => i.status === 'failed'));

  // Payment succeeds after failure → clears grace period
  localStorage.setItem(BILLING_STORAGE_KEYS.WORKSPACE, JSON.stringify(r2.updatedWorkspace));
  const successAgain = makeWebhook('invoice.payment_succeeded', ws.id, 'pro');
  const r3 = billingService.processWebhookEvent(successAgain);
  assert(results, 'BIL-004-F', 'Successful payment after failure clears gracePeriodEndsAt', !r3.updatedWorkspace?.gracePeriodEndsAt, `Got: ${r3.updatedWorkspace?.gracePeriodEndsAt}`);
  assert(results, 'BIL-004-G', 'Successful payment after failure restores status active', r3.updatedWorkspace?.status === 'active');

  // Subscription deleted → canceled, cancelAtPeriodEnd true
  localStorage.setItem(BILLING_STORAGE_KEYS.WORKSPACE, JSON.stringify(r3.updatedWorkspace));
  const deleteEvt = makeWebhook('customer.subscription.deleted', ws.id, 'pro');
  const r4 = billingService.processWebhookEvent(deleteEvt);
  assert(results, 'BIL-004-H', 'Subscription deletion sets status to canceled', r4.updatedWorkspace?.status === 'canceled', `Got: ${r4.updatedWorkspace?.status}`);
  assert(results, 'BIL-004-I', 'Subscription deletion sets cancelAtPeriodEnd true', r4.updatedWorkspace?.cancelAtPeriodEnd === true);

  // cancelSubscription helper
  const activeWs: Workspace = makeWorkspace({ plan: 'pro', status: 'active' });
  const canceledWs = billingService.cancelSubscription(activeWs, 'qa@lynkflow.com');
  assert(results, 'BIL-004-J', 'cancelSubscription sets cancelAtPeriodEnd', canceledWs.cancelAtPeriodEnd === true);
  assert(results, 'BIL-004-K', 'cancelSubscription sets status canceled', canceledWs.status === 'canceled');
}

// ─── BIL-005: Downgrade Protection ───────────────────────────────────────────

function testDowngradeProtection(results: TestResult[]): void {
  // Agency workspace with 5 profiles downgrading to pro (limit: 3)
  const ws = makeWorkspace({
    plan: 'agency',
    status: 'active',
    profiles: [
      { id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'p5' }
    ] as unknown as []
  });

  const result = billingService.handleWorkspaceDowngrade(ws, 'pro', 'qa@lynkflow.com');
  assert(results, 'BIL-005-A', 'Downgrade succeeds', result.success);
  assert(results, 'BIL-005-B', 'Downgrade does not delete profiles', result.workspace.profiles.length === 5, `Got: ${result.workspace.profiles.length}`);
  assert(results, 'BIL-005-C', 'Downgrade reports over-limit count (2 profiles)', result.markedInactiveCount === 2, `Got: ${result.markedInactiveCount}`);
  assert(results, 'BIL-005-D', 'Downgraded plan is set to pro', result.workspace.plan === 'pro');

  // Free (limit: 1 profile) — should report 4 over-limit
  const resultToFree = billingService.handleWorkspaceDowngrade(ws, 'free', 'qa@lynkflow.com');
  assert(results, 'BIL-005-E', 'Downgrade to free preserves all 5 profiles', resultToFree.workspace.profiles.length === 5);
  assert(results, 'BIL-005-F', 'Downgrade to free reports 4 over-limit profiles', resultToFree.markedInactiveCount === 4, `Got: ${resultToFree.markedInactiveCount}`);

  // Agency (unlimited) — no over-limit profiles
  const resultToAgency = billingService.handleWorkspaceDowngrade(ws, 'agency', 'qa@lynkflow.com');
  assert(results, 'BIL-005-G', 'Upgrade to agency reports 0 over-limit', resultToAgency.markedInactiveCount === 0, `Got: ${resultToAgency.markedInactiveCount}`);
}

// ─── Checkout Session ─────────────────────────────────────────────────────────

function testCheckoutSession(results: TestResult[]): void {
  const session = billingService.createCheckoutSession({
    workspaceId: 'ws-checkout-test',
    planId: 'pro',
    billingCycle: 'annual',
    successUrl: 'https://app.lynkflow.com/billing?success=1',
    cancelUrl: 'https://app.lynkflow.com/billing?canceled=1',
    userEmail: 'qa@lynkflow.com'
  });

  assert(results, 'BIL-CS-A', 'Checkout session returns a sessionId', !!session.sessionId, session.sessionId);
  assert(results, 'BIL-CS-B', 'Checkout session returns a checkoutUrl', !!session.checkoutUrl && session.checkoutUrl.startsWith('https://'));
  assert(results, 'BIL-CS-C', 'Checkout session plan matches request', session.planId === 'pro');
  assert(results, 'BIL-CS-D', 'Checkout session has future expiry', session.expiresAt > Date.now());
  assert(results, 'BIL-CS-E', 'Annual checkout reflects annual billing total', session.amountDue.includes('84'));
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runBillingSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.group('%c🧾 Feature 10: Billing Plans & Entitlements — QA Suite', 'font-weight:bold;color:#818cf8');

  console.group('BIL-001 Plan Catalog');
  testPlanCatalog(results);
  console.groupEnd();

  console.group('BIL-002 Webhook Idempotency');
  testWebhookIdempotency(results);
  console.groupEnd();

  console.group('BIL-003 Entitlement Gating');
  testEntitlementGating(results);
  console.groupEnd();

  console.group('BIL-004 Billing Lifecycle');
  testBillingLifecycle(results);
  console.groupEnd();

  console.group('BIL-005 Downgrade Protection');
  testDowngradeProtection(results);
  console.groupEnd();

  console.group('BIL-CS Checkout Session');
  testCheckoutSession(results);
  console.groupEnd();

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`\n✅ Passed: ${passed} | ❌ Failed: ${failed} | Total: ${results.length}`);
  if (failed > 0) {
    console.error('Failed tests:', results.filter(r => r.status === 'FAIL').map(r => `${r.id}: ${r.description}`));
  }
  console.groupEnd();

  return results;
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('qaBillingSuite')) {
  runBillingSuite().then(results => {
    const failed = results.filter(r => r.status === 'FAIL').length;
    if (failed > 0) process.exit(1);
  });
}
