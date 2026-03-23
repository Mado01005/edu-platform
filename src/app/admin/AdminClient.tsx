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
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500 selection:text-white">
      <div className="max-w-full mx-auto flex flex-col md:flex-row min-h-screen overflow-hidden">
        
        {/* SIDEBAR NAVIGATION - SECURE DOCKED */}
        <div className="w-full md:w-[320px] bg-[#0A0A0F] border-r border-white/5 flex flex-col pt-8 p-6 space-y-8 h-screen sticky top-0 md:overflow-y-auto">
          <div className="flex items-center gap-4 px-2 mb-4">
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl border border-indigo-500/20">⚡</div>
             <div>
               <h1 className="text-lg font-black tracking-tighter uppercase">Command</h1>
               <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] opacity-80">v4.0 OPERATIONAL</p>
             </div>
          </div>

          <div className="flex-1 space-y-2">
            {(['upload', 'manage', 'broadcast', 'inbox', 'team', 'telemetry'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 border ${
                  activeTab === tab 
                    ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.1)]' 
                    : 'text-gray-500 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-lg opacity-80">
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

        {/* MAIN CONTENT AREA - FULL WIDTH SCAN */}
        <div className="flex-1 bg-black relative flex flex-col min-h-screen">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent)] pointer-events-none"></div>
           
           <div className="flex-1 p-6 md:p-10 lg:p-16 relative overflow-y-auto">
              <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
                
                {/* CONTENT ROUTER */}
                {activeTab === 'upload' && (
                  <form onSubmit={processUploadOrEmbed} className="space-y-12">
                    <div className="space-y-4 max-w-2xl">
                      <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Initialize Deployment</h2>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">Transmit encrypted educational content to the global infrastructure clusters.</p>
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
                                        <button key={target} type="button" onClick={() => setUploadTarget(target)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${uploadTarget === target ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>
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
                                 <label className={`flex flex-col items-center justify-center w-full h-56 border-2 ${file ? 'border-green-500/50 bg-green-500/5' : 'border-dashed border-white/10 hover:border-indigo-500/30 bg-black/50'} rounded-[2.5rem] cursor-pointer transition-all group relative overflow-hidden`}>
                                   {file && <div className="absolute inset-0 bg-green-500/5 opacity-50"></div>}
                                   <div className="text-center relative z-10">
                                     <div className={`w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center text-3xl transition-transform duration-500 group-hover:scale-110 ${file ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-indigo-400 shadow-inner'}`}>{file ? '✓' : '⚡'}</div>
                                     {file ? <p className="text-sm font-black text-green-300">{file.name}</p> : <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-black">Ready for synchronization</p>}
                                   </div>
                                   <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading}/>
                                 </label>
                               ) : (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <input type="text" placeholder="Visual Identifier (Title)" value={vimeoTitle} onChange={e => setVimeoTitle(e.target.value)} className="bg-black border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-gray-800" />
                                   <input type="text" placeholder="Vimeo / Dynamic Resource URL" value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} className="bg-black border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-gray-800" />
                                 </div>
                               )}

                               {statusMessage && (
                                <div className={`p-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center ${statusMessage.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                  {statusMessage}
                                </div>
                               )}

                               <button type="submit" disabled={!selectedLessonId || uploading} className="w-full bg-white text-black font-black py-6 rounded-[2rem] hover:bg-gray-200 transition-all duration-500 disabled:opacity-30 uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:scale-[1.01] active:scale-95">
                                 {uploading ? 'Processing Transmission...' : 'Execute Transaction'}
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
                      <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Curriculum Control</h2>
                      <p className="text-sm text-gray-500 font-medium">Full administrative override for subjects, modules, and binary assets.</p>
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
                                <div className="flex items-center justify-between mb-6">
                                  <h4 className="text-md font-bold text-indigo-400 uppercase tracking-widest group-hover:text-white transition-colors">📂 {lesson.title}</h4>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleRename('lesson', lesson.id!, lesson.title)} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition">Rename</button>
                                    <button onClick={() => handleDelete('lesson', lesson.id!, lesson.title)} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-500/5 text-red-500 border border-red-500/10 rounded-lg hover:bg-red-500/10 transition">Delete</button>
                                  </div>
                                </div>
                                <ul className="space-y-2">
                                  {lesson.content?.map((item: any) => (
                                    <li key={item.id} className="flex justify-between items-center text-xs py-4 px-6 rounded-2xl hover:bg-white/5 transition border border-transparent hover:border-white/5 group/item bg-black/40">
                                      <div className="flex items-center gap-4">
                                        <input type="checkbox" checked={selectedItems.size > 0 && selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="accent-indigo-500 w-4 h-4 rounded-lg" />
                                        <span className="text-gray-600">{item.type === 'vimeo' ? '🔗' : '📄'}</span>
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
                    </div>

                    {selectedItems.size > 0 && (
                      <div className="fixed bottom-10 left-[calc(320px+50%)] -translate-x-1/2 bg-red-500 text-white p-8 rounded-[3rem] flex items-center gap-12 shadow-[0_40px_80px_rgba(239,68,68,0.4)] z-[100] animate-in zoom-in-95">
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
                    <div className="space-y-2 px-2">
                       <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Live Telemetry</h2>
                       <p className="text-sm text-gray-500 font-medium">Real-time scan of global session activity and platform load.</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-[3.5rem] p-4">
                       <ActiveSessionsFeed />
                    </div>
                  </div>
                )}

                {/* Other tabs follow similar premium sidebar-consistent styling */}
                {activeTab === 'broadcast' && (
                  <div className="h-[600px] flex items-center justify-center fade-in">
                     <div className="w-full max-w-2xl bg-white/5 border border-white/10 p-16 rounded-[4rem] text-center space-y-12 relative overflow-hidden shadow-3xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[120px] rounded-full"></div>
                        <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-5xl shadow-inner border border-indigo-500/20">📢</div>
                        <div className="space-y-4">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Emergency Signal</h2>
                          <p className="text-gray-500 text-sm font-medium">Global broadcast alert sent directly to all student frequencies.</p>
                        </div>
                        <input id="broadcast-msg" type="text" placeholder="Draft transmission protocol..." className="w-full bg-black/60 border border-white/10 rounded-[2rem] px-8 py-6 text-sm text-center font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-800" />
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

                {activeTab === 'inbox' && (
                  <div className="space-y-10 fade-in">
                    <div className="flex justify-between items-end px-4">
                       <div className="space-y-2">
                         <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Support Uplink</h2>
                         <p className="text-sm text-gray-500 font-medium">Verified student inquiries awaiting administrative clearance.</p>
                       </div>
                       <button onClick={refreshPageData} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-white rounded-2xl border border-white/10 transition-all">Reload Feed</button>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                       {messages.map(msg => (
                         <div key={msg.id} className={`p-10 rounded-[3.5rem] border transition-all duration-700 ${msg.is_read ? 'bg-white/[0.01] border-white/5 opacity-40' : 'bg-white/[0.03] border-indigo-500/20 shadow-3xl'}`}>
                           <div className="flex justify-between items-start mb-8">
                              <div>
                                <h3 className="font-black text-2xl text-white tracking-tight">{msg.subject}</h3>
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-2">{msg.sender_email} <span className="text-gray-800 mx-3">/</span> {new Date(msg.created_at).toLocaleString()}</p>
                              </div>
                              {!msg.is_read && (
                                <button onClick={async () => {
                                  await fetch('/api/messages', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message_id: msg.id, is_read: true })});
                                  refreshPageData();
                                }} className="text-[9px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 px-6 py-2.5 rounded-xl border border-white/10 transition">Verify</button>
                              )}
                           </div>
                           <div className="bg-black/60 p-8 rounded-[2rem] border border-white/5 text-gray-300 text-sm mb-8 leading-relaxed font-medium">{msg.body}</div>
                           
                           {replyingTo === msg.id ? (
                             <div className="space-y-6 fade-in pt-8 border-t border-white/5">
                               <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Draft secure response channel..." className="w-full bg-black border border-white/10 rounded-[2rem] p-8 text-sm min-h-[180px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white font-medium" />
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
                                 }} className="bg-white text-black px-12 py-4 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all">Transmit</button>
                               </div>
                             </div>
                           ) : (
                             <button onClick={() => setReplyingTo(msg.id)} className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-all flex items-center gap-4 bg-indigo-500/10 px-8 py-4 rounded-2xl border border-indigo-500/20">
                               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                               Secure Direct Link
                             </button>
                           )}
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {activeTab === 'team' && (
                  <div className="space-y-12 fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] space-y-8 shadow-2xl">
                         <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Deploy Access</h2>
                         <p className="text-sm text-gray-500 font-medium leading-relaxed">Elevate verified personnel to administrative clearance levels.</p>
                         <div className="space-y-4">
                           <input value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="Verified google email..." className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] px-8 py-6 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white text-sm font-bold" />
                           <button onClick={async () => {
                             if (!newTeacherEmail) return;
                             await fetch('/api/admin/roles', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: newTeacherEmail })});
                             setNewTeacherEmail('');
                             refreshPageData();
                             alert('Authorization Granted');
                           }} className="w-full bg-indigo-600 hover:bg-indigo-500 py-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-600/20 transition-all active:scale-95">Elevate Personnel</button>
                         </div>
                       </div>
                       <div className="bg-indigo-500/5 border border-indigo-500/10 p-12 rounded-[3.5rem] space-y-8 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full translate-x-10 -translate-y-10"></div>
                          <div className="w-16 h-16 rounded-[1.2rem] bg-indigo-500/20 flex items-center justify-center text-3xl border border-indigo-500/10 shadow-inner">📄</div>
                          <h3 className="text-xl font-bold text-white tracking-tight uppercase">Access Protocol</h3>
                          <div className="space-y-4 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 opacity-60">
                             <p className="flex gap-4"><span>—</span> Automated Google Identity Verification</p>
                             <p className="flex gap-4"><span>—</span> Real-time Content Control Management</p>
                             <p className="flex gap-4"><span>—</span> Permanent Session Restricted Access</p>
                          </div>
                       </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl">
                       <div className="px-12 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                          <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-gray-500">Security Clearance Database</h3>
                          <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-5 py-2 rounded-xl border border-indigo-500/20">{allRoles.length} Records</span>
                       </div>
                       <ul className="divide-y divide-white/5">
                         {allRoles.filter(r => r.role !== 'student').map(r => (
                           <li key={r.email} className="px-12 py-8 flex items-center justify-between hover:bg-white/[0.02] transition-all duration-500 group">
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
                                }} className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${r.role === 'banned' ? 'bg-green-600 text-white shadow-2xl' : 'bg-red-500/10 text-red-500 border border-red-500/10 hover:bg-red-500/20 opacity-0 group-hover:opacity-100'}`}>
                                  {r.role === 'banned' ? 'Authorize Access' : 'Suspend Account'}
                                </button>
                              )}
                           </li>
                         ))}
                         
                         <div className="px-12 py-12 bg-black/40">
                            <div className="flex items-center gap-6 mb-10 opacity-30">
                               <div className="h-px flex-1 bg-white/10"></div>
                               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-center">Identified Student Transmissions</span>
                               <div className="h-px flex-1 bg-white/10"></div>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                               {activeLogins.map(email => (
                                 <div key={email} className="bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden transition-all duration-500 hover:border-indigo-500/30 hover:shadow-3xl group/student shadow-inner">
                                   <li className="px-10 py-8 flex items-center justify-between">
                                      <div className="flex items-center gap-6">
                                         <div className="w-14 h-14 rounded-[1.2rem] bg-indigo-500/10 border border-white/5 flex items-center justify-center text-lg font-black text-indigo-400 group-hover/student:bg-indigo-500 group-hover/student:text-white transition-all duration-500">{email.charAt(0).toUpperCase()}</div>
                                         <div>
                                           <p className="text-md font-black text-gray-100">{email}</p>
                                           <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">Direct Secure Link Active</p>
                                         </div>
                                      </div>
                                      <div className="flex gap-4">
                                        <button 
                                          onClick={() => setActiveChatEmail(activeChatEmail === email ? null : email)}
                                          className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeChatEmail === email ? 'bg-white text-black shadow-3xl scale-105' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 border border-white/5'}`}
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
                                     <div className="px-10 pb-12 animate-in slide-in-from-top-4">
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
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  function renderDossierChat(studentEmail: string) {
    const chatMessages = messages.filter(m => m.sender_email === studentEmail || m.receiver_email === studentEmail).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
      <div className="flex flex-col h-[550px] bg-black/60 rounded-[3rem] border border-white/10 overflow-hidden shadow-3xl relative animate-in zoom-in-95">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>
        <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-10 grayscale space-y-8 animate-pulse">
              <div className="text-8xl">🛰️</div>
              <p className="text-[10px] font-black uppercase tracking-[0.6em] text-center ml-2">Secure frequency scanning...</p>
            </div>
          )}
          {chatMessages.map(m => (
            <div key={m.id} className={`flex ${m.sender_email === studentEmail ? 'justify-start' : 'justify-end'}`}>
               <div className={`max-w-[85%] rounded-[2rem] px-8 py-5 text-sm leading-relaxed shadow-3xl relative transition-all hover:scale-[1.01] ${m.sender_email === studentEmail ? 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-none' : 'bg-indigo-600 text-white shadow-indigo-600/30 rounded-tr-none'}`}>
                 <p className="font-semibold">{m.body}</p>
                 <div className="mt-4 opacity-40 text-[9px] font-black uppercase tracking-[0.2em] pt-4 border-t border-white/5 flex justify-between items-center whitespace-nowrap gap-6 italic">
                    <span>{m.sender_email === studentEmail ? 'INBOUND_SIGNAL' : 'ADMIN_OVERRIDE'}</span>
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
              body: JSON.stringify({ receiver_email: studentEmail, subject: 'Direct Command Protocol Response', body: adminReply })
            });
            if (res.ok) {
              setMessages(prev => [{ id: Math.random().toString(), sender_email: ADMIN_EMAIL, receiver_email: studentEmail, body: adminReply, created_at: new Date().toISOString() }, ...prev]);
              setAdminReply('');
              refreshPageData();
            }
          }}
          className="p-10 border-t border-white/10 bg-white/5 flex gap-6 backdrop-blur-3xl"
        >
          <input 
            type="text" 
            placeholder="Initialize response link..." 
            value={adminReply}
            onChange={e => setAdminReply(e.target.value)}
            className="flex-1 bg-black border border-white/10 rounded-[1.5rem] px-8 py-6 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-gray-800"
          />
          <button type="submit" className="bg-white text-black px-12 py-6 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-3xl hover:bg-gray-200 transition-all duration-300 active:scale-95">Dispatch</button>
        </form>
      </div>
    );
  }
}
