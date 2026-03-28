import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as { role?: string })?.role === 'admin' || (session?.user as { role?: string })?.role === 'superadmin';
    
    if (!session || !isAdmin) {
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

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('edu-content')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('edu-content')
      .getPublicUrl(storagePath);

    return NextResponse.json({ 
      publicUrl: urlData.publicUrl,
      path: storagePath,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Supabase upload error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
