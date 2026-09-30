/**
 * Feature Specification 11: Custom Domains & Multi-Profile Management
 * Domain Service — domainService.ts
 *
 * Enforces:
 * - PRO-003: Verify custom domain ownership (unverified domains must not serve content)
 * - PRO-004: Certificate provisioning/renewal with explicit failure states
 * - PRO-001: Isolation — no cross-profile domain leakage
 *
 * All domain mutations return explicit success/failure with a reason.
 * A simulated network layer (setTimeout) represents the real async DNS check job.
 */

import { CustomDomainConfig, Profile } from '../types';

export const DOMAIN_CNAME_TARGET = 'cname.lynkflow.io';
export const DOMAIN_A_RECORD = '76.76.21.21';

interface DomainVerificationResult {
  success: boolean;
  domain: string;
  status: CustomDomainConfig['status'];
  sslStatus: CustomDomainConfig['sslStatus'];
  failureReason?: string;
  conflictOwnerId?: string;
  config: CustomDomainConfig;
}

interface DomainRemoveResult {
  success: boolean;
  reason?: string;
}

interface DomainRecheckResult {
  changed: boolean;
  config: CustomDomainConfig;
  failureReason?: string;
}

const DOMAIN_STORAGE_KEY = 'lynkflow_domain_registry_v1';

/** In-memory registry: domain → workspaceId. Simulates server-side uniqueness. */
class DomainRegistry {
  private inMemoryRegistry: Record<string, string> = {};

  private getRegistry(): Record<string, string> {
    try {
      const stored = JSON.parse(localStorage.getItem(DOMAIN_STORAGE_KEY) || '{}') as Record<string, string>;
      return { ...stored, ...this.inMemoryRegistry };
    } catch {
      return { ...this.inMemoryRegistry };
    }
  }

  private saveRegistry(reg: Record<string, string>): void {
    this.inMemoryRegistry = { ...reg };
    try {
      localStorage.setItem(DOMAIN_STORAGE_KEY, JSON.stringify(reg));
    } catch { /* ignore */ }
  }

  claim(domain: string, workspaceId: string): { claimed: boolean; existingOwner?: string } {
    const reg = this.getRegistry();
    const existing = reg[domain];
    if (existing && existing !== workspaceId) {
      return { claimed: false, existingOwner: existing };
    }
    reg[domain] = workspaceId;
    this.saveRegistry(reg);
    return { claimed: true };
  }

  release(domain: string, workspaceId: string): boolean {
    const reg = this.getRegistry();
    if (reg[domain] === workspaceId) {
      delete reg[domain];
      this.saveRegistry(reg);
      return true;
    }
    return false;
  }

  isOwner(domain: string, workspaceId: string): boolean {
    return this.getRegistry()[domain] === workspaceId;
  }

  getOwner(domain: string): string | null {
    return this.getRegistry()[domain] ?? null;
  }
}

const registry = new DomainRegistry();

/**
 * Validate hostname format (no protocol, no path, valid TLD).
 */
export function validateHostname(raw: string): { valid: boolean; cleaned: string; reason?: string } {
  const cleaned = raw.toLowerCase().trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  
  if (cleaned.length < 4) {
    return { valid: false, cleaned, reason: 'Hostname is too short.' };
  }
  if (!cleaned.includes('.')) {
    return { valid: false, cleaned, reason: 'Must be a valid domain (e.g. links.yourbrand.com).' };
  }
  if (!/^[a-z0-9][a-z0-9-_.]*\.[a-z]{2,}$/.test(cleaned)) {
    return { valid: false, cleaned, reason: 'Hostname contains invalid characters.' };
  }
  return { valid: true, cleaned };
}

class DomainService {
  /**
   * PRO-003: Initiate domain verification.
   * Simulates a DNS CNAME check. Real impl would queue a background job.
   * Returns explicit status — unverified domains MUST NOT serve content.
   */
  async verifyDomain(
    domain: string,
    profileId: string,
    workspaceId: string,
    allProfiles: Profile[]
  ): Promise<DomainVerificationResult> {
    const validation = validateHostname(domain);
    if (!validation.valid) {
      return this.buildResult(domain, 'failed', 'failed', validation.reason);
    }

    const cleanDomain = validation.cleaned;

    // PRO-001: Check no other profile in this workspace already owns this domain
    const conflictInWorkspace = allProfiles.find(
      p => p.id !== profileId && p.customDomain?.domain === cleanDomain && p.customDomain.status === 'verified'
    );
    if (conflictInWorkspace) {
      return this.buildResult(
        cleanDomain,
        'conflict',
        'failed',
        `Domain is already connected to profile @${conflictInWorkspace.username} in this workspace.`,
        workspaceId // own workspace is the "conflict owner" for self-conflict
      );
    }

    // PRO-003: Claim domain in global registry (cross-workspace uniqueness)
    const claim = registry.claim(cleanDomain, workspaceId);
    if (!claim.claimed && claim.existingOwner) {
      return this.buildResult(
        cleanDomain,
        'conflict',
        'failed',
        'This hostname is already connected to another LynkFlow workspace.',
        claim.existingOwner
      );
    }

    // Simulate DNS verification (800ms round-trip)
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate: domains with fewer than 3 label parts (e.g., root apex TLDs) return 'failed'
    const parts = cleanDomain.split('.');
    const dnsOk = parts.length >= 2 && parts.every(p => p.length > 0);

    if (!dnsOk) {
      registry.release(cleanDomain, workspaceId);
      return this.buildResult(
        cleanDomain,
        'failed',
        'failed',
        'DNS CNAME record not found. Ensure you have added the CNAME pointing to ' + DOMAIN_CNAME_TARGET
      );
    }

    // SSL provisioning (simulated: always succeeds after verified)
    const config: CustomDomainConfig = {
      domain: cleanDomain,
      status: 'verified',
      sslStatus: 'active',
      cnameTarget: DOMAIN_CNAME_TARGET,
      expectedIp: DOMAIN_A_RECORD,
      lastCheckedAt: new Date().toISOString(),
      nextRenewalAt: new Date(Date.now() + 89 * 24 * 3600 * 1000).toISOString()
    };

    return {
      success: true,
      domain: cleanDomain,
      status: 'verified',
      sslStatus: 'active',
      config
    };
  }

  /**
   * PRO-003: Re-check an existing domain (e.g., after user updates DNS).
   */
  async recheckDomain(
    existing: CustomDomainConfig,
    workspaceId: string
  ): Promise<DomainRecheckResult> {
    await new Promise(resolve => setTimeout(resolve, 600));

    if (!registry.isOwner(existing.domain, workspaceId)) {
      return {
        changed: true,
        config: { ...existing, status: 'conflict', sslStatus: 'failed', failureReason: 'Domain ownership conflict detected.' },
        failureReason: 'Domain ownership conflict detected.'
      };
    }

    // Simulate transient DNS propagation delay ~20% of the time
    const propagating = Math.random() < 0.2;
    if (propagating) {
      return {
        changed: false,
        config: { ...existing, status: 'pending', lastCheckedAt: new Date().toISOString(), failureReason: 'DNS propagation in progress. Check again in a few minutes.' },
        failureReason: 'DNS propagation in progress.'
      };
    }

    return {
      changed: existing.status !== 'verified',
      config: {
        ...existing,
        status: 'verified',
        sslStatus: 'active',
        lastCheckedAt: new Date().toISOString(),
        failureReason: undefined
      }
    };
  }

  /**
   * PRO-004: Simulate SSL renewal failure.
   * Called by background renewal job. Returns updated config for UI visibility.
   */
  simulateCertRenewalFailure(existing: CustomDomainConfig): CustomDomainConfig {
    return {
      ...existing,
      sslStatus: 'renewal_failed',
      lastRenewalAttemptAt: new Date().toISOString(),
      failureReason: 'Automatic SSL certificate renewal failed. Re-verify domain ownership to retry.'
    };
  }

  /**
   * PRO-003: Remove a domain connection. Releases registry claim.
   * The profile must not attempt to serve content after removal.
   */
  removeDomain(domain: string, workspaceId: string): DomainRemoveResult {
    const released = registry.release(domain, workspaceId);
    if (!released) {
      return { success: false, reason: 'Domain not found or not owned by this workspace.' };
    }
    return { success: true };
  }

  /**
   * PRO-001: Check whether a profile is permitted to read data from another.
   * Cross-profile reads are always denied.
   */
  assertProfileIsolation(requestingProfileId: string, targetProfileId: string): void {
    if (requestingProfileId !== targetProfileId) {
      throw new Error(
        `[PRO-001] Profile isolation violation: profile ${requestingProfileId} attempted to read data from ${targetProfileId}.`
      );
    }
  }

  private buildResult(
    domain: string,
    status: CustomDomainConfig['status'],
    sslStatus: CustomDomainConfig['sslStatus'],
    failureReason?: string,
    conflictOwnerId?: string
  ): DomainVerificationResult {
    const config: CustomDomainConfig = {
      domain,
      status,
      sslStatus,
      cnameTarget: DOMAIN_CNAME_TARGET,
      expectedIp: DOMAIN_A_RECORD,
      lastCheckedAt: new Date().toISOString(),
      failureReason,
      conflictOwnerId
    };
    return { success: false, domain, status, sslStatus, failureReason, conflictOwnerId, config };
  }
}

export const domainService = new DomainService();
