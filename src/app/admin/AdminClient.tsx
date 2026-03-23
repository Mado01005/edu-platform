'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ActiveSessionsFeed from '@/components/ActiveSessionsFeed';
import { SubjectMeta } from '@/lib/content';

interface AdminClientProps {
  subjects: SubjectMeta[];
  initialRoles: any[];
  userEmail: string;
}

export default function AdminClient({ subjects, initialRoles, userEmail }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'broadcast' | 'inbox' | 'team' | 'telemetry'>('upload');
  const [localSubjects, setLocalSubjects] = useState<SubjectMeta[]>(subjects);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<'file' | 'link'>('file');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [vimeoTitle, setVimeoTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [allRoles, setAllRoles] = useState<any[]>(initialRoles);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [activeLogins, setActiveLogins] = useState<string[]>([]);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [uploadTarget, setUploadTarget] = useState<'supabase' | 'r2'>('r2');
  const [migrating, setMigrating] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Messaging state
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [activeChatEmail, setActiveChatEmail] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState('');

  const supabase = createClientComponentClient();
  const ADMIN_EMAIL = 'abdallahsaad813@gmail.com';

  const refreshPageData = useCallback(async () => {
    const [subRes, rolesRes, logRes, statRes, msgRes] = await Promise.all([
      fetch('/api/admin/subjects'),
      fetch('/api/admin/roles'),
      fetch('/api/admin/active-logins'),
      fetch('/api/admin/storage-stats'),
      fetch('/api/messages')
    ]);

    if (subRes.ok) setLocalSubjects(await subRes.json());
    if (rolesRes.ok) setAllRoles(await rolesRes.json());
    if (logRes.ok) {
      const logs = await logRes.json();
      setActiveLogins(Array.from(new Set(logs.map((l: any) => l.user_email))).filter(Boolean) as string[]);
    }
    if (statRes.ok) setStorageStats(await statRes.json());
    if (msgRes.ok) {
       const data = await msgRes.json();
       setMessages(data.messages || []);
    }
  }, []);

  useEffect(() => {
    refreshPageData();
    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => refreshPageData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshPageData, supabase]);

  const activeLessons = localSubjects.find(s => s.id === selectedSubjectId)?.lessons || [];
  const teamRoles = allRoles.filter(r => r.role === 'teacher' || r.role === 'superadmin');
  const canSeeGodMode = allRoles.some(r => r.role === 'superadmin');

  const processUploadOrEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId) return alert('Select a module first');
    setUploading(true);
    setStatusMessage('Preparing transmission...');
    setProgress(10);

    try {
      if (inputType === 'file' && file) {
        setProgress(30);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('lessonId', selectedLessonId);
        formData.append('target', uploadTarget);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Upload failed');
        }
        
        setStatusMessage('Success: File stored and linked!');
        setFile(null);
      } else if (inputType === 'link' && vimeoUrl) {
        if (!vimeoTitle) throw new Error('Title required for link');
        const res = await fetch('/api/admin/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: selectedLessonId,
            type: 'vimeo',
            name: vimeoTitle,
            url: vimeoUrl
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
      if (res.ok) refreshPageData();
    } catch(err: any) { alert(err.message); }
  };

  const handleCreateLesson = async () => {
    const title = prompt('New Module Title:');
    if (!title || !selectedSubjectId) return;
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubjectId, title, type: 'lesson' })
      });
      if (res.ok) refreshPageData();
    } catch(err: any) { alert(err.message); }
  };

  const handleDelete = async (type: 'subject' | 'lesson' | 'item', id: string, name: string) => {
    if (!confirm(`Permanently delete ${type} "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/${type === 'subject' ? 'subjects' : 'content'}?id=${id}`, { method: 'DELETE' });
      if (res.ok) refreshPageData();
      else throw new Error('Deletion failed');
    } catch(err: any) { alert(err.message); }
  };

  const handleRename = async (type: 'subject' | 'lesson', id: string, oldName: string) => {
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
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

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItems);
    if (id && next.has(id)) next.delete(id);
    else if (id) next.add(id);
    setSelectedItems(next);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <div className="lg:col-span-3 space-y-4 sticky top-24">
        {(['upload', 'manage', 'broadcast', 'inbox', 'team', 'telemetry'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 border ${
              activeTab === tab 
                ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.15)] scale-[1.02]' 
                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <span className="text-lg">
              {tab === 'upload' && '⚡'}
              {tab === 'manage' && '📂'}
              {tab === 'broadcast' && '📢'}
              {tab === 'inbox' && '📥'}
              {tab === 'team' && '👥'}
              {tab === 'telemetry' && '🌐'}
            </span>
            {tab}
          </button>
        ))}

        {storageStats && (
          <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Environment Stats</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px]">
                 <span className="text-gray-500 font-bold">R2 STORAGE</span>
                 <span className="text-white font-black">{(storageStats.r2.totalSize / (1024 * 1024)).toFixed(1)}MB</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                 <span className="text-gray-500 font-bold">SUPABASE</span>
                 <span className="text-white font-black">{(storageStats.supabase.totalSize / (1024 * 1024)).toFixed(1)}MB</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="lg:col-span-9">
        <div className="bg-[#05050A]/70 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden min-h-[700px]">
           <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-40"></div>
           
           {/* TABS CONTENT */}
           {activeTab === 'upload' && (
             <form onSubmit={processUploadOrEmbed} className="space-y-8 fade-in">
               <div className="space-y-4">
                 <h2 className="text-2xl font-black text-white">Encrypted Deployment</h2>
                 <p className="text-sm text-gray-400">Select a course destination and upload your encrypted assets to the cloud.</p>
               </div>

               <div className="space-y-4">
                 <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">Destination Hierarchy</label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select className="bg-[#1A1A1E] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedLessonId(''); }} disabled={uploading}>
                      <option value="">-- Select Subject --</option>
                      {localSubjects.map(s => <option key={s.id} value={s.id!}>{s.icon} {s.title}</option>)}
                    </select>
                    {selectedSubjectId && (
                      <select className="bg-[#1A1A1E] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all fade-in" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} disabled={uploading}>
                        <option value="">-- Select Module --</option>
                        {activeLessons.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    )}
                 </div>
                 <div className="flex gap-4">
                    <button type="button" onClick={handleCreateSubject} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition">+ New Subject</button>
                    {selectedSubjectId && <button type="button" onClick={handleCreateLesson} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition">+ New Module</button>}
                 </div>
               </div>

               {selectedLessonId && (
                 <div className="fade-in bg-white/5 p-8 rounded-3xl space-y-6 border border-white/10">
                   <div className="flex gap-4 mb-2">
                     <button type="button" onClick={() => setUploadTarget('r2')} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${uploadTarget === 'r2' ? 'bg-orange-500/10 text-orange-300 border-orange-500/30' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>☁️ Cloudflare R2</button>
                     <button type="button" onClick={() => setUploadTarget('supabase')} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${uploadTarget === 'supabase' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>📦 Supabase</button>
                   </div>
                   
                   <div className="flex gap-6 border-b border-white/10 pb-6">
                     <label className="flex items-center gap-3 cursor-pointer text-xs font-black uppercase tracking-widest text-white">
                       <input type="radio" checked={inputType === 'file'} onChange={() => setInputType('file')} className="accent-indigo-500 w-4 h-4" /> File Upload
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer text-xs font-black uppercase tracking-widest text-white">
                       <input type="radio" checked={inputType === 'link'} onChange={() => setInputType('link')} className="accent-indigo-500 w-4 h-4" /> Embed Link
                     </label>
                   </div>

                   {inputType === 'file' ? (
                     <label className={`flex flex-col items-center justify-center w-full h-40 border-2 ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-dashed border-white/10 hover:border-indigo-500/40 bg-black/40'} rounded-3xl cursor-pointer transition-all`}>
                       <div className="text-center px-4">
                         <svg className="w-10 h-10 mb-4 mx-auto text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                         {file ? <p className="text-sm font-bold text-indigo-300">{file.name}</p> : <p className="text-xs text-gray-400 uppercase tracking-widest font-black">Drop asset or click to browse</p>}
                       </div>
                       <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading}/>
                     </label>
                   ) : (
                     <div className="space-y-4">
                       <input type="text" placeholder="Entry Title (e.g. Chapter 1 Video)" value={vimeoTitle} onChange={e => setVimeoTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                       <input type="text" placeholder="https://vimeo.com/..." value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                     </div>
                   )}
                 </div>
               )}

               {statusMessage && (
                 <div className={`p-5 rounded-2xl text-xs font-black uppercase tracking-widest ${statusMessage.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'} border ${statusMessage.includes('Error') ? 'border-red-500/20' : 'border-green-500/20'}`}>
                   {statusMessage}
                 </div>
               )}

               <button type="submit" disabled={!selectedLessonId || uploading} className="w-full bg-white text-black font-black py-5 px-8 rounded-2xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 uppercase tracking-[0.2em] text-xs shadow-2xl">
                 {uploading ? 'Processing Deployment...' : 'Execute Transaction'}
               </button>
             </form>
           )}

           {activeTab === 'manage' && (
             <div className="space-y-6 fade-in">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-black text-white">Hierarchy Management</h2>
                 <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Manage Subjects & Modules</p>
               </div>
               
               {localSubjects.map(subject => (
                 <div key={subject.id} className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden transition-all duration-300 hover:border-white/20">
                   <div className="flex items-center justify-between p-6 bg-white/5 border-b border-white/5">
                     <h3 className="text-lg font-black text-white flex gap-3 items-center">{subject.icon} {subject.title}</h3>
                     <div className="flex gap-2">
                        <button onClick={() => handleRename('subject', subject.id!, subject.title)} className="p-2.5 hover:bg-white/10 rounded-xl transition text-gray-400 hover:text-white">✏️</button>
                        <button onClick={() => handleDelete('subject', subject.id!, subject.title)} className="p-2.5 hover:bg-red-500/10 rounded-xl transition text-red-500">🗑️</button>
                     </div>
                   </div>
                   <div className="divide-y divide-white/5 shadow-inner">
                     {subject.lessons?.map((lesson: any) => (
                       <div key={lesson.id} className="p-6 pl-12 bg-black/20 group">
                         <div className="flex items-center justify-between mb-4">
                           <h4 className="text-md font-bold text-indigo-300 group-hover:text-white transition-colors">📂 {lesson.title}</h4>
                           <div className="flex gap-2">
                             <button onClick={() => handleRename('lesson', lesson.id!, lesson.title)} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 border border-white/5 transition">Rename</button>
                             <button onClick={() => handleDelete('lesson', lesson.id!, lesson.title)} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-500/5 text-red-500 rounded-lg hover:bg-red-500/10 border border-red-500/10 transition">Delete</button>
                           </div>
                         </div>
                         <ul className="space-y-2">
                           {lesson.content?.map((item: any) => (
                             <li key={item.id} className="flex justify-between items-center text-xs py-3 px-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5 group/item">
                               <div className="flex items-center gap-4">
                                 <input type="checkbox" checked={selectedItems.size > 0 && selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="accent-red-500 w-4 h-4 rounded-lg" />
                                 <span className="text-gray-500">{item.type === 'vimeo' ? '🔗' : '📄'}</span>
                                 <span className="font-bold text-gray-300">{item.name}</span>
                               </div>
                               <button onClick={() => handleDelete('item', item.id, item.name)} className="opacity-0 group-item-hover:opacity-100 text-red-500 hover:scale-125 transition">🗑️</button>
                             </li>
                           ))}
                         </ul>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}

               {selectedItems.size > 0 && (
                 <div className="sticky bottom-8 bg-red-500/10 backdrop-blur-2xl border border-red-500/30 p-6 rounded-3xl flex items-center justify-between shadow-[0_20px_50px_rgba(239,68,68,0.2)] z-50">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center font-black text-xl">!</div>
                      <div>
                        <p className="font-black text-white uppercase tracking-widest text-xs">{selectedItems.size} items flagged</p>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Staged for permanent deletion</p>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setSelectedItems(new Set())} className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-4 py-2 hover:text-white transition">Cancel</button>
                      <button onClick={handleBatchDelete} className="bg-red-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20">Wipe Staged Assets</button>
                   </div>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'broadcast' && (
             <div className="space-y-8 fade-in flex flex-col items-center justify-center min-h-[500px]">
               <div className="w-full max-w-2xl bg-white/5 border border-white/10 p-12 rounded-[3rem] text-center space-y-8">
                 <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border border-indigo-500/30">📢</div>
                 <div className="space-y-4">
                   <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Global Announcement</h2>
                   <p className="text-gray-400 text-sm">Targeted transmissions sent directly to all student dashboards.</p>
                 </div>
                 <input id="broadcast-msg" type="text" placeholder="Enter alert frequency..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm text-center font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-700" />
                 <div className="flex gap-4 pt-4">
                   <button onClick={async () => {
                     const msg = (document.getElementById('broadcast-msg') as HTMLInputElement).value;
                     if (!msg) return;
                     await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, is_active: true }) });
                     alert('Broadcast Pulse Sent!');
                     (document.getElementById('broadcast-msg') as HTMLInputElement).value = '';
                   }} className="flex-1 bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 transition-all">Send Alert</button>
                   <button onClick={async () => {
                     await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false }) });
                     alert('Emergency Broadcast Ceased');
                   }} className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">End Transmission</button>
                 </div>
               </div>
             </div>
           )}

           {activeTab === 'inbox' && (
             <div className="space-y-8 fade-in">
               <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Support Queue</h2>
                 <button onClick={refreshPageData} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Refresh Sync</button>
               </div>
               <div className="space-y-6">
                 {messages.length === 0 && (
                   <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] space-y-4">
                      <div className="text-6xl grayscale opacity-20">📥</div>
                      <p className="text-gray-600 font-bold uppercase tracking-[0.2em] text-xs">No active inquiries in buffer.</p>
                   </div>
                 )}
                 {messages.map(msg => (
                   <div key={msg.id} className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${msg.is_read ? 'bg-white/5 border-white/5 opacity-50 grayscale' : 'bg-white/[0.03] border-indigo-500/20 shadow-2xl hover:border-indigo-500/40'}`}>
                     <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                             {!msg.is_read && <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>}
                             <h3 className="font-black text-xl text-white tracking-tight">{msg.subject}</h3>
                          </div>
                          <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{msg.sender_email} <span className="text-gray-700 mx-2">•</span> {new Date(msg.created_at).toLocaleString()}</p>
                        </div>
                        {!msg.is_read && (
                          <button onClick={async () => {
                            await fetch('/api/messages', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message_id: msg.id, is_read: true })});
                            refreshPageData();
                          }} className="text-[9px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all">Acknowledge</button>
                        )}
                     </div>
                     <div className="bg-black/50 p-6 rounded-2xl border border-white/5 text-gray-300 leading-relaxed text-sm mb-6 whitespace-pre-wrap selection:bg-indigo-500 selection:text-white font-medium">{msg.body}</div>
                     {replyingTo === msg.id ? (
                       <div className="space-y-4 fade-in pt-4 border-t border-white/5">
                         <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Draft secure response uplink..." className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm min-h-[150px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white" />
                         <div className="flex justify-end gap-4">
                           <button onClick={() => setReplyingTo(null)} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition">Cancel</button>
                           <button onClick={async () => {
                             if (!replyText) return;
                             const res = await fetch('/api/messages', {
                               method: 'POST',
                               headers: {'Content-Type': 'application/json'},
                               body: JSON.stringify({ receiver_email: msg.sender_email, subject: `RE: ${msg.subject}`, body: replyText })
                             });
                             if (res.ok) {
                               setReplyingTo(null);
                               setReplyText('');
                               refreshPageData();
                             }
                           }} className="bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">Transmit Reply</button>
                         </div>
                       </div>
                     ) : (
                       <button onClick={() => setReplyingTo(msg.id)} className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-all flex items-center gap-3 bg-indigo-500/5 px-4 py-2 rounded-xl hover:bg-indigo-500/10">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                         Establish Direct Link
                       </button>
                     )}
                   </div>
                 ))}
               </div>
             </div>
           )}

           {activeTab === 'team' && (
             <div className="space-y-10 fade-in">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Left Role Form */}
                  <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-8">
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Teacher Access</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">Elevate student accounts to administrative status using their verified Google emails.</p>
                    <div className="space-y-4">
                      <input value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="Personnel primary email..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white text-sm" />
                      <button onClick={async () => {
                        if (!newTeacherEmail) return;
                        await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: newTeacherEmail })});
                        setNewTeacherEmail('');
                        refreshPageData();
                        alert('Role Privileges Updated');
                      }} className="w-full bg-indigo-500 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-98 transition-all">Initialize Elevation</button>
                    </div>
                  </div>

                  {/* Right Instruction Block */}
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-10 rounded-[3rem] space-y-6">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-xl">ℹ️</div>
                    <h3 className="font-bold text-lg text-white">Access Protocol</h3>
                    <ul className="space-y-4 text-xs text-indigo-300 font-medium leading-relaxed">
                      <li className="flex gap-3"><span className="text-indigo-500">01</span> User must log in at least once via Google to initialize their metadata.</li>
                      <li className="flex gap-3"><span className="text-indigo-500">02</span> Elevating to "Teacher" grants full upload & control access.</li>
                      <li className="flex gap-3"><span className="text-indigo-500">03</span> "Superadmin" status can only be set manually in DB for safety.</li>
                    </ul>
                  </div>
               </div>

               {/* Registered Personnel List */}
               <div className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden">
                 <div className="px-10 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">Database Personnel Hierarchy</h3>
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black uppercase text-gray-600">{allRoles.length} Records</span>
                 </div>
                 <ul className="divide-y divide-white/5">
                   {allRoles.filter(r => r.role !== 'student').map(b => (
                     <li key={b.email} className="px-10 py-6 flex items-center justify-between hover:bg-white/5 transition-all duration-300 group">
                        <div className="flex items-center gap-5">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black border transition-all ${b.role === 'superadmin' ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                             {b.email.charAt(0).toUpperCase()}
                           </div>
                           <div>
                             <p className="font-bold text-gray-100 text-sm">{b.email}</p>
                             <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${b.role === 'superadmin' ? 'text-indigo-400' : b.role === 'banned' ? 'text-red-500' : 'text-gray-500'}`}>{b.role}</p>
                           </div>
                        </div>
                        <div className="flex gap-3">
                           {b.role !== 'superadmin' && (
                             <button onClick={async () => {
                               const nextRole = b.role === 'banned' ? 'student' : 'banned';
                               await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: b.email, overrideRole: nextRole })});
                               refreshPageData();
                             }} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${b.role === 'banned' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500 opactiy-0 group-hover:opacity-100'}`}>
                               {b.role === 'banned' ? 'Restore' : 'Revoke'}
                             </button>
                           )}
                        </div>
                     </li>
                   ))}
                   
                   {/* Student Contacts with Direct Chat */}
                   <div className="px-10 py-6 bg-indigo-500/[0.02] border-t border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/50 mb-6">Student Activity Roster</p>
                      <div className="grid grid-cols-1 gap-4">
                        {activeLogins.map(email => (
                          <div key={email} className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden transition-all hover:border-indigo-500/20">
                            <li className="px-8 py-5 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-gray-500">{email.charAt(0).toUpperCase()}</div>
                                <span className="text-sm font-bold text-gray-300">{email}</span>
                              </div>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => setActiveChatEmail(activeChatEmail === email ? null : email)}
                                  className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeChatEmail === email ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'}`}
                                >
                                  {activeChatEmail === email ? 'Close Dossier' : 'Open Dossier'}
                                </button>
                                <button onClick={async () => {
                                  if (!confirm(`Ban ${email}?`)) return;
                                  await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email, overrideRole: 'banned' })});
                                  refreshPageData();
                                }} className="p-3 hover:bg-red-500/20 rounded-2xl text-red-500 transition-all opacity-20 hover:opacity-100">🚫</button>
                              </div>
                            </li>
                            {activeChatEmail === email && (
                              <div className="px-8 pb-8 fade-in">
                                {renderDossierChat(email)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                   </div>
                 </ul>
               </div>
             </div>
           )}

           {activeTab === 'telemetry' && (
              <div className="fade-in bg-white/5 rounded-[3rem] overflow-hidden">
                <div className="p-10 border-b border-white/5">
                   <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Live Telemetry</h2>
                   <p className="text-sm text-gray-500">Real-time stream of all mission-critical interactions across the platform architecture.</p>
                </div>
                <ActiveSessionsFeed />
              </div>
           )}
        </div>
      </div>
    </div>
  );

  function renderDossierChat(studentEmail: string) {
    const chatMessages = messages.filter(m => m.sender_email === studentEmail || m.receiver_email === studentEmail).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
      <div className="flex flex-col h-[450px] bg-black/80 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl mt-4">
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.05),transparent)]">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale space-y-4">
              <div className="text-5xl">📡</div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">No historical signal logs.</p>
            </div>
          )}
          {chatMessages.map(m => (
            <div key={m.id} className={`flex ${m.sender_email === studentEmail ? 'justify-start' : 'justify-end'}`}>
               <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-4 text-xs leading-relaxed shadow-xl ${m.sender_email === studentEmail ? 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-none' : 'bg-indigo-600 text-white shadow-indigo-500/20 rounded-tr-none'}`}>
                 <p>{m.body}</p>
                 <div className="mt-3 opacity-40 text-[9px] font-black uppercase tracking-tighter border-t border-white/10 pt-2 flex justify-between items-center italic">
                   <span>{m.sender_email === studentEmail ? 'INBOUND' : 'OUTBOUND'}</span>
                   <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                 </div>
               </div>
            </div>
          ))}
        </div>
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            if (!adminReply.trim()) return;
            const res = await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ receiver_email: studentEmail, subject: 'Direct Command Response', body: adminReply })
            });
            if (res.ok) {
              setMessages(prev => [{ id: Math.random().toString(), sender_email: ADMIN_EMAIL, receiver_email: studentEmail, body: adminReply, created_at: new Date().toISOString() }, ...prev]);
              setAdminReply('');
              refreshPageData();
            }
          }}
          className="p-5 border-t border-white/10 bg-white/5 flex gap-4 backdrop-blur-md"
        >
          <input 
            type="text" 
            placeholder="Transmit secure feedback..." 
            value={adminReply}
            onChange={e => setAdminReply(e.target.value)}
            className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition shadow-lg shadow-indigo-600/30 active:scale-95">Send</button>
        </form>
      </div>
    );
  }
}
