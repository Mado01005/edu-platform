import { supabaseAdmin } from '@/lib/supabase';
import { auth, ADMIN_EMAIL } from '@/auth';
import LiveActivityFeed from '@/components/LiveActivityFeed';

export default async function AnalyticsPanel() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) return null;
  
  // Fetch initial logs to prevent "Flicker" on load
  const { data: logs, error } = await supabaseAdmin
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return <LiveActivityFeed initialLogs={logs || []} />;
}
