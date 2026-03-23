import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_EMAIL } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, details } = await req.json();
    const url = req.headers.get('referer') || 'Unknown';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const city = req.headers.get('x-vercel-ip-city') || 'Unknown City';
    const country = req.headers.get('x-vercel-ip-country') || 'Unknown Country';

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    // Insert log securely into Supabase
    // First attempt: Deep logging with geolocation (requires new schema columns)
    const { data, error } = await supabaseAdmin.from('activity_logs').insert({
      user_name: session.user?.name || 'Anonymous Student',
      user_email: session.user?.email,
      action,
      url,
      user_agent: userAgent,
      geo_city: city,
      geo_country: country,
      details: details || {}
    }).select().single();

    if (error) {
      console.warn('Advanced logging failed (likely missing columns), falling back to basic log:', error.message);
      // Fallback: Store info in 'details' instead of dedicated columns to prevent 500 errors
      const { error: fallbackError } = await supabaseAdmin.from('activity_logs').insert({
        user_name: session.user?.name || 'Anonymous Student',
        user_email: session.user?.email,
        action,
        url,
        user_agent: userAgent,
        details: {
          ...(details || {}),
          _geo: { city, country },
          _notice: 'Please run SQL to add geo_city/geo_country columns'
        }
      });
      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
    }

    // WEBHOOK: If a brand new student just initialized their dashboard, autonomously alert the Master Admin!
    if (action === 'Completed Student Onboarding') {
      await supabaseAdmin.from('messages').insert({
        sender_email: 'SYSTEM_ROBOT',
        receiver_email: ADMIN_EMAIL,
        subject: `[System Alert] ✨ New Student Registration: ${session.user.email}`,
        body: `Access Code Accepted.\n\nA brand new student has successfully completed the first-boot onboarding sequence and is now exploring the platform.\n\nStudent Email: ${session.user.email}\nRegistry Name: ${session.user.name || 'Unknown User'}\nTimestamp: ${new Date().toLocaleString()}\n\nYou may now grant them Instructor privledges from the Admin Dashboard if necessary.`,
        is_read: false
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
