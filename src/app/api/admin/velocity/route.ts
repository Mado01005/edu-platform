import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sessions, error } = await supabaseAdmin
      .from('focus_sessions')
      .select('user_id, lesson_id, duration_minutes, status, content_items(name)');
      
    if (error) throw error;

    // 1. Calculate global averages per lesson
    const lessonTotals: Record<string, { totalDuration: number; sessionCount: number; name: string }> = {};
    const userLessonStats: Record<string, { user_id: string; lesson_id: string; lesson_name: string; duration: number; interrupted: number; total: number }> = {};

    sessions?.forEach((s: any) => {
      let lessonName = s.lesson_id;
      if (s.content_items) {
        lessonName = Array.isArray(s.content_items) ? s.content_items[0]?.name : s.content_items.name;
      }

      // Populate global averages
      if (!lessonTotals[s.lesson_id]) lessonTotals[s.lesson_id] = { totalDuration: 0, sessionCount: 0, name: lessonName };
      lessonTotals[s.lesson_id].totalDuration += s.duration_minutes;
      lessonTotals[s.lesson_id].sessionCount += 1;

      // Populate user-specific stats
      const key = `${s.user_id}_${s.lesson_id}`;
      if (!userLessonStats[key]) {
        userLessonStats[key] = { user_id: s.user_id, lesson_id: s.lesson_id, lesson_name: lessonName, duration: 0, interrupted: 0, total: 0 };
      }
      userLessonStats[key].duration += s.duration_minutes;
      userLessonStats[key].total += 1;
      if (s.status === 'interrupted') {
        userLessonStats[key].interrupted += 1;
      }
    });

    // 2. Identify Flagged Students
    const flaggedStudents: any[] = [];
    
    // We optionally fetch user emails dynamically to avoid N+1 queries if we get flag matches
    const flaggedUserIds = new Set<string>();

    Object.values(userLessonStats).forEach(stat => {
       const globalAverage = lessonTotals[stat.lesson_id].totalDuration / lessonTotals[stat.lesson_id].sessionCount;
       const interruptRate = stat.total > 0 ? stat.interrupted / stat.total : 0;
       const velocityScore = globalAverage > 0 ? stat.duration / globalAverage : 1; // e.g., 2.0 = double the average time

       // Flag if time exceeds average by >50% (velocity > 1.5) AND interrupted rate is high (> 40%)
       if (velocityScore > 1.5 && interruptRate > 0.4 && stat.total > 2) {
          flaggedStudents.push({
            user_id: stat.user_id,
            lesson_id: stat.lesson_id,
            lesson_name: stat.lesson_name,
            velocity_score: velocityScore.toFixed(2),
            interrupt_rate: (interruptRate * 100).toFixed(0),
            duration: stat.duration,
            global_average: globalAverage.toFixed(0)
          });
          flaggedUserIds.add(stat.user_id);
       }
    });

    // 3. Resolve User Emails
    if (flaggedUserIds.size > 0) {
      // NOTE: Querying auth.users mapping usually via custom public profiles or checking logs directly
      // using admin since we have full access
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      if (usersData && usersData.users) {
         flaggedStudents.forEach(f => {
            const match = usersData.users.find((u: any) => u.id === f.user_id);
            if (match) f.email = match.email;
            else f.email = 'Unknown User';
         });
      }
    }

    return NextResponse.json({
      success: true,
      data: flaggedStudents.sort((a, b) => parseFloat(b.velocity_score) - parseFloat(a.velocity_score))
    });
  } catch (error: any) {
    console.error('[VELOCITY_API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
