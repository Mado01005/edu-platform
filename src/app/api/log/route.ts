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

    const body = await req.json();
    const action = typeof body?.action === 'string' ? body.action.trim() : '';
    const details =
      body?.details &&
      typeof body.details === 'object' &&
      !Array.isArray(body.details)
        ? body.details
        : {};
    const url = req.headers.get('referer') || 'Unknown';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const city = req.headers.get('x-vercel-ip-city') || 'Unknown City';
    const country = req.headers.get('x-vercel-ip-country') || 'Unknown Country';

    if (!action || action.length > 100 || JSON.stringify(details).length > 16_384) {
      return NextResponse.json({ error: 'Invalid telemetry payload.' }, { status: 400 });
    }

    // Insert log securely into Supabase
    // Note: 'user_agent' column does not exist in activity_logs, so we put it in details
    const { data, error } = await supabaseAdmin.from('activity_logs').insert({
      user_name: session.user?.name || 'Anonymous Student',
      user_email: (session.user?.email || '').toLowerCase(),
      action,
      url,
      geo_city: city,
      geo_country: country,
      details: {
        ...(details || {}),
        userAgent
      }
    }).select().single();

    if (error) {
      console.warn('Telemetry insert failed:', error.message);
      return NextResponse.json({ error: 'Telemetry storage failed.' }, { status: 500 });
    }

    // WEBHOOK: If a brand new student just initialized their dashboard, autonomously alert the Master Admin!
    if (action === 'Completed Student Onboarding') {
      // Atomically transition the user once so replayed telemetry cannot spam admin messages.
      const { data: newlyOnboarded } = await supabaseAdmin
        .from('user_roles')
        .update({ is_onboarded: true })
        .eq('email', session.user.email.toLowerCase())
        .eq('is_onboarded', false)
        .select('email')
        .maybeSingle();

      if (newlyOnboarded) {
        await supabaseAdmin.from('messages').insert({
          sender_email: 'SYSTEM_ROBOT',
          receiver_email: ADMIN_EMAIL,
          subject: `[System Alert] New Student Registration: ${session.user.email}`,
          body: `Onboarding completed.\n\nA new student completed onboarding.\n\nStudent Email: ${session.user.email}\nRegistry Name: ${session.user.name || 'Unknown User'}\nTimestamp: ${new Date().toISOString()}\n\nYou may now grant them instructor privileges from the Admin Dashboard if necessary.`,
          is_read: false
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('--- Telemetry API Crash ---');
    if (error instanceof Error) {
      console.error('Error Message:', error.message);
      console.error('Stacktrace:', error.stack);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
