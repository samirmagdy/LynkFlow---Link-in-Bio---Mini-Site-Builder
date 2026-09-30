import { isSupabaseConfigured } from '../lib/supabaseConfig';
import { supabase } from '../lib/supabase';
import type { UserAccount } from '../types';

export interface AuthResponse {
  success: boolean;
  user?: UserAccount;
  error?: string;
  actionRequired?: 'verify_email' | 'complete_onboarding';
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  error?: string;
}

const AUTH_UNAVAILABLE_MESSAGE = 'Authentication is temporarily unavailable. Please try again later.';

function unavailable<T extends AuthResponse | PasswordResetResponse>(result: T): T {
  return { ...result, success: false, error: AUTH_UNAVAILABLE_MESSAGE };
}

function createUserAccount(
  id: string,
  email: string,
  name: string,
  createdAt: string,
  isVerified: boolean,
  onboardingCompleted: boolean
): UserAccount {
  return {
    id,
    email,
    name,
    isVerified,
    createdAt,
    lastLoginAt: new Date().toISOString(),
    onboardingCompleted,
    onboardingStep: onboardingCompleted ? 'completed' : 'category',
    workspaceId: id
  };
}

export async function signUp(email: string, password: string, name?: string): Promise<AuthResponse> {
  if (!isSupabaseConfigured || !supabase) return unavailable({ success: false });
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error || !data.user) {
    const providerMessage = error?.message?.toLowerCase() || '';
    const message = providerMessage.includes('error sending confirmation email')
      ? 'We could not send the confirmation email right now. Please try again later or contact support.'
      : error?.message || 'Failed to create account.';
    return { success: false, error: message };
  }
  const user = createUserAccount(
    data.user.id,
    data.user.email || email,
    name?.trim() || email.split('@')[0],
    data.user.created_at,
    Boolean(data.user.email_confirmed_at),
    false
  );
  return { success: true, user, actionRequired: 'verify_email' };
}

export async function logIn(email: string, password: string): Promise<AuthResponse> {
  if (!isSupabaseConfigured || !supabase) return unavailable({ success: false });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { success: false, error: 'Invalid email or password. Please verify your credentials and try again.' };
  const onboardingCompleted = data.user.user_metadata?.onboardingCompleted === true;
  const user = createUserAccount(
    data.user.id,
    data.user.email || email,
    String(data.user.user_metadata?.name || email.split('@')[0]),
    data.user.created_at,
    Boolean(data.user.email_confirmed_at),
    onboardingCompleted
  );
  return { success: true, user };
}

export async function verifyEmail(): Promise<AuthResponse> {
  if (!supabase) return unavailable({ success: false });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { success: false, error: 'Open the confirmation link sent to your email before continuing.' };
  if (!data.user.email_confirmed_at) return { success: false, error: 'Your email is not verified yet. Check your inbox and try again.' };
  return { success: true };
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return unavailable({ success: false });
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  if (!isSupabaseConfigured || !supabase) return unavailable({ success: false, message: AUTH_UNAVAILABLE_MESSAGE });
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/?password-recovery=1` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  return {
    success: !error,
    message: 'If an account matches that email address, password reset instructions have been dispatched.',
    ...(error ? { error: error.message } : {})
  };
}

export async function resetPassword(newPassword: string): Promise<AuthResponse> {
  if (!isSupabaseConfigured || !supabase) return unavailable({ success: false });
  if (!newPassword || newPassword.length < 8) return { success: false, error: 'New password must be at least 8 characters long.' };
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return error || !data.user ? { success: false, error: error?.message || 'Unable to reset password.' } : { success: true };
}

export const authUnavailableMessage = AUTH_UNAVAILABLE_MESSAGE;
