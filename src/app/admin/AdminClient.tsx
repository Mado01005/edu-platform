'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ActiveSessionsFeed from '@/components/ActiveSessionsFeed';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import { SubjectMeta } from '@/lib/content';
import { ADMIN_EMAILS } from '@/lib/constants';

interface AdminClientProps {
  subjects: SubjectMeta[];
  initialRoles: any[];
  userEmail: string;
  initialLogs: any[];
  initialSessions: any[];
}

type TabId = 'upload' | 'manage' | 'broadcast' | 'team' | 'telemetry';

export default function AdminClient({ subjects, initialRoles, userEmail, initialLogs, initialSessions }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [localSubjects, setLocalSubjects] = useState<SubjectMeta[]>(subjects);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [inputType, setInputType] = useState<'file' | 'link'>('file');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [vimeoTitle, setVimeoTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('0 MB/s');
  const [currentFileName, setCurrentFileName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [allRoles, setAllRoles] = useState<any[]>(initialRoles);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [activeLogins, setActiveLogins] = useState<string[]>([]);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [uploadTarget, setUploadTarget] = useState<'supabase' | 'r2'>('r2');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

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
      const logs = await logRes.json();
      setActiveLogins(Array.from(new Set(logs.map((l: any) => l.user_email))).filter(Boolean) as string[]);
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

  const activeLessons = localSubjects.find(s => s.id === selectedSubjectId)?.lessons || [];

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
        alert(`Error: ${errData.error || 'Failed to update user role'}`);
      }
    } catch (err: any) { alert(`System Error: ${err.message}`); }
  };

  const getFileType = (mime: string) => {
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('image')) return 'image';
    if (mime.includes('video')) return 'video';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'powerpoint';
    return 'unknown';
  };

  const uploadFileWithProgress = (file: File, signedUrl: string, contentType: string) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
          
          const duration = (Date.now() - startTime) / 1000;
          if (duration > 0) {
            const speed = (e.loaded / 1024 / 1024 / duration).toFixed(2);
            setUploadSpeed(`${speed} MB/s`);
          }
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      });

      xhr.addEventListener('error', () => {
        const errorMsg = `Network error during upload in R2 (Status: ${xhr.status}, ${xhr.statusText || 'No response'}). Check CORS settings on the bucket.`;
        reject(new Error(errorMsg));
      });
      
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(file);
    });
  };

  const processUploadOrEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId) return alert('Select a module first');
    
    setUploading(true);
    setStatusMessage('Preparing transmission...');
    setProgress(0);
    setUploadSpeed('0 MB/s');

    try {
      if (inputType === 'file' && files.length > 0) {
        let completed = 0;
        const total = files.length;
        
        for (const file of files) {
          setCurrentFileName(file.name);
          setStatusMessage(`Processing: ${file.name} (${completed + 1}/${total})`);
          
          let itemType = 'file';
          let vimeoId = '';

          // Support for .vimeo files (which contain the Vimeo ID/URL)
          if (file.name.toLowerCase().endsWith('.vimeo')) {
            itemType = 'vimeo';
            try {
              const fileContent = await file.text();
              // Extract ID if it's a URL in the file
              const idMatch = fileContent.match(/(?:vimeo\.com\/|video\/)(\d+)/);
              vimeoId = idMatch ? idMatch[1] : fileContent.trim();
            } catch (e) {
              console.error('Failed to read .vimeo file', e);
            }
          }

          // 1. Initiate
          const subject = localSubjects.find(s => s.id === selectedSubjectId);
          const lesson = activeLessons.find((l: any) => l.id === selectedLessonId);
          
          const initRes = await fetch('/api/admin/upload-initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              subjectSlug: subject?.slug || 'unknown',
              lessonSlug: lesson?.title.toLowerCase().replace(/\s+/g, '-') || 'unknown',
              contentType: file.type || 'application/octet-stream'
            })
          });

          if (!initRes.ok) throw new Error(`Initiate failed for ${file.name}`);
          const { signedUrl, publicUrl } = await initRes.json();

          // 2. Transmit
          await uploadFileWithProgress(file, signedUrl, file.type);

          // 3. Complete
          const compRes = await fetch('/api/admin/upload-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subjectId: selectedSubjectId,
              lessonId: selectedLessonId,
              fileName: file.name,
              fileType: getFileType(file.type),
              publicUrl,
              itemType,
              vimeoId
            })
          });

          if (!compRes.ok) {
            const errorData = await compRes.json();
            throw new Error(`Completion failed for ${file.name}: ${errorData.error || 'Unknown database error'}`);
          }
          
          completed++;
        }
        
        setStatusMessage(`Success: ${completed} assets verified and linked!`);
        setFiles([]);
        setCurrentFileName('');
        setUploadSpeed('0 MB/s');
      } else if (inputType === 'link' && vimeoUrl) {
        if (!vimeoTitle) throw new Error('Title required for link');
        const res = await fetch('/api/admin/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId: selectedSubjectId,
            lessonId: selectedLessonId,
            url: vimeoUrl,
            title: vimeoTitle
          })
        });
        if (!res.ok) throw new Error('Link embedding failed');
        setStatusMessage('Success: Link embedded!');
        setVimeoUrl('');
        setVimeoTitle('');
      }
      refreshPageData();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      setProgress(0);
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
      if (res.ok) {
        alert(`Folder "${title}" successfully initialized.`);
        refreshPageData();
      } else {
        const err = await res.json();
        alert(`Folder Creation Error: ${err.error || 'Identity not authorized or database timeout'}`);
      }
    } catch(err: any) { alert(`Diagnostic Alert: ${err.message}`); }
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
      if (res.ok) {
        alert(`Module "${title}" successfully deployed to subject.`);
        refreshPageData();
      } else {
        const err = await res.json();
        alert(`Module Creation Error: ${err.error || 'Deployment credentials expired or ID mapping is invalid'}`);
      }
    } catch(err: any) { alert(`Diagnostic Alert: ${err.message}`); }
  };

  const handleDelete = async (type: 'subject' | 'lesson' | 'item', id: string, name: string) => {
    if (!confirm(`Permanently delete ${type} "${name}"?`)) return;
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      });
      if (res.ok) {
        alert(`Identity "${name}" securely purged.`);
        refreshPageData();
      } else {
         const err = await res.json();
         alert(`Deletion Error: ${err.error || 'Access Denied'}`);
      }
    } catch(err: any) { alert(`Diagnostic Alert: ${err.message}`); }
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
      if (res.ok) {
        alert(`Identity changed to: ${newName}`);
        refreshPageData();
      } else {
        const err = await res.json();
        alert(`Rename Error: ${err.error || 'Conflict detected'}`);
      }
    } catch(err: any) { alert(`Diagnostic Alert: ${err.message}`); }
  };

  const handleMove = async (type: 'lesson' | 'item', id: string, name: string) => {
    const targetType = type === 'item' ? 'Module' : 'Subject';
    const targetId = prompt(`Enter the ID of the target ${targetType} to move "${name}" to:`);
    if (!targetId) return;

    try {
      const res = await fetch('/api/admin/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, targetId })
      });
      if (!res.ok) throw new Error('Move failed');
      alert(`Successfully moved to target ${targetId}`);
      refreshPageData();
    } catch(err: any) { alert(err.message); }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItems);
    if (id && next.has(id)) next.delete(id);
    else if (id) next.add(id);
    setSelectedItems(next);
  };

  const toggleLesson = (id: string) => {
    const next = new Set(expandedLessons);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedLessons(next);
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Permanently delete ${selectedItems.size} selected items?`)) return;
    try {
      const res = await fetch('/api/admin/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedItems) })
      });
      if (res.ok) {
        setSelectedItems(new Set());
        refreshPageData();
      } else throw new Error('Batch deletion failed');
    } catch(err: any) { alert(err.message); }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500 selection:text-white">
      <div className="max-w-full mx-auto flex flex-col md:flex-row min-h-screen overflow-hidden">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full md:w-[320px] bg-[#0A0A0F] border-r border-white/5 flex flex-col pt-8 p-6 space-y-8 h-screen sticky top-0 md:overflow-y-auto">
          <div className="flex items-center gap-4 px-2 mb-4">
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl border border-indigo-500/20">⚡</div>
             <div>
               <h1 className="text-lg font-black tracking-tighter uppercase">Command</h1>
               <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] opacity-80">{currentUserRole.toUpperCase()} LEVEL</p>
             </div>
          </div>

          <div className="flex-1 space-y-2">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 border ${
                  activeTab === tab.id 
                    ? 'bg-white text-black border-white shadow-xl' 
                    : 'text-gray-500 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-lg opacity-80">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {storageStats && (
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-5 shadow-inner">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400 opacity-60">System Resources</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-bold uppercase tracking-widest">R2 Sector</span>
                      <span className="text-white font-black">{storageStats.r2.estimatedMB}MB</span>
                   </div>
                   <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${storageStats.r2.percentUsed}%` }}></div>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-bold uppercase tracking-widest">SB Core</span>
                      <span className="text-white font-black">{storageStats.supabase.estimatedMB}MB</span>
                   </div>
                   <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${storageStats.supabase.percentUsed}%` }}></div>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 bg-black relative flex flex-col min-h-screen">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent)] pointer-events-none"></div>
           
           <div className="flex-1 p-6 md:p-10 lg:p-16 relative overflow-y-auto">
              <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
                
                {activeTab === 'upload' && (
                  <form onSubmit={processUploadOrEmbed} className="space-y-12">
                    <div className="space-y-4 max-w-2xl text-center md:text-left mx-auto md:mx-0">
                      <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Initialize Deployment</h2>
                      <p className="text-sm text-gray-400 font-medium leading-relaxed">Transmit encrypted educational content to the global infrastructure clusters.</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
                       <div className="xl:col-span-4 space-y-6">
                          <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">01 Target Coordinates</label>
                             <div className="space-y-4">
                                <select className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer" value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedLessonId(''); }} disabled={uploading}>
                                  <option value="">-- Select Subject Cluster --</option>
                                  {localSubjects.map(s => <option key={s.id} value={s.id!}>{s.icon} {s.title}</option>)}
                                </select>
                                {selectedSubjectId && (
                                  <select className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all animate-in slide-in-from-top-2" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} disabled={uploading}>
                                    <option value="">-- Select Deployment Unit --</option>
                                    {activeLessons.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
                                  </select>
                                )}
                                <div className="flex gap-2 pt-2">
                                  <button type="button" onClick={handleCreateSubject} className="flex-1 text-[9px] font-black uppercase tracking-widest py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition">+ Create Folder</button>
                                  {selectedSubjectId && <button type="button" onClick={handleCreateLesson} className="flex-1 text-[9px] font-black uppercase tracking-widest py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition">+ Create Module</button>}
                                </div>
                             </div>
                          </div>
                       </div>

                       {selectedLessonId && (
                         <div className="xl:col-span-8 space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] space-y-10">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">02 Storage Core</label>
                                    <div className="flex gap-3">
                                      {(['r2', 'supabase'] as const).map(target => (
                                        <button key={target} type="button" onClick={() => setUploadTarget(target)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${uploadTarget === target ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>
                                          {target === 'r2' ? 'Cloudflare R2' : 'Supabase Storage'}
                                        </button>
                                      ))}
                                    </div>
                                 </div>
                                 <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">03 Link Protocol</label>
                                    <div className="flex p-1.5 bg-black/40 rounded-2xl border border-white/5">
                                      <button type="button" onClick={() => setInputType('file')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${inputType === 'file' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>Direct Upload</button>
                                      <button type="button" onClick={() => setInputType('link')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${inputType === 'link' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>Embed Service</button>
                                    </div>
                                 </div>
                               </div>

                               {inputType === 'file' ? (
                                 <label className={`flex flex-col items-center justify-center w-full h-56 border-2 ${files.length > 0 ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-dashed border-white/10 hover:border-indigo-500/30 bg-black/50'} rounded-[2.5rem] cursor-pointer transition-all group relative overflow-hidden`}>
                                   <div className="text-center relative z-10">
                                     <div className={`w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center text-3xl transition-transform duration-500 group-hover:scale-110 ${files.length > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-indigo-400 shadow-inner'}`}>{files.length > 0 ? '📦' : '⚡'}</div>
                                     {files.length > 0 ? (
                                        <div className="space-y-1">
                                          <p className="text-sm font-black text-indigo-300">{files.length} Assets Selected</p>
                                          <p className="text-[9px] text-gray-500 uppercase font-black">Click to change selection</p>
                                        </div>
                                     ) : (
                                        <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-black">Ready for synchronization</p>
                                     )}
                                   </div>
                                   <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} disabled={uploading}/>
                                 </label>
                               ) : (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <input type="text" placeholder="Visual Identifier (Title)" value={vimeoTitle} onChange={e => setVimeoTitle(e.target.value)} className="bg-black border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-gray-800" />
                                   <input type="text" placeholder="Vimeo / Dynamic Resource URL" value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} className="bg-black border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-gray-800" />
                                 </div>
                               )}

                               {uploading && (
                                 <div className="space-y-6 animate-in fade-in duration-500">
                                    <div className="flex justify-between items-end">
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Transmission</p>
                                        <p className="text-sm font-black text-white truncate max-w-sm">{currentFileName}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Network Speed</p>
                                        <p className="text-sm font-black text-indigo-400">{uploadSpeed}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.4)]" style={{ width: `${progress}%` }}>
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[pulse_2s_linear_infinite]"></div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center px-1">
                                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">0%</span>
                                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{progress}% VERIFIED</span>
                                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">100%</span>
                                    </div>
                                 </div>
                               )}

                               {statusMessage && (
                                <div className={`p-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center ${statusMessage.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                  {statusMessage}
                                </div>
                               )}

                               <button type="submit" disabled={!selectedLessonId || uploading || (inputType === 'file' && files.length === 0)} className="w-full bg-white text-black font-black py-6 rounded-[2rem] hover:bg-gray-200 transition-all duration-500 disabled:opacity-30 uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:scale-[1.01] active:scale-95">
                                 {uploading ? 'Processing Transmission Cluster...' : 'Execute Transaction'}
                               </button>
                            </div>
                         </div>
                       )}
                    </div>
                  </form>
                )}

                {activeTab === 'manage' && (
                  <div className="space-y-10 fade-in">
                    <div className="space-y-4 max-w-2xl px-2">
                      <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Curriculum Control</h2>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">Full administrative override for subjects, modules, and binary assets.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {localSubjects.map(subject => (
                        <div key={subject.id} className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden transition-all duration-500 hover:border-white/20 hover:shadow-2xl">
                          <div className="flex items-center justify-between p-8 bg-white/5 border-b border-white/5">
                            <h3 className="text-lg font-black text-white flex gap-3 items-center tracking-tight">{subject.icon} {subject.title}</h3>
                            <div className="flex gap-2">
                               <button onClick={() => handleRename('subject', subject.id!, subject.title)} className="p-3 hover:bg-white/10 rounded-2xl transition text-gray-500">✏️</button>
                               <button onClick={() => handleDelete('subject', subject.id!, subject.title)} className="p-3 hover:bg-red-500/10 rounded-2xl transition text-red-500">🗑️</button>
                            </div>
                          </div>
                          <div className="divide-y divide-white/5">
                            {subject.lessons?.map((lesson: any) => (
                              <div key={lesson.id} className="p-8 pb-10 group">
                                <div className={`flex items-center justify-between cursor-pointer rounded-2xl p-4 transition-all duration-300 ${expandedLessons.has(lesson.id!) ? 'bg-white/5 mb-6' : 'hover:bg-white/[0.02]'}`} onClick={() => toggleLesson(lesson.id!)}>
                                  <div className="flex items-center gap-4">
                                    <span className={`text-xs transition-transform duration-300 ${expandedLessons.has(lesson.id!) ? 'rotate-90' : 'rotate-0'}`}>▶</span>
                                    <h4 className={`text-md font-bold uppercase tracking-widest transition-colors ${expandedLessons.has(lesson.id!) ? 'text-indigo-400' : 'text-gray-500'}`}>📂 {lesson.title}</h4>
                                  </div>
                                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => handleMove('lesson', lesson.id!, lesson.title)} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded-lg hover:bg-indigo-500/20 transition">Move</button>
                                    <button onClick={() => handleRename('lesson', lesson.id!, lesson.title)} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition">Rename</button>
                                    <button onClick={() => handleDelete('lesson', lesson.id!, lesson.title)} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-500/5 text-red-500 border border-red-500/10 rounded-lg hover:bg-red-500/10 transition">Delete</button>
                                  </div>
                                </div>
                                {expandedLessons.has(lesson.id!) && (
                                   <ul className="space-y-2 mt-4 animate-in slide-in-from-top-2 duration-300">
                                    {lesson.content?.length === 0 && (
                                      <p className="text-[9px] text-gray-700 italic px-6">Folder is currently empty</p>
                                    )}
                                    {lesson.content?.map((item: any) => (
                                      <li key={item.id} className="flex justify-between items-center text-xs py-4 px-6 rounded-2xl hover:bg-white/5 transition border border-transparent hover:border-white/5 group/item bg-black/40">
                                        <div className="flex items-center gap-4">
                                          <input type="checkbox" checked={selectedItems.size > 0 && selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="accent-indigo-500 w-4 h-4 rounded-lg" />
                                          <span className="text-gray-500 font-normal text-lg">
                                            {item.type === 'vimeo' ? '🎬' : 
                                             item.fileType === 'video' ? '📽️' : 
                                             item.fileType === 'pdf' ? '📕' : 
                                             item.fileType === 'image' ? '🖼️' : 
                                             item.name.toLowerCase().endsWith('.docx') || item.name.toLowerCase().endsWith('.doc') ? '📝' : 
                                             '📄'}
                                          </span>
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-gray-300">{item.name}</span>
                                              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border ${
                                                item.type === 'vimeo' || item.fileType === 'video' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                                item.fileType === 'pdf' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                item.name.toLowerCase().includes('.doc') ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                                'bg-white/5 border-white/10 text-gray-500'
                                              }`}>
                                                {item.type === 'vimeo' ? 'VIMEO' : (item.fileType || 'FILE').toUpperCase()}
                                              </span>
                                            </div>
                                            <span className="text-[8px] text-gray-700 font-mono tracking-tighter opacity-50 uppercase">{item.id}</span>
                                          </div>
                                        </div>
                                        <div className="flex gap-3 opacity-0 group-hover/item:opacity-100 transition-all">
                                          <button onClick={() => handleMove('item', item.id, item.name)} className="text-[7px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition">Move</button>
                                          <button onClick={() => handleRename('item', item.id, item.name)} className="text-[7px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition">Rename</button>
                                          <button onClick={() => handleDelete('item', item.id, item.name)} className="text-red-500 hover:scale-125 transition">🗑️</button>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedItems.size > 0 && (
                      <div className="fixed bottom-10 left-[calc(320px+50%)] -translate-x-1/2 bg-red-500 text-white p-8 rounded-[3rem] flex items-center gap-12 shadow-2xl z-[100] animate-in zoom-in-95">
                         <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-black text-2xl shadow-inner">!</div>
                            <div>
                              <p className="font-black uppercase tracking-[0.2em] text-sm">{selectedItems.size} Selected Assets</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Marked for secure deletion</p>
                            </div>
                         </div>
                         <div className="flex gap-4">
                            <button onClick={() => setSelectedItems(new Set())} className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition px-4">Cancel</button>
                            <button onClick={handleBatchDelete} className="bg-black/20 hover:bg-black/40 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl">Purge Cluster</button>
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'telemetry' && (
                  <div className="space-y-10 fade-in">
                    <div className="space-y-4 px-2">
                       <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Live Telemetry</h2>
                       <p className="text-sm text-gray-500 font-medium">Real-time scan of global session activity and platform load.</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-[3.5rem] p-4 shadow-3xl">
                       <LiveActivityFeed 
                          initialLogs={initialLogs} 
                          initialSessions={initialSessions} 
                          initialUsers={allRoles.filter(r => r.role === 'student')} 
                       />
                    </div>
                  </div>
                )}

                {activeTab === 'broadcast' && (
                  <div className="h-[600px] flex items-center justify-center fade-in">
                     <div className="w-full max-w-2xl bg-white/5 border border-white/10 p-16 rounded-[4rem] text-center space-y-12 relative overflow-hidden shadow-3xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
                        <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-5xl shadow-inner border border-indigo-500/20">📢</div>
                        <div className="space-y-4">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Emergency Signal</h2>
                          <p className="text-gray-500 text-sm font-medium">Global broadcast alert sent directly to all student frequencies.</p>
                        </div>
                        <input id="broadcast-msg" type="text" placeholder="Draft transmission protocol..." className="w-full bg-black border border-white/10 rounded-[2rem] px-8 py-6 text-sm text-center font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-800" />
                        <div className="flex gap-4">
                          <button onClick={async () => {
                            const msg = (document.getElementById('broadcast-msg') as HTMLInputElement).value;
                            if (!msg) return;
                            await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, is_active: true }) });
                            alert('Signal Transmitted');
                            (document.getElementById('broadcast-msg') as HTMLInputElement).value = '';
                          }} className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-600/20 transition-all active:scale-95">Send Frequency</button>
                          <button onClick={async () => {
                            await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false }) });
                            alert('Signal Terminated');
                          }} className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 px-10 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] transition-all">End Feed</button>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'team' && (
                  <div className="space-y-16 fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="bg-[#101015] border border-white/10 p-12 rounded-[4rem] space-y-10 shadow-3xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                         <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Security Override</h2>
                         <p className="text-sm text-gray-500 font-medium leading-relaxed">Elevate any student to Faculty (Teacher) or God Mode (Superadmin) clearance.</p>
                         <div className="space-y-6">
                           <input value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="Verified google identity email..." className="w-full bg-black border border-white/10 rounded-3xl px-8 py-7 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white text-md font-black placeholder:text-gray-800 shadow-inner" />
                           <div className="flex gap-4">
                              <button onClick={() => { if (!newTeacherEmail) return; updateRole(newTeacherEmail, 'teacher'); setNewTeacherEmail(''); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-6 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl transition-all">Grant Teacher</button>
                              <button onClick={() => { if (!newTeacherEmail) return; updateRole(newTeacherEmail, 'superadmin'); setNewTeacherEmail(''); }} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-2xl shadow-indigo-600/30">Grant God Mode</button>
                           </div>
                         </div>
                       </div>
                       
                       <div className="bg-indigo-500/5 border border-indigo-500/10 p-12 rounded-[4rem] space-y-10 relative overflow-hidden backdrop-blur-md">
                          <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-4xl border border-indigo-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">📄</div>
                          <div className="space-y-4">
                             <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Authority Log</h3>
                             <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest leading-loose opacity-60">
                                — TEACHER: Content Upload privileges only.<br/>
                                — SUPERADMIN: Full telemetric God Mode override.<br/>
                                — BANNED: Complete identity sector lockout.
                             </p>
                          </div>
                          <div className="h-1 bg-white/5 w-full rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-500/40 w-1/3"></div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-[#05050A] border border-white/10 rounded-[4rem] overflow-hidden shadow-3xl min-h-[500px]">
                       <div className="px-14 py-10 border-b border-white/5 bg-white/[0.02] flex justify-between items-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] pointer-events-none"></div>
                          <h3 className="font-black text-[11px] uppercase tracking-[0.4em] text-gray-500">Classified Personnel DB</h3>
                          <span className="text-[11px] font-black text-indigo-400 bg-indigo-500/10 px-6 py-2 rounded-2xl border border-indigo-500/10 shadow-inner">{allRoles.length} Identified Identities</span>
                       </div>
                       
                       <div className="divide-y divide-white/5">
                         {/* FACULTY / ADMINS */}
                         <div className="bg-indigo-500/[0.02]">
                            {allRoles.filter(r => r.role === 'teacher' || r.role === 'superadmin').map(r => (
                              <li key={r.email} className="px-14 py-10 flex items-center justify-between hover:bg-white/[0.03] transition-all duration-700 group border-l-4 border-transparent hover:border-indigo-500">
                                 <div className="flex items-center gap-8">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl border transition-all duration-500 ${r.role === 'superadmin' ? 'bg-indigo-600 border-indigo-400 text-white shadow-2xl shadow-indigo-600/40' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                      {r.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-black text-white text-xl tracking-tighter group-hover:text-indigo-400 transition-colors">{r.email}</p>
                                      <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-3 ${r.role === 'superadmin' ? 'text-indigo-400' : 'text-gray-600'}`}>
                                        <span className={`w-2 h-2 rounded-full ${r.role === 'superadmin' ? 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]' : 'bg-gray-800'}`}></span>
                                        {r.role} CLEARANCE
                                      </p>
                                    </div>
                                 </div>
                                 <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-10 group-hover:translate-x-0 min-w-[200px]">
                                     {r.role !== 'superadmin' && (
                                       <button onClick={() => updateRole(r.email, 'superadmin')} className="w-full px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-2xl hover:bg-indigo-500 transition-all">Grant God Mode</button>
                                     )}
                                     {!ADMIN_EMAILS.some(e => r.email.toLowerCase().trim() === e.toLowerCase().trim()) && (
                                       <button onClick={() => updateRole(r.email, 'student')} className="w-full px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-red-500/40 hover:text-red-500 border border-white/10 hover:bg-red-500/10 transition-all">Demote to Student</button>
                                     )}
                                  </div>
                              </li>
                            ))}
                         </div>

                         {/* ALL STUDENTS */}
                         <div className="p-14 space-y-12">
                            <div className="flex items-center gap-6 opacity-20 hover:opacity-100 transition-all duration-1000">
                               <div className="h-px flex-1 bg-white/10"></div>
                               <span className="text-[11px] font-black uppercase tracking-[0.6em] text-center">Global Student Frequency Scan</span>
                               <div className="h-px flex-1 bg-white/10"></div>
                            </div>

                            <div className="grid grid-cols-1 gap-8">
                               {allRoles.filter(r => r.role === 'student' || r.role === 'banned').map(r => (
                                 <div key={r.email} className={`bg-[#0A0A0F] border rounded-[3rem] overflow-hidden transition-all duration-700 group/student p-8 flex flex-col md:flex-row items-center justify-between gap-8 ${r.role === 'banned' ? 'border-red-500/20 grayscale' : 'border-white/5 hover:border-indigo-500/30 shadow-inner'}`}>
                                    <div className="flex items-center gap-8 w-full md:w-auto">
                                       <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-xl font-black transition-all duration-500 ${r.role === 'banned' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-400 group-hover/student:bg-indigo-500 group-hover/student:text-white shadow-inner'}`}>{r.email.charAt(0).toUpperCase()}</div>
                                       <div>
                                          <div className="flex items-center gap-3">
                                            <p className="text-xl font-black text-gray-100 tracking-tight">{r.email}</p>
                                            {activeLogins.includes(r.email) && <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-green-500/20 animate-pulse">Online</span>}
                                          </div>
                                          <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-2 ${r.role === 'banned' ? 'text-red-600' : 'text-gray-700'}`}>{r.role === 'banned' ? '✘ Identity Sector Revoked' : '✓ Verified connection'}</p>
                                       </div>
                                    </div>
                                    <div className="flex flex-col gap-2 min-w-[200px] items-end justify-center w-full md:w-auto">
                                       {r.role !== 'banned' ? (
                                         <>
                                           <button onClick={() => updateRole(r.email, 'teacher')} className="w-full px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 border border-white/5 shadow-xl transition-all">Promote: Teacher</button>
                                           <button onClick={() => updateRole(r.email, 'superadmin')} className="w-full px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all">Grant: God Mode</button>
                                           <button onClick={() => updateRole(r.email, 'banned')} className="w-full mt-1 px-4 py-3 hover:bg-red-500/20 rounded-xl text-red-500 bg-white/5 border border-white/5 transition-all opacity-40 hover:opacity-100" title="Revoke Identity">🚫 Revoke Access</button>
                                         </>
                                       ) : (
                                         <button onClick={() => updateRole(r.email, 'student')} className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">Authorize Re-Entry</button>
                                       )}
                                    </div>
                                 </div>
                               ))}
                               {allRoles.filter(r => r.role === 'student' || r.role === 'banned').length === 0 && (
                                 <p className="text-center py-20 text-[11px] font-black text-gray-800 uppercase tracking-[0.4em] italic leading-loose select-none">No student identifiers detected in the regional frequency scans.</p>
                               )}
                            </div>
                         </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
