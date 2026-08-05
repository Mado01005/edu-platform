import { WorkspaceActionHub } from '@/components/navigation/workspace-action-hub';
import { requireTeacherPage } from '@/lib/lms/auth';

export const dynamic = 'force-dynamic';

export default async function TeacherHomePage() {
  const teacher = await requireTeacherPage();

  return <WorkspaceActionHub mode="teacher" userName={teacher.name} />;
}
