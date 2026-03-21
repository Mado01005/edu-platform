import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = await req.json();
    if (!type || !id) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    let table = '';
    if (type === 'subject') table = 'subjects';
    else if (type === 'lesson') table = 'lessons';
    else if (type === 'item') table = 'content_items';
    else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    // If deleting a physical file, cleanly strip it from the cloud bucket to save space
    if (type === 'item') {
      const { data: item } = await supabaseAdmin.from('content_items').select('url, item_type').eq('id', id).single();
      if (item && item.item_type === 'file' && item.url) {
         try {
           const path = item.url.split('/edu-content/')[1];
           if (path) {
             await supabaseAdmin.storage.from('edu-content').remove([path]);
           }
         } catch(e) {
           console.error("Storage cleanup failed silently:", e);
         }
      }
    }

    const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (error) {
       console.error(`Delete ${type} error:`, error);
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
