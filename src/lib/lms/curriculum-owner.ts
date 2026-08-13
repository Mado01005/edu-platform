import 'server-only';

import type { Role } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';

export async function resolveCurriculumTeacherId(
  actor: { id: string; role: Role },
  preferredTeacherId?: string | null,
) {
  if (actor.role === 'TEACHER') return actor.id;

  if (preferredTeacherId) {
    const preferredTeacher = await getPrisma().user.findFirst({
      where: {
        id: preferredTeacherId,
        role: 'TEACHER',
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (preferredTeacher) return preferredTeacher.id;
  }

  const activeTeacher = await getPrisma().user.findFirst({
    where: { role: 'TEACHER', status: 'ACTIVE' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  if (!activeTeacher) {
    throw new Error(
      'Create or activate a teacher account before adding curriculum content.',
    );
  }
  return activeTeacher.id;
}
