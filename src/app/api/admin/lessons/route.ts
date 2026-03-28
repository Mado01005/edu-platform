import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

function generateSlug(title: string) {
  return title.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subjectId, title } = await req.json();

    if (!subjectId || !title) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const slug = generateSlug(title);
    
    const { data, error } = await supabaseAdmin.from('lessons').insert({
      subject_id: subjectId,
      slug,
      title
    }).select().single();

    if (error) {
       console.error('Create lesson error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lesson: data });
  } catch (error: unknown) {
    console.error('Create lesson crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
