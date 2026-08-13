'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px]">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="size-5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
        <span className="text-sm font-medium text-slate-900">Processing...</span>
      </div>
    </div>
  );
};

// Lazy loaded — only fetched when the admin clicks the tab
const TabLoader = () => <div className="flex items-center justify-center py-20"><div className="size-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" /></div>;
const TelemetryTab = dynamic(() => import('./components/TelemetryTab'), { loading: TabLoader, ssr: false });
const AnnouncementTab = dynamic(() => import('./components/AnnouncementTab'), { loading: TabLoader, ssr: false });
const TeamTab = dynamic(() => import('./components/TeamTab'), { loading: TabLoader, ssr: false });


interface AdminClientProps {
  subjects: Subject[];
  initialRoles: UserRole[];
  userEmail: string;
  initialLogs: ActivityLog[];
  initialSessions: unknown[];
}

type TabId = 'upload' | 'manage' | 'Announcement' | 'team' | 'telemetry';

export default function AdminClient({ subjects, initialRoles, userEmail, initialLogs, initialSessions }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [localSubjects, setLocalSubjects] = useState<SubjectMeta[]>(subjects as SubjectMeta[]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [allRoles, setAllRoles] = useState<UserRole[]>(initialRoles);
  const [activeLogins, setActiveLogins] = useState<string[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  const currentUserRole = useMemo(() => {
    if (userEmail && ADMIN_EMAILS.some(e => userEmail.toLowerCase().trim() === e.toLowerCase().trim())) return 'superadmin';
    const found = allRoles.find(r => r.email?.toLowerCase() === userEmail?.toLowerCase());
    return found?.role || 'student';
  }, [allRoles, userEmail]);

  const availableTabs = useMemo(() => {
    const tabs = [{ id: 'upload', icon: '➕', label: 'Add lessons' }] as { id: TabId, icon: string, label: string }[];
    if (currentUserRole === 'superadmin') {
      tabs.push(
        { id: 'manage', icon: '📚', label: 'Manage lessons' },
        { id: 'Announcement', icon: '📢', label: 'Send announcement' },
        { id: 'team', icon: '👥', label: 'Manage team' },
        { id: 'telemetry', icon: '📊', label: 'View activity' }
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
    const initialRefresh = window.setTimeout(
      () => void refreshPageData(),
      0,
    );
    const poll = window.setInterval(() => void refreshPageData(), 30_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(poll);
    };
  }, [refreshPageData]);

  const activeLessons = useMemo(() => 
    (localSubjects.find(s => s.id === selectedSubjectId)?.lessons as LessonMeta[]) || [],
    [localSubjects, selectedSubjectId]
  );

  return (
    <AdminProvider refreshPageData={refreshPageData}>
      <section className="relative flex w-full min-w-0 flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm selection:bg-sky-100 selection:text-slate-900 sm:p-5">
        <AdminSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          availableTabs={availableTabs} 
          storageStats={storageStats} 
        />
        <AdminGlobalOverlay />
        <div className="relative min-w-0 rounded-2xl bg-slate-50 p-1 sm:p-3">
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

            {activeTab === 'manage' && <ManageTab localSubjects={localSubjects} />}

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
          </AdminErrorBoundary>
        </div>
      </section>
    </AdminProvider>
  );
}
