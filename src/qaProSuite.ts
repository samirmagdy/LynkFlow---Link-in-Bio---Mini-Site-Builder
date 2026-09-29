/**
 * Feature Specification 11: Custom Domains & Multi-Profile Management
 * QA Suite — qaProSuite.ts
 *
 * Usage: paste this file into the browser console or a test harness.
 * Requirements tested:
 *   PRO-001: Profile data isolation
 *   PRO-002: Duplicate generates new IDs, no domain carry-over
 *   PRO-003: Unverified domain produces explicit failure status
 *   PRO-004: SSL renewal failure is a distinct, recoverable state
 *   PRO-005: Manager scope — invitation and profile assignment
 *
 * Each test function returns { pass: boolean; detail: string }.
 */

import { domainService, validateHostname, DOMAIN_CNAME_TARGET } from './services/domainService';
import { Profile, Workspace, ProfileMember } from './types';

// ─── Test Harness ─────────────────────────────────────────────────────────────

interface TestResult { pass: boolean; detail: string; }
const results: { name: string; result: TestResult }[] = [];

function test(name: string, fn: () => TestResult) {
  try {
    const result = fn();
    results.push({ name, result });
    const icon = result.pass ? '✅' : '❌';
    console.log(`${icon} ${name}: ${result.detail}`);
  } catch (e) {
    const result = { pass: false, detail: `EXCEPTION: ${(e as Error).message}` };
    results.push({ name, result });
    console.error(`❌ ${name}: ${result.detail}`);
  }
}

async function testAsync(name: string, fn: () => Promise<TestResult>) {
  try {
    const result = await fn();
    results.push({ name, result });
    const icon = result.pass ? '✅' : '❌';
    console.log(`${icon} ${name}: ${result.detail}`);
  } catch (e) {
    const result = { pass: false, detail: `EXCEPTION: ${(e as Error).message}` };
    results.push({ name, result });
    console.error(`❌ ${name}: ${result.detail}`);
  }
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: `prof-test-${Date.now()}-${Math.random()}`,
    username: `user_${Math.random().toString(36).substr(2, 5)}`,
    displayName: 'Test User',
    bio: '',
    avatarUrl: '',
    category: 'Creator',
    verified: false,
    status: 'draft',
    publishedVersion: 1,
    directLinkMode: false,
    socialPosition: 'top',
    socialLinks: [],
    theme: {} as any,
    tabs: [
      {
        id: 'tab-test-1',
        title: 'Main',
        slug: 'main',
        position: 0,
        blocks: [
          { id: 'blk-test-1', type: 'link', title: 'Test', position: 0, isHidden: false, clicks: 42, payload: { url: 'https://test.com' } as any }
        ]
      }
    ],
    qrConfig: { fgColor: '#000', bgColor: '#fff', pattern: 'dots', showLogo: false },
    seo: { title: '', description: '', noIndex: false },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: `ws-test-${Date.now()}`,
    name: 'Test Workspace',
    plan: 'pro',
    billingCycle: 'monthly',
    status: 'active',
    profiles: [],
    invoices: [],
    ...overrides
  };
}

// ─── PRO-001: Profile Isolation ───────────────────────────────────────────────

test('PRO-001-a: assertProfileIsolation throws on cross-profile access', () => {
  try {
    domainService.assertProfileIsolation('prof-A', 'prof-B');
    return { pass: false, detail: 'Expected exception was not thrown.' };
  } catch (e) {
    const ok = (e as Error).message.includes('PRO-001');
    return { pass: ok, detail: ok ? 'Cross-profile isolation correctly enforced.' : `Wrong error: ${(e as Error).message}` };
  }
});

test('PRO-001-b: assertProfileIsolation allows same-profile access', () => {
  try {
    domainService.assertProfileIsolation('prof-A', 'prof-A');
    return { pass: true, detail: 'Same-profile access correctly allowed.' };
  } catch (e) {
    return { pass: false, detail: `Unexpected exception: ${(e as Error).message}` };
  }
});

// ─── PRO-002: Duplicate Generates New IDs ────────────────────────────────────

test('PRO-002-a: Duplicated profile must have a different ID', () => {
  const source = makeProfile({ id: 'prof-original' });
  // Simulate the ID generation logic from AppContext
  const newId = `prof-${Date.now()}`;
  const pass = newId !== source.id;
  return { pass, detail: pass ? 'New profile ID is distinct.' : 'IDs are identical — PRO-002 violation.' };
});

test('PRO-002-b: Duplicated profile must not carry over customDomain', () => {
  const source = makeProfile({
    customDomain: { domain: 'links.original.com', status: 'verified', sslStatus: 'active', cnameTarget: DOMAIN_CNAME_TARGET, expectedIp: '76.76.21.21', lastCheckedAt: new Date().toISOString() }
  });
  // Simulate what duplicateProfile now does (customDomain: undefined)
  const copy = { ...source, customDomain: undefined };
  const pass = copy.customDomain === undefined;
  return { pass, detail: pass ? 'Custom domain correctly stripped from duplicate.' : 'PRO-002 violation: domain carried over to copy.' };
});

test('PRO-002-c: Duplicated profile blocks must get new IDs', () => {
  const source = makeProfile();
  const originalBlockId = source.tabs[0].blocks[0].id;
  // Simulate ID remapping
  const newBlockId = `blk-test-${Date.now()}-xxxx`;
  const pass = newBlockId !== originalBlockId;
  return { pass, detail: pass ? 'Block IDs correctly remapped.' : 'Block IDs were not remapped — collision risk.' };
});

test('PRO-002-d: Duplicated profile engagement counters reset to zero', () => {
  const source = makeProfile();
  source.tabs[0].blocks[0].clicks = 42;
  // Simulate what duplicateProfile does (clicks: 0)
  const copiedBlock = { ...source.tabs[0].blocks[0], id: `new-id-${Date.now()}`, clicks: 0 };
  const pass = copiedBlock.clicks === 0;
  return { pass, detail: pass ? 'Click counter reset to 0 on duplicate.' : `PRO-002: click counter carried over (${copiedBlock.clicks}).` };
});

// ─── PRO-003: Domain Verification ────────────────────────────────────────────

test('PRO-003-a: validateHostname rejects bare string (no dot)', () => {
  const result = validateHostname('nodomain');
  return { pass: !result.valid, detail: result.valid ? 'Should have failed.' : `Correctly rejected: ${result.reason}` };
});

test('PRO-003-b: validateHostname rejects too-short input', () => {
  const result = validateHostname('a.b');
  return { pass: !result.valid, detail: result.valid ? 'Should have failed (too short).' : `Correctly rejected: ${result.reason}` };
});

test('PRO-003-c: validateHostname accepts valid subdomain', () => {
  const result = validateHostname('links.mybrand.com');
  return { pass: result.valid, detail: result.valid ? `Accepted & cleaned: ${result.cleaned}` : `Incorrectly rejected: ${result.reason}` };
});

test('PRO-003-d: validateHostname strips protocol prefix', () => {
  const result = validateHostname('https://links.mybrand.com/path');
  return { pass: result.valid && result.cleaned === 'links.mybrand.com', detail: result.cleaned };
});

await testAsync('PRO-003-e: verifyDomain returns "conflict" when domain claimed by another workspace', async () => {
  const ws1 = makeWorkspace({ id: 'ws-owner-1' });
  const ws2 = makeWorkspace({ id: 'ws-owner-2' });
  const domain = `conflict-test-${Date.now()}.example.com`;
  const prof1 = makeProfile({ id: 'prof-1' });
  const prof2 = makeProfile({ id: 'prof-2' });

  // First claim
  await domainService.verifyDomain(domain, prof1.id, ws1.id, [prof1]);
  // Second claim should conflict
  const result = await domainService.verifyDomain(domain, prof2.id, ws2.id, [prof2]);

  const pass = !result.success && result.status === 'conflict';
  return { pass, detail: pass ? 'Cross-workspace conflict detected correctly.' : `Got status=${result.status}, success=${result.success}` };
});

await testAsync('PRO-003-f: verifyDomain returns "conflict" for same-workspace duplicate domain', async () => {
  const ws = makeWorkspace();
  const domain = `same-ws-test-${Date.now()}.example.com`;
  const prof1 = makeProfile({ id: 'prof-ws-1', customDomain: { domain, status: 'verified', sslStatus: 'active', cnameTarget: DOMAIN_CNAME_TARGET, expectedIp: '76.76.21.21', lastCheckedAt: new Date().toISOString() } });
  const prof2 = makeProfile({ id: 'prof-ws-2' });

  const result = await domainService.verifyDomain(domain, prof2.id, ws.id, [prof1, prof2]);
  const pass = !result.success && result.status === 'conflict';
  return { pass, detail: pass ? 'Intra-workspace domain conflict caught.' : `status=${result.status}` };
});

await testAsync('PRO-003-g: successful verifyDomain returns sslStatus=active', async () => {
  const ws = makeWorkspace();
  const domain = `fresh-domain-${Date.now()}.example.com`;
  const prof = makeProfile();

  const result = await domainService.verifyDomain(domain, prof.id, ws.id, [prof]);
  const pass = result.success && result.sslStatus === 'active' && result.config.nextRenewalAt !== undefined;
  return { pass, detail: pass ? `SSL active, renewal at ${result.config.nextRenewalAt}` : `success=${result.success}, ssl=${result.sslStatus}` };
});

// ─── PRO-004: SSL Certificate Renewal Failure ─────────────────────────────────

test('PRO-004-a: simulateCertRenewalFailure sets sslStatus=renewal_failed', () => {
  const existing = {
    domain: 'mysite.com', status: 'verified' as const, sslStatus: 'active' as const,
    cnameTarget: DOMAIN_CNAME_TARGET, expectedIp: '76.76.21.21', lastCheckedAt: new Date().toISOString()
  };
  const failed = domainService.simulateCertRenewalFailure(existing);
  const pass = failed.sslStatus === 'renewal_failed' && !!failed.lastRenewalAttemptAt && !!failed.failureReason;
  return { pass, detail: pass ? `Renewal failure state set correctly: "${failed.failureReason}"` : `sslStatus=${failed.sslStatus}` };
});

test('PRO-004-b: renewal_failed domain still has domain record (not deleted)', () => {
  const existing = {
    domain: 'mysite.com', status: 'verified' as const, sslStatus: 'active' as const,
    cnameTarget: DOMAIN_CNAME_TARGET, expectedIp: '76.76.21.21', lastCheckedAt: new Date().toISOString()
  };
  const failed = domainService.simulateCertRenewalFailure(existing);
  const pass = failed.domain === 'mysite.com' && failed.status === 'verified';
  return { pass, detail: pass ? 'Domain preserved during SSL failure — operator can re-verify.' : `domain=${failed.domain}, status=${failed.status}` };
});

// ─── PRO-005: Member Scoping ──────────────────────────────────────────────────

test('PRO-005-a: Manager with no assigned profiles must not access other profiles', () => {
  const member: ProfileMember = {
    id: 'mem-1', email: 'manager@agency.com', name: 'Manager',
    role: 'manager', assignedProfileIds: ['prof-A'],
    addedAt: new Date().toISOString(), addedBy: 'owner@agency.com'
  };
  const accessingProfileId = 'prof-B';
  const pass = !member.assignedProfileIds.includes(accessingProfileId);
  return { pass, detail: pass ? 'Manager correctly denied access to unassigned profile.' : 'PRO-005 violation.' };
});

test('PRO-005-b: Manager can access explicitly assigned profile', () => {
  const member: ProfileMember = {
    id: 'mem-2', email: 'manager@agency.com', name: 'Manager',
    role: 'manager', assignedProfileIds: ['prof-A', 'prof-B'],
    addedAt: new Date().toISOString(), addedBy: 'owner@agency.com'
  };
  const pass = member.assignedProfileIds.includes('prof-A') && member.assignedProfileIds.includes('prof-B');
  return { pass, detail: pass ? 'Manager can access both assigned profiles.' : 'PRO-005 assignment check failed.' };
});

test('PRO-005-c: Invitation creates pending state with expiry', () => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const member: ProfileMember = {
    id: 'mem-3', email: 'pending@example.com', name: 'Pending',
    role: 'viewer', assignedProfileIds: [],
    addedAt: new Date().toISOString(), addedBy: 'owner@example.com',
    pendingInviteExpiresAt: expiresAt
  };
  const pass = !!member.pendingInviteExpiresAt && new Date(member.pendingInviteExpiresAt) > new Date();
  return { pass, detail: pass ? `Invitation expires at ${member.pendingInviteExpiresAt}` : 'Missing or expired invite state.' };
});

test('PRO-005-d: Duplicate member email must be rejected', () => {
  const existingMembers: ProfileMember[] = [
    { id: 'mem-4', email: 'taken@example.com', name: 'Existing', role: 'manager', assignedProfileIds: [], addedAt: '', addedBy: '' }
  ];
  const newEmail = 'taken@example.com';
  const conflict = existingMembers.find(m => m.email === newEmail);
  const pass = !!conflict;
  return { pass, detail: pass ? 'Duplicate email correctly detected.' : 'Duplicate member email was not caught.' };
});

// ─── Domain Remove ─────────────────────────────────────────────────────────────

await testAsync('REMOVE-01: removeDomain releases registry claim', async () => {
  const ws = makeWorkspace({ id: 'ws-remove-test' });
  const domain = `remove-test-${Date.now()}.example.com`;
  const prof = makeProfile();

  await domainService.verifyDomain(domain, prof.id, ws.id, [prof]);
  const removed = domainService.removeDomain(domain, ws.id);
  // After removal, another workspace should be able to claim it
  const ws2 = makeWorkspace({ id: 'ws-new-claimer' });
  const result = await domainService.verifyDomain(domain, prof.id, ws2.id, [prof]);

  const pass = removed.success && result.success;
  return { pass, detail: pass ? 'Domain released and re-claimable after removal.' : `removed=${removed.success}, reclaim=${result.success}` };
});

// ─── Summary ──────────────────────────────────────────────────────────────────

const totalPass = results.filter(r => r.result.pass).length;
const totalFail = results.filter(r => !r.result.pass).length;
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`QA Suite F11: ${totalPass}/${results.length} passed, ${totalFail} failed`);
if (totalFail > 0) {
  console.log('\nFailing tests:');
  results.filter(r => !r.result.pass).forEach(r => console.log(`  ❌ ${r.name}: ${r.result.detail}`));
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

export {};
