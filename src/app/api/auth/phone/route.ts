import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth-guard';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { normalizePhoneNumber, isValidE164PhoneNumber } from '@/lib/phone';
import { getPrisma } from '@/lib/prisma';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/ssr-server';

export const dynamic = 'force-dynamic';

async function syncVerifiedPhone(supabaseId: string, phone: string) {
  try {
    return await getPrisma().user.update({
      where: { supabaseId },
      data: { phoneNumber: phone, phoneVerified: true },
      select: { id: true, phoneNumber: true, phoneVerified: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('That phone number is already linked to another account.');
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const phone = normalizePhoneNumber(typeof body.phone === 'string' ? body.phone : '');
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!phone || !isValidE164PhoneNumber(phone) || !/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: 'A valid phone number and 6-digit verification code are required.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? 'The verification code is invalid or expired.' },
        { status: 400 },
      );
    }
    const verifiedPhone = normalizePhoneNumber(data.user.phone ?? '');
    if (!verifiedPhone || verifiedPhone !== phone || !data.user.phone_confirmed_at) {
      return NextResponse.json(
        { error: 'Supabase did not confirm this phone number.' },
        { status: 409 },
      );
    }

    const user = await syncVerifiedPhone(data.user.id, verifiedPhone);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unable to verify this phone number.';
    const status = message.includes('already linked') ? 409 : 500;
    console.error('[PHONE_OTP_VERIFY_SYNC]', error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const auth = await requireApiAuth(request, {
      allowedRoles: ['SUPER_ADMIN'],
      allowCookieAuth: true,
    });
    if (!auth.ok) return auth.response;
    if (!auth.profile?.phoneNumber) {
      return NextResponse.json(
        { error: 'Add and save a valid phone number before verifying it.' },
        { status: 400 },
      );
    }

    const phone = normalizePhoneNumber(auth.profile.phoneNumber);
    if (!phone || !isValidE164PhoneNumber(phone)) {
      return NextResponse.json({ error: 'The saved phone number is invalid.' }, { status: 400 });
    }
    const { data, error } = await getSupabaseAdminClient().auth.admin.updateUserById(
      auth.user.id,
      { phone, phone_confirm: true },
    );
    if (error || !data.user?.phone_confirmed_at) {
      return NextResponse.json(
        { error: error?.message ?? 'Supabase did not confirm the phone number.' },
        { status: 502 },
      );
    }

    const user = await syncVerifiedPhone(auth.user.id, phone);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to manually verify this phone number.';
    const status = message.includes('already linked') ? 409 : 500;
    console.error('[PHONE_MANUAL_VERIFY_SYNC]', error);
    return NextResponse.json({ error: message }, { status });
  }
}
