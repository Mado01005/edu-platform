import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { isMasterAdmin } from '@/lib/constants';

const ELEVATED_ROLES = ['superadmin', 'admin', 'teacher'];

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: roles, error } = await supabaseAdmin
      .from('user_roles')
      .select('*');

    if (error) {
      console.error('Fetch roles error:', error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json(roles);
  } catch (error: unknown) {
    console.error('Fetch roles crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, overrideRole } = await req.json();

    if (!email || !overrideRole) {
      return NextResponse.json({ error: 'Missing email or role' }, { status: 400 });
    }

    const targetEmail = email.toLowerCase().trim();

    // Prevent modifying master admin accounts
    if (isMasterAdmin(targetEmail)) {
      return NextResponse.json({ error: 'Cannot modify a master admin account' }, { status: 403 });
    }

    // Fetch the target user's current role to prevent standard admins from demoting peers or superiors
    const { data: currentTargetRole, error: fetchErr } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('email', targetEmail)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: 'Failed to verify target role' }, { status: 500 });
    }

    const isTargetElevated = currentTargetRole && ELEVATED_ROLES.includes(currentTargetRole.role);

    // Only superadmins can assign or MODIFY elevated roles (admin, superadmin, teacher)
    // If a standard admin tries to modify an ALREADY elevated user, block it.
    if (!session.user.isSuperAdmin) {
      if (ELEVATED_ROLES.includes(overrideRole)) {
        return NextResponse.json({ error: 'Only superadmins can assign elevated roles' }, { status: 403 });
      }
      if (isTargetElevated) {
        return NextResponse.json({ error: 'Only superadmins can modify existing administrators' }, { status: 403 });
      }
    }

    // Upsert the role
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .upsert({ email: targetEmail, role: overrideRole }, { onConflict: 'email' })
      .select()
      .single();

    if (error) {
      console.error('Upsert role error:', error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Log the change
    Promise.resolve(supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: 'ROLE_UPDATED',
      details: { target_email: email, new_role: overrideRole },
    })).catch(() => {});

    return NextResponse.json({ success: true, user: data });
  } catch (error: unknown) {
    console.error('Upsert role crash:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    const { data: targetData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('email', email)
      .maybeSingle();

    if (targetData && ELEVATED_ROLES.includes(targetData.role) && !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Only superadmins can delete existing administrators' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('email', email);

    if (error) {
      console.error('Delete role error:', error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete role crash:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
