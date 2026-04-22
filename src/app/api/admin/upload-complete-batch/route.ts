import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyR2ObjectExists } from '@/lib/r2';

// P3.2: Increased timeout for large batches
export const maxDuration = 60;

// P4.0: Chunk size for parallel operations to avoid connection pool exhaustion
const VALIDATION_CHUNK_SIZE = 25;
const INSERT_CHUNK_SIZE = 25;

interface BatchCompleteItem {
  subjectId: string;
  lessonId: string;
  parentId: string | null;
  fileName: string;
  fileType: string;
  publicUrl: string;
  itemType: string;
  contentType: string;
  vimeoId: string;
  idempotencyKey: string;
}

interface ValidationResult {
  status: 'created' | 'idempotent' | 'missing_r2' | 'duplicate' | 'error';
  item: BatchCompleteItem;
  data?: any;
  error?: string;
}

/**
 * P4.0: Process an array in chunked parallel batches to prevent
 * Supabase connection pool exhaustion (PgBouncer default: 15 connections).
 */
async function chunkedParallel<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
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

    console.log(`[BATCH] Received ${items.length} items for processing`);
    const batchStart = Date.now();

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

    // P4.0: Chunked validation — process 50 items at a time to avoid
    // saturating Supabase connection pool and R2 socket limits
    const validateItem = async (item: BatchCompleteItem): Promise<ValidationResult> => {
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

        return { status: 'created', item };
      } catch (err: any) {
        console.error(`Validation error for ${item.fileName}:`, err);
        return { status: 'error', item, error: err.message };
      }
    };

    const validationStart = Date.now();
    const validationResults = await chunkedParallel(uniqueItems, VALIDATION_CHUNK_SIZE, validateItem);
    console.log(`[BATCH] Validation completed in ${Date.now() - validationStart}ms (${uniqueItems.length} items, chunks of ${VALIDATION_CHUNK_SIZE})`);
    
    // Collect all results including duplicates
    const allResults = [...duplicates, ...validationResults];

    // Filter items that actually need inserting
    const itemsToInsert = validationResults
      .filter(r => r.status === 'created')
      .map(r => {
        if (!r.item.lessonId) {
          console.error('[API BATCH ERROR] Missing lessonId for item:', r.item.fileName);
          return null;
        }
        return {
          lesson_id: r.item.lessonId,
          parent_id: r.item.parentId || null,
          item_type: r.item.itemType,
          file_type: r.item.fileType,
          content_type: r.item.contentType || null,
          name: r.item.fileName,
          url: r.item.publicUrl,
          vimeo_id: r.item.vimeoId || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // P4.0: Chunked insert — insert 50 rows at a time to prevent
    // PostgREST payload bloat and connection hold-time issues
    if (itemsToInsert.length > 0) {
      const insertStart = Date.now();
      const insertErrors: string[] = [];

      for (let i = 0; i < itemsToInsert.length; i += INSERT_CHUNK_SIZE) {
        const chunk = itemsToInsert.slice(i, i + INSERT_CHUNK_SIZE);
        const { error: insertError } = await supabaseAdmin
          .from('content_items')
          .insert(chunk)
          .select();

        if (insertError) {
          console.error(`[SUPABASE BATCH ERROR] Insert chunk ${i}-${i + chunk.length} failed:`, insertError);
          insertErrors.push(`Chunk ${i}-${i + chunk.length}: ${insertError.message}`);
        }
      }

      console.log(`[BATCH] Insert completed in ${Date.now() - insertStart}ms (${itemsToInsert.length} rows, chunks of ${INSERT_CHUNK_SIZE})`);

      if (insertErrors.length > 0 && insertErrors.length === Math.ceil(itemsToInsert.length / INSERT_CHUNK_SIZE)) {
        // All chunks failed — total failure
        return NextResponse.json({ 
          error: 'Database synchronization failed for the entire batch',
          details: insertErrors.join('; '),
        }, { status: 500 });
      }
    }

    const createdCount = itemsToInsert.length;
    console.log(`[BATCH] Total processing time: ${Date.now() - batchStart}ms — created: ${createdCount}, skipped: ${validationResults.filter(r => r.status !== 'created').length}`);

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
          processingTimeMs: Date.now() - batchStart,
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
