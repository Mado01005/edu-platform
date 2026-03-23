'use client';

import { useState, useEffect } from 'react';
import ActiveSessionsFeed from '@/components/ActiveSessionsFeed';

type AdminClientProps = {
  subjects: any[];
  initialRoles?: any[];
  userEmail?: string;
};

export default function AdminClient({ subjects: initialSubjects, initialRoles = [], userEmail }: AdminClientProps) {
  const [localSubjects, setLocalSubjects] = useState(initialSubjects);
  
  // Verify God Mode access. Hardcoded owner or roles marked explicitly as 'superadmin'.
  const canSeeGodMode = userEmail === 'abdallahsaad2150@gmail.com' || initialRoles.find(r => r.email === userEmail)?.role === 'superadmin';
  
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'broadcast' | 'team' | 'inbox' | 'telemetry'>('upload');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'inbox') {
      setLoadingMessages(true);
      fetch('/api/messages').then(res => res.json()).then(data => {
        setMessages(data.messages || []);
        setLoadingMessages(false);
      });
    }
  }, [activeTab]);

  const [allRoles, setAllRoles] = useState(initialRoles);
  const teamRoles = allRoles.filter(r => r.role === 'teacher' || r.role === 'admin');
  const activeLogins = allRoles.filter(r => r.role === 'student').map(r => r.email);

  const [newTeacherEmail, setNewTeacherEmail] = useState('');

  // ================= UPLOAD / EMBED STATE =================
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [inputType, setInputType] = useState<'file' | 'link'>('file');
  
  const [file, setFile] = useState<File | null>(null);
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [vimeoTitle, setVimeoTitle] = useState('');

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [uploadTarget, setUploadTarget] = useState<'r2' | 'supabase'>('r2');
  const [storageStats, setStorageStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/storage-stats').then(r => r.json()).then(setStorageStats).catch(() => {});
  }, []);

  const [migrating, setMigrating] = useState(false);

  const activeSubject = localSubjects.find(s => s.id === selectedSubjectId);
  const activeLessons = activeSubject?.lessons || [];

  // ================= COMMON ACTION HANDLERS =================
  const refreshPageData = () => {
    window.location.reload();
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} selected item(s)? This cannot be undone.`)) return;

    let failed = 0;
    for (const id of selectedItems) {
      try {
        const res = await fetch('/api/admin/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'item', id })
        });
        if (!res.ok) failed++;
      } catch { failed++; }
    }

    setSelectedItems(new Set());
    if (failed > 0) alert(`${failed} item(s) failed to delete.`);
    refreshPageData();
  };

  const handleCreateSubject = async () => {
    const title = prompt('Enter the name of the new Subject (Math, Physics, etc.):');
    if (!title) return;
    const icon = prompt('Enter an emoji icon for this Subject (e.g. 📚, 🔬):') || '📁';
    
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, icon, color: 'from-indigo-500 to-purple-500' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocalSubjects(prev => [...prev, data.subject]);
      setSelectedSubjectId(data.subject.id);
      setSelectedLessonId('');
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  const handleCreateLesson = async () => {
    if (!selectedSubjectId) return;
    const title = prompt('Enter the name of the new Lesson / Folder:');
    if (!title) return;
    try {
      const res = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubjectId, title })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocalSubjects(prev => prev.map(s => s.id === selectedSubjectId ? { ...s, lessons: [...(s.lessons || []), data.lesson] } : s));
      setSelectedLessonId(data.lesson.id);
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  // ================= FILE UPLOAD + LINK EMBED =================
  const processUploadOrEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !selectedLessonId) {
      setStatusMessage('Please select a subject and lesson.');
      return;
    }

    if (inputType === 'file' && !file) return setStatusMessage('Please select a file to upload.');
    if (inputType === 'link' && (!vimeoUrl || !vimeoTitle)) return setStatusMessage('Please provide a URL and Title.');

    setUploading(true);
    setProgress(10);

    try {
      if (inputType === 'link') {
        setStatusMessage('Embedding video link...');
        const res = await fetch('/api/admin/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectId: selectedSubjectId, lessonId: selectedLessonId, url: vimeoUrl, title: vimeoTitle })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to embed');
        setProgress(100);
        setStatusMessage('Link Embedded successfully!');
        setVimeoUrl(''); setVimeoTitle('');
        setTimeout(() => setProgress(0), 3000);
        return;
      }

      // FILE UPLOAD FLOW
      setStatusMessage('Preparing upload...');
      const subjectSlug = activeSubject.slug;
      const lessonSlug = activeLessons.find((l: any) => l.id === selectedLessonId)?.slug;
      let publicUrl = '';

      if (uploadTarget === 'r2') {
        // R2: Presigned URL direct upload
        setStatusMessage('Requesting secure R2 signature...');
        const initiateRes = await fetch('/api/admin/upload-initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file!.name, subjectSlug, lessonSlug, contentType: file!.type || 'application/octet-stream' })
        });
        if (!initiateRes.ok) throw new Error('Failed to initiate R2 upload');
        const { signedUrl, publicUrl: r2Url } = await initiateRes.json();
        publicUrl = r2Url;
        
        setProgress(30);
        setStatusMessage('Uploading to Cloudflare R2...');

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signedUrl, true);
          xhr.setRequestHeader('Content-Type', file!.type || 'application/octet-stream');
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 60) + 30);
          };
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 upload failed (${xhr.status}): ${xhr.statusText}`));
          xhr.onerror = () => reject(new Error('R2 network error — try Supabase instead'));
          xhr.send(file);
        });
      } else {
        // Supabase: Server-side proxy upload (no CORS issues)
        setStatusMessage('Uploading to Supabase Storage...');
        setProgress(30);

        const formData = new FormData();
        formData.append('file', file!);
        formData.append('subjectSlug', subjectSlug);
        formData.append('lessonSlug', lessonSlug || '');

        const uploadRes = await fetch('/api/admin/upload-supabase', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Supabase upload failed');
        }
        const { publicUrl: sbUrl } = await uploadRes.json();
        publicUrl = sbUrl;
        setProgress(90);
      }

      setProgress(90);
      setStatusMessage('Finalizing database records...');

      let fileType = 'unknown';
      if (file!.type.startsWith('video/')) fileType = 'video';
      else if (file!.type.startsWith('image/')) fileType = 'image';
      else if (file!.type === 'application/pdf') fileType = 'pdf';
      else if (file!.name.toLowerCase().endsWith('.ppt') || file!.name.toLowerCase().endsWith('.pptx') || file!.type.includes('presentation')) fileType = 'powerpoint';
      else if (file!.name.toLowerCase().endsWith('.doc') || file!.name.toLowerCase().endsWith('.docx')) fileType = 'document';

      const completeRes = await fetch('/api/admin/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubjectId, lessonId: selectedLessonId, fileName: file!.name, fileType, publicUrl })
      });

      if (!completeRes.ok) {
        const errorData = await completeRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to register file in database');
      }

      setProgress(100);
      setStatusMessage('Upload complete!');
      setFile(null); 

    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 3000);
    }
  };

  // ================= CRUD ABILITIES =================
  const handleDelete = async (type: string, id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      });
      if (!res.ok) throw new Error('Delete failed');
      refreshPageData();
    } catch(err: any) { alert(err.message); }
  };

  const handleRename = async (type: string, id: string, oldName: string) => {
    const newName = prompt(`Enter new name for "${oldName}":`, oldName);
    if (!newName || newName === oldName) return;
    try {
      const res = await fetch('/api/admin/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, title: newName })
      });
      if (!res.ok) throw new Error('Rename failed');
      refreshPageData();
    } catch(err: any) { alert(err.message); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT SIDEBAR NAVIGATION & HUD */}
      <div className="lg:col-span-3 space-y-5 fade-in">
        
        {/* Navigation Sidebar */}
        <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl p-3 flex flex-col gap-1.5 shadow-2xl relative overflow-hidden">
           <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

           <button onClick={() => setActiveTab('upload')} className={`relative w-full text-left px-4 py-3.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 ${activeTab === 'upload' ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] shadow-indigo-500/10' : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
             <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
             Upload / Embed
             {activeTab === 'upload' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>}
           </button>

           <button onClick={() => setActiveTab('manage')} className={`relative w-full text-left px-4 py-3.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 ${activeTab === 'manage' ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] shadow-indigo-500/10' : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
             <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
             Manage Syllabus
             {activeTab === 'manage' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>}
           </button>

           <button onClick={() => setActiveTab('inbox')} className={`relative w-full text-left px-4 py-3.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 ${activeTab === 'inbox' ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] shadow-indigo-500/10' : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
             <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
             Student Inbox
             {messages.filter(m => !m.is_read).length > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse">{messages.filter(m => !m.is_read).length}</span>}
             {activeTab === 'inbox' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>}
           </button>

           {canSeeGodMode && (
             <button onClick={() => setActiveTab('telemetry')} className={`relative w-full text-left px-4 py-3.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 ${activeTab === 'telemetry' ? 'bg-green-500/10 border border-green-500/30 text-green-300 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)] shadow-green-500/10' : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
               <div className="relative">
                 <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                 <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               </div>
               God Mode HUD
               {activeTab === 'telemetry' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-500 rounded-r-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>}
             </button>
           )}

           <button onClick={() => setActiveTab('broadcast')} className={`relative w-full text-left px-4 py-3.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 ${activeTab === 'broadcast' ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] shadow-indigo-500/10' : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
             <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
             Broadcast
             {activeTab === 'broadcast' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>}
           </button>

           <button onClick={() => setActiveTab('team')} className={`relative w-full text-left px-4 py-3.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 ${activeTab === 'team' ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] shadow-indigo-500/10' : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
             <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             Team Access
             {activeTab === 'team' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>}
           </button>
        </div>

        {/* Quick Stats HUD under sidebar */}
        <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span> Live Telemetry</p>
           
           <div className="flex justify-between items-center bg-white/[0.03] border border-white/5 px-4 py-3 rounded-xl hover:bg-white/[0.06] transition-colors duration-300">
             <span className="text-sm text-gray-300 font-medium">Active Courses</span>
             <span className="text-xl font-black text-white drop-shadow-md">{localSubjects.length}</span>
           </div>

           <div className="flex justify-between items-center bg-white/[0.03] border border-white/5 px-4 py-3 rounded-xl hover:bg-white/[0.06] transition-colors duration-300">
             <span className="text-sm text-gray-300 font-medium">Verified Staff</span>
             <span className="text-xl font-black text-indigo-300 drop-shadow-md">{teamRoles.length}</span>
           </div>

           {/* Storage Usage */}
           {storageStats && (
             <div className="space-y-3 pt-3 border-t border-white/5">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
                 Storage Usage
               </p>
               <div>
                 <div className="flex justify-between text-[10px] mb-1">
                   <span className="text-gray-400">Supabase ({storageStats.supabase.fileCount} files)</span>
                   <span className="text-white font-bold">~{storageStats.supabase.estimatedMB} / {storageStats.supabase.limitMB} MB</span>
                 </div>
                 <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                   <div className={`h-full rounded-full transition-all ${storageStats.supabase.percentUsed > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.max(storageStats.supabase.percentUsed, 2)}%` }} />
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-[10px] mb-1">
                   <span className="text-gray-400">Cloudflare R2 ({storageStats.r2.fileCount} files)</span>
                   <span className="text-white font-bold">~{storageStats.r2.estimatedMB} / {storageStats.r2.limitMB} MB</span>
                 </div>
                 <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                   <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${Math.max(storageStats.r2.percentUsed, 2)}%` }} />
                 </div>
               </div>
             </div>
           )}
        </div>

      </div>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="lg:col-span-9">
        <div className="bg-[#05050A]/70 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-7 md:p-10 shadow-2xl relative overflow-hidden min-h-[600px] slide-up">
           <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-40"></div>
           
           {/* TABS CONTENT */}
      {activeTab === 'upload' && (
        <form onSubmit={processUploadOrEmbed} className="space-y-6 fade-in">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Course Destination</label>
            <div className="flex gap-2 mb-3">
              <select className="flex-1 bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedLessonId(''); }} disabled={uploading}>
                <option value="">-- Choose Subject --</option>
                {localSubjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
              </select>
              <button type="button" onClick={handleCreateSubject} className="px-4 py-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl font-medium transition">+ New</button>
            </div>
            {selectedSubjectId && (
              <div className="flex gap-2 fade-in">
                <select className="flex-1 bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} disabled={uploading}>
                  <option value="">-- Choose Module --</option>
                  {activeLessons.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
                <button type="button" onClick={handleCreateLesson} className="px-4 py-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl font-medium transition">+ New</button>
              </div>
            )}
          </div>

          {selectedLessonId && (
            <div className="fade-in bg-white/5 p-4 rounded-xl space-y-4 border border-white/10">
              {/* Upload destination picker */}
              <div className="flex gap-2 border-b border-white/10 pb-4">
                <button type="button" onClick={() => setUploadTarget('r2')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition border ${uploadTarget === 'r2' ? 'bg-orange-500/10 text-orange-300 border-orange-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>
                  ☁️ Cloudflare R2
                </button>
                <button type="button" onClick={() => setUploadTarget('supabase')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition border ${uploadTarget === 'supabase' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>
                  📦 Supabase
                </button>
              </div>
              <div className="flex gap-4 border-b border-white/10 pb-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-white">
                  <input type="radio" checked={inputType === 'file'} onChange={() => setInputType('file')} className="text-indigo-500 focus:ring-indigo-500 bg-[#1A1A1E] border-gray-600" />
                  Cloud File Upload
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-white">
                  <input type="radio" checked={inputType === 'link'} onChange={() => setInputType('link')} className="text-indigo-500 focus:ring-indigo-500 bg-[#1A1A1E] border-gray-600" />
                  Embed Link (Vimeo)
                </label>
              </div>

              {inputType === 'file' ? (
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-dashed border-white/10 hover:border-indigo-400 bg-[#1A1A1E]'} rounded-xl cursor-pointer transition-all`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    {file ? <p className="text-sm font-semibold text-indigo-300">{file.name}</p> : <p className="text-sm text-gray-400"><span className="font-semibold text-white">Click to select file</span></p>}
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading}/>
                </label>
              ) : (
                <div className="space-y-3">
                  <input type="text" placeholder="Video Title (e.g. Chapter 1 Intro)" value={vimeoTitle} onChange={e => setVimeoTitle(e.target.value)} className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" disabled={uploading}/>
                  <input type="text" placeholder="https://vimeo.com/..." value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" disabled={uploading}/>
                </div>
              )}
            </div>
          )}

          {statusMessage && (
            <div className={`p-3 rounded-lg text-sm font-medium ${statusMessage.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-300'}`}>{statusMessage}</div>
          )}
          {uploading && progress > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2"><div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
          )}

          <button type="submit" disabled={!selectedLessonId || uploading} className="w-full bg-white text-black font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {uploading ? 'Processing...' : inputType === 'file' ? 'Upload File' : 'Embed Link'}
          </button>
        </form>
      )}

      {activeTab === 'manage' && (
        <div className="space-y-4 fade-in">
          <p className="text-sm text-gray-400 mb-4">Manage your entire course hierarchy interactively. Changes sync instantly.</p>
          {localSubjects.map(subject => (
            <div key={subject.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-white/5">
                <h3 className="text-lg font-bold text-white flex gap-2 items-center">{subject.icon} {subject.title}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleRename('subject', subject.id, subject.title)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition">✏️</button>
                  <button onClick={() => handleDelete('subject', subject.id, subject.title)} className="p-1.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition">🗑️</button>
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {subject.lessons?.map((lesson: any) => (
                  <div key={lesson.id} className="p-4 pl-8 bg-black/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-md font-semibold text-indigo-300">📂 {lesson.title}</h4>
                      <div className="flex gap-2">
                        <button onClick={() => handleRename('lesson', lesson.id, lesson.title)} className="text-xs px-2 py-1 text-gray-400 hover:bg-white/10 rounded transition">Rename</button>
                        <button onClick={() => handleDelete('lesson', lesson.id, lesson.title)} className="text-xs px-2 py-1 text-red-400 hover:bg-red-500/20 rounded transition">Delete</button>
                      </div>
                    </div>
                    {/* Render Files */}
                    <ul className="pl-6 space-y-1 mt-2">
                      {lesson.content?.map((item: any, idx: number) => {
                        if (item.type === 'folder') return null;
                        const isSelected = item.id && selectedItems.has(item.id);
                        return (
                           <li key={item.id || idx} className={`flex justify-between items-center text-sm py-1.5 px-2 rounded group transition-all ${isSelected ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'text-gray-400 hover:bg-white/5'}`}>
                             <div className="flex items-center gap-2 truncate">
                               {item.id && (
                                 <input
                                   type="checkbox"
                                   checked={!!isSelected}
                                   onChange={() => toggleSelectItem(item.id)}
                                   className="w-4 h-4 rounded border-gray-600 bg-transparent accent-red-500 cursor-pointer"
                                 />
                               )}
                               {item.type === 'vimeo' ? '🔗' : item.fileType === 'powerpoint' ? '📊' : '📄'} <span>{item.name}</span>
                             </div>
                             {item.id && (
                               <button onClick={() => handleDelete('item', item.id, item.name)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition">Delete</button>
                             )}
                           </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {(!subject.lessons || subject.lessons.length === 0) && (
                  <p className="px-8 py-4 text-sm text-gray-500 italic">No lessons in this subject.</p>
                )}
              </div>
            </div>
          ))}

          {/* Floating Batch Delete Action Bar */}
          {selectedItems.size > 0 && (
            <div className="sticky bottom-4 mt-6 bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_-5px_30px_rgba(239,68,68,0.2)] z-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 font-black text-sm">{selectedItems.size}</div>
                <p className="text-red-300 text-sm font-bold">item{selectedItems.size > 1 ? 's' : ''} selected</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelectedItems(new Set())} className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition font-medium">Cancel</button>
                <button onClick={handleBatchDelete} className="text-sm text-white bg-red-500/80 hover:bg-red-500 px-5 py-2 rounded-lg transition font-bold shadow-lg">Delete All</button>
              </div>
            </div>
          )}

          {localSubjects.length === 0 && <p className="text-gray-500 text-center py-10">No subjects exist yet.</p>}
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="space-y-4 fade-in">
          <p className="text-sm text-gray-400 mb-4">Send a global announcement banner to all students directly on their dashboard.</p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <input 
              type="text" 
              placeholder="e.g. Midterm Exams starting Next Friday! 📚"
              className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
              id="broadcast-msg"
            />
            <div className="flex gap-3">
              <button onClick={async () => {
                const msg = (document.getElementById('broadcast-msg') as HTMLInputElement).value;
                if (!msg) return alert('Enter a message first');
                await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, is_active: true }) });
                alert('Broadcast pushed globally!');
                (document.getElementById('broadcast-msg') as HTMLInputElement).value = '';
              }} className="bg-indigo-500 hover:bg-indigo-600 px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition">Publish Banner</button>
              
              <button onClick={async () => {
                await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false }) });
                alert('All banners deactivated!');
              }} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition">Clear Banner</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="space-y-4 fade-in">
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <p className="text-sm text-gray-400">Read and reply to direct queries from your students asynchronously. Replies are securely routed to the student's dashboard.</p>
            <button 
              onClick={async () => {
                setLoadingMessages(true);
                const res = await fetch('/api/messages');
                if (res.ok) {
                  const { messages } = await res.json();
                  setMessages(messages || []);
                }
                setLoadingMessages(false);
              }}
              className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium transition shrink-0"
            >
              Refresh Inbox
            </button>
          </div>

          <div className="space-y-4">
            {loadingMessages && <p className="text-gray-500 text-sm text-center py-10">Decrypting inbound transmissions...</p>}
            {!loadingMessages && messages.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-10 bg-white/5 rounded-xl border border-white/10">No messages in your active queue.</p>
            )}
            {!loadingMessages && messages.map(msg => (
              <div key={msg.id} className={`p-5 rounded-xl border transition-all duration-300 ${msg.is_read ? 'bg-white/5 border-white/10 opacity-75' : 'bg-[#1A1A1E] border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-white flex items-center gap-2 text-lg">
                       {!msg.is_read && <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>}
                       {msg.subject}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-2">
                       From: <span className="text-indigo-300 font-medium">{msg.sender_email}</span> 
                       <span className="text-gray-600">•</span> 
                       {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!msg.is_read && (
                    <button 
                      onClick={async () => {
                        await fetch('/api/messages', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message_id: msg.id, is_read: true })});
                        setMessages(prev => prev.map(m => m.id === msg.id ? {...m, is_read: true} : m));
                      }}
                      className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
                
                <div className="text-sm text-gray-200 bg-black/30 border border-white/5 p-4 rounded-xl mb-4 whitespace-pre-wrap leading-relaxed">
                  {msg.body}
                </div>

                {replyingTo === msg.id ? (
                  <div className="space-y-3 mt-4 border-t border-white/10 pt-5 fade-in">
                     <textarea 
                       placeholder="Draft your secure reply..."
                       value={replyText}
                       onChange={e => setReplyText(e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[120px] resize-y"
                     />
                     <div className="flex gap-3 justify-end items-center">
                       <button onClick={() => setReplyingTo(null)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition">Cancel</button>
                       <button 
                         onClick={async () => {
                           if (!replyText) return;
                           const res = await fetch('/api/messages', {
                             method: 'POST',
                             headers: {'Content-Type': 'application/json'},
                             body: JSON.stringify({ receiver_email: msg.sender_email, subject: `Re: ${msg.subject}`, body: replyText })
                           });
                           if (res.ok) {
                             alert('Reply securely dispatched to the student!');
                             setReplyingTo(null);
                             setReplyText('');
                             fetch('/api/messages', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message_id: msg.id, is_read: true })});
                             setMessages(prev => prev.map(m => m.id === msg.id ? {...m, is_read: true} : m));
                           }
                         }}
                         className="px-6 py-2 text-sm font-bold bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition shadow-lg hover:shadow-indigo-500/20"
                       >
                         Dispatch Reply
                       </button>
                     </div>
                  </div>
                ) : (
                  <button onClick={() => { setReplyingTo(msg.id); setReplyText(''); }} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 -ml-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    Quick Reply
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'telemetry' && canSeeGodMode && (
        <ActiveSessionsFeed />
      )}
      
      {activeTab === 'team' && (
        <div className="space-y-6 fade-in">
          <p className="text-sm text-gray-400 mb-2">Grant or explicitly revoke Administrative dashboard permissions to verified Google accounts.</p>
          
          {/* Add Teacher Form */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Invite Teacher
            </h3>
            <div className="flex gap-3">
              <input 
                type="email" 
                placeholder="teacher@school.edu"
                className="flex-1 bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newTeacherEmail}
                onChange={e => setNewTeacherEmail(e.target.value)}
                disabled={uploading}
              />
              <button 
                onClick={async () => {
                   if (!newTeacherEmail) return alert('Enter an email address');
                   setUploading(true);
                   try {
                     const res = await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: newTeacherEmail })});
                     if (!res.ok) throw new Error(await res.text());
                     const { role } = await res.json();
                     setAllRoles(prev => [...prev.filter(r => r.email !== role.email), role]);
                     setNewTeacherEmail('');
                     alert('Teacher permission granted! They can now log in and access this dashboard.');
                   } catch(err: any) { alert(err.message); }
                   setUploading(false);
                }}
                disabled={uploading}
                className="bg-indigo-500 hover:bg-indigo-600 px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
              >
                Grant Access
              </button>
            </div>

            {/* Recent Logins Auto-Fill Widget */}
            {activeLogins && activeLogins.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">Recent Platform Logins (Click to auto-fill):</p>
                <div className="flex flex-wrap gap-2">
                  {activeLogins.filter(email => email).map(email => (
                    <button 
                      key={email}
                      type="button"
                      onClick={() => setNewTeacherEmail(email)}
                      className="bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30 border border-white/10 rounded-full px-3 py-1.5 text-xs text-gray-300 transition duration-200"
                    >
                      {email}
                    </button>
                  ))}
                  {activeLogins.length === 0 && (
                    <span className="text-xs text-gray-500 italic">No new students have logged into the platform yet since activation.</span>
                  )}
                </div>
                {storageStats.supabase.fileCount > 0 && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Migrate all ${storageStats.supabase.fileCount} Supabase files to Cloudflare R2? This may take a minute.`)) return;
                      setMigrating(true);
                      try {
                        const res = await fetch('/api/admin/migrate-to-r2', { method: 'POST' });
                        const data = await res.json();
                        const errInfo = data.errors?.length ? `\n\nErrors:\n${data.errors.join('\n')}` : '';
                        const urlInfo = data.sampleUrls?.length ? `\n\nSample URLs:\n${data.sampleUrls.join('\n')}` : '';
                        alert(`${data.message}${errInfo}${urlInfo}`);
                        fetch('/api/admin/storage-stats').then(r => r.json()).then(setStorageStats).catch(() => {});
                      } catch (err: any) { alert(`Migration error: ${err.message}`); }
                      setMigrating(false);
                    }}
                    disabled={migrating}
                    className={`w-full mt-2 py-2 rounded-xl text-[11px] font-bold border transition ${migrating ? 'bg-orange-500/5 text-orange-300/50 border-orange-500/10 cursor-wait' : 'bg-orange-500/10 text-orange-300 border-orange-500/20 hover:bg-orange-500/20'}`}
                  >
                    {migrating ? 'Migrating...' : '⚡ Migrate All → R2'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Instructors Roster */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mt-8 shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 bg-black/40">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
                Active Instructors ({teamRoles.length})
              </h3>
            </div>
            <ul className="divide-y divide-white/5 bg-black/20">
              {teamRoles.map(role => (
                <li key={role.email} className="px-6 py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-white/5 transition duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-lg shrink-0 shadow-inner">
                       {role.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium break-all">{role.email}</p>
                      <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-black mt-1 drop-shadow-md">{role.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canSeeGodMode && role.role !== 'superadmin' && (
                       <button 
                         onClick={async () => {
                           if (!confirm(`Upgrade ${role.email} to Super Admin (Grant God Mode Access)?`)) return;
                           try {
                             const res = await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: role.email, overrideRole: 'superadmin' })});
                             if (!res.ok) throw new Error(await res.text());
                             setAllRoles((prev: any[]) => prev.map(r => r.email === role.email ? { ...r, role: 'superadmin' } : r));
                           } catch(err: any) { alert(err.message); }
                         }}
                         className="text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 px-3 py-2 rounded-lg text-xs font-bold transition border border-green-500/20"
                       >
                         + God Mode
                       </button>
                    )}
                    <button 
                       onClick={async () => {
                         if (!confirm(`Revoke teaching access for ${role.email}?`)) return;
                         try {
                           const res = await fetch('/api/admin/roles', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: role.email })});
                           if (!res.ok) throw new Error(await res.text());
                           setAllRoles((prev: any[]) => prev.map(r => r.email === role.email ? { ...r, role: 'student' } : r));
                         } catch(err: any) { alert(err.message); }
                       }}
                       className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg text-xs font-bold transition border border-red-500/20"
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
              {teamRoles.length === 0 && (
                <li className="px-6 py-8 text-center text-gray-500 text-sm italic">No external teachers have been granted access yet.</li>
              )}
            </ul>
          </div>

          {/* Registered Students Roster */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mt-8 shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 bg-black/40">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                Registered Students ({activeLogins.length})
              </h3>
            </div>
            {activeLogins.length === 0 ? (
               <p className="px-6 py-8 text-sm text-gray-400 italic text-center bg-black/20">No students have signed in to the platform yet.</p>
            ) : (
               <ul className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar bg-black/20">
                 {allRoles.filter(r => r.role === 'student').map(student => (
                   <li key={student.email} className="px-6 py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-white/5 transition duration-300 group">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 font-bold shrink-0">
                          {student.email.charAt(0).toUpperCase()}
                       </div>
                       <div>
                         <p className="text-white font-medium break-all">{student.email}</p>
                         <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Student</p>
                       </div>
                     </div>
                     <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <button onClick={() => { navigator.clipboard.writeText(student.email); alert('Student Email Copied to Clipboard!'); }} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition">
                         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                         Copy Email
                       </button>
                       <button onClick={async () => {
                         if (!confirm(`WARNING: Are you sure you want to elevate ${student.email} to an Instructor? They will gain access to this Admin Dashboard.`)) return;
                         setUploading(true);
                         try {
                           const res = await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: student.email })});
                           if (!res.ok) throw new Error(await res.text());
                           const { role } = await res.json();
                           setAllRoles(prev => [...prev.filter(r => r.email !== role.email), role]);
                           alert('SUCCESS: Teacher permission granted!');
                         } catch(err: any) { alert(err.message); }
                         setUploading(false);
                       }} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg text-xs font-bold transition duration-300 shadow-[inset_0_0_10px_rgba(99,102,241,0.05)] hover:shadow-indigo-500/20">
                         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                         Elevate
                       </button>
                       <button onClick={async () => {
                         if (!confirm(`BAN ${student.email}? They will be immediately locked out of the platform.`)) return;
                         try {
                           const res = await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: student.email, overrideRole: 'banned' })});
                           if (!res.ok) throw new Error(await res.text());
                           setAllRoles(prev => prev.map(r => r.email === student.email ? { ...r, role: 'banned' } : r));
                         } catch(err: any) { alert(err.message); }
                       }} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition">
                         🚫 Ban
                       </button>
                     </div>
                   </li>
                 ))}
               </ul>
            )}
          </div>

          {/* Banned Students */}
          {allRoles.filter(r => r.role === 'banned').length > 0 && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl overflow-hidden mt-8">
              <div className="px-6 py-4 border-b border-red-500/10 bg-red-500/5">
                <h3 className="text-red-400 font-bold flex items-center gap-2">
                  🚫 Banned Students ({allRoles.filter(r => r.role === 'banned').length})
                </h3>
              </div>
              <ul className="divide-y divide-red-500/5 bg-black/20">
                {allRoles.filter(r => r.role === 'banned').map(banned => (
                  <li key={banned.email} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm">{banned.email.charAt(0).toUpperCase()}</div>
                      <span className="text-sm text-gray-300">{banned.email}</span>
                    </div>
                    <button onClick={async () => {
                      if (!confirm(`Unban ${banned.email}? They will regain access to the platform.`)) return;
                      try {
                        const res = await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: banned.email, overrideRole: 'student' })});
                        if (!res.ok) throw new Error(await res.text());
                        setAllRoles(prev => prev.map(r => r.email === banned.email ? { ...r, role: 'student' } : r));
                      } catch(err: any) { alert(err.message); }
                    }} className="text-xs text-green-400 bg-green-500/10 hover:bg-green-500/20 px-4 py-2 rounded-lg font-bold border border-green-500/20 transition">
                      ✅ Unban
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
