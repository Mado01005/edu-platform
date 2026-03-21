'use client';

import { useState } from 'react';

// Using inline types to represent the fetched data structure
type AdminClientProps = {
  subjects: any[];
};

export default function AdminClient({ subjects }: AdminClientProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  
  // We allow either selecting an existing lesson or creating a new one (future feature, for now just existing)
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const activeSubject = subjects.find(s => s.id === selectedSubjectId);
  const activeLessons = activeSubject?.lessons || [];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedSubjectId || !selectedLessonId) {
      setStatusMessage('Please select a subject, lesson, and file.');
      return;
    }

    setUploading(true);
    setProgress(10);
    setStatusMessage('Initiating secure upload...');

    try {
      const subjectSlug = activeSubject.slug;
      const lessonSlug = activeLessons.find((l: any) => l.id === selectedLessonId)?.slug;

      // 1. Get signed URL
      const initiateRes = await fetch('/api/admin/upload-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          subjectSlug,
          lessonSlug
        })
      });

      if (!initiateRes.ok) throw new Error('Failed to initiate upload');
      const { signedUrl, publicUrl } = await initiateRes.json();
      
      setProgress(30);
      setStatusMessage('Uploading to cloud storage...');

      // 2. Upload directly to Supabase Storage using XMLHttpRequest to track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        // Supabase requires the exact content type
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 60) + 30; // Scale 30-90%
            setProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      setProgress(90);
      setStatusMessage('Finalizing database records...');

      // Determine basic file type for DB
      let fileType = 'unknown';
      if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type === 'application/pdf') fileType = 'pdf';

      // 3. Mark upload as complete in Postgres DB
      const completeRes = await fetch('/api/admin/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          lessonId: selectedLessonId,
          fileName: file.name,
          fileType,
          publicUrl
        })
      });

      if (!completeRes.ok) throw new Error('Failed to register file in database');

      setProgress(100);
      setStatusMessage('Upload complete! The file is now live.');
      setFile(null); // Reset form

    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 3000);
    }
  };

  return (
    <div className="glass-card p-6 md:p-8 rounded-2xl max-w-2xl border border-white/5">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
        </svg>
        Direct Cloud Upload
      </h2>

      <form onSubmit={handleUpload} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Select Subject</label>
          <select 
            className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSelectedLessonId(''); // reset lesson when subject changes
            }}
            disabled={uploading}
          >
            <option value="">-- Choose a Subject --</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.icon} {subject.title}</option>
            ))}
          </select>
        </div>

        {selectedSubjectId && (
          <div className="fade-in">
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Lesson</label>
            <select 
              className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              disabled={uploading}
            >
              <option value="">-- Choose a Lesson --</option>
              {activeLessons.map((lesson: any) => (
                <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
              ))}
            </select>
            {activeLessons.length === 0 && (
              <p className="text-yellow-500 text-sm mt-2">This subject has no lessons. You need to create one first.</p>
            )}
          </div>
        )}

        {selectedLessonId && (
          <div className="fade-in">
            <label className="block text-sm font-medium text-gray-400 mb-2">Select File (Video, PDF, Image)</label>
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-dashed border-white/10 hover:border-indigo-400 bg-[#1A1A1E]'} rounded-xl cursor-pointer transition-all`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {file ? (
                  <p className="text-sm font-semibold text-indigo-300">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                ) : (
                  <p className="text-sm text-gray-400"><span className="font-semibold text-white">Click to select</span> or drag and drop</p>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {statusMessage && (
          <div className={`p-3 rounded-lg text-sm font-medium ${statusMessage.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-300'}`}>
            {statusMessage}
          </div>
        )}

        {uploading && progress > 0 && (
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || !selectedSubjectId || !selectedLessonId || uploading}
          className="w-full relative overflow-hidden group bg-white text-black font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white flex items-center justify-center gap-2"
        >
          {uploading ? 'Uploading...' : 'Upload to Cloud'}
        </button>
      </form>
    </div>
  );
}
