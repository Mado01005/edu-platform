import { NextResponse, type NextRequest } from 'next/server';
import { getPrisma } from '@/lib/prisma';
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
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      const user = data.session?.user;

      if (!error && user?.email) {
        const metadataName =
          user.user_metadata?.full_name ?? user.user_metadata?.name;
        const hasMetadataName =
          typeof metadataName === 'string' && metadataName.trim();
        const name = hasMetadataName ? metadataName.trim() : 'New Student';

        await getPrisma().user.upsert({
          where: { supabaseId: user.id },
          update: {
            email: user.email.toLowerCase(),
            ...(hasMetadataName ? { name } : {}),
          },
          create: {
            supabaseId: user.id,
            email: user.email.toLowerCase(),
            name,
            role: 'STUDENT',
          },
        });

        const response = NextResponse.redirect(new URL(next, request.url));
        response.headers.set(
          'Cache-Control',
          'private, no-cache, no-store, must-revalidate, max-age=0',
        );
        return response;
      }
    } catch {
      // Fall through to the safe login error redirect. A valid auth session
      // without a synchronized LMS profile must not enter the application.
    }
  }

  const errorUrl = new URL('/lms/login', request.url);
  errorUrl.searchParams.set('error', 'Unable to complete sign in.');
  return NextResponse.redirect(errorUrl);
}
