import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  ACTIVE_SESSION_COOKIE,
  DEVICE_ID_COOKIE,
  activateStudentSession,
  activeSessionCookieOptions,
  deactivateStudentSession,
  deviceIdCookieOptions,
  normalizeOrCreateDeviceId,
  readClientIp,
} from '@/lib/lms/active-session';
import {
  getLmsAuthState,
  getLmsUserWithoutActiveSessionCheck,
} from '@/lib/lms/auth';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
};

export async function GET() {
  const state = await getLmsAuthState();

  if (state.reason === 'concurrent_login') {
    return NextResponse.json(
      { active: false, reason: 'concurrent_login' },
      { headers: noStoreHeaders, status: 409 },
    );
  }
  if (!state.user) {
    return NextResponse.json(
      { active: false, reason: 'signed_out' },
      { headers: noStoreHeaders, status: 401 },
    );
  }

  return NextResponse.json(
    { active: true },
    { headers: noStoreHeaders },
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }

  const user = await getLmsUserWithoutActiveSessionCheck();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  const deviceId = normalizeOrCreateDeviceId(
    cookieStore.get(DEVICE_ID_COOKIE)?.value,
  );
  const token = await activateStudentSession(
    user,
    request.headers.get('user-agent'),
    deviceId,
    readClientIp(request.headers),
  );
  const response = NextResponse.json(
    { active: true, enforced: Boolean(token) },
    { headers: noStoreHeaders },
  );

  if (token) {
    response.cookies.set(
      ACTIVE_SESSION_COOKIE,
      token,
      activeSessionCookieOptions(),
    );
    response.cookies.set(
      DEVICE_ID_COOKIE,
      deviceId,
      deviceIdCookieOptions(),
    );
  } else {
    response.cookies.delete(ACTIVE_SESSION_COOKIE);
  }

  return response;
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }

  const [user, cookieStore] = await Promise.all([
    getLmsUserWithoutActiveSessionCheck(),
    cookies(),
  ]);
  if (user) {
    await deactivateStudentSession(
      user,
      cookieStore.get(ACTIVE_SESSION_COOKIE)?.value,
    );
  }

  const response = NextResponse.json(
    { active: false },
    { headers: noStoreHeaders },
  );
  response.cookies.delete(ACTIVE_SESSION_COOKIE);
  return response;
}
