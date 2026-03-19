import { NextResponse } from 'next/server';
import { validateCredentials, AUTH_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const user = validateCredentials(username, password);

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionData = JSON.stringify({ username: user.username, name: user.name });
    const response = NextResponse.json({ success: true, user });

    response.cookies.set(AUTH_COOKIE, sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
