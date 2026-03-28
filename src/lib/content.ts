import { supabase } from './supabase';
import { SubjectMeta, LessonMeta, ContentNode, ItemType, FileType, ContentItem } from '@/types';

function buildContentTree(flatItems: ContentItem[], parentId: string | null = null): ContentNode[] {
  const nodes: ContentNode[] = [];
  const children = flatItems.filter(item => item.parent_id === parentId);

  // Sort: folders first, then by name
  children.sort((a, b) => {
    if (a.item_type === 'folder' && b.item_type !== 'folder') return -1;
    if (a.item_type !== 'folder' && b.item_type === 'folder') return 1;
    return (a.name as string).localeCompare(b.name as string);
  });

  for (const child of children) {
    if (child.item_type === 'folder') {
      const folderChildren = buildContentTree(flatItems, child.id);
      if (folderChildren.length > 0) {
        nodes.push({
          id: child.id,
          type: 'folder' as ItemType,
          name: child.name,
          children: folderChildren
        });
      }
    } else {
      nodes.push({
        id: child.id,
        type: child.item_type as ItemType,
        fileType: (child.file_type as FileType) || undefined,
        name: child.name,
        url: child.url || undefined,
        vimeoId: child.vimeo_id || undefined,
      });
    }
  }
  return nodes;
}

function hasFilesOfType(nodes: ContentNode[], fileTypeLabel: 'video' | 'pdf' | 'vimeo'): boolean {
  for (const node of nodes) {
    if (node.type === fileTypeLabel || (node.type === 'file' && node.fileType === fileTypeLabel)) return true;
    if (node.type === 'folder' && node.children && hasFilesOfType(node.children, fileTypeLabel)) return true;
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

export async function getAllSubjects(): Promise<SubjectMeta[]> {
  const { data: subjectsData, error } = await supabase
    .from('subjects')
    .select(`
      id, slug, title, icon, color,
      lessons (
        id, slug, title,
        content_items (
          id, parent_id, item_type, file_type, name, url, vimeo_id
        )
      )
    `)
    .order('created_at', { ascending: true });

  if (error || !subjectsData) {
    console.error('Error fetching from Supabase:', error);
    return [];
  }

  return (subjectsData as Record<string, unknown>[]).map((subject) => {
    const lessons: LessonMeta[] = ((subject.lessons as Record<string, unknown>[]) || []).map((lesson: { id: string, slug: string, title: string, content_items: Record<string, unknown>[] }) => {
      const contentTree = buildContentTree(lesson.content_items || [], null);
      return {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        subjectSlug: subject.slug,
        content: contentTree,
        hasVideo: hasFilesOfType(contentTree, 'video') || hasFilesOfType(contentTree, 'vimeo'),
        hasPdf: hasFilesOfType(contentTree, 'pdf'),
        hasDocx: contentTree.some(node => node.url && (node.name.toLowerCase().endsWith('.doc') || node.name.toLowerCase().endsWith('.docx'))),
        imageCount: countImages(contentTree),
      };
    });

    // Sort lessons by creation or just name if created_at is not fetched, assuming DB sorts naturally or we sort by title
    lessons.sort((a, b) => a.title.localeCompare(b.title));

    return {
      id: subject.id,
      slug: subject.slug,
      title: subject.title,
      icon: subject.icon,
      color: subject.color,
      lessons,
    };
  });
}

export async function getSubject(slug: string): Promise<SubjectMeta | null> {
  const subjects = await getAllSubjects();
  return subjects.find((s) => s.slug === slug) || null;
}

export async function getLesson(subjectSlug: string, lessonSlug: string): Promise<LessonMeta | null> {
  const subject = await getSubject(subjectSlug);
  if (!subject) return null;
  return subject.lessons.find((l) => l.slug === lessonSlug) || null;
}
