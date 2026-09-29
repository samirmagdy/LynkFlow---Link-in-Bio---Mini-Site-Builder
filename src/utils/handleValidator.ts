/**
 * Handle Normalization & Reservation Engine (ACC-002)
 * Ensures consistent canonical handle formatting and enforces reserved routes and policy rules.
 */

export const RESERVED_HANDLES = new Set([
  'admin',
  'administrator',
  'api',
  'app',
  'auth',
  'billing',
  'blog',
  'careers',
  'contact',
  'dashboard',
  'docs',
  'explore',
  'faq',
  'features',
  'help',
  'home',
  'inbox',
  'legal',
  'login',
  'logout',
  'marketing',
  'media',
  'oauth',
  'onboarding',
  'overview',
  'pricing',
  'privacy',
  'profile',
  'profiles',
  'qr',
  'register',
  'reset-password',
  'root',
  'security',
  'settings',
  'signin',
  'signout',
  'signup',
  'status',
  'studio',
  'support',
  'terms',
  'themes',
  'user',
  'users',
  'verify',
  'webhook',
  'webhooks',
  'workspace'
]);

export interface HandleValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
  reason?: 'too_short' | 'too_long' | 'invalid_chars' | 'reserved' | 'collision';
}

/**
 * Normalizes a handle to canonical URL representation:
 * - Lowercased
 * - Leading @ trimmed
 * - Converts spaces and dashes to underscores or strips non-alphanumeric characters
 */
export function normalizeHandle(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim().toLowerCase();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.substring(1);
  }
  // Replace hyphens and consecutive spaces with underscore
  cleaned = cleaned.replace(/[-\s]+/g, '_');
  // Strip any character that is not lowercase a-z, 0-9, or underscore
  cleaned = cleaned.replace(/[^a-z0-9_]/g, '');
  return cleaned;
}

/**
 * Validates handle candidate against length, character set, prohibited reserved routes, and existing namespaces.
 */
export function validateHandle(
  raw: string, 
  existingHandles: string[] = []
): HandleValidationResult {
  const normalized = normalizeHandle(raw);

  if (!normalized || normalized.length < 3) {
    return {
      isValid: false,
      normalized,
      error: 'Handle must be at least 3 characters long.',
      reason: 'too_short'
    };
  }

  if (normalized.length > 30) {
    return {
      isValid: false,
      normalized,
      error: 'Handle cannot exceed 30 characters.',
      reason: 'too_long'
    };
  }

  // Must start with an alphanumeric letter
  if (!/^[a-z0-9]/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Handle must begin with a letter or number.',
      reason: 'invalid_chars'
    };
  }

  // Prohibited / system reserved route check
  if (RESERVED_HANDLES.has(normalized)) {
    return {
      isValid: false,
      normalized,
      error: `@${normalized} is a reserved system address and cannot be claimed.`,
      reason: 'reserved'
    };
  }

  // Collision check against existing active namespace
  const lowerExisting = existingHandles.map(h => normalizeHandle(h));
  if (lowerExisting.includes(normalized)) {
    return {
      isValid: false,
      normalized,
      error: `@${normalized} is already taken by another creator. Please select another handle.`,
      reason: 'collision'
    };
  }

  return {
    isValid: true,
    normalized
  };
}
