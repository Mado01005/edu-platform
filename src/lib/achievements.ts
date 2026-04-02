import { supabaseAdmin } from './supabase';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: (stats: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'streak_7',
    name: '7-Day Warrior',
    description: 'Maintain a 7-day study streak.',
    icon: '🔥',
    color: '#FF4D4D',
    criteria: (stats) => (stats.streakCount || 0) >= 7
  },
  {
    id: 'lessons_10',
    name: 'Decathlon Scholar',
    description: 'Complete 10 lessons across any subjects.',
    icon: '📚',
    color: '#4D94FF',
    criteria: (stats) => (stats.completedCount || 0) >= 10
  },
  {
    id: 'deep_diver',
    name: 'Deep Diver',
    description: 'Spend more than 5 hours studying in total.',
    icon: '🤿',
    color: '#4DFF88',
    criteria: (stats) => (stats.totalMinutes || 0) >= 300
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Log in and study between 12 AM and 4 AM.',
    icon: '🦉',
    color: '#944DFF',
    criteria: (stats) => {
        const hour = new Date(stats.lastLoginAt).getUTCHours();
        return hour >= 0 && hour <= 4;
    }
  }
];

export async function checkAndUnlockAchievements(email: string, stats: any) {
  try {
    // 1. Fetch already unlocked achievements
    const { data: unlocked } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_email', email);

    const unlockedIds = new Set(unlocked?.map(a => a.achievement_id) || []);

    // 2. Filter achievements not yet unlocked but satisfying criteria
    const newlyunlocked = ACHIEVEMENTS.filter(
      ach => !unlockedIds.has(ach.id) && ach.criteria(stats)
    );

    if (newlyunlocked.length > 0) {
      // 3. Perform batch insert
      const toInsert = newlyunlocked.map(ach => ({
        user_email: email,
        achievement_id: ach.id,
        unlocked_at: new Date().toISOString()
      }));

      const { error } = await supabaseAdmin
        .from('user_achievements')
        .insert(toInsert);

      if (error) throw error;
      
      // Return newly unlocked achievements for notification potential
      return newlyunlocked;
    }
    return [];
  } catch (error) {
    console.error('[ACHIEVEMENTS] Sync Error:', error);
    return [];
  }
}
