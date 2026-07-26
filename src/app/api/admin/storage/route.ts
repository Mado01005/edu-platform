import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import {
  deleteR2AssetAndReferences,
  getR2StorageSnapshot,
} from '@/lib/r2-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireLmsRole(['ADMIN']);
    const snapshot = await getR2StorageSnapshot();
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS_ADMIN_R2_STORAGE_GET]', error);
    return NextResponse.json(
      { error: 'Unable to inspect R2 storage.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: 'Invalid request origin.' },
        { status: 403 },
      );
    }

    await requireLmsRole(['ADMIN']);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'A valid JSON request body is required.' },
        { status: 400 },
      );
    }

    const key =
      body && typeof body === 'object' ? Reflect.get(body, 'key') : null;
    if (typeof key !== 'string') {
      return NextResponse.json(
        { error: 'A valid object key is required.' },
        { status: 400 },
      );
    }

    const result = await deleteR2AssetAndReferences(key);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    const statusCode =
      error &&
      typeof error === 'object' &&
      Reflect.get(Reflect.get(error, '$metadata') ?? {}, 'httpStatusCode') ===
        404
        ? 404
        : 500;
    console.error('[LMS_ADMIN_R2_STORAGE_DELETE]', error);
    return NextResponse.json(
      {
        error:
          statusCode === 404
            ? 'The R2 object no longer exists.'
            : 'Unable to delete this asset.',
      },
      { status: statusCode },
    );
  }
}
