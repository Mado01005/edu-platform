import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await auth();
    // Use the comprehensive admin check
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Bypass RLS to aggregate all student data using God Mode identity (supabaseAdmin)
    const { data: sessions, error } = await supabaseAdmin
      .from('focus_sessions')
      .select(`
        id,
        duration_minutes,
        status,
        lesson_id,
        content_items ( name )
      `);
      
    if (error) throw error;

    let totalFocusMinutes = 0;
    let completedCount = 0;
    let interruptedCount = 0;
    
    // For Content Friction List
    const lessonStats: Record<string, { lesson_id: string; title: string; completed: number; interrupted: number; totalDuration: number }> = {};

    sessions?.forEach((s: any) => {
      if (s.status === 'completed') {
        totalFocusMinutes += s.duration_minutes;
        completedCount++;
      } else {
        interruptedCount++;
      }

      // Safe extract name - array handling in case of one-to-many relationship mapping weirdness
      let lessonName = s.lesson_id;
      if (s.content_items) {
        lessonName = Array.isArray(s.content_items) ? s.content_items[0]?.name : s.content_items.name;
      }
      
      if (!lessonStats[s.lesson_id]) {
        lessonStats[s.lesson_id] = { lesson_id: s.lesson_id, title: lessonName || s.lesson_id, completed: 0, interrupted: 0, totalDuration: 0 };
      }
      
      if (s.status === 'completed') {
        lessonStats[s.lesson_id].completed++;
        lessonStats[s.lesson_id].totalDuration += s.duration_minutes;
      } else {
        lessonStats[s.lesson_id].interrupted++;
      }
    });

    const totalSessions = completedCount + interruptedCount;
    const globalCompletionRate = totalSessions > 0 ? (completedCount / totalSessions) * 100 : 0;

    const frictionList = Object.values(lessonStats)
      .sort((a, b) => b.interrupted - a.interrupted)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        totalFocusMinutes,
        globalCompletionRate,
        frictionList
      }
    });
  } catch (error: any) {
    console.error('[FOCUS_ANALYTICS] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
