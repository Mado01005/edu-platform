import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'public', 'content');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'src', 'data', 'content-metadata.json');

const SUBJECT_CONFIG = {
  dynamics: { title: 'Dynamics', icon: '⚙️', color: 'from-orange-500 to-red-600' },
  physics: { title: 'Physics 2', icon: '⚛️', color: 'from-blue-500 to-indigo-600' },
  chemistry: { title: 'Chemistry', icon: '🧪', color: 'from-green-500 to-teal-600' },
  'communication-skills': { title: 'Communication Skills', icon: '💬', color: 'from-purple-500 to-pink-600' },
  'academic-writing': { title: 'Academic Writing', icon: '✍️', color: 'from-yellow-500 to-orange-600' },
  calculus: { title: 'Calculus', icon: '∫', color: 'from-cyan-500 to-blue-600' },
  programming: { title: 'Programming', icon: '💻', color: 'from-violet-500 to-purple-600' },
};

function formatTitle(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseDirectory(dirPath, basePathPaths) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  const nodes = [];
  
  const sortedEntries = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of sortedEntries) {
    if (entry.isDirectory()) {
      const children = parseDirectory(path.join(dirPath, entry.name), [...basePathPaths, encodeURIComponent(entry.name)]);
      if (children.length > 0) {
        nodes.push({
          type: 'folder',
          name: entry.name,
          children
        });
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      
      if (ext === '.vimeo' || ext === '.txt' || ext === '.text' || ext === '.rtf') {
        const filePath = path.join(dirPath, entry.name);
        const rawContents = fs.readFileSync(filePath, 'utf-8');
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
      
      let fileType = 'unknown';
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

function hasFilesOfType(nodes, fileTypeLabel) {
  for (const node of nodes) {
    if (node.type === fileTypeLabel || (node.type === 'file' && node.fileType === fileTypeLabel)) return true;
    if (node.type === 'folder' && node.children) {
      if (hasFilesOfType(node.children, fileTypeLabel)) return true;
    }
  }
  return false;
}

function countImages(nodes) {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'file' && node.fileType === 'image') count++;
    if (node.type === 'folder' && node.children) {
      count += countImages(node.children);
    }
  }
  return count;
}

function main() {
  console.log('Generating content metadata...');
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('Content directory not found:', CONTENT_DIR);
    process.exit(1);
  }

  const subjectDirs = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const subjects = subjectDirs.map((slug) => {
    const config = SUBJECT_CONFIG[slug] || {
      title: formatTitle(slug),
      icon: '📚',
      color: 'from-slate-500 to-slate-700',
    };

    const subjectPath = path.join(CONTENT_DIR, slug);
    const lessonDirs = fs.readdirSync(subjectPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const lessons = lessonDirs.map((lessonSlug) => {
      const lessonPath = path.join(subjectPath, lessonSlug);
      const content = parseDirectory(lessonPath, [encodeURIComponent(slug), encodeURIComponent(lessonSlug)]);

      return {
        slug: lessonSlug,
        title: formatTitle(lessonSlug),
        subjectSlug: slug,
        content,
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

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(subjects, null, 2));
  console.log('Metadata generated successfully!');
}

main();
