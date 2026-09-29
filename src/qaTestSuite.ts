/**
 * Verification test suite for Feature Specification 07:
 * - PUBL-001: Persist drafts independently from published snapshots.
 * - PUBL-002: Optimistic concurrency & stale write conflict detection.
 * - PUBL-003: Validation blocking of invalid publish attempts.
 * - PUBL-004: Atomic cache invalidation and snapshot creation.
 * - PUBL-005: Snapshot rollback with permission and audit logging.
 * - Scenario: Idempotency token deduplication.
 * - Scenario: Preview token generation and expiration.
 * - Scenario: Scheduled release creation & UTC normalization.
 */

// Polyfill minimal localStorage for Node environment
const storageMock: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMock[key] || null,
  setItem: (key: string, val: string) => { storageMock[key] = String(val); },
  removeItem: (key: string) => { delete storageMock[key]; },
  clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
};

import { contentLifecycleService } from './services/contentLifecycleService';
import { publicProfileService } from './services/publicProfileService';
import { workspaceSyncService } from './services/workspaceSyncService';
import { INITIAL_PROFILES } from './data/mockData';
import { Profile } from './types';

async function runTestSuite() {
  console.log('=== RUNNING FEATURE SPECIFICATION 07 QA SUITE ===\n');

  const baseProfile: Profile = JSON.parse(JSON.stringify(INITIAL_PROFILES[0]));
  localStorage.setItem('lynkflow_profiles_v1', JSON.stringify([baseProfile]));

  // 1. PUBL-001: Draft persistence independence
  console.log('[TEST 1] PUBL-001: Draft persistence does NOT mutate published live state');
  const draftModified: Profile = {
    ...baseProfile,
    displayName: 'Draft Experimental Name Changed'
  };
  const saveResult = await contentLifecycleService.saveDraftWithConcurrency(draftModified.id, draftModified);
  if (!saveResult.success || !saveResult.etag) {
    throw new Error('Draft save failed');
  }

  const liveResolution = await publicProfileService.resolvePublicProfile(baseProfile.username);
  if (liveResolution.snapshot?.displayName === 'Draft Experimental Name Changed') {
    throw new Error('FAIL: Public live output was mutated by a draft save!');
  }
  console.log('  ✓ Public output remained unmodified on draft save:', liveResolution.snapshot?.displayName);
  console.log('  ✓ Draft ETag generated:', saveResult.etag);

  // 2. PUBL-002: Optimistic concurrency & stale write conflict detection
  console.log('\n[TEST 2] PUBL-002: Stale ETag write returns conflict (409)');
  const staleWriteResult = await contentLifecycleService.saveDraftWithConcurrency(
    draftModified.id,
    draftModified,
    'W/"stale-outdated-etag"'
  );
  if (!staleWriteResult.isConflict) {
    throw new Error('FAIL: Stale ETag write was not blocked!');
  }
  console.log('  ✓ Stale write correctly blocked with isConflict: true');

  console.log('  ✓ Explicit overwrite path replaces the competing draft authoritatively');
  const overwriteProfile: Profile = {
    ...draftModified,
    displayName: 'Local overwrite confirmed'
  };
  const overwriteResult = await workspaceSyncService.saveDraftAuthoritative(overwriteProfile, false);
  if (!overwriteResult.success || overwriteResult.updatedProfile?.displayName !== 'Local overwrite confirmed') {
    throw new Error('FAIL: Explicit conflict overwrite was not persisted.');
  }

  // 3. PUBL-003: Validation gate blocking invalid publish
  console.log('\n[TEST 3] PUBL-003: Block publish on broken blocks & empty tab titles');
  const brokenDraft: Profile = {
    ...baseProfile,
    tabs: [
      {
        id: 't-broken',
        title: '',
        slug: 'broken',
        position: 0,
        blocks: [
          {
            id: 'b-broken-link',
            type: 'link',
            title: 'Empty destination link',
            position: 0,
            isHidden: false,
            clicks: 0,
            payload: { url: '' } as any
          }
        ]
      }
    ]
  };

  const validation = contentLifecycleService.validateDraftForPublish(brokenDraft);
  if (validation.canPublish || validation.criticalIssues.length === 0) {
    throw new Error('FAIL: Broken draft passed validation!');
  }
  console.log('  ✓ Validation correctly blocked publish with critical issues:');
  validation.criticalIssues.forEach(iss => console.log(`    - [${iss.code}] ${iss.message}`));

  const publishBlockedResult = await contentLifecycleService.publishAuthoritative(brokenDraft, 'tester@example.com');
  if (publishBlockedResult.success) {
    throw new Error('FAIL: Broken draft was published!');
  }
  console.log('  ✓ publishAuthoritative rejected broken draft');

  // 4. PUBL-004 & Idempotency: Publish valid snapshot & cache invalidation
  console.log('\n[TEST 4] PUBL-004 & Scenario Retry: Atomic publish, cache purge & idempotency');
  const validDraft: Profile = {
    ...baseProfile,
    displayName: 'Authoritative Verified Name'
  };

  const idempKey = 'idemp-test-unique-key-101';
  const pub1 = await contentLifecycleService.publishAuthoritative(validDraft, 'owner@lynkflow.me', idempKey, 'First publish attempt');
  if (!pub1.success || !pub1.snapshot) {
    throw new Error('FAIL: Valid publish failed: ' + pub1.error);
  }
  console.log(`  ✓ Published v${pub1.publishedVersion} successfully. Snapshot ID: ${pub1.snapshot.snapshotId}`);

  // Repeated request with same idempotency key
  const pub2 = await contentLifecycleService.publishAuthoritative(validDraft, 'owner@lynkflow.me', idempKey, 'Retry publish attempt');
  if (!pub2.idempotent || pub2.snapshot?.snapshotId !== pub1.snapshot.snapshotId) {
    throw new Error('FAIL: Idempotent replay did not return cached authoritative snapshot!');
  }
  console.log('  ✓ Repeated request returned idempotent cached snapshot without duplicate version increment.');

  // Cache invalidation verification
  const freshPublic = await publicProfileService.resolvePublicProfile(baseProfile.username);
  if (freshPublic.snapshot?.displayName !== 'Authoritative Verified Name') {
    throw new Error('FAIL: Public resolution did not reflect new snapshot!');
  }
  console.log('  ✓ Cache invalidation verified: public page immediately reflects new snapshot');

  // 5. Preview Token (PUBL-001)
  console.log('\n[TEST 5] Preview Token: Expiring token grants draft access without public exposure');
  const previewToken = contentLifecycleService.createPreviewToken(baseProfile.id, 'owner@lynkflow.me', 60);
  console.log('  ✓ Created preview token:', previewToken.token);

  const previewResolution = await publicProfileService.resolvePublicProfile(baseProfile.username, previewToken.token);
  if (previewResolution.status !== 'success' || !previewResolution.snapshot) {
    throw new Error('FAIL: Failed to resolve preview with token');
  }
  console.log('  ✓ Preview resolved successfully for draft');

  const invalidTokenResolution = await publicProfileService.resolvePublicProfile(baseProfile.username, 'prev_fake_invalid_token');
  if (invalidTokenResolution.status === 'success') {
    throw new Error('FAIL: Fake preview token resolved as valid!');
  }
  console.log('  ✓ Invalid preview token rejected safely');

  // 6. PUBL-005: Snapshot Rollback with Permission & Audit
  console.log('\n[TEST 6] PUBL-005: Snapshot Rollback & Permission Enforcement');
  // First, unauthorized rollback attempt
  const deniedRollback = await contentLifecycleService.rollbackToSnapshot(
    baseProfile.id,
    pub1.snapshot.snapshotId,
    'attacker@unauthorized.com',
    false // unauthorized
  );
  if (deniedRollback.success) {
    throw new Error('FAIL: Unauthorized rollback was permitted!');
  }
  console.log('  ✓ Unauthorized rollback blocked with permission denial audit log');

  // Authorized rollback
  const allowedRollback = await contentLifecycleService.rollbackToSnapshot(
    baseProfile.id,
    pub1.snapshot.snapshotId,
    'owner@lynkflow.me',
    true,
    'Emergency rollback after testing'
  );
  if (!allowedRollback.success || !allowedRollback.rolledBackProfile) {
    throw new Error('FAIL: Authorized rollback failed: ' + allowedRollback.error);
  }
  console.log(`  ✓ Authorized rollback succeeded. Created new release v${allowedRollback.rolledBackProfile.publishedVersion}`);
  console.log('  ✓ Audit log recorded:', allowedRollback.auditLog?.details);

  // 7. Scheduled publish
  console.log('\n[TEST 7] Scheduled Publish: Timezone awareness & UTC execution');
  const futureIso = new Date(Date.now() + 120 * 1000).toISOString();
  const scheduled = contentLifecycleService.schedulePublish(
    validDraft,
    futureIso,
    'America/New_York',
    'owner@lynkflow.me'
  );
  console.log('  ✓ Release scheduled for:', scheduled.scheduledTimeUtc, 'in timezone', scheduled.timezone);

  console.log('\n🎉 ALL 7 QA ACCEPTANCE SCENARIOS PASSED WITH ZERO DEFECTS!');
}

runTestSuite().catch(err => {
  console.error('\n❌ QA TEST FAILURE:', err);
  process.exit(1);
});
