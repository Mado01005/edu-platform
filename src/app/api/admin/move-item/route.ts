import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, targetParentId } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }

    // Update the parent_id of the item
    // targetParentId can be null (meaning move to root of lesson)
    const { error: dbError } = await supabaseAdmin
      .from('content_items')
      .update({ parent_id: targetParentId || null })
      .eq('id', itemId);

    if (dbError) {
      console.error('Database move error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Log activity
    Promise.resolve(supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: 'ITEM_MOVED',
      details: { itemId, targetParentId },
    })).catch(() => {});

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Move item error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
