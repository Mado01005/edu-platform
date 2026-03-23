import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { r2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const subjectSlug = formData.get('subjectSlug') as string;
    const lessonSlug = formData.get('lessonSlug') as string;

    if (!file || !subjectSlug) {
      return NextResponse.json({ error: 'Missing file or subject' }, { status: 400 });
    }

    // Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Construct storage path
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_()]/g, '_');
    const storagePath = `${subjectSlug}/${lessonSlug}/${timestamp}_${cleanName}`;

    // Upload to R2 Storage via Server-Proxy (bypasses CORS)
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'eduportal-media',
      Key: storagePath,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await r2Client.send(command);

    // Get public URL
    const publicBase = process.env.R2_PUBLIC_URL || '';
    const publicUrl = `${publicBase}/${storagePath}`;

    return NextResponse.json({ 
      publicUrl,
      path: storagePath,
    });

  } catch (error: any) {
    console.error('R2 proxy upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
