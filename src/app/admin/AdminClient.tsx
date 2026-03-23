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
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER NAVIGATION HUD */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -z-10"></div>
           <div className="flex gap-6 items-center">
             <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-4xl shadow-inner border border-indigo-500/30">⚡</div>
             <div>
               <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Command Center</h1>
               <div className="flex items-center gap-4 mt-1">
                 <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">Operational HUD</p>
                 {storageStats && (
                   <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                     <span className="text-[10px] font-bold text-gray-500 uppercase">R2: <span className="text-white">{storageStats.r2.estimatedMB}MB</span></span>
                     <span className="text-[10px] font-bold text-gray-500 uppercase">SB: <span className="text-white">{storageStats.supabase.estimatedMB}MB</span></span>
                   </div>
                 )}
               </div>
             </div>
           </div>
           <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide w-full xl:w-auto">
             {(['upload', 'manage', 'broadcast', 'inbox', 'team', 'telemetry'] as const).map((tab) => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 border whitespace-nowrap ${activeTab === tab ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105' : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'}`}
               >
                 {tab}
               </button>
             ))}
           </div>
        </div>

        {/* MAIN DISPLAY MODULE */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
           <div className="bg-[#05050A]/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden min-h-[750px] w-full">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-40"></div>
              
              {activeTab === 'telemetry' ? (
                <div className="fade-in">
                  <div className="mb-10 text-center xl:text-left">
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-4">Live Telemetry</h2>
                    <p className="text-sm text-gray-500 font-medium">Full-sector scan of active student activity and platform interactions.</p>
                  </div>
                  <ActiveSessionsFeed />
                </div>
              ) : (
                <div className="max-w-5xl mx-auto py-4">
                  
                  {/* UPLOAD TAB */}
                  {activeTab === 'upload' && (
                    <form onSubmit={processUploadOrEmbed} className="space-y-10 fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                           <h3 className="text-xl font-black text-white uppercase tracking-tight">Deploy Assets</h3>
                           <p className="text-sm text-gray-400 leading-relaxed font-medium">Select your target subject and module to begin encrypted cloud deployment.</p>
                         </div>
                         <div className="space-y-4 bg-white/5 p-6 rounded-[2rem] border border-white/10">
                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Target Hierarchy</label>
                            <div className="space-y-3">
                              <select className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedLessonId(''); }} disabled={uploading}>
                                <option value="">-- Choose Subject --</option>
                                {localSubjects.map(s => <option key={s.id} value={s.id!}>{s.icon} {s.title}</option>)}
                              </select>
                              {selectedSubjectId && (
                                <select className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all fade-in" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} disabled={uploading}>
                                  <option value="">-- Choose Module --</option>
                                  {activeLessons.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
                                </select>
                              )}
                              <div className="flex gap-2 pt-2">
                                <button type="button" onClick={handleCreateSubject} className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition">+ New Subject</button>
                                {selectedSubjectId && <button type="button" onClick={handleCreateLesson} className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition">+ New Module</button>}
                              </div>
                            </div>
                         </div>
                      </div>

                      {selectedLessonId && (
                        <div className="fade-in bg-white/5 p-10 rounded-[2.5rem] space-y-8 border border-white/10 shadow-inner">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Storage Core</label>
                               <div className="flex gap-4">
                                 <button type="button" onClick={() => setUploadTarget('r2')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${uploadTarget === 'r2' ? 'bg-orange-500/10 text-orange-300 border-orange-500/30' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>Cloudflare R2</button>
                                 <button type="button" onClick={() => setUploadTarget('supabase')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${uploadTarget === 'supabase' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>Supabase</button>
                               </div>
                             </div>
                             <div className="space-y-4">
                               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Input Mode</label>
                               <div className="flex gap-4 p-2 bg-black/40 rounded-2xl border border-white/5">
                                 <button type="button" onClick={() => setInputType('file')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${inputType === 'file' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>File</button>
                                 <button type="button" onClick={() => setInputType('link')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${inputType === 'link' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>Link</button>
                               </div>
                             </div>
                           </div>

                           {inputType === 'file' ? (
                             <label className={`flex flex-col items-center justify-center w-full h-48 border-2 ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-dashed border-white/10 hover:border-indigo-500/40 bg-black/40'} rounded-[2rem] cursor-pointer transition-all shadow-inner group`}>
                               <div className="text-center">
                                 <svg className="w-12 h-12 mb-4 mx-auto text-indigo-500/50 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                 {file ? <p className="text-sm font-black text-indigo-300">{file.name}</p> : <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Drop asset for synchronization</p>}
                               </div>
                               <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading}/>
                             </label>
                           ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <input type="text" placeholder="Visual Identifier (Title)" value={vimeoTitle} onChange={e => setVimeoTitle(e.target.value)} className="bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                               <input type="text" placeholder="Vimeo/External Resource URL" value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} className="bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                             </div>
                           )}
                        </div>
                      )}

                      {statusMessage && (
                        <div className={`p-6 rounded-[1.5rem] border ${statusMessage.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'} text-xs font-black uppercase tracking-widest text-center`}>
                          {statusMessage}
                        </div>
                      )}

                      <button type="submit" disabled={!selectedLessonId || uploading} className="w-full bg-white text-black font-black py-6 rounded-[2rem] hover:bg-gray-200 transition-all duration-500 disabled:opacity-30 uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:scale-[1.01] active:scale-95">
                        {uploading ? 'Processing Deployment...' : 'Confirm System Launch'}
                      </button>
                    </form>
                  )}

                  {/* MANAGE TAB */}
                  {activeTab === 'manage' && (
                    <div className="space-y-8 fade-in">
                       <div className="flex justify-between items-end mb-4 px-2">
                         <div className="space-y-2">
                           <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Asset Hierarchy</h2>
                           <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Global Curriculum Control</p>
                         </div>
                       </div>
                       
                       <div className="space-y-6">
                         {localSubjects.map(subject => (
                           <div key={subject.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-white/20">
                             <div className="flex items-center justify-between p-8 bg-white/5 border-b border-white/5">
                               <h3 className="text-xl font-black text-white flex gap-3 items-center">{subject.icon} {subject.title}</h3>
                               <div className="flex gap-2">
                                  <button onClick={() => handleRename('subject', subject.id!, subject.title)} className="p-3 hover:bg-white/10 rounded-2xl transition text-gray-500 hover:text-white">✏️</button>
                                  <button onClick={() => handleDelete('subject', subject.id!, subject.title)} className="p-3 hover:bg-red-500/10 rounded-2xl transition text-red-500">🗑️</button>
                               </div>
                             </div>
                             <div className="divide-y divide-white/5">
                               {subject.lessons?.map((lesson: any) => (
                                 <div key={lesson.id} className="p-8 pl-12 bg-black/20 group">
                                   <div className="flex items-center justify-between mb-6">
                                     <h4 className="text-lg font-black text-indigo-400 group-hover:text-white transition-colors tracking-tight">📂 {lesson.title}</h4>
                                     <div className="flex gap-2">
                                       <button onClick={() => handleRename('lesson', lesson.id!, lesson.title)} className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 border border-white/10 transition">Rename</button>
                                       <button onClick={() => handleDelete('lesson', lesson.id!, lesson.title)} className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-red-500/5 text-red-500 rounded-xl hover:bg-red-500/10 border border-red-500/20 transition">Delete</button>
                                     </div>
                                   </div>
                                   <ul className="space-y-3">
                                     {lesson.content?.map((item: any) => (
                                       <li key={item.id} className="flex justify-between items-center text-xs py-4 px-5 rounded-[1.5rem] hover:bg-white/5 transition border border-transparent hover:border-white/10 group/item bg-black/20">
                                         <div className="flex items-center gap-4">
                                           <input type="checkbox" checked={selectedItems.size > 0 && selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="accent-red-500 w-5 h-5" />
                                           <span className="text-gray-600">{item.type === 'vimeo' ? '🔗' : '📄'}</span>
                                           <span className="font-bold text-gray-400 selection:bg-indigo-500">{item.name}</span>
                                         </div>
                                         <button onClick={() => handleDelete('item', item.id, item.name)} className="opacity-0 group-item-hover:opacity-100 text-red-500 hover:scale-[1.3] transition-all">🗑️</button>
                                       </li>
                                     ))}
                                   </ul>
                                 </div>
                               ))}
                             </div>
                           </div>
                         ))}
                       </div>

                       {selectedItems.size > 0 && (
                         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-500/20 backdrop-blur-3xl border border-red-500/30 p-8 rounded-[3rem] flex items-center gap-12 shadow-[0_40px_80px_rgba(239,68,68,0.2)] z-50 animate-in slide-in-from-bottom-10">
                            <div className="flex items-center gap-5">
                               <div className="w-14 h-14 rounded-[1.5rem] bg-red-500 text-white flex items-center justify-center font-black text-2xl shadow-lg">!</div>
                               <div>
                                 <p className="font-black text-white uppercase tracking-[0.2em] text-sm">{selectedItems.size} Selected</p>
                                 <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Marked for secure deletion</p>
                               </div>
                            </div>
                            <div className="flex gap-4">
                               <button onClick={() => setSelectedItems(new Set())} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition">Abort</button>
                               <button onClick={handleBatchDelete} className="bg-red-500 hover:bg-red-400 text-white px-10 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-red-500/20">Execute Wipe</button>
                            </div>
                         </div>
                       )}
                    </div>
                  )}

                  {/* BROADCAST TAB */}
                  {activeTab === 'broadcast' && (
                    <div className="space-y-8 fade-in flex flex-col items-center justify-center min-h-[500px]">
                       <div className="w-full max-w-2xl bg-white/5 border border-white/10 p-16 rounded-[4rem] text-center space-y-10 relative overflow-hidden">
                          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                          <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-5xl shadow-inner border border-indigo-500/10 scale-in">📢</div>
                          <div className="space-y-4">
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Broadcast Alert</h2>
                            <p className="text-gray-500 text-sm font-medium">This message will overwrite the dashboard notification area for all users.</p>
                          </div>
                          <input id="broadcast-msg" type="text" placeholder="Draft transmission text..." className="w-full bg-black/60 border border-white/10 rounded-[2rem] px-8 py-6 text-sm text-center font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-800" />
                          <div className="flex gap-4 pt-6">
                            <button onClick={async () => {
                              const msg = (document.getElementById('broadcast-msg') as HTMLInputElement).value;
                              if (!msg) return;
                              await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, is_active: true }) });
                              alert('Alert Broadcasted');
                              (document.getElementById('broadcast-msg') as HTMLInputElement).value = '';
                            }} className="flex-1 bg-indigo-500 hover:bg-indigo-600 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-500/20 transition-all active:scale-95">Send Broadcast</button>
                            <button onClick={async () => {
                              await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false }) });
                              alert('Signals Cleared');
                            }} className="bg-red-500/5 text-red-500 border border-red-500/20 hover:bg-red-500/10 px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all">End Feed</button>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* INBOX TAB */}
                  {activeTab === 'inbox' && (
                    <div className="space-y-10 fade-in">
                       <div className="flex justify-between items-center px-4">
                         <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Support Inbox</h2>
                         <button onClick={refreshPageData} className="px-8 py-3.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-3xl font-black text-[10px] uppercase tracking-widest border border-indigo-500/20 transition-all">Sync Feed</button>
                       </div>
                       <div className="grid grid-cols-1 gap-8">
                         {messages.length === 0 && (
                           <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[4rem] space-y-6">
                              <div className="text-7xl opacity-10">📥</div>
                              <p className="text-gray-700 font-bold uppercase tracking-[0.3em] text-xs">Awaiting student inquiries...</p>
                           </div>
                         )}
                         {messages.map(msg => (
                           <div key={msg.id} className={`p-10 rounded-[3.5rem] border transition-all duration-700 ${msg.is_read ? 'bg-white/[0.02] border-white/5 grayscale opacity-40' : 'bg-white/[0.03] border-indigo-500/20 shadow-3xl'}`}>
                             <div className="flex justify-between items-start mb-8">
                                <div>
                                  <div className="flex items-center gap-4 mb-3">
                                     {!msg.is_read && <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]"></span>}
                                     <h3 className="font-black text-2xl text-white tracking-tight leading-none">{msg.subject}</h3>
                                  </div>
                                  <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest ml-7">{msg.sender_email} <span className="text-gray-800 mx-3">/</span> {new Date(msg.created_at).toLocaleString()}</p>
                                </div>
                                {!msg.is_read && (
                                  <button onClick={async () => {
                                    await fetch('/api/messages', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message_id: msg.id, is_read: true })});
                                    refreshPageData();
                                  }} className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-2xl transition-all">Verrify</button>
                                )}
                             </div>
                             <div className="bg-black/60 p-8 rounded-[2rem] border border-white/5 text-gray-200 leading-relaxed text-sm mb-8 whitespace-pre-wrap font-medium">{msg.body}</div>
                             
                             {replyingTo === msg.id ? (
                               <div className="space-y-6 fade-in pt-8 border-t border-white/5 animate-in slide-in-from-top-4">
                                 <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Draft secure response channel..." className="w-full bg-black/80 border border-white/10 rounded-[2rem] p-8 text-sm min-h-[180px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white font-medium" />
                                 <div className="flex justify-end gap-6 items-center">
                                   <button onClick={() => setReplyingTo(null)} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition">Abort</button>
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
                                   }} className="bg-white text-black px-12 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.25em] shadow-2xl hover:scale-[1.05] active:scale-95 transition-all">Dispatch</button>
                                 </div>
                               </div>
                             ) : (
                               <button onClick={() => setReplyingTo(msg.id)} className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-all flex items-center gap-4 bg-indigo-500/10 px-6 py-3 rounded-2xl hover:bg-indigo-500/20 border border-indigo-500/10">
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                 Establish Uplink
                               </button>
                             )}
                           </div>
                         ))}
                       </div>
                    </div>
                  )}

                  {/* TEAM TAB */}
                  {activeTab === 'team' && (
                    <div className="space-y-12 fade-in">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] space-y-8">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Invite Faculty</h2>
                            <p className="text-sm text-gray-500 leading-relaxed font-medium">Grant specialized administrative privileges to verified personnel.</p>
                            <div className="space-y-4">
                              <input value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="Personnel primary email..." className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] px-8 py-6 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white text-sm font-bold" />
                              <button onClick={async () => {
                                if (!newTeacherEmail) return;
                                await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: newTeacherEmail })});
                                setNewTeacherEmail('');
                                refreshPageData();
                                alert('Protocol Initialized');
                              }} className="w-full bg-indigo-600 hover:bg-indigo-500 py-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-600/20 transition-all active:scale-95">Verify & Elevate</button>
                            </div>
                          </div>
                          
                          <div className="bg-indigo-500/10 border border-indigo-500/20 p-12 rounded-[3.5rem] space-y-8 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
                             <div className="w-16 h-16 bg-indigo-500/20 rounded-[1.5rem] flex items-center justify-center text-2xl border border-indigo-500/20 shadow-inner">📄</div>
                             <h3 className="text-xl font-bold text-white tracking-tight">Access Authority</h3>
                             <div className="space-y-4 text-xs text-indigo-300 font-bold uppercase tracking-widest leading-loose opacity-60">
                               <p className="flex gap-4"><span>—</span> First-time users must initialize via Google.</p>
                               <p className="flex gap-4"><span>—</span> Teacher role provides full workspace tools.</p>
                               <p className="flex gap-4"><span>—</span> Banned status restricts all session access.</p>
                             </div>
                          </div>
                       </div>

                       <div className="bg-white/5 border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl">
                          <div className="px-12 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                             <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-gray-500">Personnel Roster</h3>
                             <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-xl border border-indigo-500/10">{allRoles.length} Records</span>
                          </div>
                          <ul className="divide-y divide-white/5">
                            {allRoles.filter(r => r.role !== 'student').map(r => (
                              <li key={r.email} className="px-12 py-8 flex items-center justify-between hover:bg-white/[0.03] transition-all duration-500 group">
                                 <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center font-black border transition-all ${r.role === 'superadmin' ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                      {r.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-black text-white text-base tracking-tight">{r.email}</p>
                                      <p className={`text-[9px] font-black uppercase tracking-[0.25em] mt-1 ${r.role === 'superadmin' ? 'text-indigo-400' : r.role === 'banned' ? 'text-red-500' : 'text-gray-600'}`}>{r.role}</p>
                                    </div>
                                 </div>
                                 {r.role !== 'superadmin' && (
                                   <button onClick={async () => {
                                     const nextRole = r.role === 'banned' ? 'student' : 'banned';
                                     await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: r.email, overrideRole: nextRole })});
                                     refreshPageData();
                                   }} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${r.role === 'banned' ? 'bg-green-600 text-white shadow-lg' : 'bg-red-500/10 text-red-500 border border-red-500/10 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 italic'}`}>
                                     {r.role === 'banned' ? 'Restore Base Access' : 'Suspend Account'}
                                   </button>
                                 )}
                              </li>
                            ))}

                            <div className="px-12 py-10 bg-white/[0.01]">
                               <div className="flex items-center gap-3 mb-8 opacity-40">
                                  <div className="h-px flex-1 bg-white/10"></div>
                                  <span className="text-[9px] font-black uppercase tracking-[0.4em]">Active Student Transmissions</span>
                                  <div className="h-px flex-1 bg-white/10"></div>
                               </div>
                               <div className="grid grid-cols-1 gap-6">
                                 {activeLogins.map(email => (
                                   <div key={email} className="bg-[#0A0A0F] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-indigo-500/30 hover:shadow-3xl group/student">
                                     <li className="px-10 py-6 flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                           <div className="w-12 h-12 rounded-[1rem] bg-indigo-500/10 border border-white/10 flex items-center justify-center text-sm font-black text-indigo-400 group-hover/student:bg-indigo-500 group-hover/student:text-white transition-all">{email.charAt(0).toUpperCase()}</div>
                                           <div>
                                             <p className="text-sm font-black text-gray-200">{email}</p>
                                             <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">Verified Connection</p>
                                           </div>
                                        </div>
                                        <div className="flex gap-4">
                                          <button 
                                            onClick={() => setActiveChatEmail(activeChatEmail === email ? null : email)}
                                            className={`px-6 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeChatEmail === email ? 'bg-white text-black shadow-2xl scale-105' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}
                                          >
                                            {activeChatEmail === email ? 'Close dossier' : 'Contact dossier'}
                                          </button>
                                          <button onClick={async () => {
                                            if (!confirm(`Ban student ${email}?`)) return;
                                            await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email, overrideRole: 'banned' })});
                                            refreshPageData();
                                          }} className="p-4 hover:bg-red-500/20 rounded-2xl text-red-500 transition-all opacity-0 group-hover/student:opacity-100">🚫</button>
                                        </div>
                                     </li>
                                     {activeChatEmail === email && (
                                       <div className="px-8 pb-10 fade-in animate-in slide-in-from-top-4">
                                          {renderDossierChat(email)}
                                       </div>
                                     )}
                                   </div>
                                 ))}
                                 {activeLogins.length === 0 && <p className="text-center py-10 text-[10px] font-medium text-gray-600 uppercase tracking-[0.2em] italic">No active frequency scans found.</p>}
                               </div>
                            </div>
                          </ul>
                       </div>
                    </div>
                  )}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );

  function renderDossierChat(studentEmail: string) {
    const chatMessages = messages.filter(m => m.sender_email === studentEmail || m.receiver_email === studentEmail).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
      <div className="flex flex-col h-[500px] bg-black/80 rounded-[3rem] border border-white/10 overflow-hidden shadow-3xl relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>
        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-25 grayscale space-y-6">
              <div className="text-7xl">🛰️</div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-center ml-2">Secure Link Idle</p>
            </div>
          )}
          {chatMessages.map(m => (
            <div key={m.id} className={`flex ${m.sender_email === studentEmail ? 'justify-start' : 'justify-end'}`}>
               <div className={`max-w-[80%] rounded-[2rem] px-7 py-5 text-sm leading-relaxed shadow-3xl relative transition-all hover:scale-[1.01] ${m.sender_email === studentEmail ? 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-none' : 'bg-indigo-600 text-white shadow-indigo-600/30 rounded-tr-none'}`}>
                 <p className="font-medium">{m.body}</p>
                 <div className="mt-4 opacity-40 text-[9px] font-black uppercase tracking-[0.2em] pt-3 border-t border-white/5 flex justify-between items-center whitespace-nowrap gap-4 italic">
                    <span>{m.sender_email === studentEmail ? 'INBOUND' : 'COMMAND_HQ'}</span>
                    <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
              body: JSON.stringify({ receiver_email: studentEmail, subject: 'Direct System Override Response', body: adminReply })
            });
            if (res.ok) {
              setMessages(prev => [{ id: Math.random().toString(), sender_email: ADMIN_EMAIL, receiver_email: studentEmail, body: adminReply, created_at: new Date().toISOString() }, ...prev]);
              setAdminReply('');
              refreshPageData();
            }
          }}
          className="p-8 border-t border-white/10 bg-white/5 flex gap-5 backdrop-blur-3xl shadow-inner"
        >
          <input 
            type="text" 
            placeholder="Initialize response link..." 
            value={adminReply}
            onChange={e => setAdminReply(e.target.value)}
            className="flex-1 bg-black/60 border border-white/10 rounded-[1.5rem] px-8 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-gray-800"
          />
          <button type="submit" className="bg-white text-black px-12 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-3xl hover:bg-gray-200 transition-all duration-300 active:scale-95">Dispatch</button>
        </form>
      </div>
    );
  }
}
