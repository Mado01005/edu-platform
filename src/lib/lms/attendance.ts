import 'server-only';

import { getPrisma } from '@/lib/prisma';

const EARLY_JOIN_MINUTES = 30;
const LATE_JOIN_MINUTES = 60;

export class AttendanceError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export async function recordLiveAttendance(
  studentId: string,
  zoomSessionId: string,
) {
  const prisma = getPrisma();
  const session = await prisma.zoomSession.findFirst({
    where: {
      id: zoomSessionId,
      course: { enrollments: { some: { studentId } } },
    },
    select: {
      courseId: true,
      duration: true,
      meetingUrl: true,
      startTime: true,
    },
  });
  if (!session) {
    throw new AttendanceError('Enrolled live class not found.', 404);
  }

  const now = new Date();
  const opensAt = new Date(
    session.startTime.getTime() - EARLY_JOIN_MINUTES * 60_000,
  );
  const closesAt = new Date(
    session.startTime.getTime() +
      (session.duration + LATE_JOIN_MINUTES) * 60_000,
  );
  if (now < opensAt || now > closesAt) {
    throw new AttendanceError(
      'Attendance opens 30 minutes before class and closes 60 minutes after it ends.',
      409,
    );
  }

  await prisma.digitalAttendance.upsert({
    where: {
      studentId_zoomSessionId_type: {
        studentId,
        type: 'LIVE_ZOOM',
        zoomSessionId,
      },
    },
    create: {
      courseId: session.courseId,
      durationMin: 0,
      studentId,
      type: 'LIVE_ZOOM',
      zoomSessionId,
    },
    update: {},
  });

  return { meetingUrl: session.meetingUrl };
}
