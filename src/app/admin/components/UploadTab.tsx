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
        <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Initialize Deployment</h2>
        <p className="text-sm text-gray-400 font-medium leading-relaxed">Transmit encrypted educational content to the global infrastructure clusters.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
         <div className="xl:col-span-4 space-y-6">
            <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">01 Target Coordinates</label>
               <div className="space-y-4">
                  <select className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer" value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedLessonId(''); }}>
                    <option value="">-- Select Subject Cluster --</option>
                    {localSubjects.map(s => <option key={s.id} value={s.id!}>{s.icon} {s.title}</option>)}
                  </select>
                  {selectedSubjectId && (
                    <select className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all animate-in slide-in-from-top-2" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)}>
                      <option value="">-- Select Deployment Unit --</option>
                      {activeLessons.map((l: LessonMeta) => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={handleCreateSubject} className="flex-1 text-[9px] font-black uppercase tracking-widest py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition">+ Create Folder</button>
                    {selectedSubjectId && <button type="button" onClick={() => handleCreateLesson(selectedSubjectId)} className="flex-1 text-[9px] font-black uppercase tracking-widest py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition">+ Create Module</button>}
                  </div>
               </div>
            </div>
         </div>

         {selectedLessonId && (
           <div className="xl:col-span-8 space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block">03 Target Folder</label>
                  <select 
                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
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
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block">04 Virtual Path (Optional)</label>
                  <input type="text" placeholder="e.g., Chapter 1" value={subfolder} onChange={e => setSubfolder(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-gray-700" />
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
