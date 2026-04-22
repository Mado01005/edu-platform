import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Extracts a Vimeo video ID from various URL formats:
 *   - https://vimeo.com/123456789
 *   - https://player.vimeo.com/video/123456789
 *   - https://vimeo.com/channels/staffpicks/123456789
 *   - https://vimeo.com/groups/name/videos/123456789
 *   - Raw numeric ID: "123456789"
 */
function extractVimeoId(input: string): string | null {
  const trimmed = input.trim();

  // Pure numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed;

  // URL patterns
  const patterns = [
    /(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/,
    /vimeo\.com\/channels\/[\w-]+\/(\d+)/,
    /vimeo\.com\/groups\/[\w-]+\/videos\/(\d+)/,
  ];

  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) return match[1];
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, name, url, parentId } = await req.json();

    if (!lessonId || !name || !url) {
      return NextResponse.json({ error: 'Missing parameters (lessonId, name, url)' }, { status: 400 });
    }

    // Extract Vimeo ID from URL for player rendering
    const vimeoId = extractVimeoId(url);
    if (!vimeoId) {
      return NextResponse.json(
        { error: 'Invalid Vimeo URL. Accepted formats: vimeo.com/ID, player.vimeo.com/video/ID, or a raw numeric ID.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.from('content_items').insert({
      lesson_id: lessonId,
      parent_id: parentId || null,
      name,
      url,
      vimeo_id: vimeoId,
      item_type: 'vimeo',
      file_type: 'video',
      content_type: 'video/vimeo',
      created_at: new Date().toISOString()
    }).select().single();

    if (error) {
       console.error('Embed video error:', error);
       const message = error instanceof Error ? error.message : 'Internal Server Error';
       return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error: unknown) {
    console.error('Embed error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
