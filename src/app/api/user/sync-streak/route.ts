import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API Route: Sync Daily Study Streak
 * Handles timezone-aware streak calculations by accepting the client's local date string.
 */
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { localDate } = await req.json(); // Format: YYYY-MM-DD
    if (!localDate) {
      return new NextResponse("Missing localDate", { status: 400 });
    }

    const email = session.user.email?.toLowerCase();

    // Fetch current streak data from Supabase
    const { data: userData, error: fetchError } = await supabase
      .from('user_roles')
      .select('streak_count, last_login')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!userData) throw new Error("User profile not found");

    let currentStreak = userData.streak_count || 0;
    const lastLoginFull = userData.last_login; // Timestamp with zone

    // Convert DB last_login to a YYYY-MM-DD string for comparison
    // We treat the stored last_login as the "last recorded day"
    let lastLoginDateStr = null;
    if (lastLoginFull) {
        // We use the date part of the ISO string (UTC) but we are moving to a model where the client tells us the day.
        // For existing records, we just take the date part.
        lastLoginDateStr = lastLoginFull.split('T')[0];
    }

    let updatedStreak = currentStreak;
    let shouldUpdate = false;

    if (!lastLoginDateStr) {
      // First time tracking
      updatedStreak = 1;
      shouldUpdate = true;
    } else if (lastLoginDateStr === localDate) {
      // Already logged in today (local time)
      // No update needed to streak, but we might want to update last_login for timestamp accuracy
      // however we'll avoid unnecessary writes.
    } else {
      // Different day — check if it's consecutive
      const today = new Date(localDate);
      const lastDay = new Date(lastLoginDateStr);

      const diffInMs = today.getTime() - lastDay.getTime();
      const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 1) {
        // Consecutive!
        updatedStreak += 1;
        shouldUpdate = true;
      } else if (diffInDays > 1) {
        // Streak broken
        updatedStreak = 1;
        shouldUpdate = true;
      } else if (diffInDays < 0) {
        // Clock drift or user traveling backwards?
        // We ignore this to prevent streak hacking/loss.
      }
    }

    if (shouldUpdate) {
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({
          streak_count: updatedStreak,
          last_login: new Date().toISOString() // Store full timestamp
        })
        .eq('email', email);

      if (updateError) throw updateError;
    }

    return NextResponse.json({
      streak: updatedStreak,
      lastLogin: localDate,
      updated: shouldUpdate
    });

  } catch (error: any) {
    console.error('🔥 [STREAK SYNC ERROR]:', error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}
