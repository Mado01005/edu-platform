import { supabase } from '@/lib/supabase';

export async function upsertLiveSession(data: { currentPage: string; isIdle: boolean }) {
  const { data: sessionData, error } = await supabase
    .from('live_sessions')
    .upsert({
      ...data,
      updated_at: new Date(),
    });
  if (error) {
    console.error('Error upserting live session:', error);
    throw error;
  }
  return sessionData;
}