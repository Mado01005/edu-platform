import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyR2ObjectExists } from '@/lib/r2';

// P3.2: Increased timeout for large batches
export const maxDuration = 60;

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

interface ValidationResult {
  status: 'created' | 'idempotent' | 'missing_r2' | 'duplicate' | 'error';
  item: BatchCompleteItem;
  data?: any;
  error?: string;
}

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

    // Deduplicate items by idempotencyKey within this batch
    const seenKeys = new Set<string>();
    const uniqueItems: BatchCompleteItem[] = [];
    const duplicates: ValidationResult[] = [];
    
    for (const item of items) {
      if (!seenKeys.has(item.idempotencyKey)) {
        seenKeys.add(item.idempotencyKey);
        uniqueItems.push(item);
      } else {
        duplicates.push({ status: 'duplicate', item });
      }
    }

    // P3.4: Concurrent Validation (R2 + Idempotency)
    const validationPromises = uniqueItems.map(async (item): Promise<ValidationResult> => {
      try {
        // 1. R2 Verification
        if (item.itemType === 'file' && item.publicUrl) {
          const r2PublicBase = process.env.R2_PUBLIC_URL || '';
          const r2Key = item.publicUrl.replace(r2PublicBase + '/', '');
          const contentLength = await verifyR2ObjectExists(r2Key);
          
          if (contentLength === null) {
            return { status: 'missing_r2', item };
          }
        }

        // 2. Idempotency Check (Check if record already exists)
        const { data: existing } = await supabaseAdmin
          .from('content_items')
          .select('*')
          .eq('lesson_id', item.lessonId)
          .eq('name', item.fileName)
          .eq('url', item.publicUrl)
          .maybeSingle();

        if (existing) {
          return { status: 'idempotent', item, data: existing };
        }

        // If it passed both, it's ready to be created
        return { status: 'created', item };
      } catch (err: any) {
        console.error(`Validation error for ${item.fileName}:`, err);
        return { status: 'error', item, error: err.message };
      }
    });

    const validationResults = await Promise.all(validationPromises);
    
    // Collect all results including duplicates
    const allResults = [...duplicates, ...validationResults];

    // Filter items that actually need inserting
    const itemsToInsert = validationResults
      .filter(r => r.status === 'created')
      .map(r => ({
        lesson_id: r.item.lessonId,
        parent_id: r.item.parentId || null,
        item_type: r.item.itemType,
        file_type: r.item.fileType,
        name: r.item.fileName,
        url: r.item.publicUrl,
        vimeo_id: r.item.vimeoId || null,
      }));

    if (itemsToInsert.length > 0) {
      // P3.5: Single Multi-Row Transaction
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('content_items')
        .insert(itemsToInsert)
        .select();

      if (insertError) {
        console.error('[SUPABASE BATCH ERROR] Multi-row insert failed:', insertError);
        return NextResponse.json({ 
          error: 'Database synchronization failed for the entire batch',
          details: insertError.message,
          code: insertError.code
        }, { status: 500 });
      }

      // Map inserted data back to results (optional but good for telemetry)
      // Since they are inserted in order, we could map them, but for this app 
      // simple success Boolean is usually enough for the UI.
    }

    // Fire-and-forget activity log
    const createdCount = itemsToInsert.length;
    if (createdCount > 0) {
      Promise.resolve(supabaseAdmin.from('activity_logs').insert({
        user_email: session.user?.email || 'admin',
        user_name: session.user?.name || 'Admin',
        action: 'BATCH_UPLOAD_COMPLETE_OPTIMIZED',
        details: {
          totalRequested: items.length,
          totalCreated: createdCount,
          skippedMissingR2: validationResults.filter(r => r.status === 'missing_r2').length,
          skippedIdempotent: validationResults.filter(r => r.status === 'idempotent').length,
        },
      })).catch(() => { });
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      created: createdCount,
      idempotent: validationResults.filter(r => r.status === 'idempotent').length,
      missingR2: validationResults.filter(r => r.status === 'missing_r2').length,
      duplicates: duplicates.length,
      results: allResults
    });

  } catch (error: unknown) {
    console.error('Optimized Batch complete error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

