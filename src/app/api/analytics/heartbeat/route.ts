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

    // Upsert into live_sessions based on user_email and ip_address to capture multiple devices (Piracy tracking)
    const { error } = await supabaseAdmin.from('live_sessions').upsert({
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
    });

    if (error) {
      console.error('Session upsert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: isIdle ? 'Idle' : 'Active' });

  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
