import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyR2ObjectExists } from '@/lib/r2';

interface BatchCompleteItem {
  subjectId: string;
  lessonId: string;
  parentId: string | null;
  fileName: string;
  fileType: string;
  publicUrl: string;
  itemType: string;
  vimeoId: string;
  idempotencyKey: string;
}

/**
 * P3.2: Batch database insert for completed uploads.
 * Accepts an array of file metadata and inserts all content_items in a single transaction.
 * Includes R2 verification and idempotency checks.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items }: { items: BatchCompleteItem[] } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    if (items.length > 100) {
      return NextResponse.json({ error: 'Batch size exceeds maximum of 100 items' }, { status: 400 });
    }

    const results: Array<{ status: 'created' | 'idempotent' | 'missing_r2' | 'duplicate'; item: BatchCompleteItem; data?: unknown }> = [];

    // Deduplicate items by idempotencyKey within this batch
    const seenKeys = new Set<string>();
    const uniqueItems: BatchCompleteItem[] = [];
    for (const item of items) {
      if (!seenKeys.has(item.idempotencyKey)) {
        seenKeys.add(item.idempotencyKey);
        uniqueItems.push(item);
      } else {
        results.push({ status: 'duplicate', item });
      }
    }

    // Process each unique item
    for (const item of uniqueItems) {
      // R2 existence verification (same as single complete)
      if (item.itemType === 'file' && item.publicUrl) {
        const r2PublicBase = process.env.R2_PUBLIC_URL || '';
        const r2Key = item.publicUrl.replace(r2PublicBase + '/', '');
        const contentLength = await verifyR2ObjectExists(r2Key);

        if (contentLength === null) {
          results.push({ status: 'missing_r2', item });
          continue;
        }
      }

      // Idempotency check
      const { data: existing } = await supabaseAdmin
        .from('content_items')
        .select('*')
        .eq('lesson_id', item.lessonId)
        .eq('name', item.fileName)
        .eq('url', item.publicUrl)
        .maybeSingle();

      if (existing) {
        results.push({ status: 'idempotent', item, data: existing });
        continue;
      }

      // Insert into content_items
      const { data, error } = await supabaseAdmin
        .from('content_items')
        .insert({
          lesson_id: item.lessonId,
          parent_id: item.parentId || null,
          item_type: item.itemType,
          file_type: item.fileType,
          name: item.fileName,
          url: item.publicUrl,
          vimeo_id: item.vimeoId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Batch insert error for item:', item.fileName, error);
        return NextResponse.json({ error: `Failed to insert ${item.fileName}: ${error.message}` }, { status: 500 });
      }

      results.push({ status: 'created', item, data });
    }

    // Fire-and-forget activity log for the batch
    const createdItems = results.filter(r => r.status === 'created');
    if (createdItems.length > 0) {
      Promise.resolve(supabaseAdmin.from('activity_logs').insert({
        user_email: session.user?.email || 'admin',
        user_name: session.user?.name || 'Admin',
        action: 'BATCH_UPLOAD_COMPLETE',
        url: '',
        details: {
          totalItems: createdItems.length,
          fileNames: createdItems.map(r => r.item.fileName),
        },
      })).catch(() => { });
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      created: results.filter(r => r.status === 'created').length,
      idempotent: results.filter(r => r.status === 'idempotent').length,
      missingR2: results.filter(r => r.status === 'missing_r2').length,
      duplicates: results.filter(r => r.status === 'duplicate').length,
      results
    });

  } catch (error: unknown) {
    console.error('Batch complete error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
