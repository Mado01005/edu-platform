import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  createPublicSupportInquiry,
  publicSupportInquirySchema,
} from '@/lib/support-inquiry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 16_384;

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return noStoreJson({ error: 'Invalid request origin.' }, 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return noStoreJson({ error: 'The message is too large.' }, 413);
  }

  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return noStoreJson({ error: 'JSON content is required.' }, 415);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = publicSupportInquirySchema.safeParse(body);

  if (!parsed.success) {
    return noStoreJson(
      {
        error: 'Check the highlighted fields and try again.',
        fields: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  // Honeypot submissions receive a generic success response but are not stored.
  if (parsed.data.website) {
    return noStoreJson({ ok: true, reference: 'RECEIVED' }, 201);
  }

  try {
    const inquiry = await createPublicSupportInquiry(parsed.data);
    return noStoreJson(
      { ok: true, reference: inquiry.id.slice(-8).toUpperCase() },
      201,
    );
  } catch (error) {
    console.error('[PUBLIC_SUPPORT_INQUIRY_CREATE]', error);
    return noStoreJson(
      { error: 'Support could not receive your message right now.' },
      500,
    );
  }
}
