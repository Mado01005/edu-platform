// DEPRECATED: Import from '@/lib/supabase-client' or '@/lib/supabase-admin' instead.
// This barrel re-exports both for backward compatibility with server-side code.
// Do NOT import from this file in client components — use '@/lib/supabase-client'.
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
supabaseUrl = supabaseUrl.replace('.supabase.com', '.supabase.co');

const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
