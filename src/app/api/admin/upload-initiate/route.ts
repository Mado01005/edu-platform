import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/r2';
import { UploadInitiateResponse } from '@/types';

// MIME type restrictions removed per Mega Upload request (Audit Task 1.5)

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

    // ── Mega Upload Check ──
    const isMegaUpload = session.user.email === 'abdallahsaad2150@gmail.com';
    const expiresIn = isMegaUpload ? 21600 : 3600; // 6 hours vs 1 hour

    const resolvedContentType = contentType || 'application/octet-stream';
  
    
    const safeSubjectSlug = subjectSlug.replace(/[^a-zA-Z0-9-]/g, '');
    const safeLessonSlug = lessonSlug.replace(/[^a-zA-Z0-9-]/g, '');
    const timestamp = Date.now();

    // Sanitize the relative path but preserve slashes for nesting
    // e.g., "Physics 1/Lab 2/image.png"
    let nestedPath = (relativeFilePath || fileName || 'unnamed_file')
      .replace(/[^a-zA-Z0-9./_\-]/g, '_') // replace unsafe chars AND SPACES with _ but keep /
      .replace(/\/+/g, '/')                 // collapse slashes
      .trim();

    const pathParts = nestedPath.split('.');
    if (pathParts.length > 1) {
      const ext = pathParts.pop()?.toLowerCase();
      nestedPath = `${pathParts.join('.')}.${ext}`;
    }

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

    // Generate a presigned upload URL from Cloudflare R2
    const signedUrl = await getPresignedUploadUrl(storagePath, resolvedContentType, expiresIn);
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
