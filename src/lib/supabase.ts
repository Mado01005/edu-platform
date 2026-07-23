// SERVER-ONLY: This file contains the service role key and must NEVER be bundled into client code.
// For client components, import from '@/lib/supabase-client' instead.
import 'server-only';
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
supabaseUrl = supabaseUrl.replace('.supabase.com', '.supabase.co');

const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'placeholder';

// Anon client — respects Row Level Security. Safe for authenticated server-side reads.
export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client — bypasses all Row Level Security.
// ONLY use on the server side (API routes, Server Components, middleware).
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
