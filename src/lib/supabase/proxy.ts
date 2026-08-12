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

  // getUser initializes the request-bound session, refreshes an expired access
  // token, and verifies the resulting JWT with Supabase Auth. Keep this call
  // immediately after client creation so refreshed cookies reach the response
  // before any page or route handler runs.
  const { data, error } = await supabase.auth.getUser();
  const subject = data.user?.id;

  return {
    // Auth operations performed after this function returns (for example a
    // forced local sign-out) can invoke setAll again and replace `response`.
    // A getter ensures callers always receive the latest cookie-bearing value.
    get response() {
      return response;
    },
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
