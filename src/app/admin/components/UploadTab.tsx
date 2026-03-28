'use client';

import { useState } from 'react';
import { SubjectMeta, LessonMeta } from '@/types';

interface UploadTabProps {
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  selectedLessonId: string;
  setSelectedLessonId: (id: string) => void;
  localSubjects: SubjectMeta[];
  activeLessons: LessonMeta[];
  handleCreateSubject: () => void;
  handleCreateLesson: () => void;
  refreshPageData: () => void;
}

export default function UploadTab({
  selectedSubjectId,
  setSelectedSubjectId,
  selectedLessonId,
  setSelectedLessonId,
  localSubjects,
  activeLessons,
  handleCreateSubject,
  handleCreateLesson,
  refreshPageData
}: UploadTabProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [inputType, setInputType] = useState<'file' | 'link'>('file');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [vimeoTitle, setVimeoTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('0 MB/s');
  const [currentFileName, setCurrentFileName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [subfolder, setSubfolder] = useState('');

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
        reject(new Error(`Network error during R2 upload. Check CORS settings.`));
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
          const relativePath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || '';
          const pathSegments = relativePath.split('/');
          const relativeFilePath = pathSegments.length > 1 ? pathSegments.slice(1).join('/') : file.name;

          setCurrentFileName(relativeFilePath);
          setStatusMessage(`Processing: ${relativeFilePath} (${completed + 1}/${total})`);
          
          let itemType = 'file';
          let vimeoId = '';

          if (file.name.toLowerCase().endsWith('.vimeo')) {
            itemType = 'vimeo';
            try {
              const fileContent = await file.text();
              const idMatch = fileContent.match(/(?:vimeo\.com\/|video\/)(\d+)/);
              vimeoId = idMatch ? idMatch[1] : fileContent.trim();
            } catch (e) { console.error('Failed to read .vimeo file', e); }
          }

          const subject = localSubjects.find(s => s.id === selectedSubjectId);
          const lesson = activeLessons.find(l => l.id === selectedLessonId);
          
          if (!lesson) throw new Error('No lesson selected');

          const initRes = await fetch('/api/admin/upload-initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              relativeFilePath,
              subjectSlug: subject?.slug || 'unknown',
              lessonSlug: lesson.slug || 'unknown',
              contentType: file.type || 'application/octet-stream',
              subfolder: subfolder.trim() || undefined
            })
          });

          if (!initRes.ok) throw new Error(`Initiate failed for ${relativeFilePath}`);
          const { signedUrl, publicUrl } = await initRes.json();
          await uploadFileWithProgress(file, signedUrl, file.type);

          const compRes = await fetch('/api/admin/upload-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subjectId: selectedSubjectId,
              lessonId: selectedLessonId,
              fileName: relativeFilePath,
              fileType: getFileType(file.type),
              publicUrl,
              itemType,
              vimeoId
            })
          });

          if (!compRes.ok) throw new Error(`Completion failed for ${file.name}`);
          completed++;
        }
        
        setStatusMessage(`Success: ${completed} assets verified!`);
        setFiles([]);
        setCurrentFileName('');
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatusMessage(`Error: ${message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
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
                      {activeLessons.map((l: LessonMeta) => <option key={l.id} value={l.id}>{l.title}</option>)}
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
                         <button type="button" className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white border-indigo-500 shadow-lg">Cloudflare R2</button>
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

                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">04 Subfolder (Optional)</label>
                    <input type="text" placeholder="e.g., Chapter 1 or Labs/Week 2" value={subfolder} onChange={e => setSubfolder(e.target.value)} disabled={uploading} className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-gray-700" />
                 </div>

                 {inputType === 'file' ? (
                   <div className="space-y-4">
                     <input id="file-input" type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} disabled={uploading}/>
                     <input id="folder-input" type="file" {...({ webkitdirectory: "", directory: "" } as Record<string, string | boolean>)} className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} disabled={uploading}/>

                     <div className="grid grid-cols-2 gap-4">
                       <button type="button" onClick={() => document.getElementById('file-input')?.click()} disabled={uploading} className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-[2rem] border-white/10 hover:border-indigo-500/30 bg-black/50 transition-all group">
                         <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl mb-3">📄</div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Select Files</p>
                       </button>
                       <button type="button" onClick={() => document.getElementById('folder-input')?.click()} disabled={uploading} className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-[2rem] border-white/10 hover:border-indigo-500/30 bg-black/50 transition-all group">
                         <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl mb-3">📂</div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Select Folder</p>
                       </button>
                     </div>
                     {files.length > 0 && <p className="text-center text-[10px] font-black text-indigo-400 uppercase">{files.length} Assets Selected</p>}
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <input type="text" placeholder="Title" value={vimeoTitle} onChange={e => setVimeoTitle(e.target.value)} className="bg-black border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                     <input type="text" placeholder="URL" value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} className="bg-black border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                   </div>
                 )}

                 {uploading && (
                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-indigo-400 uppercase">Active Transmission</p>
                          <p className="text-sm font-black text-white truncate max-w-sm">{currentFileName}</p>
                        </div>
                        <p className="text-sm font-black text-indigo-400">{uploadSpeed}</p>
                      </div>
                      <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                      </div>
                   </div>
                 )}

                 {statusMessage && <div className="p-6 rounded-2xl text-[10px] font-black uppercase text-center bg-white/5 border border-white/10">{statusMessage}</div>}

                 <button type="submit" disabled={!selectedLessonId || uploading} className="w-full bg-white text-black font-black py-6 rounded-[2rem] hover:bg-gray-200 uppercase tracking-widest text-[10px] shadow-2xl transition-all">
                   {uploading ? 'Processing...' : 'Execute Transaction'}
                 </button>
              </div>
           </div>
         )}
      </div>
    </form>
  );
}
