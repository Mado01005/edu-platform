import { NextResponse, type NextRequest } from 'next/server';
import { normalizePhoneNumber } from '@/lib/phone';
import { getPrisma } from '@/lib/prisma';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
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
        const metadataPhone = normalizePhoneNumber(
          typeof user.user_metadata?.phone_number === 'string'
            ? user.user_metadata.phone_number
            : '',
        );
        let synchronizedAuthUser = user;

        if (metadataPhone && !normalizePhoneNumber(user.phone ?? '')) {
          const { data: linkedPhone, error: phoneLinkError } =
            await getSupabaseAdminClient().auth.admin.updateUserById(user.id, {
              phone: metadataPhone,
              phone_confirm: false,
              user_metadata: {
                ...user.user_metadata,
                phone_number: metadataPhone,
              },
            });
          if (!phoneLinkError && linkedPhone.user) {
            synchronizedAuthUser = linkedPhone.user;
          } else {
            // Keep email confirmation healthy when Supabase Phone Auth has not
            // been configured yet. The number remains staged in metadata and
            // Prisma, but is not treated as a verified Auth phone.
            console.warn(
              '[LMS_AUTH_PHONE_LINK_DEFERRED]',
              phoneLinkError?.code ?? 'phone-provider-unavailable',
            );
          }
        }

        const metadataName =
          synchronizedAuthUser.user_metadata?.full_name ??
          synchronizedAuthUser.user_metadata?.name;
        const hasMetadataName =
          typeof metadataName === 'string' && metadataName.trim();
        const name = hasMetadataName ? metadataName.trim() : 'New Student';
        const phoneNumber =
          normalizePhoneNumber(synchronizedAuthUser.phone ?? '') ??
          metadataPhone;
        const phoneVerified = Boolean(
          phoneNumber &&
            normalizePhoneNumber(synchronizedAuthUser.phone ?? '') ===
              phoneNumber &&
            synchronizedAuthUser.phone_confirmed_at,
        );

        await getPrisma().user.upsert({
          where: { supabaseId: user.id },
          update: {
            email: user.email.toLowerCase(),
            ...(hasMetadataName ? { name } : {}),
            phoneNumber,
            phoneVerified,
          },
          create: {
            supabaseId: user.id,
            email: user.email.toLowerCase(),
            name,
            phoneNumber,
            phoneVerified,
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
