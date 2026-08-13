'use client';

import { useState } from 'react';
import { SubjectMeta, LessonMeta } from '@/types';
import { useAdmin } from '../context/AdminContext';

interface UploadTabProps {
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  selectedLessonId: string;
  setSelectedLessonId: (id: string) => void;
  localSubjects: SubjectMeta[];
  activeLessons: LessonMeta[];
  refreshPageData: () => void;
}

import ContentUploader from '@/components/Admin/ContentUploader';
import { useMemo } from 'react';

export default function UploadTab({
  selectedSubjectId,
  setSelectedSubjectId,
  selectedLessonId,
  setSelectedLessonId,
  localSubjects,
  activeLessons,
  refreshPageData
}: UploadTabProps) {
  const [subfolder, setSubfolder] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const { handleCreateSubject, handleCreateLesson } = useAdmin();

  const currentLesson = useMemo(() => 
    activeLessons.find(l => l.id === selectedLessonId),
    [activeLessons, selectedLessonId]
  );

  const availableFolders = useMemo(() => {
    const folders: { id: string; name: string; level: number }[] = [];
    const traverse = (nodes: any[], level: number) => {
      nodes.forEach(node => {
        if (node.type === 'folder') {
          folders.push({ id: node.id, name: node.name, level });
          if (node.children) traverse(node.children, level + 1);
        }
      });
    };
    if (currentLesson?.content) traverse(currentLesson.content, 0);
    return folders;
  }, [currentLesson]);

  return (
    <div className="space-y-12 pb-20">
      <div className="space-y-4 max-w-2xl text-center md:text-left mx-auto md:mx-0">
        <h2 className="text-4xl font-black leading-none tracking-tight text-slate-900 sm:text-5xl">Add New Lesson</h2>
        <p className="text-sm font-medium leading-relaxed text-slate-600">Choose a subject and lesson, then add files, videos, or links.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
         <div className="xl:col-span-4 space-y-6">
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">1. Select Subject and Lesson</label>
               <div className="space-y-4">
                  <select className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedLessonId(''); }}>
                    <option value="">Select Subject / Course</option>
                    {localSubjects.map(s => <option key={s.id} value={s.id!}>{s.icon} {s.title}</option>)}
                  </select>
                  {selectedSubjectId && (
                    <select className="w-full animate-in rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 slide-in-from-top-2" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)}>
                      <option value="">Select Lesson</option>
                      {activeLessons.map((l: LessonMeta) => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={handleCreateSubject} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-[9px] font-black uppercase tracking-widest text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">+ Create Subject</button>
                    {selectedSubjectId && <button type="button" onClick={() => handleCreateLesson(selectedSubjectId)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-[9px] font-black uppercase tracking-widest text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">+ Create Lesson</button>}
                  </div>
               </div>
            </div>
         </div>

         {selectedLessonId && (
           <div className="xl:col-span-8 space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">2. Save In</label>
                  <select 
                    className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                  >
                    <option value="">-- Lesson Root --</option>
                    {availableFolders.map(f => (
                      <option key={f.id} value={f.id}>
                        {'\u00A0'.repeat(f.level * 3)} ↳ {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Optional Subfolder</label>
                  <input type="text" placeholder="e.g., Chapter 1" value={subfolder} onChange={e => setSubfolder(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
                </div>
              </div>
              
              <ContentUploader 
                selectedSubjectId={selectedSubjectId}
                selectedLessonId={selectedLessonId}
                currentPath={subfolder}
                currentPathId={selectedFolderId || undefined}
                onComplete={refreshPageData}
                localSubjects={localSubjects}
                activeLessons={activeLessons}
              />
           </div>
         )}
      </div>
    </div>
  );
}
