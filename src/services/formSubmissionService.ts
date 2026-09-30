/**
 * Feature Specification 09: Forms and Audience Capture Service
 * 
 * Enforces:
 * - FORM-001: Typed fields (text, email, phone, textarea, select, checkbox) and client/server validation.
 * - FORM-002: Store submissions securely with scoped access (raw responses never public).
 * - FORM-003: Consent metadata, honeypot abuse trap, payload size bounds (<=64KB), and sliding-window rate limiting.
 * - FORM-004: Subscriber mode for email capture (deduplicated audience list with opt-in status & timestamps).
 * - FORM-005: Response inbox query, filtering, GDPR deletion, and bounded CSV exports with operator audit logs.
 */

import { FormSubmission, Subscriber, FormBlockPayload, AuditLog } from '../types';
import { serializeCsv } from '../utils/csv';

export const FORM_STORAGE_KEYS = {
  SUBMISSIONS: 'lynkflow_submissions_v1',
  SUBSCRIBERS: 'lynkflow_subscribers_v1',
  AUDIT: 'lynkflow_audit_logs_v1',
  RATE_LIMITS: 'lynkflow_form_ratelimits_v1'
};

interface FormSubmissionRequest {
  profileId: string;
  blockId: string;
  formTitle: string;
  formPayload: FormBlockPayload;
  data: Record<string, string>;
  consentGiven: boolean;
  honeypotTrap?: string; // Bot trap
  clientIpHash?: string;
  timestamp?: number;
}

interface FormSubmissionResult {
  success: boolean;
  submissionId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  rateLimited?: boolean;
}

interface SubmissionsFilter {
  formId?: string;
  formType?: string;
  searchQuery?: string;
  status?: 'verified' | 'flagged_spam' | 'archived';
  startDate?: number;
  endDate?: number;
}

class FormSubmissionService {
  private readonly MAX_PAYLOAD_BYTES = 64 * 1024; // 64KB max submission payload
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
  private readonly MAX_SUBMISSIONS_PER_WINDOW = 5; // 5 submissions per minute per IP

  /**
   * Helper to safely read from localStorage
   */
  private getStorageItem<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Helper to write to localStorage
   */
  private setStorageItem<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[FormService] Failed to persist key ${key}:`, err);
    }
  }

  /**
   * Record an immutable audit log entry for privacy, deletion, and exports
   */
  private logAudit(actor: string, action: string, target: string, details?: string): void {
    const audits = this.getStorageItem<AuditLog[]>(FORM_STORAGE_KEYS.AUDIT, []);
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      actor,
      action,
      target,
      timestamp: Date.now(),
      details
    };
    this.setStorageItem(FORM_STORAGE_KEYS.AUDIT, [entry, ...audits.slice(0, 500)]);
  }

  /**
   * Validate submission payload against form schema (FORM-001)
   */
  public validateSubmission(
    formPayload: FormBlockPayload,
    data: Record<string, string>,
    consentGiven: boolean
  ): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // 1. Consent Validation
    if (formPayload.requireConsent && !consentGiven) {
      errors['_consent'] = 'You must agree to the terms and privacy disclaimer to proceed.';
    }

    // 2. Field Schema Validation
    const fields = formPayload.fields || [];
    for (const field of fields) {
      const rawVal = (data[field.id] || '').trim();

      // Required check
      if (field.required && !rawVal) {
        errors[field.id] = `${field.label} is required.`;
        continue;
      }

      if (!rawVal) continue; // Optional field is empty, skip format validation

      // Typed field validations
      if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(rawVal)) {
          errors[field.id] = 'Please provide a valid email address.';
        }
      } else if (field.type === 'phone') {
        // E.164, local standard, or basic digits validation
        const phoneDigits = rawVal.replace(/[^0-9+]/g, '');
        if (phoneDigits.length < 7 || phoneDigits.length > 18) {
          errors[field.id] = 'Please enter a valid phone number (minimum 7 digits).';
        }
      } else if (field.type === 'select') {
        if (field.options && field.options.length > 0 && !field.options.includes(rawVal)) {
          errors[field.id] = `Selected value must be one of: ${field.options.join(', ')}`;
        }
      } else if (field.type === 'checkbox') {
        if (field.required && rawVal !== 'true' && rawVal !== 'yes') {
          errors[field.id] = `${field.label} must be checked.`;
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Check rate limit sliding window for client IP / hash (FORM-003)
   */
  private checkRateLimit(ipHash: string): boolean {
    const now = Date.now();
    const rateLimits = this.getStorageItem<Record<string, number[]>>(FORM_STORAGE_KEYS.RATE_LIMITS, {});
    const windowStart = now - this.RATE_LIMIT_WINDOW_MS;

    const clientTimestamps = (rateLimits[ipHash] || []).filter(ts => ts > windowStart);

    if (clientTimestamps.length >= this.MAX_SUBMISSIONS_PER_WINDOW) {
      return false; // Rate limit exceeded
    }

    clientTimestamps.push(now);
    rateLimits[ipHash] = clientTimestamps;
    this.setStorageItem(FORM_STORAGE_KEYS.RATE_LIMITS, rateLimits);
    return true;
  }

  /**
   * Authoritative form submission handler (FORM-001, FORM-002, FORM-003, FORM-004)
   */
  public submitFormAuthoritative(req: FormSubmissionRequest): FormSubmissionResult {
    // 1. Oversized payload defense
    const payloadSize = JSON.stringify(req.data).length;
    if (payloadSize > this.MAX_PAYLOAD_BYTES) {
      return {
        success: false,
        error: 'Payload size exceeds safe limits (maximum 64KB).'
      };
    }

    // 2. Honeypot Bot Trap (FORM-003)
    if (req.honeypotTrap && req.honeypotTrap.trim().length > 0) {
      // Silently flag or reject bot submissions
      return {
        success: false,
        error: 'Spam filter triggered. Submission rejected.'
      };
    }

    // 3. Sliding-window rate limit (FORM-003)
    const ipHash = req.clientIpHash || 'client-anon';
    if (!this.checkRateLimit(ipHash)) {
      return {
        success: false,
        rateLimited: true,
        error: 'Too many submissions. Please wait 1 minute before trying again.'
      };
    }

    // 4. Schema and field validations (FORM-001)
    const validation = this.validateSubmission(req.formPayload, req.data, req.consentGiven);
    if (!validation.valid) {
      return {
        success: false,
        fieldErrors: validation.errors,
        error: 'Please review and correct the marked form fields.'
      };
    }

    // Extract primary responder email and name if available
    let responderEmail: string | undefined;
    let responderName: string | undefined;

    for (const field of req.formPayload.fields || []) {
      const val = (req.data[field.id] || '').trim();
      if (!val) continue;

      if (field.type === 'email' && !responderEmail) {
        responderEmail = val.toLowerCase();
      }
      if ((field.label.toLowerCase().includes('name') || field.id.toLowerCase().includes('name')) && !responderName) {
        responderName = val;
      }
    }

    const timestamp = req.timestamp || Date.now();
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // 5. Store submission securely (FORM-002)
    const newSubmission: FormSubmission = {
      id: submissionId,
      profileId: req.profileId,
      blockId: req.blockId,
      formTitle: req.formTitle,
      formType: req.formPayload.formType || 'newsletter',
      data: req.data,
      responderEmail,
      responderName,
      timestamp,
      consentGiven: req.consentGiven,
      consentText: req.formPayload.consentText,
      ipHash,
      status: 'verified',
      subscriberCreated: false
    };

    // 6. Subscriber Mode Audience Synchronization (FORM-004)
    // If form is in subscriberMode (or formType is 'newsletter') and an email exists
    const isSubscriberMode = req.formPayload.subscriberMode || req.formPayload.formType === 'newsletter';
    if (isSubscriberMode && responderEmail) {
      this.syncSubscriber(req.profileId, {
        email: responderEmail,
        name: responderName,
        sourceBlockId: req.blockId,
        sourceFormTitle: req.formTitle,
        consentGiven: req.consentGiven,
        consentText: req.formPayload.consentText,
        timestamp
      });
      newSubmission.subscriberCreated = true;
    }

    // Persist submission
    const existing = this.getStorageItem<FormSubmission[]>(FORM_STORAGE_KEYS.SUBMISSIONS, []);
    this.setStorageItem(FORM_STORAGE_KEYS.SUBMISSIONS, [newSubmission, ...existing]);

    return {
      success: true,
      submissionId
    };
  }

  /**
   * Synchronize subscriber audience list with deduplication (FORM-004)
   */
  public syncSubscriber(
    profileId: string,
    params: {
      email: string;
      name?: string;
      sourceBlockId: string;
      sourceFormTitle: string;
      consentGiven: boolean;
      consentText?: string;
      timestamp: number;
    }
  ): Subscriber {
    const subscribers = this.getStorageItem<Subscriber[]>(FORM_STORAGE_KEYS.SUBSCRIBERS, []);
    const cleanEmail = params.email.trim().toLowerCase();

    // Check if subscriber exists for this profile
    const existingIndex = subscribers.findIndex(
      s => s.profileId === profileId && s.email.toLowerCase() === cleanEmail
    );

    const nowIso = new Date(params.timestamp).toISOString();

    if (existingIndex >= 0) {
      // Update existing subscriber
      const existing = subscribers[existingIndex];
      const updated: Subscriber = {
        ...existing,
        name: params.name || existing.name,
        status: 'active', // re-activated if was unsubscribed
        consentGiven: params.consentGiven,
        consentText: params.consentText || existing.consentText,
        lastEngagementAt: nowIso
      };
      subscribers[existingIndex] = updated;
      this.setStorageItem(FORM_STORAGE_KEYS.SUBSCRIBERS, subscribers);
      return updated;
    } else {
      // Create new subscriber
      const newSub: Subscriber = {
        id: `subr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        profileId,
        email: cleanEmail,
        name: params.name,
        status: 'active',
        sourceBlockId: params.sourceBlockId,
        sourceFormTitle: params.sourceFormTitle,
        subscribedAt: nowIso,
        consentGiven: params.consentGiven,
        consentText: params.consentText,
        lastEngagementAt: nowIso
      };
      this.setStorageItem(FORM_STORAGE_KEYS.SUBSCRIBERS, [newSub, ...subscribers]);
      return newSub;
    }
  }

  /**
   * Query submissions scoped strictly by profile/tenant (FORM-002, FORM-005)
   */
  public getSubmissions(profileId: string, filter?: SubmissionsFilter): FormSubmission[] {
    const all = this.getStorageItem<FormSubmission[]>(FORM_STORAGE_KEYS.SUBMISSIONS, []);
    let profileSubs = all.filter(s => s.profileId === profileId);

    if (!filter) return profileSubs;

    if (filter.formId) {
      profileSubs = profileSubs.filter(s => s.blockId === filter.formId);
    }
    if (filter.formType) {
      profileSubs = profileSubs.filter(s => s.formType === filter.formType);
    }
    if (filter.status) {
      profileSubs = profileSubs.filter(s => s.status === filter.status);
    }
    if (filter.startDate) {
      profileSubs = profileSubs.filter(s => s.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      profileSubs = profileSubs.filter(s => s.timestamp <= filter.endDate!);
    }
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      profileSubs = profileSubs.filter(s => {
        const text = `${s.formTitle} ${s.responderEmail || ''} ${s.responderName || ''} ${JSON.stringify(s.data)}`.toLowerCase();
        return text.includes(q);
      });
    }

    return profileSubs;
  }

  /**
   * Get subscribers for a profile (FORM-004)
   */
  public getSubscribers(profileId: string, query?: string): Subscriber[] {
    const all = this.getStorageItem<Subscriber[]>(FORM_STORAGE_KEYS.SUBSCRIBERS, []);
    let profileSubscribers = all.filter(s => s.profileId === profileId);

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      profileSubscribers = profileSubscribers.filter(s => 
        s.email.toLowerCase().includes(q) || (s.name && s.name.toLowerCase().includes(q))
      );
    }

    return profileSubscribers;
  }

  public replaceSubscribers(subscribers: Subscriber[]): void {
    this.setStorageItem(FORM_STORAGE_KEYS.SUBSCRIBERS, subscribers);
  }

  /**
   * Unsubscribe a subscriber (FORM-004)
   */
  public unsubscribeSubscriber(profileId: string, email: string, operatorEmail: string): boolean {
    const subscribers = this.getStorageItem<Subscriber[]>(FORM_STORAGE_KEYS.SUBSCRIBERS, []);
    const cleanEmail = email.trim().toLowerCase();
    const idx = subscribers.findIndex(s => s.profileId === profileId && s.email.toLowerCase() === cleanEmail);
    if (idx === -1) return false;

    subscribers[idx].status = 'unsubscribed';
    this.setStorageItem(FORM_STORAGE_KEYS.SUBSCRIBERS, subscribers);
    this.logAudit(operatorEmail, 'subscriber_unsubscribed', email, `Profile ${profileId}`);
    return true;
  }

  /**
   * Delete a single submission with audit logging (FORM-005)
   */
  public deleteSubmission(profileId: string, submissionId: string, operatorEmail: string): boolean {
    const submissions = this.getStorageItem<FormSubmission[]>(FORM_STORAGE_KEYS.SUBMISSIONS, []);
    const sub = submissions.find(s => s.id === submissionId && s.profileId === profileId);
    if (!sub) return false;

    const remaining = submissions.filter(s => s.id !== submissionId);
    this.setStorageItem(FORM_STORAGE_KEYS.SUBMISSIONS, remaining);

    this.logAudit(operatorEmail, 'form_submission_deleted', submissionId, `Profile ${profileId} - Form ${sub.formTitle}`);
    return true;
  }

  /**
   * Bulk delete submissions with audit logging (FORM-005)
   */
  public bulkDeleteSubmissions(profileId: string, submissionIds: string[], operatorEmail: string): number {
    const submissions = this.getStorageItem<FormSubmission[]>(FORM_STORAGE_KEYS.SUBMISSIONS, []);
    const idSet = new Set(submissionIds);

    const toDelete = submissions.filter(s => s.profileId === profileId && idSet.has(s.id));
    if (toDelete.length === 0) return 0;

    const remaining = submissions.filter(s => !(s.profileId === profileId && idSet.has(s.id)));
    this.setStorageItem(FORM_STORAGE_KEYS.SUBMISSIONS, remaining);

    this.logAudit(operatorEmail, 'form_submissions_bulk_deleted', `${toDelete.length} records`, `Profile ${profileId}`);
    return toDelete.length;
  }

  /**
   * Export submissions to bounded CSV format with operator audit trail (FORM-005)
   */
  public exportSubmissionsCsv(
    profileId: string,
    operatorEmail: string,
    filter?: SubmissionsFilter,
    maxRows: number = 5000
  ): { csvContent: string; rowCount: number; truncated: boolean } {
    const list = this.getSubmissions(profileId, filter);
    const totalCount = list.length;
    const boundedList = list.slice(0, maxRows);
    const truncated = totalCount > maxRows;

    // Build headers from dynamic fields across submissions
    const fieldKeySet = new Set<string>();
    boundedList.forEach(s => {
      Object.keys(s.data || {}).forEach(k => fieldKeySet.add(k));
    });
    const customFieldKeys = Array.from(fieldKeySet);

    const headers = [
      'Submission ID',
      'Form Title',
      'Form Type',
      'Responder Email',
      'Responder Name',
      'Submitted At (ISO)',
      'Consent Given',
      'Consent Disclaimer',
      'Status',
      ...customFieldKeys.map(k => `Field: ${k}`)
    ];

    const rows = boundedList.map(s => {
      return [
        s.id,
        s.formTitle,
        s.formType || 'custom',
        s.responderEmail || '',
        s.responderName || '',
        new Date(s.timestamp).toISOString(),
        s.consentGiven ? 'YES' : 'NO',
        s.consentText || '',
        s.status,
        ...customFieldKeys.map(k => s.data[k] ?? '')
      ];
    });

    const csvContent = serializeCsv(headers, rows);

    // Audit the export action
    this.logAudit(
      operatorEmail,
      'form_submissions_exported',
      `Profile ${profileId}`,
      `Exported ${boundedList.length} rows (total: ${totalCount}, truncated: ${truncated})`
    );

    return {
      csvContent,
      rowCount: boundedList.length,
      truncated
    };
  }

  /**
   * Export subscribers to CSV with operator audit log (FORM-004, FORM-005)
   */
  public exportSubscribersCsv(
    profileId: string,
    operatorEmail: string
  ): { csvContent: string; rowCount: number } {
    const subscribers = this.getSubscribers(profileId);
    const headers = [
      'Subscriber ID',
      'Email',
      'Name',
      'Status',
      'Subscribed At (ISO)',
      'Last Engagement (ISO)',
      'Source Form',
      'Consent Given'
    ];

    const rows = subscribers.map(s => [
      s.id,
      s.email,
      s.name || '',
      s.status,
      s.subscribedAt,
      s.lastEngagementAt || s.subscribedAt,
      s.sourceFormTitle,
      s.consentGiven ? 'YES' : 'NO'
    ]);

    const csvContent = serializeCsv(headers, rows);

    this.logAudit(
      operatorEmail,
      'subscribers_exported',
      `Profile ${profileId}`,
      `Exported ${subscribers.length} subscriber rows`
    );

    return {
      csvContent,
      rowCount: subscribers.length
    };
  }
}

export const formSubmissionService = new FormSubmissionService();
