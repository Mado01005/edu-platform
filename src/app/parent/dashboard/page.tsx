import { redirect } from 'next/navigation';
import { getParentPortalSession } from '@/lib/lms/parent-portal';

export const dynamic = 'force-dynamic';

export default async function ParentDashboardPage() {
  if (!await getParentPortalSession()) redirect('/parent/login');
  redirect('/mps');
}
