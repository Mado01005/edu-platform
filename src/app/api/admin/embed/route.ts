import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

function extractVideoId(url: string): { type: 'vimeo' | 'youtube' | 'unknown', id: string | null } {
  // Vimeo parsing
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };
  
  // YouTube parsing
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };

  return { type: 'unknown', id: null };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subjectId, lessonId, url, title } = await req.json();

    if (!subjectId || !lessonId || !url || !title) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const videoData = extractVideoId(url);
    if (videoData.type === 'unknown' || !videoData.id) {
       return NextResponse.json({ error: 'Could not extract valid Vimeo or YouTube ID from the provided URL.' }, { status: 400 });
    }

    // Right now, the schema specifically supports 'vimeo' as an item_type, but let's map youtube optionally 
    // Wait, let's insert it as 'vimeo' if it's Vimeo, or 'youtube' if it's YouTube. 
    // We update the constraint seamlessly by just passing it as the type, though the DB schema check constraint might only allow 'file', 'vimeo', 'folder'.
    // If it's YouTube, we will insert item_type: 'vimeo' but url stores the youtube id just as a hack? No, let's strictly support Vimeo for now to match the user's `VimeoPlayer` component.
    
    if (videoData.type !== 'vimeo') {
      return NextResponse.json({ error: 'Currently, only Vimeo links are supported by the frontend player.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('content_items').insert({
      lesson_id: lessonId,
      item_type: 'vimeo',
      file_type: 'video',
      name: title,
      vimeo_id: videoData.id,
      url: url // retaining the raw URL just in case
    }).select().single();

    if (error) {
       console.error('Embed video error:', error);
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error: any) {
    console.error('Embed video crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
