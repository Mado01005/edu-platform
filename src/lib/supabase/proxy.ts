import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function getSupabaseRequestContext(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      response: NextResponse.next({ request }),
      supabase: null,
      userId: null,
    };
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // getClaims validates the token and refreshes it when necessary.
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  return {
    response,
    supabase,
    userId:
      !error && typeof subject === 'string' && subject.length > 0
        ? subject
        : null,
  };
}

export async function updateSupabaseSession(request: NextRequest) {
  const { response } = await getSupabaseRequestContext(request);
  return response;
}
