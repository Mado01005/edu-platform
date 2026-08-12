import { POST as createPresignedUpload } from '@/app/api/upload/r2/route';

export const runtime = 'nodejs';

/**
 * Canonical presigned-upload endpoint. The legacy `/api/upload/r2` handler is
 * retained for backward compatibility while clients migrate to this route.
 */
export async function POST(request: Request) {
  return createPresignedUpload(request);
}
