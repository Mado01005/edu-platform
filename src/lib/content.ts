import { supabaseAdmin as supabase } from './supabase';
import { SubjectMeta, LessonMeta, ContentNode, ItemType, FileType, ContentItem } from '@/types';

function buildContentTree(flatItems: ContentItem[], rootParentId: string | null = null): ContentNode[] {
  // B2: Pre-index children by parent_id — O(n) total instead of O(n²)
  const childrenByParent = new Map<string | null, ContentItem[]>();
  for (const item of flatItems) {
    const key = item.parent_id;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(item);
  }

  function buildFromMap(parentId: string | null): ContentNode[] {
    const children = childrenByParent.get(parentId) || [];

    // Sort: folders first, then by name
    children.sort((a, b) => {
      if (a.item_type === 'folder' && b.item_type !== 'folder') return -1;
      if (a.item_type !== 'folder' && b.item_type === 'folder') return 1;
      return (a.name as string).localeCompare(b.name as string);
    });

    return children.map(child => {
      if (child.item_type === 'folder') {
        return {
          id: child.id,
          type: 'folder' as ItemType,
          name: child.name,
          children: buildFromMap(child.id),
        };
      } else {
        return {
          id: child.id,
          type: child.item_type as ItemType,
          fileType: (child.file_type as FileType) || undefined,
          contentType: child.content_type || undefined,
          name: child.name,
          url: child.url || undefined,
          vimeoId: child.vimeo_id || undefined,
        };
      }
    });
  }

  return buildFromMap(rootParentId);
}

function hasFilesOfType(nodes: ContentNode[], fileTypeLabel: 'video' | 'pdf' | 'vimeo'): boolean {
  for (const node of nodes) {
    if (node.type === fileTypeLabel || (node.type === 'file' && node.fileType === fileTypeLabel)) return true;
    if (node.type === 'folder' && node.children && hasFilesOfType(node.children, fileTypeLabel)) return true;
  }
  return false;
}

function hasFilesByExtension(nodes: ContentNode[], extensions: string[]): boolean {
  for (const node of nodes) {
    if (node.type === 'file' && node.url) {
      const ext = node.name.split('.').pop()?.toLowerCase();
      if (ext && extensions.includes(ext)) return true;
    }
    if (node.type === 'folder' && node.children && hasFilesByExtension(node.children, extensions)) return true;
  }
  return false;
}

function countImages(nodes: ContentNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'file' && node.fileType === 'image') count++;
    if (node.type === 'folder' && node.children) count += countImages(node.children);
  }
  return count;
}

// P2: Shared lesson mapping helper to avoid duplication
function mapLessonsFromSubject(
  subjectSlug: string,
  rawLessons: Record<string, unknown>[]
): LessonMeta[] {
  const lessons: LessonMeta[] = rawLessons.map((lesson) => {
    const contentTree = buildContentTree(
      (lesson.content_items as ContentItem[]) || [],
      null
    );
    return {
      id: lesson.id as string,
      slug: lesson.slug as string,
      title: lesson.title as string,
      subjectSlug,
      content: contentTree,
      hasVideo: hasFilesOfType(contentTree, 'video') || hasFilesOfType(contentTree, 'vimeo'),
      hasPdf: hasFilesOfType(contentTree, 'pdf'),
      hasDocx: hasFilesByExtension(contentTree, ['doc', 'docx']),
      hasPptx: hasFilesByExtension(contentTree, ['ppt', 'pptx']),
      imageCount: countImages(contentTree),
    };
  });

  lessons.sort((a, b) => a.title.localeCompare(b.title));
  return lessons;
}

export async function getAllSubjects(): Promise<SubjectMeta[]> {
  const { data: subjectsData, error } = await supabase
    .from('subjects')
    .select(`
      id, slug, title, icon, color,
      lessons (
        id, slug, title,
        content_items (
          id, parent_id, item_type, file_type, content_type, name, url, vimeo_id
        )
      )
    `)
    .order('created_at', { ascending: true });

  if (error || !subjectsData) {
    console.error('Error fetching from Supabase:', error);
    return [];
  }

  return (subjectsData as Record<string, unknown>[]).map((subject) => ({
    id: subject.id as string,
    slug: subject.slug as string,
    title: subject.title as string,
    icon: subject.icon as string,
    color: subject.color as string,
    lessons: mapLessonsFromSubject(
      subject.slug as string,
      ((subject.lessons as Record<string, unknown>[]) || [])
    ),
  }));
}

export async function getSubject(slug: string): Promise<SubjectMeta | null> {
  const { data: subject, error } = await supabase
    .from('subjects')
    .select(`
      id, slug, title, icon, color,
      lessons (
        id, slug, title,
        content_items (
          id, parent_id, item_type, file_type, content_type, name, url, vimeo_id
        )
      )
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !subject) return null;

  return {
    id: subject.id as string,
    slug: subject.slug as string,
    title: subject.title as string,
    icon: subject.icon as string,
    color: subject.color as string,
    lessons: mapLessonsFromSubject(
      subject.slug as string,
      ((subject.lessons as unknown as Record<string, unknown>[]) || [])
    ),
  };
}

export async function getLesson(subjectSlug: string, lessonSlug: string): Promise<LessonMeta | null> {
  const subject = await getSubject(subjectSlug);
  if (!subject) return null;
  return subject.lessons.find((l) => l.slug === lessonSlug) || null;
}
