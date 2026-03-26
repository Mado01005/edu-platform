import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the 5 most recent 'PLAYED_SONG' entries
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('user_name, details, created_at')
      .eq('action', 'PLAYED_SONG')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    return NextResponse.json({
      latestActivities: data.map(log => ({
        userName: log.user_name || 'Anonymous',
        trackName: log.details?.trackName || 'Unknown Track',
        artist: log.details?.artist || 'Unknown Artist',
        timestamp: log.created_at
      }))
    });
  } catch (error) {
    console.error('Social Spotify API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
