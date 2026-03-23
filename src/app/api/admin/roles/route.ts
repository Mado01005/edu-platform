import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { isMasterAdmin } from '@/lib/constants';

export async function GET() {
  try {
    const session = await auth();
    // @ts-ignore
    const isSuperAdmin = session?.user?.isSuperAdmin || isMasterAdmin(session?.user?.email);
    if (!isSuperAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin.from('user_roles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    const isSuperAdmin = session?.user?.isSuperAdmin || isMasterAdmin(session?.user?.email);
    if (!isSuperAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, overrideRole } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const finalRole = overrideRole || 'teacher';
    const { data, error } = await supabaseAdmin.from('user_roles').upsert({ email, role: finalRole }, { onConflict: 'email' }).select().single();
    if (error) throw error;
    
    // Auto-dispatch Native Inbox message if promoting to teacher or superadmin
    if (finalRole === 'teacher' || finalRole === 'superadmin') {
      await supabaseAdmin.from('messages').insert({
        sender_email: session?.user?.email || 'SYSTEM_ADMIN',
        receiver_email: email,
        subject: `🎓 Access Level Updated: ${finalRole.toUpperCase()} (Important)`,
        body: `Congratulations!\n\nYou have been officially granted ${finalRole} permissions.\n\nYou now have clearance to access the Command Center. ${finalRole === 'teacher' ? 'Your access is currently focused on content management and uploads.' : 'You have full God Mode access to all platform telemetry.'}\n\nClick the "Command Center" navigation button on your dashboard or navigate to /admin to begin.`,
        is_read: false
      });
    }
    
    return NextResponse.json({ success: true, role: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    // Use isAdmin check for DELETE as it was originally designed, but with isMasterAdmin fallback
    // @ts-ignore
    const isAdmin = session?.user?.isAdmin || isMasterAdmin(session?.user?.email);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
