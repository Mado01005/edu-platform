import { NextResponse } from 'next/server';
import { getLmsUser } from '@/lib/lms/auth';

export const dynamic = 'force-dynamic';

function safeNextPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard';
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const user = await getLmsUser();
    if (!user) {
      const loginUrl = new URL('/lms/login', url);
      loginUrl.searchParams.set('error', 'Your account could not be synchronized.');
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.redirect(new URL(safeNextPath(url.searchParams.get('next')), url));
  } catch (error) {
    console.error('[LMS_USER_SYNC]', error);
    const loginUrl = new URL('/lms/login', url);
    loginUrl.searchParams.set('error', 'Your account could not be synchronized.');
    return NextResponse.redirect(loginUrl);
  }
}
