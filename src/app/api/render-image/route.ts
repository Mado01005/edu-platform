import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const maxDuration = 60; // Allow enough time for heavy RAW/DNG processing

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // Fetch the original unsupported image from R2/Supabase
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return new NextResponse('Failed to fetch original image', { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let processedBuffer: Buffer;
    
    try {
      // Convert on-the-fly to WebP using Sharp
      processedBuffer = await sharp(buffer)
        .webp({ quality: 80 })
        .toBuffer();
    } catch (conversionError) {
      console.error('Dynamic image conversion failed:', conversionError);
      // Fallback: return the original buffer if conversion fails, hoping the browser *might* support it (e.g. Safari with HEIC)
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        }
      });
    }

    return new NextResponse(processedBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache heavily on Vercel Edge Network
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
