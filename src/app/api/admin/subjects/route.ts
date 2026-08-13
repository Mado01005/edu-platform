import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { TEACHING_ROLES } from '@/lib/lms/roles';

function generateSlug(title: string) {
  return title.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
}

import { getAllSubjects } from '@/lib/content';

export async function GET(request: Request = new Request('http://localhost')) {
  try {
    const actor = await requireAdminApiAuth(request, TEACHING_ROLES);
    if (!actor.ok) return actor.response;

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
    const actor = await requireAdminApiAuth(req, TEACHING_ROLES);
    if (!actor.ok) return actor.response;

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
