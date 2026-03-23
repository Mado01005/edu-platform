import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllSubjects } from '@/lib/content';
import { supabaseAdmin } from '@/lib/supabase';
import { isMasterAdmin } from '@/lib/constants';
import Navbar from '@/components/Navbar';
import AdminClient from './AdminClient';
import AnalyticsPanel from './AnalyticsPanel';

export default async function AdminPage() {
  const session = await auth();
  
  // @ts-ignore
  const isAdmin = session?.user?.isAdmin || isMasterAdmin(session?.user?.email);
  if (!session || !isAdmin) {
    redirect('/dashboard');
  }

  // Fetch all concurrent Admin Data before rendering
  const [subjects, { data: roles }, { data: allLogs }] = await Promise.all([
    getAllSubjects(),
    supabaseAdmin.from('user_roles').select('*'),
    supabaseAdmin.from('activity_logs').select('user_email')
  ]);

  // Merge legacy users who interacted with the platform before the internal `user_roles` table existed
  const historicalEmails = [...new Set((allLogs || []).map(l => l.user_email))];
  const mergedRoles = [...(roles || [])];
  
  historicalEmails.forEach(email => {
    if (email && !mergedRoles.some(r => r.email === email)) {
      mergedRoles.push({ email, role: 'student' });
    }
  });

  return (
    <div className="min-h-screen bg-[#05050A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(0,0,0,0))] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      
      <div className="relative z-10">
        <Navbar
          userName={session.user?.name ?? undefined}
          userImage={session.user?.image ?? undefined}
          // @ts-ignore
          isAdmin={session.user?.isAdmin}
        />
        <div className="flex flex-col items-center py-10 text-center fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-widest mb-5 max-w-fit shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span> Systems Online
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 tracking-tight mb-4 select-none">
            Command Center
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl font-medium">
            Control the global syllabus hierarchy, process encrypted uploads, and monitor incoming student transmissions.
          </p>
        </div>
        
        <AdminClient subjects={subjects} initialRoles={mergedRoles} userEmail={session.user?.email || ''} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mt-16 fade-in scale-in" style={{ animationDelay: '0.2s' }}>
            <AnalyticsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
