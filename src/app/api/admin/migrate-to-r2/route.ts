import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { r2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export const maxDuration = 60;

export async function POST() {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const r2PublicBase = process.env.R2_PUBLIC_URL || '';
    if (!r2PublicBase) {
      return NextResponse.json({ error: 'R2_PUBLIC_URL not configured' }, { status: 500 });
    }

    const { data: items, error } = await supabaseAdmin
      .from('content_items')
      .select('id, url, file_type, item_type');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter: anything not already in R2 and not an embed/vimeo
    const supabaseFiles = (items || []).filter(item => {
      if (!item.url) return false;
      if (item.item_type === 'embed' || item.item_type === 'vimeo') return false;
      if (item.file_type === 'vimeo') return false;
      if (item.url.startsWith(r2PublicBase)) return false; // Already in R2
      return true;
    });

    if (supabaseFiles.length === 0) {
      return NextResponse.json({ migrated: 0, message: 'No files to migrate.' });
    }

    const sampleUrls = supabaseFiles.slice(0, 3).map(f => f.url);
    const bucket = process.env.R2_BUCKET_NAME!;
    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process 15 files per batch to stay within timeout
    const batch = supabaseFiles.slice(0, 15);

    for (const item of batch) {
      try {
        let fileBuffer: Buffer | null = null;
        let contentType = 'application/octet-stream';

        // The URLs are relative paths like /content/academic-writing/Week%201/file.pdf
        // The Supabase storage path is everything after /content/
        let storagePath = '';
        if (item.url.startsWith('/content/')) {
          storagePath = decodeURIComponent(item.url.replace('/content/', ''));
        } else if (item.url.includes('/edu-content/')) {
          storagePath = decodeURIComponent(item.url.split('/edu-content/')[1]?.split('?')[0] || '');
        }

        // Method 1: Download via Supabase Admin SDK using the storage path
        if (storagePath) {
          const { data: blob, error: dlError } = await supabaseAdmin.storage
            .from('edu-content')
            .download(storagePath);

          if (blob && !dlError) {
            fileBuffer = Buffer.from(await blob.arrayBuffer());
            contentType = blob.type || contentType;
          } else if (dlError) {
            errors.push(`SDK: ${storagePath} → ${dlError.message}`);
          }
        }

        // Method 2: If URL is a full URL, try direct HTTP fetch
        if (!fileBuffer && (item.url.startsWith('http://') || item.url.startsWith('https://'))) {
          try {
            const response = await fetch(item.url);
            if (response.ok) {
              fileBuffer = Buffer.from(await response.arrayBuffer());
              contentType = response.headers.get('content-type') || contentType;
            } else {
              errors.push(`HTTP ${response.status}: ${item.url.substring(0, 60)}`);
            }
          } catch (e: any) { errors.push(`Fetch: ${e.message?.substring(0, 60)}`); }
        }

        if (!fileBuffer || fileBuffer.length === 0) {
          if (errors.length === 0 || !errors[errors.length-1]?.includes(storagePath)) {
            errors.push(`No data: ${storagePath || item.url.substring(0, 80)}`);
          }
          failed++;
          continue;
        }

        // Generate R2 key preserving original path structure
        const key = `content/${storagePath || `file_${item.id}`}`;

        // Upload to R2
        await r2Client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
        }));

        const newUrl = `${r2PublicBase}/${key}`;

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

        // Clean up from Supabase Storage
        if (storagePath) {
          await supabaseAdmin.storage.from('edu-content').remove([storagePath]);
        }

        migrated++;
      } catch (err: any) {
        errors.push(`Err: ${err.message?.substring(0, 80)}`);
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

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
