import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, subjectSlug, lessonSlug } = await req.json();

    if (!fileName || !subjectSlug || !lessonSlug) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Construct the path where the file will be stored: e.g. physics/Photos/file.jpg
    const safeSubjectSlug = subjectSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
    const safeLessonSlug = lessonSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, ''); // Basic sanitization
    
    // We use a timestamp to prevent overwriting existing files with the same name
    const storagePath = `${safeSubjectSlug}/${safeLessonSlug}/${timestamp}_${cleanFileName}`;

    // Create a signed upload URL that is valid for 1 hour (3600 seconds)
    const { data, error } = await supabaseAdmin.storage
      .from('edu-content')
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error('Supabase signed URL error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      signedUrl: data.signedUrl, 
      token: data.token,
      path: data.path,
      publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/edu-content/${storagePath}`
    });

  } catch (error: any) {
    console.error('Upload initiate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
