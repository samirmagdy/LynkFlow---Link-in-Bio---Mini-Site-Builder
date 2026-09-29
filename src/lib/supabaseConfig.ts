const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};

export const supabaseUrl = runtimeEnv.VITE_SUPABASE_URL;
export const supabasePublishableKey = runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
