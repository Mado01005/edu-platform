import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for normal, unauthenticated or standard user read operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Client for secured administrative tasks (like uploading files or inserting activity logs natively)
// ONLY use this on the server side (API routes or Server Components)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
