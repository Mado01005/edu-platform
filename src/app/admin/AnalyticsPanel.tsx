import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@/auth';
import { ADMIN_EMAILS } from '@/lib/constants';
import LiveActivityFeed from '@/components/LiveActivityFeed';

export default async function AnalyticsPanel() {
  const session = await auth();
  // @ts-ignore
  if (!session?.user?.isSuperAdmin) return null;
  
  // Fetch initial logs, sessions, and the global student registry to ensure 100% visibility
  const [{ data: logs }, { data: sessions }, { data: users }] = await Promise.all([
    supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('live_sessions')
      .select('*')
      .order('last_active_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })
  ]);

  return <LiveActivityFeed 
    initialLogs={logs || []} 
    initialSessions={sessions || []} 
    initialUsers={users || []} 
  />;
}
