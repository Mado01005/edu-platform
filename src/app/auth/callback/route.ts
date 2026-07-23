import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/ssr-server';

function safeNextPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard';
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeNextPath(request.nextUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(new URL(next, request.url));
      response.headers.set(
        'Cache-Control',
        'private, no-cache, no-store, must-revalidate, max-age=0',
      );
      return response;
    }
  }

  const errorUrl = new URL('/lms/login', request.url);
  errorUrl.searchParams.set('error', 'Unable to complete sign in.');
  return NextResponse.redirect(errorUrl);
}
