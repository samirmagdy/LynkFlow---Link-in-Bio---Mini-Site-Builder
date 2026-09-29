import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseUrl, supabasePublishableKey } from './supabaseConfig';

export { isSupabaseConfigured } from './supabaseConfig';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
