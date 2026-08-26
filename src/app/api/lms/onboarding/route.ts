import { NextResponse } from 'next/server';
import { GradeLevel } from '@prisma/client';
import { z } from 'zod';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { normalizePhoneNumber } from '@/lib/phone';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const onboardingSchema = z.object({
  city: z.string().trim().min(2, 'Enter the student city.').max(100),
  governorate: z.string().trim().min(2, 'Enter the governorate or region.').max(100),
  gradeLevel: z.nativeEnum(GradeLevel),
  name: z.string().trim().min(3, 'Enter the full legal student name.').max(160),
  parentPhone: z.string().trim().max(32),
});

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    const student = await requireLmsRole(['STUDENT']);
    const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Complete every required profile field.' }, { status: 400 });
    const parentPhone = normalizePhoneNumber(parsed.data.parentPhone);
    if (!parentPhone) return NextResponse.json({ error: 'Enter a valid international parent phone number.' }, { status: 400 });

    await getPrisma().user.update({
      where: { id: student.id },
      data: {
        city: parsed.data.city,
        governorate: parsed.data.governorate,
        gradeLevel: parsed.data.gradeLevel,
        name: parsed.data.name,
        onboardingCompletedAt: new Date(),
        parentPhone,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[LMS_ONBOARDING]', error);
    return NextResponse.json({ error: 'Unable to save the student profile.' }, { status: 500 });
  }
}
