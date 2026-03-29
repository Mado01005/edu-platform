import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Use placeholder values to prevent Next.js from crashing during the static build phase
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
supabaseUrl = supabaseUrl.replace('.supabase.com', '.supabase.co');

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'placeholder';

// Admin client — bypasses all Row Level Security.
// ONLY use on the server side (API routes, Server Components, middleware).
// This file is guarded by 'server-only' to prevent accidental client bundling.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
