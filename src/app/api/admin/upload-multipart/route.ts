import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  initiateMultipartUpload,
  getPresignedMultipartPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  getPublicUrl
} from '@/lib/r2';

/**
 * P3.1: Multipart upload coordinator.
 * Supports four actions via POST body:
 *   - { action: 'init', ... }    → Initialize multipart, returns uploadId + partUrls
 *   - { action: 'complete', ... } → Finalize upload with part ETags
 *   - { action: 'abort', ... }    → Cancel in-progress upload
 *   - { action: 'presign', ... }  → Get presigned URLs for remaining parts
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'init': {
        // Build storage path (same logic as upload-initiate)
        const { fileName, relativeFilePath, subjectSlug, lessonSlug, contentType, subfolder, totalParts } = body;
        if (!fileName || !subjectSlug || !lessonSlug || !totalParts) {
          return NextResponse.json({ error: 'Missing required parameters for multipart init' }, { status: 400 });
        }

        const safeSubjectSlug = subjectSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
        const safeLessonSlug = lessonSlug.replace(/[^a-zA-Z0-9-\s]/g, '');
        const timestamp = Date.now();
        const nestedPath = (relativeFilePath || fileName || 'unnamed_file')
          .replace(/[^a-zA-Z0-9.\s/_\-]/g, '_') // replace unsafe chars with _ but keep /
          .replace(/\/+/g, '/')
          .trim();

        const segments = nestedPath.split('/');
        segments[segments.length - 1] = `${timestamp}_${segments[segments.length - 1]}`;
        const finalizedNestedPath = segments.join('/');

        let subfolderSegment = '';
        if (subfolder && typeof subfolder === 'string') {
          subfolderSegment = subfolder
            .trim()
            .replace(/^\/+|\/+$/g, '')
            .replace(/[^a-zA-Z0-9\s/\-_]/g, '')
            .replace(/\/+/g, '/')
            .trim();
        }

        const cleanSubject = safeSubjectSlug.replace(/^\/+|\/+$/g, '');
        const cleanLesson = safeLessonSlug.replace(/^\/+|\/+$/g, '');
        const cleanFinalPath = finalizedNestedPath.replace(/^\/+|\/+$/g, '');

        const storagePath = subfolderSegment
          ? `${cleanSubject}/${cleanLesson}/${subfolderSegment}/${cleanFinalPath}`
          : `${cleanSubject}/${cleanLesson}/${cleanFinalPath}`;

        const resolvedContentType = contentType || 'application/octet-stream';

        // Initialize multipart upload
        const uploadId = await initiateMultipartUpload(storagePath, resolvedContentType);

        // Generate presigned URLs for all parts
        const partUrls: { partNumber: number; url: string }[] = [];
        for (let i = 1; i <= totalParts; i++) {
          const url = await getPresignedMultipartPartUrl(storagePath, uploadId, i, resolvedContentType);
          partUrls.push({ partNumber: i, url });
        }

        return NextResponse.json({
          uploadId,
          key: storagePath,
          partUrls,
          publicUrl: getPublicUrl(storagePath)
        });
      }

      case 'complete': {
        const { key, uploadId, parts } = body;
        if (!key || !uploadId || !parts || !Array.isArray(parts)) {
          return NextResponse.json({ error: 'Missing required parameters for multipart complete' }, { status: 400 });
        }

        const publicUrl = await completeMultipartUpload(key, uploadId, parts);
        return NextResponse.json({ success: true, publicUrl });
      }

      case 'abort': {
        const { key, uploadId } = body;
        if (!key || !uploadId) {
          return NextResponse.json({ error: 'Missing required parameters for multipart abort' }, { status: 400 });
        }

        await abortMultipartUpload(key, uploadId);
        return NextResponse.json({ success: true });
      }

      case 'presign': {
        const { key, uploadId, contentType, partNumbers } = body;
        if (!key || !uploadId || !partNumbers) {
          return NextResponse.json({ error: 'Missing required parameters for multipart presign' }, { status: 400 });
        }

        const resolvedContentType = contentType || 'application/octet-stream';
        const partUrls: { partNumber: number; url: string }[] = [];
        for (const num of partNumbers) {
          const url = await getPresignedMultipartPartUrl(key, uploadId, num, resolvedContentType);
          partUrls.push({ partNumber: num, url });
        }

        return NextResponse.json({ partUrls });
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Supported: init, complete, abort, presign' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Multipart upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
