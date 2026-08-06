import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { assignmentFileType, MAX_ASSIGNMENT_SUBMISSION_BYTES } from '@/lib/lms/submission-types';
import { getPrisma } from '@/lib/prisma';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/r2';

export const runtime = 'nodejs';

const inputSchema = z.object({
  contentType: z.string().trim().max(100),
  fileName: z.string().trim().min(1).max(255),
  size: z.number().int().min(1).max(MAX_ASSIGNMENT_SUBMISSION_BYTES),
});

function safeName(value: string) {
  return (value.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').toLowerCase() || 'submission').slice(-120);
}

export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    const [{ assignmentId }, student] = await Promise.all([params, requireLmsRole(['STUDENT'])]);
    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Valid file details are required.' }, { status: 400 });
    const type = assignmentFileType(parsed.data.fileName, parsed.data.contentType);
    if (!type) return NextResponse.json({ error: 'Upload a PDF, JPG, or PNG file.' }, { status: 415 });
    const assignment = await getPrisma().assignment.findFirst({
      where: { id: assignmentId, type: 'HOMEWORK', course: { isPublished: true, enrollments: { some: { studentId: student.id } } } },
      select: { id: true },
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found or course access is unavailable.' }, { status: 404 });
    const key = `lms/${student.id}/assignment-submissions/${assignment.id}/${randomUUID()}-${safeName(parsed.data.fileName)}`;
    return NextResponse.json({
      fileType: type,
      key,
      publicUrl: getPublicUrl(key),
      requiredHeaders: { 'Content-Type': parsed.data.contentType },
      uploadUrl: await getPresignedUploadUrl(key, parsed.data.contentType, 15 * 60),
    });
  } catch (error) {
    if (error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[ASSIGNMENT_UPLOAD_PRESIGN]', error);
    return NextResponse.json({ error: 'Unable to prepare this assignment upload.' }, { status: 500 });
  }
}
