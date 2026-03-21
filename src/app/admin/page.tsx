import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllSubjects } from '@/lib/content';
import Navbar from '@/components/Navbar';
import AdminClient from './AdminClient';
import AnalyticsPanel from './AnalyticsPanel';

export default async function AdminPage() {
  const session = await auth();
  
  // Strict check for admin status
  // @ts-ignore
  if (!session || !session.user?.isAdmin) {
    redirect('/dashboard');
  }

  const subjects = await getAllSubjects();

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <Navbar
        userName={session.user?.name ?? undefined}
        userImage={session.user?.image ?? undefined}
        // @ts-ignore
        isAdmin={session.user?.isAdmin}
      />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400 mb-8">Manage courses, create lessons, and upload heavy files directly to cloud storage.</p>
        
        <AdminClient subjects={subjects} />
        
        <AnalyticsPanel />
      </main>
    </div>
  );
}
