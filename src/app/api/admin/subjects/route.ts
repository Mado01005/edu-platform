import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

function generateSlug(title: string) {
  return title.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Attach an empty lessons array strictly for the React frontend state ingestion
    data.lessons = [];

    return NextResponse.json({ success: true, subject: data });
  } catch (error: any) {
    console.error('Create subject crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
