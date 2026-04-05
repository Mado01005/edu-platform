'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Subject, UserRole, ActivityLog, StorageStats, SubjectMeta, LessonMeta } from '@/types';
import { ADMIN_EMAILS } from '@/lib/constants';

// Eagerly loaded — shown on first admin page render
import AdminSidebar from './components/AdminSidebar';
import UploadTab from './components/UploadTab';
import ManageTab from './components/ManageTab';
import { AdminErrorBoundary } from '@/components/ErrorBoundary';
import { AdminProvider, useAdmin } from './context/AdminContext';

const AdminGlobalOverlay = () => {
  const { isPending } = useAdmin();
  if (!isPending) return null;
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-white">Processing...</span>
      </div>
    </div>
  );
};

// Lazy loaded — only fetched when the admin clicks the tab
const TabLoader = () => <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
const TelemetryTab = dynamic(() => import('./components/TelemetryTab'), { loading: TabLoader, ssr: false });
const AnnouncementTab = dynamic(() => import('./components/AnnouncementTab'), { loading: TabLoader, ssr: false });
const TeamTab = dynamic(() => import('./components/TeamTab'), { loading: TabLoader, ssr: false });
const FocusAnalyticsTab = dynamic(() => import('./components/FocusAnalyticsTab'), { loading: TabLoader, ssr: false });

interface AdminClientProps {
  subjects: Subject[];
  initialRoles: UserRole[];
  userEmail: string;
  initialLogs: ActivityLog[];
  initialSessions: unknown[];
}

type TabId = 'upload' | 'manage' | 'Announcement' | 'team' | 'telemetry' | 'focus';

export default function AdminClient({ subjects, initialRoles, userEmail, initialLogs, initialSessions }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [localSubjects, setLocalSubjects] = useState<SubjectMeta[]>(subjects as SubjectMeta[]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [allRoles, setAllRoles] = useState<UserRole[]>(initialRoles);
  const [activeLogins, setActiveLogins] = useState<string[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  const supabase = createClientComponentClient();

  const currentUserRole = useMemo(() => {
    if (userEmail && ADMIN_EMAILS.some(e => userEmail.toLowerCase().trim() === e.toLowerCase().trim())) return 'superadmin';
    const found = allRoles.find(r => r.email?.toLowerCase() === userEmail?.toLowerCase());
    return found?.role || 'student';
  }, [allRoles, userEmail]);

  const availableTabs = useMemo(() => {
    const tabs = [{ id: 'upload', icon: '⚡', label: 'UPLOAD' }] as { id: TabId, icon: string, label: string }[];
    if (currentUserRole === 'superadmin') {
      tabs.push(
        { id: 'manage', icon: '📂', label: 'MANAGE' },
        { id: 'Announcement', icon: '📢', label: 'Announcement' },
        { id: 'team', icon: '👥', label: 'TEAM' },
        { id: 'telemetry', icon: '🌐', label: 'TELEMETRY' },
        { id: 'focus', icon: '🎧', label: 'PULSE' }
      );
    }
    return tabs;
  }, [currentUserRole]);

  const refreshPageData = useCallback(async () => {
    const [subRes, rolesRes, logRes, statRes] = await Promise.all([
      fetch('/api/admin/subjects'),
      fetch('/api/admin/roles'),
      fetch('/api/admin/active-logins'),
      fetch('/api/admin/storage-stats')
    ]);

    if (subRes.ok) setLocalSubjects(await subRes.json());
    if (rolesRes.ok) setAllRoles(await rolesRes.json());
    if (logRes.ok) {
      const logs: ActivityLog[] = await logRes.json();
      setActiveLogins(Array.from(new Set(logs.map((l) => l.user_email))).filter(Boolean) as string[]);
    }
    if (statRes.ok) setStorageStats(await statRes.json());
  }, []);

  useEffect(() => {
    refreshPageData();
    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshPageData, supabase]);

  const activeLessons = useMemo(() => 
    (localSubjects.find(s => s.id === selectedSubjectId)?.lessons as LessonMeta[]) || [],
    [localSubjects, selectedSubjectId]
  );

  return (
    <AdminProvider refreshPageData={refreshPageData}>
      <div className="min-h-screen bg-black text-white selection:bg-indigo-500 selection:text-white">
      <div className="max-w-full mx-auto flex flex-col md:flex-row min-h-screen overflow-hidden">
        
        <AdminSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          availableTabs={availableTabs} 
          currentUserRole={currentUserRole} 
          storageStats={storageStats} 
        />

        <div className="flex-1 bg-black relative flex flex-col min-h-screen">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent)] pointer-events-none"></div>
          
          <div className="flex-1 p-6 md:p-10 lg:p-16 relative overflow-y-auto">
            <AdminGlobalOverlay />
            <div className="max-w-[1400px] mx-auto">
              <AdminErrorBoundary>

              
              {activeTab === 'upload' && (
                <UploadTab 
                  selectedSubjectId={selectedSubjectId}
                  setSelectedSubjectId={setSelectedSubjectId}
                  selectedLessonId={selectedLessonId}
                  setSelectedLessonId={setSelectedLessonId}
                  localSubjects={localSubjects}
                  activeLessons={activeLessons}
                  refreshPageData={refreshPageData}
                />
              )}

              {activeTab === 'manage' && (
                <ManageTab 
                  localSubjects={localSubjects}
                />
              )}

              {activeTab === 'telemetry' && (
                <TelemetryTab 
                  initialLogs={initialLogs}
                  initialSessions={initialSessions}
                  allRoles={allRoles}
                />
              )}

              {activeTab === 'Announcement' && <AnnouncementTab />}

              {activeTab === 'team' && (
                <TeamTab 
                  allRoles={allRoles}
                  activeLogins={activeLogins}
                  refreshPageData={refreshPageData}
                />
              )}

              {activeTab === 'focus' && <FocusAnalyticsTab />}
              </AdminErrorBoundary>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AdminProvider>
  );
}
