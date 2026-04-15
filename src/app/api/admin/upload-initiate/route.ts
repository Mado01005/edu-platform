import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/r2';
import { UploadInitiateResponse } from '@/types';

// ── P1.2: Server-side MIME type allowlist ──
const ALLOWED_CONTENT_TYPES = new Set([
  // Video
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
  'video/x-matroska', 'video/avi', 'video/mov',
  // Image
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'image/bmp', 'image/tiff', 'image/heic', 'image/heif',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  // Engineering / specialized
  'application/zip',
  'application/octet-stream',
  'application/x-stl',           // 3D models
  'application/x-step',          // CAD exchange
  'application/x-binary',        // Firmware / binaries
  // Audio (for completeness)
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
]);

/**
 * Validate a MIME type against the allowed set using prefix matching.
 * Supports wildcards like "video/*" by checking the type prefix.
 */
function isContentTypeAllowed(contentType: string): boolean {
  if (!contentType) return false;
  const normalized = contentType.split(';')[0].trim().toLowerCase(); // strip charset params

  // Exact match
  if (ALLOWED_CONTENT_TYPES.has(normalized)) return true;

  // Wildcard prefix matching (e.g. "video/*", "image/*", "application/*")
  const majorType = normalized.split('/')[0];
  for (const allowed of ALLOWED_CONTENT_TYPES) {
    if (allowed.endsWith('/*') && normalized.startsWith(allowed.replace('/*', '/'))) {
      return true;
    }
    // Also allow exact prefix matches like "video/" for any video subtype
    if (allowed.endsWith('/')) {
      return normalized.startsWith(allowed);
    }
  }

  // Fallback: allow common major types if not explicitly listed
  return ['video', 'image', 'audio', 'application', 'text'].includes(majorType);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, relativeFilePath, subjectSlug, lessonSlug, contentType, subfolder } = await req.json();

    if (!fileName || !subjectSlug || !lessonSlug) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // ── P1.2: Validate content type against allowlist ──
    const resolvedContentType = contentType || 'application/octet-stream';
    if (!isContentTypeAllowed(resolvedContentType)) {
      return NextResponse.json(
        { error: `Content type '${resolvedContentType}' is not allowed. Please upload a supported file format.` },
        { status: 400 }
      );
    }

    // Construct the path: [subject]/[lesson]/[optional_subfolder]/[nested_path]
    const safeSubjectSlug = subjectSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
    const safeLessonSlug = lessonSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
    const timestamp = Date.now();

    // Sanitize the relative path but preserve slashes for nesting
    // e.g., "Physics 1/Lab 2/image.png"
    const nestedPath = (relativeFilePath || fileName || 'unnamed_file')
      .replace(/[^a-zA-Z0-9.\s/_\-]/g, '_') // replace unsafe chars with _ but keep /
      .replace(/\/+/g, '/')                 // collapse slashes
      .trim();

    // If it's just a filename (no slashes), prefix it with timestamp
    // If it's a path, prefix the LAST segment with timestamp
    const segments = nestedPath.split('/');
    const lastIdx = segments.length - 1;
    segments[lastIdx] = `${timestamp}_${segments[lastIdx]}`;
    const finalizedNestedPath = segments.join('/');

    // Sanitize optional manual subfolder segment
    let subfolderSegment = '';
    if (subfolder && typeof subfolder === 'string') {
      subfolderSegment = subfolder
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/[^a-zA-Z0-9\s/\-_]/g, '')
        .replace(/\/+/g, '/')
        .trim();
    }

    // Ensure no leading/trailing slashes on any segment to prevent double-slashes in the final key
    const cleanSubject = safeSubjectSlug.replace(/^\/+|\/+$/g, '');
    const cleanLesson = safeLessonSlug.replace(/^\/+|\/+$/g, '');
    const cleanFinalPath = finalizedNestedPath.replace(/^\/+|\/+$/g, '');

    const storagePath = subfolderSegment
      ? `${cleanSubject}/${cleanLesson}/${subfolderSegment}/${cleanFinalPath}`
      : `${cleanSubject}/${cleanLesson}/${cleanFinalPath}`;

    // Generate a presigned upload URL from Cloudflare R2 (valid for 1 hour)
    const signedUrl = await getPresignedUploadUrl(storagePath, resolvedContentType);
    const publicUrl = getPublicUrl(storagePath);

    const response: UploadInitiateResponse = {
      signedUrl,
      path: storagePath,
      publicUrl,
      contentType: resolvedContentType
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('Upload initiate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
