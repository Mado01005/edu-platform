import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { ACHIEVEMENTS } from '@/lib/achievements';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = (session.user?.email || '').toLowerCase();

    // Fetch user's achievements
    const { data: userAchievements, error } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_email', email);

    if (error) throw error;

    const unlockedIds = new Set(userAchievements?.map(a => a.achievement_id) || []);

    // Map all achievements with their unlocked status
    const result = ACHIEVEMENTS.map(ach => ({
      ...ach,
      isUnlocked: unlockedIds.has(ach.id),
      unlockedAt: userAchievements?.find(a => a.achievement_id === ach.id)?.unlocked_at || null
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
