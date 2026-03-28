import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { r2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const key = formData.get('key') as string;
    const contentType = formData.get('contentType') as string;

    if (!file || !key) {
      return NextResponse.json({ error: 'Missing file or key' }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json({ error: 'R2_BUCKET_NAME is not configured' }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType || file.type || 'application/octet-stream',
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ 
      success: true, 
      url: publicUrl 
    });
  } catch (error: unknown) {
    console.error('R2 Upload Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
