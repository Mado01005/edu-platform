import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { listAllR2Objects, deleteR2Object } from '@/lib/r2';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purge } = await req.json().catch(() => ({ purge: false }));

    // 1. Fetch all items in the database that are presumably tracked
    const { data: contentItems, error: dbError } = await supabaseAdmin
      .from('content_items')
      .select('url');
      
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // 2. Identify the public CDN base so we can strip it from URLs to yield raw S3 object keys
    const publicBase = process.env.R2_PUBLIC_URL || '';
    const dbKeys = new Set<string>();
    
    contentItems.forEach(item => {
      if (item.url && item.url.startsWith(publicBase)) {
        // "https://cdn.example.com/foo/bar.png" -> "foo/bar.png"
        const key = item.url.substring(publicBase.length).replace(/^\/+/, '');
        dbKeys.add(key);
      }
    });

    // 3. Fetch literally everything sitting in the R2 bucket right now
    const r2Keys = await listAllR2Objects();

    // 4. Set difference to find files in R2 that nobody in the database claims
    const orphanedKeys = r2Keys.filter(r2Key => !dbKeys.has(r2Key));

    if (!purge) {
      // DRY RUN MODE
      return NextResponse.json({
        success: true,
        dryRun: true,
        orphanedCount: orphanedKeys.length,
        totalR2Objects: r2Keys.length,
        totalDbLinks: dbKeys.size,
        orphanedFiles: orphanedKeys
      });
    }

    // EXECUTE MODE
    // We intentionally run sequentially to prevent rate limits from Cloudflare S3 API on massive deletes
    const deleted: string[] = [];
    const failed: { key: string; reason: string }[] = [];

    for (const key of orphanedKeys) {
      try {
        await deleteR2Object(key);
        deleted.push(key);
      } catch (err: any) {
        failed.push({ key, reason: err.message || 'Unknown AWS S3 deletion error' });
      }
    }

    // Log the purge event
    if (deleted.length > 0) {
      await supabaseAdmin.from('activity_logs').insert({
        user_name: session.user.name,
        user_email: session.user.email,
        action: 'STORAGE_PURGE',
        url: 'R2 API',
        details: { deletedCount: deleted.length, failedCount: failed.length }
      });
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      purged: deleted.length,
      failed: failed.length,
      errors: failed
    });

  } catch (error: any) {
    console.error('[Purge API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
