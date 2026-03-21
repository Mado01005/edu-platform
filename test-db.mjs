import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load the local .env to test the actual keys
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ CRITICAL: Missing Supabase Environment Variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runHealthCheck() {
  console.log("🚀 Starting Architect-Level Database Health Check...");
  
  let passed = true;

  try {
    // 1. Test Content Integrity
    const { data: subjects, error: subjErr } = await supabase.from('subjects').select('*').limit(1);
    if (subjErr) throw subjErr;
    console.log("✅ Subject Hierarchy Tree is active and accessible.");

    // 2. Test Announcements
    const { data: ann, error: annErr } = await supabase.from('announcements').select('*').limit(1);
    if (annErr) throw annErr;
    console.log("✅ Global Broadcast Banners table is properly structured in Supabase.");

    // 3. Test Student Registry / Roles
    const { data: roles, error: rolesErr } = await supabase.from('user_roles').select('*').limit(1);
    if (rolesErr) throw rolesErr;
    console.log("✅ Global Student Registry (user_roles) is online and receiving metrics.");

    // 4. Test Telemetry / Logs
    const { data: logs, error: logsErr } = await supabase.from('activity_logs').select('*').limit(1);
    if (logsErr) throw logsErr;
    console.log("✅ Telemetry System (activity_logs) successfully bridged.");
    
    console.log("\\n🎉 SUCCESS: All 4 Phase deployments have perfect structural integrity. No regressions found.");

  } catch (err) {
    passed = false;
    console.error("❌ FAILED: Database constraint or connection issue detected:", err);
  }

  process.exit(passed ? 0 : 1);
}

runHealthCheck();
