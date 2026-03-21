import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const { data, error } = await supabaseAdmin.from('user_roles').upsert({ email, role: 'teacher' }).select().single();
    if (error) throw error;
    
    // Auto-dispatch Native Inbox message to the newly promoted user
    await supabaseAdmin.from('messages').insert({
      sender_email: session.user.email || 'SYSTEM_ADMIN',
      receiver_email: email,
      subject: '🎓 Welcome to the Faculty! (Important)',
      body: 'Congratulations!\n\nYou have been officially promoted to an Instructor.\n\nYou now have full clearance to access the Command Center and upload new educational content directly to the platform.\n\nClick the "Command Center" navigation button on your dashboard or navigate to /admin to begin configuring your modules.',
      is_read: false
    });
    
    return NextResponse.json({ success: true, role: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Downgrade them back to 'student' so they remain in the platform's global registry
    const { error } = await supabaseAdmin.from('user_roles').update({ role: 'student' }).eq('email', email);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
