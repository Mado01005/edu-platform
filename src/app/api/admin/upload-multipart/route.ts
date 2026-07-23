import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  initiateMultipartUpload,
  getPresignedMultipartPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  getPublicUrl
} from '@/lib/r2';
import {
  isSafeR2Key,
  validateAdminUploadMetadata,
  validateMultipartPartCount,
} from '@/lib/admin-upload-validation';

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

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'A valid JSON body is required.' }, { status: 400 });
    }
    const { action } = body;

    switch (action) {
      case 'init': {
        // Build storage path (same logic as upload-initiate)
        let validated;
        let totalParts: number;
        try {
          validated = validateAdminUploadMetadata(body, !!session.user.isSuperAdmin);
          totalParts = validateMultipartPartCount(body.totalParts, validated.size);
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Invalid multipart metadata.' },
            { status: 400 },
          );
        }

        // Initialize multipart upload
        const uploadId = await initiateMultipartUpload(
          validated.storagePath,
          validated.contentType,
        );

        // Generate presigned URLs for all parts
        const partUrls: { partNumber: number; url: string }[] = [];
        for (let i = 1; i <= totalParts; i++) {
          const url = await getPresignedMultipartPartUrl(
            validated.storagePath,
            uploadId,
            i,
            validated.contentType,
          );
          partUrls.push({ partNumber: i, url });
        }

        return NextResponse.json({
          uploadId,
          key: validated.storagePath,
          partUrls,
          publicUrl: getPublicUrl(validated.storagePath)
        });
      }

      case 'complete': {
        const { key, uploadId, parts } = body;
        const validParts =
          Array.isArray(parts) &&
          parts.length > 0 &&
          parts.length <= 10_000 &&
          parts.every(
            (part) =>
              typeof part?.ETag === 'string' &&
              part.ETag.length > 0 &&
              Number.isInteger(part?.PartNumber) &&
              part.PartNumber >= 1 &&
              part.PartNumber <= 10_000,
          ) &&
          new Set(parts.map((part) => part.PartNumber)).size === parts.length;
        if (!isSafeR2Key(key) || typeof uploadId !== 'string' || !validParts) {
          return NextResponse.json({ error: 'Missing required parameters for multipart complete' }, { status: 400 });
        }

        const publicUrl = await completeMultipartUpload(key, uploadId, parts);
        return NextResponse.json({ success: true, publicUrl });
      }

      case 'abort': {
        const { key, uploadId } = body;
        if (!isSafeR2Key(key) || typeof uploadId !== 'string' || !uploadId) {
          return NextResponse.json({ error: 'Missing required parameters for multipart abort' }, { status: 400 });
        }

        await abortMultipartUpload(key, uploadId);
        return NextResponse.json({ success: true });
      }

      case 'presign': {
        const { key, uploadId, contentType, partNumbers } = body;
        const validPartNumbers =
          Array.isArray(partNumbers) &&
          partNumbers.length > 0 &&
          partNumbers.length <= 1_000 &&
          partNumbers.every(
            (partNumber) =>
              Number.isInteger(partNumber) && partNumber >= 1 && partNumber <= 10_000,
          );
        if (!isSafeR2Key(key) || typeof uploadId !== 'string' || !validPartNumbers) {
          return NextResponse.json({ error: 'Missing required parameters for multipart presign' }, { status: 400 });
        }

        const resolvedContentType =
          typeof contentType === 'string' && contentType.length <= 255
            ? contentType
            : 'application/octet-stream';
        const partUrls: { partNumber: number; url: string }[] = [];
        for (const num of partNumbers as number[]) {
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
