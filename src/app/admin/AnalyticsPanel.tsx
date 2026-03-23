import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@/auth';
import { ADMIN_EMAILS } from '@/lib/constants';
import LiveActivityFeed from '@/components/LiveActivityFeed';

export default async function AnalyticsPanel() {
  const session = await auth();
  // @ts-ignore
  if (!session?.user?.isSuperAdmin) return null;
  
  // Fetch initial logs to prevent "Flicker" on load
  const { data: logs, error } = await supabaseAdmin
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return <LiveActivityFeed initialLogs={logs || []} />;
}
