import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { logoutParentPortal } from '@/lib/lms/parent-portal';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  await logoutParentPortal();
  return NextResponse.json({ ok: true });
}
