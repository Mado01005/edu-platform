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
    if (next.has(id)) next.delete(id);
    else next.add(id);
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
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pt-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER HUD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -z-10"></div>
           <div className="flex gap-6 items-center">
             <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-4xl shadow-inner border border-indigo-500/30">⚡</div>
             <div>
               <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Admin HUD</h1>
               <p className="text-xs text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">Operational Command & Control Center</p>
             </div>
           </div>
           <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             {(['upload', 'manage', 'broadcast', 'inbox', 'team', 'telemetry'] as const).map((tab) => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 border ${activeTab === tab ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20'}`}
               >
                 {tab}
               </button>
             ))}
           </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
           {activeTab === 'telemetry' ? (
             <ActiveSessionsFeed />
           ) : (
             <div className="bg-[#05050A]/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden min-h-[700px]">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-40"></div>
                
                {/* UPLOAD TAB */}
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
                      <div className="fade-in bg-white/5 p-6 rounded-2xl space-y-4 border border-white/10">
                        <div className="flex gap-4 border-b border-white/10 pb-6">
                           <button type="button" onClick={() => setUploadTarget('r2')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition border ${uploadTarget === 'r2' ? 'bg-orange-500/10 text-orange-300 border-orange-500/30 shadow-lg shadow-orange-500/5' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>☁️ Cloudflare R2</button>
                           <button type="button" onClick={() => setUploadTarget('supabase')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition border ${uploadTarget === 'supabase' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>📦 Supabase</button>
                        </div>
                        <div className="flex gap-4 border-b border-white/10 pb-6">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-white">
                            <input type="radio" checked={inputType === 'file'} onChange={() => setInputType('file')} className="accent-indigo-500" /> Cloud File Upload
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-white">
                            <input type="radio" checked={inputType === 'link'} onChange={() => setInputType('link')} className="accent-indigo-500" /> Embed Link
                          </label>
                        </div>
                        {inputType === 'file' ? (
                          <label className={`flex flex-col items-center justify-center w-full h-40 border-2 ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-dashed border-white/10 hover:border-indigo-500/40 bg-black/40'} rounded-2xl cursor-pointer transition-all`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                              <svg className="w-10 h-10 mb-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                              {file ? <p className="text-sm font-bold text-indigo-300">{file.name}</p> : <p className="text-sm text-gray-400"><span className="font-bold text-white">Choose file</span> or drag and drop</p>}
                            </div>
                            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading}/>
                          </label>
                        ) : (
                          <div className="space-y-4">
                            <input type="text" placeholder="Entry Title" value={vimeoTitle} onChange={e => setVimeoTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500" disabled={uploading}/>
                            <input type="text" placeholder="https://..." value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500" disabled={uploading}/>
                          </div>
                        )}
                      </div>
                    )}
                    {statusMessage && <div className={`p-4 rounded-xl text-sm font-bold ${statusMessage.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{statusMessage}</div>}
                    <button type="submit" disabled={!selectedLessonId || uploading} className="w-full bg-white text-black font-black py-4 px-8 rounded-2xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 uppercase tracking-widest text-xs">
                      {uploading ? 'Processing Transaction...' : 'Execute Deployment'}
                    </button>
                  </form>
                )}

                {/* MANAGE TAB */}
                {activeTab === 'manage' && (
                  <div className="space-y-6 fade-in">
                    {localSubjects.map(subject => (
                      <div key={subject.id} className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
                        <div className="flex items-center justify-between p-6 bg-white/5 border-b border-white/5">
                          <h3 className="text-xl font-black text-white flex gap-3 items-center">{subject.icon} {subject.title}</h3>
                          <div className="flex gap-2">
                             <button onClick={() => handleRename('subject', subject.id!, subject.title)} className="p-2 hover:bg-white/10 rounded-xl transition text-gray-400">✏️</button>
                             <button onClick={() => handleDelete('subject', subject.id!, subject.title)} className="p-2 hover:bg-red-500/10 rounded-xl transition text-red-500">🗑️</button>
                          </div>
                        </div>
                        <div className="divide-y divide-white/5">
                          {subject.lessons?.map((lesson: any) => (
                            <div key={lesson.id} className="p-6 pl-10 bg-black/20">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-bold text-indigo-300">📂 {lesson.title}</h4>
                                <div className="flex gap-2">
                                  <button onClick={() => handleRename('lesson', lesson.id!, lesson.title)} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 rounded-lg">Rename</button>
                                  <button onClick={() => handleDelete('lesson', lesson.id!, lesson.title)} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg">Delete</button>
                                </div>
                              </div>
                              <ul className="space-y-2">
                                {lesson.content?.map((item: any) => (
                                  <li key={item.id} className="flex justify-between items-center text-sm py-2.5 px-3 rounded-xl hover:bg-white/5 transition group">
                                    <div className="flex items-center gap-3">
                                      <input type="checkbox" checked={selectedItems.size > 0 && selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="accent-red-500" />
                                      <span className="text-gray-400">{item.type === 'vimeo' ? '🔗' : '📄'}</span>
                                      <span className="font-medium text-gray-300">{item.name}</span>
                                    </div>
                                    <button onClick={() => handleDelete('item', item.id, item.name)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:scale-110 transition">🗑️</button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {selectedItems.size > 0 && (
                      <div className="sticky bottom-6 bg-red-500/10 backdrop-blur-2xl border border-red-500/30 p-6 rounded-3xl flex items-center justify-between shadow-2xl z-50">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center font-black">!</div>
                           <p className="font-bold text-red-300">{selectedItems.size} items staged for deletion</p>
                        </div>
                        <div className="flex gap-4">
                           <button onClick={() => setSelectedItems(new Set())} className="text-sm font-bold text-gray-400">Cancel</button>
                           <button onClick={handleBatchDelete} className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold">Wipe Staged Items</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BROADCAST TAB */}
                {activeTab === 'broadcast' && (
                  <div className="space-y-6 fade-in">
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10">
                      <h2 className="text-2xl font-black mb-6 flex items-center gap-3">📢 Global Transmission</h2>
                      <input id="broadcast-msg" type="text" placeholder="Enter alert message..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-indigo-500 mb-6" />
                      <div className="flex gap-4">
                        <button onClick={async () => {
                          const msg = (document.getElementById('broadcast-msg') as HTMLInputElement).value;
                          if (!msg) return;
                          await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, is_active: true }) });
                          alert('Alert broadcasted!');
                        }} className="flex-1 bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Push Alert</button>
                        <button onClick={async () => {
                          await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false }) });
                          alert('Broadcast cleared');
                        }} className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Full Clear</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* INBOX TAB */}
                {activeTab === 'inbox' && (
                  <div className="space-y-6 fade-in">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black">Support Queue</h2>
                      <button onClick={refreshPageData} className="px-5 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-widest">Refresh Stream</button>
                    </div>
                    <div className="space-y-6">
                      {messages.length === 0 && <p className="text-center py-20 text-gray-600 font-bold italic border border-white/5 rounded-3xl">No active transmissions in queue.</p>}
                      {messages.map(msg => (
                        <div key={msg.id} className={`p-8 rounded-[2rem] border transition-all duration-300 ${msg.is_read ? 'bg-white/5 border-white/5 opacity-60' : 'bg-indigo-500/5 border-indigo-500/30 shadow-2xl'}`}>
                          <div className="flex justify-between items-start mb-6">
                             <div>
                               <h3 className="font-black text-xl flex items-center gap-3">
                                 {!msg.is_read && <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></span>}
                                 {msg.subject}
                               </h3>
                               <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mt-2">{msg.sender_email} • {new Date(msg.created_at).toLocaleString()}</p>
                             </div>
                             {!msg.is_read && (
                               <button onClick={async () => {
                                 await fetch('/api/messages', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message_id: msg.id, is_read: true })});
                                 refreshPageData();
                               }} className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg">Mark Verified</button>
                             )}
                          </div>
                          <div className="bg-black/40 p-6 rounded-2xl border border-white/5 text-gray-300 leading-relaxed mb-6 whitespace-pre-wrap">{msg.body}</div>
                          {replyingTo === msg.id ? (
                            <div className="space-y-4 fade-in">
                              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Draft secure response..." className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm min-h-[150px] outline-none focus:ring-2 focus:ring-indigo-500" />
                              <div className="flex justify-end gap-4">
                                <button onClick={() => setReplyingTo(null)} className="text-xs font-black uppercase text-gray-500">Abort</button>
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
                                    alert('Reply dispatched');
                                    refreshPageData();
                                  }
                                }} className="bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20">Transmit Reply</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setReplyingTo(msg.id)} className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-white transition flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                              Open Response Channel
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TEAM TAB */}
                {activeTab === 'team' && (
                  <div className="space-y-8 fade-in">
                    <div className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem]">
                      <h2 className="text-2xl font-black mb-8">Personnel Management</h2>
                      <div className="flex gap-4 mb-10">
                        <input value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="Enter personnel email..." className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={async () => {
                          if (!newTeacherEmail) return;
                          await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: newTeacherEmail })});
                          setNewTeacherEmail('');
                          refreshPageData();
                        }} className="bg-indigo-500 px-8 rounded-2xl font-black uppercase tracking-widest text-xs">Assign Role</button>
                      </div>

                      {/* Registered Students */}
                      <div className="bg-black/20 border border-white/5 rounded-3xl overflow-hidden mb-10">
                        <div className="px-8 py-5 border-b border-white/5 bg-white/5">
                           <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">Class Roster ({activeLogins.length})</h3>
                        </div>
                        <ul className="divide-y divide-white/5">
                          {activeLogins.map(email => (
                            <div key={email}>
                              <li className="px-8 py-5 flex items-center justify-between hover:bg-white/5 transition group">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-300">{email.charAt(0).toUpperCase()}</div>
                                   <span className="font-bold text-sm text-gray-200">{email}</span>
                                </div>
                                <div className="flex gap-3">
                                   <button onClick={() => setActiveChatEmail(activeChatEmail === email ? null : email)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition ${activeChatEmail === email ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                                     {activeChatEmail === email ? 'Close' : 'Chat'}
                                   </button>
                                   <button onClick={async () => {
                                     if (!confirm(`Ban ${email}?`)) return;
                                     await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email, overrideRole: 'banned' })});
                                     refreshPageData();
                                   }} className="p-2 hover:bg-red-500/20 rounded-xl text-red-500 transition opacity-0 group-hover:opacity-100">🚫</button>
                                </div>
                              </li>
                              {activeChatEmail === email && (
                                <div className="px-8 pb-8 fade-in">
                                  {renderDossierChat(email)}
                                </div>
                              )}
                            </div>
                          ))}
                        </ul>
                      </div>

                      {/* Banned List if any */}
                      {allRoles.filter(r => r.role === 'banned').length > 0 && (
                        <div className="border border-red-500/20 rounded-3xl overflow-hidden">
                           <div className="px-8 py-4 bg-red-500/5 border-b border-red-500/10">
                              <h3 className="text-red-400 font-black text-[10px] uppercase tracking-widest">Blacklisted Access</h3>
                           </div>
                           <ul className="divide-y divide-red-500/10">
                              {allRoles.filter(r => r.role === 'banned').map(b => (
                                <li key={b.email} className="px-8 py-4 flex items-center justify-between bg-red-500/5">
                                   <span className="text-red-300 text-sm font-bold">{b.email}</span>
                                   <button onClick={async () => {
                                     await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: b.email, overrideRole: 'student' })});
                                     refreshPageData();
                                   }} className="text-[10px] font-black uppercase text-green-400">Restore Access</button>
                                </li>
                              ))}
                           </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );

  function renderDossierChat(studentEmail: string) {
    const chatMessages = messages.filter(m => m.sender_email === studentEmail || m.receiver_email === studentEmail).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
      <div className="flex flex-col h-[450px] bg-black/60 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl mt-4">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {chatMessages.length === 0 && <p className="text-center text-gray-600 text-[10px] py-10 italic uppercase tracking-widest">Initiating connection... No logs found.</p>}
          {chatMessages.map(m => (
            <div key={m.id} className={`flex ${m.sender_email === studentEmail ? 'justify-start' : 'justify-end'}`}>
               <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-xs shadow-xl ${m.sender_email === studentEmail ? 'bg-white/5 border border-white/10 text-gray-300' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>
                 <p className="leading-relaxed">{m.body}</p>
                 <div className="mt-2 opacity-50 text-[9px] font-bold uppercase tracking-tighter">{new Date(m.created_at).toLocaleTimeString()}</div>
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
              body: JSON.stringify({ receiver_email: studentEmail, subject: 'Immediate Direct Response', body: adminReply })
            });
            if (res.ok) {
              setMessages(prev => [{ id: Math.random().toString(), sender_email: ADMIN_EMAIL, receiver_email: studentEmail, body: adminReply, created_at: new Date().toISOString() }, ...prev]);
              setAdminReply('');
              refreshPageData();
            }
          }}
          className="p-4 border-t border-white/10 bg-white/5 flex gap-3"
        >
          <input 
            type="text" 
            placeholder="Secure uplink reply..." 
            value={adminReply}
            onChange={e => setAdminReply(e.target.value)}
            className="flex-1 bg-black/80 border border-white/10 rounded-xl px-5 py-3 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-600/20">Send</button>
        </form>
      </div>
    );
  }
}
