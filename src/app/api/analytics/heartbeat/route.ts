import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPage, isIdle } = await req.json();
    
    // Next.js standard way to pull IP and User-Agent from headers
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    
    // Take the first IP if there is a comma-separated list of proxies
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'Unknown Local IP');
    const userAgent = headersList.get('user-agent') || 'Unknown Browser';

    // Vercel Geolocation headers
    const city = headersList.get('x-vercel-ip-city') || 'Unknown City';
    const country = headersList.get('x-vercel-ip-country') || 'Unknown Country';

    // 1. Fetch current session state to detect navigation/path changes
    const { data: existingSession } = await supabaseAdmin
      .from('live_sessions')
      .select('current_page, is_idle')
      .eq('user_email', session.user.email)
      .eq('ip_address', ipAddress)
      .maybeSingle();

    const tasks: Promise<any>[] = [];

    // 2. If path changed, log a navigation event to activity_logs for the real-time Feed
    if (!existingSession || existingSession.current_page !== (currentPage || 'UnknownPage')) {
      tasks.push(
        supabaseAdmin.from('activity_logs').insert({
          user_name: session.user.name || 'Anonymous Student',
          user_email: session.user.email,
          action: 'PAGE_VIEW',
          url: currentPage || 'UnknownPage',
          geo_city: city,
          geo_country: country,
          details: { 
            from: existingSession?.current_page || 'initial_load',
            to: currentPage || 'dashboard',
            userAgent 
          }
        }) as unknown as Promise<any>
      );
    }

    // 3. Upsert into live_sessions for the real-time Sessions tab visibility
    tasks.push(
      supabaseAdmin.from('live_sessions').upsert({
        user_email: session.user.email,
        ip_address: ipAddress,
        user_agent: userAgent,
        current_page: currentPage || 'UnknownPage',
        is_idle: isIdle || false,
        last_active_at: new Date().toISOString(),
        geo_city: city,
        geo_country: country
      }, {
        onConflict: 'user_email, ip_address'
      }) as unknown as Promise<any>
    );

    // Run parallel DB writes to prevent slow API response times
    const results = await Promise.all(tasks);
    const dbError = results.find(r => r?.error)?.error;

    if (dbError) {
      console.error('Session DB Error:', dbError.message);
      // Fail silently for analytics rather than crashing the heartbeat for the user
      return NextResponse.json({ success: false, error: dbError.message }, { status: 200 });
    }

    return NextResponse.json({ success: true, status: isIdle ? 'Idle' : 'Active' });

  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
