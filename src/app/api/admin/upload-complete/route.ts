import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyR2ObjectExists } from '@/lib/r2';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subjectId, lessonId, parentId, fileName, fileType, contentType, publicUrl, itemType = 'file', vimeoId, idempotencyKey } = await req.json();

    if (!lessonId || !fileName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // ── P2.5: Idempotency check — prevent duplicate rows from retries ──
    // Check for an existing record with the same lesson + name + url combination.
    // This makes the endpoint safe for client-side retries.
    if (idempotencyKey) {
      const { data: existing } = await supabaseAdmin
        .from('content_items')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('name', fileName)
        .eq('url', publicUrl)
        .maybeSingle();

      if (existing) {
        // Already recorded — return as idempotent success
        return NextResponse.json({ success: true, data: existing, idempotent: true });
      }
    }

    // ── P1.3: Verify file actually exists in R2 before creating DB record ──
    // Extract the R2 key from the public URL. The publicUrl format is:
    // {R2_PUBLIC_URL}/{subject}/{lesson}/[subfolder]/timestamp_filename
    if (itemType === 'file' && publicUrl) {
      const r2PublicBase = process.env.R2_PUBLIC_URL || '';
      const r2Key = publicUrl.replace(r2PublicBase + '/', '');
      const contentLength = await verifyR2ObjectExists(r2Key);

      if (contentLength === null) {
        return NextResponse.json(
          { error: `Upload verification failed: '${fileName}' was not found in storage. The file transfer may have failed.` },
          { status: 409 }
        );
      }
    }

    // Insert the new record into the content_items SQL table
    const { data, error } = await supabaseAdmin.from('content_items').insert({
      lesson_id: lessonId,
      parent_id: parentId || null,
      item_type: itemType,
      file_type: fileType,
      content_type: contentType || null,
      name: fileName,
      url: publicUrl,
      vimeo_id: vimeoId,
    }).select().single();

    if (error) {
      console.error('Database insert error:', error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Auto-log the upload as an activity event for "What's New" notifications (non-blocking)
    Promise.resolve(supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: 'NEW_CONTENT_ADDED',
      url: publicUrl,
      details: { subjectId, lessonId, fileName, fileType, itemType },
    })).catch(() => { });

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error('Upload complete error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
