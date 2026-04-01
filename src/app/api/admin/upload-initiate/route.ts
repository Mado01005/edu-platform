import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/r2';
import { UploadInitiateResponse } from '@/types';

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

    // Construct the path: [subject]/[lesson]/[optional_subfolder]/[nested_path]
    const safeSubjectSlug = subjectSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
    const safeLessonSlug = lessonSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
    const timestamp = Date.now();
    
    // Sanitize the relative path but preserve slashes for nesting
    // e.g., "Physics 1/Lab 2/image.png"
    const nestedPath = (relativeFilePath || fileName || 'unnamed_file')
      .replace(/[^a-zA-Z0-9.\s/_\-]/g, '') // remove unsafe chars but keep /
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
    const signedUrl = await getPresignedUploadUrl(storagePath, contentType || 'application/octet-stream');
    const publicUrl = getPublicUrl(storagePath);

    const response: UploadInitiateResponse = { 
      signedUrl,
      path: storagePath,
      publicUrl,
      contentType: contentType || 'application/octet-stream'
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('Upload initiate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
