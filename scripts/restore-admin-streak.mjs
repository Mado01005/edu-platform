import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
supabaseUrl = supabaseUrl.replace('.supabase.com', '.supabase.co');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  console.error("❌ ERROR: Missing Supabase Environment Variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreAdminStreak() {
  const email = 'abdallahsaad2150@gmail.com';
  console.log(`🚀 Restoring legitimately earned 365-day streak for: ${email}...`);
  
  const { data, error } = await supabase
    .from('user_roles')
    .update({ 
      streak_count: 365, 
      last_login: new Date().toISOString() 
    })
    .eq('email', email)
    .select();

  if (error) {
    console.error("❌ FAILED:", error.message);
  } else if (!data || data.length === 0) {
    console.error(`⚠️ WARNING: User ${email} not found in user_roles table.`);
  } else {
    console.log("✅ SUCCESS: Admin streak forcefully restored to 365 days.");
    console.log("Database response:", data[0]);
  }
  process.exit(0);
}

restoreAdminStreak();
