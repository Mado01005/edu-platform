import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteR2Object } from '@/lib/r2';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, fileUrl } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }

    // 1. If it's an R2 file, delete from R2 first
    if (fileUrl && fileUrl.includes(process.env.R2_PUBLIC_URL || '')) {
      const publicBase = process.env.R2_PUBLIC_URL || '';
      // Extract the key from the URL
      let key = fileUrl.replace(publicBase, '');
      if (key.startsWith('/')) key = key.substring(1);
      
      // Decode URI component because it might be encoded (e.g. %20 for spaces)
      key = decodeURIComponent(key);

      try {
        await deleteR2Object(key);
        console.log(`Deleted R2 object: ${key}`);
      } catch (r2Error) {
        console.error('R2 deletion failed:', r2Error);
        // We continue even if R2 fails, to ensure DB record is removed if requested,
        // or we could fail earlier. Usually better to at least try DB deletion.
      }
    }

    // 2. Delete the record from the database
    // If it's a folder, we might want to delete children too? 
    // Usually Supabase handles this with CASCADE if configured, 
    // but we'll do a simple delete here.
    const { error: dbError } = await supabaseAdmin
      .from('content_items')
      .delete()
      .eq('id', itemId);

    if (dbError) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Delete item error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
