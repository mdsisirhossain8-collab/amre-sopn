import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// In a professional application, we want to ensure these are present
const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

// Logger for debugging while protecting secrets
if (!isConfigured) {
  console.warn('[Supabase] Missing or invalid configuration. Real-time features and Supabase auth will be disabled.');
} else {
  console.log('[Supabase] Client initialized successfully');
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null;
