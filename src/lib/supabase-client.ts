import { createClient } from '@supabase/supabase-js';

// Use placeholder values to prevent Next.js from crashing during the static build phase
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
supabaseUrl = supabaseUrl.replace('.supabase.com', '.supabase.co');

const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'placeholder';

// Client for normal, unauthenticated or standard user read operations
// Safe to import from client components
export const supabase = createClient(supabaseUrl, supabaseKey);
