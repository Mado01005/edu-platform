import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ADMIN_ROLES } from '@/lib/lms/roles';
import { deleteR2AssetsAndReferences } from '@/lib/r2-storage';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    await requireLmsRole(ADMIN_ROLES);
    const body = (await request.json().catch(() => null)) as { keys?: unknown } | null;
    if (!Array.isArray(body?.keys) || !body.keys.length || !body.keys.every((key) => typeof key === 'string')) {
      return NextResponse.json({ error: 'Choose one or more valid R2 object keys.' }, { status: 400 });
    }
    const result = await deleteR2AssetsAndReferences(body.keys);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[LMS_ADMIN_R2_BULK_DELETE]', error);
    return NextResponse.json({ error: 'Unable to delete the selected assets.' }, { status: 500 });
  }
}
