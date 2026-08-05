import { PortalShell } from '@/components/erp/PortalShell';
import { requireTeacherPage } from '@/lib/lms/auth';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacher = await requireTeacherPage();

  return (
    <PortalShell user={teacher}>
      <div className="flex w-full min-w-0 flex-col gap-4">{children}</div>
    </PortalShell>
  );
}
