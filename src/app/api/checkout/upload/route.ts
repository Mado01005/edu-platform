import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { OnlinePaymentError, prepareReceiptUpload } from '@/lib/lms/online-payments';
import { getPresignedUploadUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const student = await requireLmsRole(['STUDENT']);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 });
    const upload = await prepareReceiptUpload({
      contentType: body.contentType,
      courseId: body.courseId,
      fileName: body.fileName,
      fileSize: body.fileSize,
      method: body.method,
      studentId: student.id,
    });
    const uploadUrl = await getPresignedUploadUrl(upload.key, upload.contentType, 600);
    return NextResponse.json({ ...upload, uploadUrl });
  } catch (error) {
    if (error instanceof OnlinePaymentError || error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[CHECKOUT_UPLOAD]', error);
    return NextResponse.json({ error: 'Unable to prepare receipt upload.' }, { status: 500 });
  }
}
