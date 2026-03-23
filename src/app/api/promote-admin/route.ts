import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const email = 'abdallahsaad828asd@gmail.com';
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .upsert({ email, role: 'superadmin' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, user: data });
}
