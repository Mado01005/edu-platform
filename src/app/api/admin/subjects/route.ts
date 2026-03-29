import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

function generateSlug(title: string) {
  return title.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
}

import { getAllSubjects } from '@/lib/content';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subjects = await getAllSubjects();
    return NextResponse.json(subjects, {
      headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (error: unknown) {
    console.error('Fetch subjects error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, icon, color } = await req.json();

    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

    const slug = generateSlug(title);
    
    const { data, error } = await supabaseAdmin.from('subjects').insert({
      slug,
      title,
      icon: icon || '📁',
      color: color || 'from-indigo-500 to-purple-500'
    }).select().single();

    if (error) {
      console.error('Create subject error:', error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
    
    // Attach an empty lessons array strictly for the React frontend state ingestion
    const subjectWithLessons = { ...data, lessons: [] };

    return NextResponse.json({ success: true, subject: subjectWithLessons });
  } catch (error: unknown) {
    console.error('Create subject crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
