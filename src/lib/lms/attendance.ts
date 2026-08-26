import 'server-only';

import { getPrisma } from '@/lib/prisma';

const EARLY_JOIN_MINUTES = 10;
const LATE_JOIN_MINUTES = 60;

export type LiveAttendanceAction = 'join' | 'heartbeat' | 'leave';

export class AttendanceError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export async function recordLiveAttendance(
  studentId: string,
  zoomSessionId: string,
  action: LiveAttendanceAction = 'join',
) {
  const prisma = getPrisma();
  const session = await prisma.zoomSession.findFirst({
    where: {
      id: zoomSessionId,
      course: { enrollments: { some: { studentId } } },
    },
    select: { courseId: true, duration: true, meetingUrl: true, startTime: true },
  });
  if (!session) throw new AttendanceError('Enrolled live class not found.', 404);

  const now = new Date();
  const opensAt = new Date(session.startTime.getTime() - EARLY_JOIN_MINUTES * 60_000);
  const closesAt = new Date(session.startTime.getTime() + (session.duration + LATE_JOIN_MINUTES) * 60_000);
  if (action === 'join' && (now < opensAt || now > closesAt)) {
    throw new AttendanceError('The Join Live Lecture button activates 10 minutes before class.', 409);
  }

  let attendance = await prisma.digitalAttendance.findUnique({
    where: { studentId_zoomSessionId_type: { studentId, type: 'LIVE_ZOOM', zoomSessionId } },
  });
  if (!attendance) {
    if (action !== 'join') throw new AttendanceError('Live attendance has not started.', 409);
    attendance = await prisma.digitalAttendance.create({
      data: { courseId: session.courseId, durationMin: 0, studentId, type: 'LIVE_ZOOM', zoomSessionId },
    });
  }

  const durationMin = Math.min(
    session.duration + LATE_JOIN_MINUTES,
    Math.max(0, Math.floor((now.getTime() - attendance.joinedAt.getTime()) / 60_000)),
  );
  const updated = await prisma.digitalAttendance.update({
    where: { id: attendance.id },
    data: {
      durationMin: Math.max(attendance.durationMin, durationMin),
      ...(action === 'leave' ? { leftAt: now } : { leftAt: null }),
    },
    select: { durationMin: true, joinedAt: true, leftAt: true },
  });
  return { attendance: updated, meetingUrl: action === 'join' ? session.meetingUrl : undefined };
}
