import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { r2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export const maxDuration = 60; // Allow up to 60s for large migrations

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

    // Find all content items stored in Supabase (NOT in R2)
    const { data: items, error } = await supabaseAdmin
      .from('content_items')
      .select('id, url, file_type, item_type');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to only Supabase-stored files (not R2, not embeds/vimeo)
    const supabaseFiles = (items || []).filter(item => {
      if (!item.url) return false;
      if (item.item_type === 'embed' || item.item_type === 'vimeo') return false;
      if (item.url.startsWith(r2PublicBase)) return false; // Already in R2
      return item.url.includes('supabase'); // Supabase URL pattern
    });

    if (supabaseFiles.length === 0) {
      return NextResponse.json({ migrated: 0, message: 'No Supabase files found to migrate.' });
    }

    const s3 = r2Client;
    const bucket = process.env.R2_BUCKET_NAME!;
    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of supabaseFiles) {
      try {
        // Download the file from Supabase
        const response = await fetch(item.url);
        if (!response.ok) {
          errors.push(`Failed to download: ${item.url}`);
          failed++;
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        // Generate a key for R2
        const urlParts = item.url.split('/');
        const fileName = urlParts[urlParts.length - 1] || `file_${item.id}`;
        const key = `migrated/${Date.now()}_${fileName}`;

        // Upload to R2
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }));

        const newUrl = `${r2PublicBase}/${key}`;

        // Update the database record to point to R2
        const { error: updateError } = await supabaseAdmin
          .from('content_items')
          .update({ url: newUrl })
          .eq('id', item.id);

        if (updateError) {
          errors.push(`DB update failed for item ${item.id}: ${updateError.message}`);
          failed++;
          continue;
        }

        // Delete from Supabase Storage to free space
        const supabasePath = item.url.split('/edu-content/')[1];
        if (supabasePath) {
          await supabaseAdmin.storage.from('edu-content').remove([supabasePath]);
        }

        migrated++;
      } catch (err: any) {
        errors.push(`Error on item ${item.id}: ${err.message}`);
        failed++;
      }
    }

    return NextResponse.json({
      migrated,
      failed,
      total: supabaseFiles.length,
      errors: errors.slice(0, 5), // Only return first 5 errors
      message: `Successfully migrated ${migrated}/${supabaseFiles.length} files to R2.`,
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
