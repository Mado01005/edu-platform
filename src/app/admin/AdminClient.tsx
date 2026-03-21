'use client';

import { useState } from 'react';

type AdminClientProps = {
  subjects: any[];
  initialRoles?: any[];
};

export default function AdminClient({ subjects: initialSubjects, initialRoles = [] }: AdminClientProps) {
  const [localSubjects, setLocalSubjects] = useState(initialSubjects);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'broadcast' | 'team'>('upload');
  
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

  const activeSubject = localSubjects.find(s => s.id === selectedSubjectId);
  const activeLessons = activeSubject?.lessons || [];

  // ================= COMMON ACTION HANDLERS =================
  const refreshPageData = () => {
    // A full refresh is the safest way to re-sync heavily nested tree structures
    window.location.reload();
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
      setStatusMessage('Requesting secure cloud signature...');
      const subjectSlug = activeSubject.slug;
      const lessonSlug = activeLessons.find((l: any) => l.id === selectedLessonId)?.slug;

      const initiateRes = await fetch('/api/admin/upload-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file!.name, subjectSlug, lessonSlug })
      });
      if (!initiateRes.ok) throw new Error('Failed to initiate upload');
      const { signedUrl, publicUrl } = await initiateRes.json();
      
      setProgress(30);
      setStatusMessage('Directly uploading to cloud storage...');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        xhr.setRequestHeader('Content-Type', file!.type || 'application/octet-stream');
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 60) + 30);
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.statusText}`));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      setProgress(90);
      setStatusMessage('Finalizing database records...');

      let fileType = 'unknown';
      if (file!.type.startsWith('video/')) fileType = 'video';
      else if (file!.type.startsWith('image/')) fileType = 'image';
      else if (file!.type === 'application/pdf') fileType = 'pdf';

      const completeRes = await fetch('/api/admin/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubjectId, lessonId: selectedLessonId, fileName: file!.name, fileType, publicUrl })
      });

      if (!completeRes.ok) throw new Error('Failed to register file in database');

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
    <div className="glass-card p-6 md:p-8 rounded-2xl max-w-4xl mx-auto border border-white/5 space-y-6">
      
      {/* TABS HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Admin Control Center
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'upload' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>Upload / Embed</button>
          <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'manage' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>Manage Syllabus</button>
          <button onClick={() => setActiveTab('broadcast')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'broadcast' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>Broadcast</button>
          <button onClick={() => setActiveTab('team')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'team' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>Team Access</button>
        </div>
      </div>

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
                        // The ContentNode has an id mapped now from content items 
                        // Wait, folder grouping means some nodes are folders. We'll simply show a flat list if possible, or just exact items.
                        // I mapped `id` explicitly into ContentNode in src/lib/content.ts
                        if (item.type === 'folder') return null; // Simplified rendering for deep folders
                        return (
                           <li key={item.id || idx} className="flex justify-between items-center text-sm text-gray-400 py-1 hover:bg-white/5 px-2 rounded group">
                             <div className="flex items-center gap-2 truncate">
                               {item.type === 'vimeo' ? '🔗' : '📄'} <span>{item.name}</span>
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
              </div>
            )}
          </div>

          {/* Teacher Roster */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-black/20">
              <h3 className="text-white font-semibold">Active Teachers ({teamRoles.length})</h3>
            </div>
            <ul className="divide-y divide-white/5">
              {teamRoles.map(role => (
                <li key={role.email} className="px-6 py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-white/5 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                       {role.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium break-all">{role.email}</p>
                      <p className="text-xs text-indigo-400 uppercase tracking-wider font-bold mt-0.5">{role.role}</p>
                    </div>
                  </div>
                  <button 
                     onClick={async () => {
                       if (!confirm(`Revoke teaching access for ${role.email}?`)) return;
                       try {
                         const res = await fetch('/api/admin/roles', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email: role.email })});
                         if (!res.ok) throw new Error(await res.text());
                         setAllRoles((prev: any[]) => prev.map(r => r.email === role.email ? { ...r, role: 'student' } : r));
                       } catch(err: any) { alert(err.message); }
                     }}
                     className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition shrink-0"
                  >
                    Revoke
                  </button>
                </li>
              ))}
              {teamRoles.length === 0 && (
                <li className="px-6 py-8 text-center text-gray-500 text-sm">No external teachers have been granted access yet.</li>
              )}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
