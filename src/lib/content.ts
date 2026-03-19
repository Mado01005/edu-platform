import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export interface LessonMeta {
  slug: string;
  title: string;
  subjectSlug: string;
  video: string | null;
  pdf: string | null;
  images: string[];
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
  physics: { title: 'Physics', icon: '⚛️', color: 'from-blue-500 to-indigo-600' },
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
      const files = fs.existsSync(lessonPath) ? fs.readdirSync(lessonPath) : [];

      const video = files.find((f) => /\.(mp4|webm|ogg|mov)$/i.test(f)) || null;
      const pdf = files.find((f) => /\.pdf$/i.test(f)) || null;
      const images = files
        .filter((f) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f))
        .sort();

      return {
        slug: lessonSlug,
        title: formatTitle(lessonSlug),
        subjectSlug: slug,
        video: video ? `/content-files/${slug}/${lessonSlug}/${video}` : null,
        pdf: pdf ? `/content-files/${slug}/${lessonSlug}/${pdf}` : null,
        images: images.map((img) => `/content-files/${slug}/${lessonSlug}/${img}`),
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
