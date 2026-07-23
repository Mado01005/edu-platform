import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

interface SearchResult {
  id: string;
  type: 'subject' | 'lesson' | 'file';
  title: string;
  href: string;
  badge: string;
  color?: string;
}

export async function GET(req: Request) {
  try {
    // C1: Authentication check — prevent unauthenticated content enumeration
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2 || query.length > 100) {
      return NextResponse.json({ results: [] });
    }

    // C1: Escape SQL LIKE wildcards to prevent pattern-based DoS
    const sanitizedQuery = query.replace(/%/g, '\\%').replace(/_/g, '\\_');

    // Parallel search across Subjects, Lessons, and Content Items
    const [subjectsRes, lessonsRes, itemsRes] = await Promise.all([
      supabaseAdmin.from('subjects').select('id, title, slug, color').ilike('title', `%${sanitizedQuery}%`).limit(5),
      supabaseAdmin.from('lessons').select('id, title, slug, subject:subjects(slug)').ilike('title', `%${sanitizedQuery}%`).limit(8),
      supabaseAdmin.from('content_items').select('id, name, item_type, lesson:lessons(slug, subject:subjects(slug))').ilike('name', `%${sanitizedQuery}%`).limit(10)
    ]);

    const results: SearchResult[] = [];

    // Format Subjects
    subjectsRes.data?.forEach((s: Record<string, string>) => {
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
    lessonsRes.data?.forEach((l: Record<string, unknown>) => {
      const subject = l.subject as { slug: string } | null;
      if (!subject?.slug) return;
      results.push({
        id: l.id as string,
        type: 'lesson',
        title: l.title as string,
        href: `/subjects/${subject.slug}/${l.slug}`,
        badge: 'Module'
      });
    });

    // Format Items (Files/Folders)
    itemsRes.data?.forEach((i: Record<string, unknown>) => {
      const lesson = i.lesson as { slug: string; subject: { slug: string } } | null;
      if (!lesson?.subject?.slug) return;
      results.push({
        id: i.id as string,
        type: 'file',
        title: i.name as string,
        href: `/subjects/${lesson.subject.slug}/${lesson.slug}?path=${encodeURIComponent(i.name as string)}`,
        badge: (i.item_type as string) === 'folder' ? 'Folder' : 'File'
      });
    });

    return NextResponse.json({ results });

  } catch (error: unknown) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] });
  }
}
