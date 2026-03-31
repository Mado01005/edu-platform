import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Parallel search across Subjects, Lessons, and Content Items
    const [subjectsRes, lessonsRes, itemsRes] = await Promise.all([
      supabaseAdmin.from('subjects').select('id, title, slug, color').ilike('title', `%${query}%`).limit(5),
      supabaseAdmin.from('lessons').select('id, title, slug, subject:subjects(slug)').ilike('title', `%${query}%`).limit(8),
      supabaseAdmin.from('content_items').select('id, name, item_type, lesson:lessons(slug, subject:subjects(slug))').ilike('name', `%${query}%`).limit(10)
    ]);

    const results: any[] = [];

    // Format Subjects
    subjectsRes.data?.forEach(s => {
      results.push({
        id: s.id,
        type: 'subject',
        title: s.title,
        href: `/subjects/${s.slug}`,
        badge: 'Subject',
        color: s.color
      });
    });

    // Format Lessons
    lessonsRes.data?.forEach((l: any) => {
      results.push({
        id: l.id,
        type: 'lesson',
        title: l.title,
        href: `/subjects/${l.subject.slug}/${l.slug}`,
        badge: 'Module'
      });
    });

    // Format Items (Files/Folders)
    itemsRes.data?.forEach((i: any) => {
      results.push({
        id: i.id,
        type: 'file',
        title: i.name,
        href: `/subjects/${i.lesson.subject.slug}/${i.lesson.slug}?path=${encodeURIComponent(i.name)}`, // Might need better path logic
        badge: i.item_type === 'folder' ? 'Folder' : 'File'
      });
    });

    return NextResponse.json({ results });

  } catch (error: unknown) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] });
  }
}
