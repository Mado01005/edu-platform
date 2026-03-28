import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, is_active } = await req.json();

    // If disabling all announcements via a clear command
    if (!message && is_active === false) {
       const { error } = await supabaseAdmin.from('announcements')
            .update({ is_active: false })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to target all rows

       if (error) throw error;
       return NextResponse.json({ success: true, status: 'cleared' });
    }

    if (!message) return NextResponse.json({ error: 'Message payload missing' }, { status: 400 });

    // Step 1: Force all prior announcements to immediately expire (only one global banner allowed at a time)
    await supabaseAdmin.from('announcements')
            .update({ is_active: false })
            .neq('id', '00000000-0000-0000-0000-000000000000'); 

    // Step 2: Insert the newly forged announcement
    const { data, error } = await supabaseAdmin.from('announcements').insert({
      message,
      is_active: true
    }).select().single();
    
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Announcement deployment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
