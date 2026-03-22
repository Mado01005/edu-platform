import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/r2';

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, subjectSlug, lessonSlug, contentType } = await req.json();

    if (!fileName || !subjectSlug || !lessonSlug) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Construct the path where the file will be stored: e.g. physics/Photos/1234567_file.jpg
    const safeSubjectSlug = subjectSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
    const safeLessonSlug = lessonSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
    
    const storagePath = `${safeSubjectSlug}/${safeLessonSlug}/${timestamp}_${cleanFileName}`;

    // Generate a presigned upload URL from Cloudflare R2 (valid for 1 hour)
    const signedUrl = await getPresignedUploadUrl(storagePath, contentType || 'application/octet-stream');
    const publicUrl = getPublicUrl(storagePath);

    return NextResponse.json({ 
      signedUrl,
      path: storagePath,
      publicUrl
    });

  } catch (error: any) {
    console.error('Upload initiate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
