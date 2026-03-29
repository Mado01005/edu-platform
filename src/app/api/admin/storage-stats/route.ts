import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count all content items grouped by storage location
    const { data: items, error } = await supabaseAdmin
      .from('content_items')
      .select('url, file_type, item_type');

    if (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
    }

    // Average file sizes for estimation (in MB)
    const sizeEstimates: Record<string, number> = {
      pdf: 2.5,
      image: 1.2,
      video: 15,
      powerpoint: 4,
      vimeo: 0, // Embeds use zero storage
      embed: 0,
      unknown: 1,
    };

    let supabaseCount = 0;
    let supabaseMB = 0;
    let r2Count = 0;
    let r2MB = 0;
    let embedCount = 0;

    const r2PublicBase = process.env.R2_PUBLIC_URL || '';

    (items || []).forEach(item => {
      const type = item.file_type || item.item_type || 'unknown';
      const estimatedSize = sizeEstimates[type] || sizeEstimates['unknown'];
      
      if (item.item_type === 'embed' || item.item_type === 'vimeo' || type === 'vimeo') {
        embedCount++;
        return;
      }

      if (r2PublicBase && item.url?.startsWith(r2PublicBase)) {
        r2Count++;
        r2MB += estimatedSize;
      } else {
        supabaseCount++;
        supabaseMB += estimatedSize;
      }
    });

    return NextResponse.json({
      supabase: {
        fileCount: supabaseCount,
        estimatedMB: Math.round(supabaseMB),
        limitMB: 1000,
        percentUsed: Math.min(Math.round((supabaseMB / 1000) * 100), 100),
      },
      r2: {
        fileCount: r2Count,
        estimatedMB: Math.round(r2MB),
        limitMB: 10000,
        percentUsed: Math.min(Math.round((r2MB / 10000) * 100), 100),
      },
      embeds: embedCount,
      totalFiles: supabaseCount + r2Count + embedCount,
    }, {
      headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120' }
    });

  } catch (error: unknown) {
    console.error('Storage stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
