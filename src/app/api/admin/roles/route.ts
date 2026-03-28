import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

    // Upsert the role
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .upsert({ email: email.toLowerCase().trim(), role: overrideRole }, { onConflict: 'email' })
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
