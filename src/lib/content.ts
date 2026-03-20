import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'public', 'content');

export interface ContentNode {
  type: 'file' | 'folder' | 'vimeo';
  fileType?: 'video' | 'pdf' | 'image' | 'unknown'; 
  name: string;
  url?: string;
  vimeoId?: string;
  children?: ContentNode[];
}

export interface LessonMeta {
  slug: string;
  title: string;
  subjectSlug: string;
  content: ContentNode[];
  hasVideo: boolean;
  hasPdf: boolean;
  imageCount: number;
}

export interface SubjectMeta {
  slug: string;
  title: string;
  lessons: LessonMeta[];
  icon: string;
  color: string;
}

const SUBJECT_CONFIG: Record<string, { title: string; icon: string; color: string }> = {
  dynamics: { title: 'Dynamics', icon: '⚙️', color: 'from-orange-500 to-red-600' },
  physics: { title: 'Physics 2', icon: '⚛️', color: 'from-blue-500 to-indigo-600' },
  chemistry: { title: 'Chemistry', icon: '🧪', color: 'from-green-500 to-teal-600' },
  'communication-skills': { title: 'Communication Skills', icon: '💬', color: 'from-purple-500 to-pink-600' },
  'academic-writing': { title: 'Academic Writing', icon: '✍️', color: 'from-yellow-500 to-orange-600' },
  calculus: { title: 'Calculus', icon: '∫', color: 'from-cyan-500 to-blue-600' },
  programming: { title: 'Programming', icon: '💻', color: 'from-violet-500 to-purple-600' },
};

function formatTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseDirectory(dirPath: string, basePathPaths: string[]): ContentNode[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  const nodes: ContentNode[] = [];
  
  // Sort: folders first, then files
  const sortedEntries = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of sortedEntries) {
    if (entry.isDirectory()) {
      const children = parseDirectory(path.join(dirPath, entry.name), [...basePathPaths, encodeURIComponent(entry.name)]);
      // Only keep folders that have content to prevent UI clutter
      if (children.length > 0) {
        nodes.push({
          type: 'folder',
          name: entry.name,
          children
        });
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      
      // Check for Vimeo support
      if (ext === '.vimeo' || ext === '.txt' || ext === '.text' || ext === '.rtf') {
        const filePath = path.join(dirPath, entry.name);
        const rawContents = fs.readFileSync(filePath, 'utf-8');
        
        // Extract raw URL out of RTF markup or just use trimmed text
        const vimeoMatch = rawContents.match(/https?:\/\/(www\.)?vimeo\.com\/[^\s\\"\}]+/i);
        const fileContents = (vimeoMatch ? vimeoMatch[0] : rawContents).trim();
        
        if (ext === '.vimeo' || entry.name.toLowerCase().includes('.vimeo') || fileContents.includes('vimeo')) {
          nodes.push({
            type: 'vimeo',
            name: entry.name.replace(/\.(vimeo|vimeo\.txt|vimeo\.text|vimeo\.rtf|txt|text|rtf)$/i, ''),
            vimeoId: fileContents,
          });
          continue;
        }
      }
      
      let fileType: ContentNode['fileType'] = 'unknown';
      if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) {
        fileType = 'video';
      } else if (['.pdf'].includes(ext)) {
        fileType = 'pdf';
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.heic', '.heif', '.dng'].includes(ext)) {
        fileType = 'image';
      }
      
      if (fileType !== 'unknown') {
        nodes.push({
          type: 'file',
          fileType,
          name: entry.name,
          url: `/content/${basePathPaths.join('/')}/${encodeURIComponent(entry.name)}`
        });
      }
    }
  }
  return nodes;
}

// Helpers for backward compatibility and metadata
function hasFilesOfType(nodes: ContentNode[], fileTypeLabel: 'video' | 'pdf' | 'vimeo'): boolean {
  for (const node of nodes) {
    if (node.type === fileTypeLabel || (node.type === 'file' && node.fileType === fileTypeLabel)) return true;
    if (node.type === 'folder' && node.children) {
      if (hasFilesOfType(node.children, fileTypeLabel)) return true;
    }
  }
  return false;
}

function countImages(nodes: ContentNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'file' && node.fileType === 'image') count++;
    if (node.type === 'folder' && node.children) {
      count += countImages(node.children);
    }
  }
  return count;
}

export function getAllSubjects(): SubjectMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const subjectDirs = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  return subjectDirs.map((slug) => {
    const config = SUBJECT_CONFIG[slug] || {
      title: formatTitle(slug),
      icon: '📚',
      color: 'from-slate-500 to-slate-700',
    };

    const subjectPath = path.join(CONTENT_DIR, slug);
    const lessonDirs = fs.existsSync(subjectPath)
      ? fs
          .readdirSync(subjectPath, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : [];

    const lessons: LessonMeta[] = lessonDirs.map((lessonSlug) => {
      const lessonPath = path.join(subjectPath, lessonSlug);
      // Recursively parse the main lesson directory
      const content = parseDirectory(lessonPath, [encodeURIComponent(slug), encodeURIComponent(lessonSlug)]);

      return {
        slug: lessonSlug,
        title: formatTitle(lessonSlug),
        subjectSlug: slug,
        content,
        // Calculate meta counts using recursive helpers
        hasVideo: hasFilesOfType(content, 'video') || hasFilesOfType(content, 'vimeo'),
        hasPdf: hasFilesOfType(content, 'pdf'),
        imageCount: countImages(content),
      };
    });

    return {
      slug,
      title: config.title,
      lessons,
      icon: config.icon,
      color: config.color,
    };
  });
}

export function getSubject(slug: string): SubjectMeta | null {
  const subjects = getAllSubjects();
  return subjects.find((s) => s.slug === slug) || null;
}

export function getLesson(subjectSlug: string, lessonSlug: string): LessonMeta | null {
  const subject = getSubject(subjectSlug);
  if (!subject) return null;
  return subject.lessons.find((l) => l.slug === lessonSlug) || null;
}
