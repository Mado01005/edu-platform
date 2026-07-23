import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidUUID } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, targetParentId } = await req.json();

    // C4: Validate UUID format for itemId
    if (!itemId || !isValidUUID(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    // C4: Validate target parent ID if provided
    if (targetParentId && !isValidUUID(targetParentId)) {
      return NextResponse.json({ error: 'Invalid target parent ID' }, { status: 400 });
    }

    // Update the parent_id of the item
    // targetParentId can be null (meaning move to root of lesson)
    const { error: dbError } = await supabaseAdmin
      .from('content_items')
      .update({ parent_id: targetParentId || null })
      .eq('id', itemId);

    if (dbError) {
      console.error('Database move error:', dbError);
      // C4: Sanitize error — don't leak raw DB message
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }

    try {
      await supabaseAdmin.from('activity_logs').insert({
        user_email: session.user?.email || 'admin',
        user_name: session.user?.name || 'Admin',
        action: 'ITEM_MOVED',
        details: { itemId, targetParentId },
      });
    } catch (logErr) {
      console.error('Failed to log item move:', logErr);
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Move item error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
