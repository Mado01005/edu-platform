import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { isMasterAdmin } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    // 1. Authorization Check
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetEmail, action, value } = await req.json();

    if (!targetEmail || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Protect against self-modifying or modifying Master Admins if not a Master Admin themselves
    if (isMasterAdmin(targetEmail) && !isMasterAdmin(userEmail || '')) {
      return NextResponse.json({ error: 'Cannot modify a Master Administrator' }, { status: 403 });
    }

    switch (action) {
      case 'UPDATE_STREAK':
        const { error: streakError } = await supabaseAdmin
          .from('user_roles')
          .update({ streak_count: parseInt(value) })
          .eq('email', targetEmail.toLowerCase());
        
        if (streakError) throw streakError;
        break;

      case 'UPDATE_ROLE':
        // Prevent lowering own role if last admin
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: value })
          .eq('email', targetEmail.toLowerCase());
        
        if (roleError) throw roleError;
        break;

      case 'BAN_USER':
        const { error: banError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: 'banned' })
          .eq('email', targetEmail.toLowerCase());
        
        if (banError) throw banError;
        break;

      case 'UNBAN_USER':
        const { error: unbanError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: 'student' })
          .eq('email', targetEmail.toLowerCase());
        
        if (unbanError) throw unbanError;
        break;

      case 'UPDATE_NOTES':
        const { error: notesError } = await supabaseAdmin
          .from('user_roles')
          .update({ internal_notes: value })
          .eq('email', targetEmail.toLowerCase());
        
        if (notesError) throw notesError;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Log the admin action
    await supabaseAdmin.from('activity_logs').insert({
      user_email: userEmail,
      action: `ADMIN_USER_MANAGE_${action}`,
      details: { targetEmail, value }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN_USER_MANAGE] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
