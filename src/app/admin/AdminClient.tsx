'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Subject, UserRole, ActivityLog, StorageStats, SubjectMeta, LessonMeta } from '@/types';
import { ADMIN_EMAILS } from '@/lib/constants';

// Sub-components
import AdminSidebar from './components/AdminSidebar';
import UploadTab from './components/UploadTab';
import ManageTab from './components/ManageTab';
import TelemetryTab from './components/TelemetryTab';
import BroadcastTab from './components/BroadcastTab';
import TeamTab from './components/TeamTab';

interface AdminClientProps {
  subjects: Subject[];
  initialRoles: UserRole[];
  userEmail: string;
  initialLogs: ActivityLog[];
  initialSessions: unknown[];
}

type TabId = 'upload' | 'manage' | 'broadcast' | 'team' | 'telemetry';

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
        { id: 'broadcast', icon: '📢', label: 'BROADCAST' },
        { id: 'team', icon: '👥', label: 'TEAM' },
        { id: 'telemetry', icon: '🌐', label: 'TELEMETRY' }
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

  const updateRole = async (email: string, role: string) => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, overrideRole: role })
      });
      if (res.ok) {
        alert(`${email} updated to ${role}`);
        refreshPageData();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || 'Failed to update'}`);
      }
    } catch (err: unknown) {
      alert(`System Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCreateSubject = async () => {
    const title = prompt('New Subject Title:');
    if (!title) return;
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, icon: '📂' })
      });
      if (res.ok) refreshPageData();
      else alert('Failed to create subject');
    } catch(e) { alert('Network Error'); }
  };

  const handleCreateLesson = async () => {
    const title = prompt('New Module Title:');
    if (!title || !selectedSubjectId) return;
    try {
      const res = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubjectId, title })
      });
      if (res.ok) refreshPageData();
      else alert('Failed to create module');
    } catch(e) { alert('Network Error'); }
  };

  const handleDelete = async (type: 'subject' | 'lesson' | 'item', id: string, name: string) => {
    if (!confirm(`Permanently delete ${type} "${name}"?`)) return;
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      });
      if (res.ok) refreshPageData();
      else alert('Deletion Denied');
    } catch(e) { alert('Network Error'); }
  };

  const handleRename = async (type: 'subject' | 'lesson' | 'item', id: string, oldName: string) => {
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    try {
      const res = await fetch('/api/admin/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, title: newName })
      });
      if (res.ok) refreshPageData();
      else alert('Rename Conflict');
    } catch(e) { alert('Network Error'); }
  };

  const handleMove = async (type: 'lesson' | 'item', id: string, name: string) => {
    const targetType = type === 'item' ? 'Module' : 'Subject';
    const targetId = prompt(`Enter ID of target ${targetType} to move "${name}" to:`);
    if (!targetId) return;
    try {
      const res = await fetch('/api/admin/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, targetId })
      });
      if (res.ok) refreshPageData();
      else alert('Move Failed');
    } catch(e) { alert('Network Error'); }
  };

  const handleBatchDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} selected items?`)) return;
    try {
      const res = await fetch('/api/admin/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) refreshPageData();
      else alert('Batch Purge Failed');
    } catch(e) { alert('Network Error'); }
  };

  return (
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
            <div className="max-w-[1400px] mx-auto">
              
              {activeTab === 'upload' && (
                <UploadTab 
                  selectedSubjectId={selectedSubjectId}
                  setSelectedSubjectId={setSelectedSubjectId}
                  selectedLessonId={selectedLessonId}
                  setSelectedLessonId={setSelectedLessonId}
                  localSubjects={localSubjects}
                  activeLessons={activeLessons}
                  handleCreateSubject={handleCreateSubject}
                  handleCreateLesson={handleCreateLesson}
                  refreshPageData={refreshPageData}
                />
              )}

              {activeTab === 'manage' && (
                <ManageTab 
                  localSubjects={localSubjects}
                  handleDelete={handleDelete}
                  handleRename={handleRename}
                  handleMove={handleMove}
                  handleBatchDelete={handleBatchDelete}
                />
              )}

              {activeTab === 'telemetry' && (
                <TelemetryTab 
                  initialLogs={initialLogs}
                  initialSessions={initialSessions}
                  allRoles={allRoles}
                />
              )}

              {activeTab === 'broadcast' && <BroadcastTab />}

              {activeTab === 'team' && (
                <TeamTab 
                  allRoles={allRoles}
                  activeLogins={activeLogins}
                  updateRole={updateRole}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
