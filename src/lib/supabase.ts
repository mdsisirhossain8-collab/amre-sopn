import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('SUPABASE CONFIG ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in your Environment Variables.');
}

const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

if (!isConfigured) {
  console.warn('Supabase credentials missing or invalid. Database sync will be disabled.');
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null;
