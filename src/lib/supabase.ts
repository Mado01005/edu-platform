import { createClient } from '@supabase/supabase-js';

// Use placeholder values to prevent Next.js from crashing during the static build phase
// if Vercel doesn't have the environment variables explicitly loaded yet.
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
// Auto-correct common typos where users paste .com instead of .co
supabaseUrl = supabaseUrl.replace('.supabase.com', '.supabase.co');

const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'placeholder';

// Client for normal, unauthenticated or standard user read operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Client for secured administrative tasks (like uploading files or inserting activity logs natively)
// ONLY use this on the server side (API routes or Server Components)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
