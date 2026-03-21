import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_EMAIL } from '@/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, details } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    // Insert log securely into Supabase
    const { error } = await supabaseAdmin.from('activity_logs').insert({
      user_email: session.user.email,
      user_name: session.user.name || 'Unknown User',
      action,
      details: details || {}
    });

    if (error) {
      console.error('Activity log error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
