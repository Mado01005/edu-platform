import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { putR2Object } from '@/lib/r2';
import sharp from 'sharp';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    if (!file || !path) {
      return NextResponse.json({ error: 'Missing file or storage path' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 1. Process with Sharp (convert to WebP)
    let processedBuffer: Buffer;
    let finalPath = path;

    try {
      processedBuffer = await sharp(buffer)
        .webp({ quality: 80 })
        .toBuffer();
        
      // Ensure extension is .webp
      finalPath = path.replace(/\.[^/.]+$/, "") + ".webp";
    } catch (sharpError) {
      console.error('Sharp processing failed:', sharpError);
      return NextResponse.json({ error: 'Failed to process RAW image. Format may not be supported by the server runtime.' }, { status: 422 });
    }

    // 2. Upload processed WebP to R2
    const publicUrl = await putR2Object(finalPath, processedBuffer, 'image/webp');

    return NextResponse.json({ 
      success: true, 
      publicUrl,
      fileName: finalPath.split('/').pop()
    });

  } catch (error: unknown) {
    console.error('RAW upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
