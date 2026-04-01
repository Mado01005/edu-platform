'use client';

import { useState } from 'react';
import { SubjectMeta, LessonMeta } from '@/types';

interface ContentUploaderProps {
  selectedSubjectId: string;
  selectedLessonId?: string;
  currentPathId?: string;
  currentPath?: string;
  onComplete: () => void;
  localSubjects?: SubjectMeta[];
  activeLessons?: LessonMeta[];
  subjectSlug?: string;
  lessonSlug?: string;
  variant?: 'full' | 'compact';
}

// Formats that browsers CANNOT render. These must be converted before upload.
const UNSUPPORTED_IMAGE_EXTENSIONS = ['.heic', '.heif', '.dng'];

function isUnsupportedImage(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return UNSUPPORTED_IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export default function ContentUploader({
  selectedSubjectId,
  selectedLessonId,
  currentPathId,
  currentPath = '',
  onComplete,
  localSubjects = [],
  activeLessons = [],
  subjectSlug,
  lessonSlug,
  variant = 'full'
}: ContentUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [inputType, setInputType] = useState<'file' | 'link'>('file');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [vimeoTitle, setVimeoTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('0 MB/s');
  const [currentFileName, setCurrentFileName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const getFileType = (mime: string, fileName?: string) => {
    const m = mime.toLowerCase();
    const f = (fileName || '').toLowerCase();
    if (m.includes('pdf') || f.endsWith('.pdf')) return 'pdf';
    if (m.includes('image') || f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.gif')) return 'image';
    if (m.includes('video') || f.endsWith('.mp4') || f.endsWith('.mov')) return 'video';
    if (m.includes('presentation') || m.includes('powerpoint') || f.endsWith('.pptx')) return 'powerpoint';
    return 'unknown';
  };

  /**
   * BULLETPROOF CLIENT-SIDE CONVERSION
   * Converts ALL non-web-safe image formats to .webp BEFORE any network call.
   * - .heic / .heif → converted via heic2any
   * - .dng → converted via heic2any (it handles some RAW) with canvas fallback
   * If conversion fails entirely, the file is REJECTED — it never reaches R2.
   */
  const convertToWebSafe = async (file: File): Promise<File> => {
    const lower = file.name.toLowerCase();

    if (!isUnsupportedImage(file.name)) {
      return file; // Already web-safe, pass through
    }

    const newName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
    setStatusMessage(`Converting ${file.name} → ${newName}...`);

    // Attempt 1: heic2any (works for HEIC/HEIF, may work for some DNG)
    try {
      const heic2any = (await import('heic2any')).default;
      const result = await heic2any({
        blob: file,
        toType: 'image/webp',
        quality: 0.85
      });
      const blob = Array.isArray(result) ? result[0] : result;
      return new File([blob], newName, { type: 'image/webp' });
    } catch (heicErr) {
      console.warn(`heic2any failed for ${file.name}, trying canvas fallback:`, heicErr);
    }

    // Attempt 2: Canvas fallback (for DNG or any file the browser CAN decode)
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(bitmap, 0, 0);
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Canvas toBlob returned null')),
          'image/webp',
          0.85
        );
      });
      bitmap.close();
      return new File([webpBlob], newName, { type: 'image/webp' });
    } catch (canvasErr) {
      console.warn(`Canvas fallback failed for ${file.name}:`, canvasErr);
    }

    // BOTH conversion paths failed → REJECT the file
    throw new Error(
      `Cannot convert ${file.name} to a web-safe format. ` +
      `Please convert it to .jpg or .png manually before uploading.`
    );
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
        
        for (let file of files) {
          // ── STEP 0: Convert non-web-safe images to .webp ──
          // This happens BEFORE any network call. If conversion fails, the file
          // is rejected and never touches R2 or the database.
          file = await convertToWebSafe(file);

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

          const sSlug = subjectSlug || localSubjects.find(s => s.id === selectedSubjectId)?.slug || 'unknown';
          const lSlug = lessonSlug || activeLessons.find(l => l.id === selectedLessonId)?.slug || 'unknown';
          
          // ── STEP 1: Initiate presigned upload (always standard path now) ──
          const initRes = await fetch('/api/admin/upload-initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              relativeFilePath,
              subjectSlug: sSlug,
              lessonSlug: lSlug,
              contentType: file.type || 'application/octet-stream',
              subfolder: currentPath.trim() || undefined
            })
          });

          if (!initRes.ok) throw new Error(`Initiate failed for ${relativeFilePath}`);
          const { signedUrl, publicUrl } = await initRes.json();

          // ── STEP 2: Upload directly to R2 via presigned URL ──
          await uploadFileWithProgress(file, signedUrl, file.type);

          // ── STEP 3: Register in Supabase ──
          const compRes = await fetch('/api/admin/upload-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subjectId: selectedSubjectId,
              lessonId: selectedLessonId,
              parentId: currentPathId || null,
              fileName: relativeFilePath,
              fileType: getFileType(file.type, relativeFilePath),
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
        onComplete();
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
        onComplete();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatusMessage(`Error: ${message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl">
        <input 
          id="compact-file-input" 
          type="file" 
          multiple 
          className="hidden" 
          onChange={(e) => {
            const selectedFiles = Array.from(e.target.files || []);
            setFiles(selectedFiles);
          }} 
          disabled={uploading}
        />
        <button 
          type="button" 
          onClick={() => document.getElementById('compact-file-input')?.click()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-500/20"
          disabled={uploading}
        >
          {uploading ? '...' : '↑ Upload Assets'}
        </button>

        {files.length > 0 && !uploading && (
           <button 
             onClick={(e) => processUploadOrEmbed(e)}
             className="bg-white text-black text-[10px] font-black uppercase px-6 py-3 rounded-xl hover:bg-gray-200 transition-all shrink-0"
           >
             Start ({files.length})
           </button>
        )}

        {uploading && (
          <div className="flex-1 flex items-center gap-4 animate-pulse">
            <div className="text-[10px] font-black text-indigo-400 uppercase truncate max-w-[100px]">{currentFileName}</div>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="text-[10px] font-bold text-gray-500">{uploadSpeed}</div>
          </div>
        )}

        {!uploading && files.length === 0 && (
           <p className="text-[10px] font-medium text-gray-500 italic">Select one or more files to transmit to {currentPath || 'root'}</p>
        )}

        {statusMessage && !uploading && files.length === 0 && (
          <p className="text-[10px] font-black text-indigo-400 uppercase animate-in fade-in slide-in-from-right-4">{statusMessage}</p>
        )}
      </div>
    );
  }

  return (
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

       <button onClick={(e) => processUploadOrEmbed(e)} disabled={!selectedLessonId || uploading} className="w-full bg-white text-black font-black py-6 rounded-[2rem] hover:bg-gray-200 uppercase tracking-widest text-[10px] shadow-2xl transition-all">
         {uploading ? 'Processing...' : 'Execute Transaction'}
       </button>
    </div>
  );
}
