import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteR2Object } from '@/lib/r2';

export async function POST() {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const r2PublicBase = process.env.R2_PUBLIC_URL || '';

    // Find all content_items where url ends with .dng, .DNG, .heic, .HEIC, .heif, .HEIF
    const { data: unsupported, error: queryError } = await supabaseAdmin
      .from('content_items')
      .select('id, url, file_name')
      .or(
        'url.ilike.%.dng,' +
        'url.ilike.%.heic,' +
        'url.ilike.%.heif'
      );

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!unsupported || unsupported.length === 0) {
      return NextResponse.json({
        purged: 0,
        message: 'No unsupported image formats found in the database.',
      });
    }

    let purged = 0;
    let r2Deleted = 0;
    const errors: string[] = [];

    for (const item of unsupported) {
      try {
        // 1. Attempt to delete the file from R2 if it's an R2 URL
        if (item.url && r2PublicBase && item.url.startsWith(r2PublicBase)) {
          const r2Key = decodeURIComponent(item.url.replace(r2PublicBase + '/', ''));
          try {
            await deleteR2Object(r2Key);
            r2Deleted++;
          } catch (r2Err) {
            // R2 deletion failure is non-fatal — the DB record still gets purged
            console.warn(`R2 delete failed for key "${r2Key}":`, r2Err);
          }
        }

        // 2. Delete the database record
        const { error: deleteError } = await supabaseAdmin
          .from('content_items')
          .delete()
          .eq('id', item.id);

        if (deleteError) {
          errors.push(`DB delete failed for ${item.id}: ${deleteError.message}`);
        } else {
          purged++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown';
        errors.push(`Error processing ${item.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      found: unsupported.length,
      purged,
      r2Deleted,
      errors: errors.slice(0, 10),
      message: `Purged ${purged}/${unsupported.length} unsupported image records. ${r2Deleted} R2 objects deleted.`,
    });

  } catch (error: unknown) {
    console.error('Purge unsupported error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
