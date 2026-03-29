import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get content added in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('details, created_at')
      .eq('action', 'NEW_CONTENT_ADDED')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ items: [] });
    }

    const items = (data || []).map(log => ({
      fileName: log.details?.fileName || 'Unknown',
      subjectId: log.details?.subjectId || '',
      lessonId: log.details?.lessonId || '',
      fileType: log.details?.fileType || '',
      created_at: log.created_at,
    }));

    // Also return lesson IDs that have new content (for "NEW" badges)
    const newLessonIds = [...new Set(items.map(i => i.lessonId).filter(Boolean))];

    return NextResponse.json({ items, newLessonIds }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });
  } catch {
    return NextResponse.json({ items: [], newLessonIds: [] });
  }
}
