import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { r2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { headers } from 'next/headers';

export const maxDuration = 60;

export async function POST() {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const r2PublicBase = process.env.R2_PUBLIC_URL || '';
    if (!r2PublicBase) {
      return NextResponse.json({ error: 'R2_PUBLIC_URL not configured' }, { status: 500 });
    }

    // Get the base URL of the site from the request headers
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const { data: items, error } = await supabaseAdmin
      .from('content_items')
      .select('id, url, file_type, item_type');

    if (error) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Filter: anything not already in R2 and not an embed/vimeo
    const supabaseFiles = (items || []).filter(item => {
      if (!item.url) return false;
      if (item.item_type === 'embed' || item.item_type === 'vimeo') return false;
      if (item.file_type === 'vimeo') return false;
      if (item.url.startsWith(r2PublicBase)) return false;
      return true;
    });

    if (supabaseFiles.length === 0) {
      return NextResponse.json({ migrated: 0, message: 'All files are already on R2!' });
    }

    const sampleUrls = supabaseFiles.slice(0, 3).map(f => f.url);
    const bucket = process.env.R2_BUCKET_NAME!;
    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process 15 files per batch
    const batch = supabaseFiles.slice(0, 15);

    for (const item of batch) {
      try {
        // The URLs are relative paths like /content/academic-writing/Week%201/file.pdf
        const fullUrl = item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`;

        const response = await fetch(fullUrl);
        if (!response.ok) {
          errors.push(`HTTP ${response.status}: ${item.url.substring(0, 70)}`);
          failed++;
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        if (buffer.length === 0) {
          errors.push(`Empty file: ${item.url.substring(0, 70)}`);
          failed++;
          continue;
        }

        // Preserve original path structure in R2
        const key = item.url.startsWith('/') ? decodeURIComponent(item.url.substring(1)) : decodeURIComponent(item.url);

        // Upload to R2
        await r2Client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }));

        const newUrl = `${r2PublicBase}/${encodeURI(key)}`;

        // Update DB to point to R2
        const { error: updateError } = await supabaseAdmin
          .from('content_items')
          .update({ url: newUrl })
          .eq('id', item.id);

        if (updateError) {
          errors.push(`DB: ${updateError.message}`);
          failed++;
          continue;
        }

        migrated++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Err: ${msg.substring(0, 80)}`);
        failed++;
      }
    }

    const remaining = supabaseFiles.length - batch.length;

    return NextResponse.json({
      migrated,
      failed,
      total: batch.length,
      remaining,
      sampleUrls,
      errors: errors.slice(0, 10),
      message: `Migrated ${migrated}/${batch.length} files.${remaining > 0 ? ` ${remaining} remaining — click again.` : ''}`,
    });

  } catch (error: unknown) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
