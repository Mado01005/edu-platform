'use client';

import { useState } from 'react';
import { SubjectMeta, LessonMeta, ContentNode } from '@/types';
import { useAdmin } from '../context/AdminContext';

interface ManageTabProps {
  localSubjects: SubjectMeta[];
}

export default function ManageTab({
  localSubjects
}: ManageTabProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const { handleDelete, handleRename, handleMove, handleBatchDelete } = useAdmin();

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const toggleLesson = (id: string) => {
    const next = new Set(expandedLessons);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedLessons(next);
  };

  const onBatchDelete = () => {
    if (selectedItems.size === 0) return;
    handleBatchDelete(Array.from(selectedItems));
    setSelectedItems(new Set());
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <div className="space-y-4 max-w-2xl px-2">
        <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Course &amp; Lesson Manager</h2>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">Review subjects, lessons, folders, and uploaded files.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {localSubjects.map(subject => (
          <div key={subject.id} className="card-hover overflow-hidden rounded-[3rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50 p-8">
              <h3 className="flex items-center gap-3 text-lg font-black tracking-tight text-slate-900">{subject.icon} {subject.title}</h3>
              <div className="flex gap-2">
                 <button onClick={() => handleRename('subject', subject.id ?? '', subject.title)} className="rounded-2xl p-3 text-slate-500 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-700 hover:shadow-md">✏️</button>
                 <button onClick={() => handleDelete('subject', subject.id ?? '', subject.title)} className="p-3 hover:bg-red-500/10 rounded-2xl transition text-red-500">🗑️</button>
              </div>
            </div>
            <div className="divide-y divide-slate-200/80">
              {(subject.lessons as LessonMeta[]).map((lesson: LessonMeta) => (
                <div key={lesson.id} className="p-8 pb-10 group">
                  <div className={`flex cursor-pointer items-center justify-between rounded-2xl p-4 transition-all duration-200 ease-in-out ${expandedLessons.has(lesson.id!) ? 'mb-6 bg-sky-50' : 'hover:bg-slate-50'}`} onClick={() => toggleLesson(lesson.id!)}>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs transition-transform duration-300 ${expandedLessons.has(lesson.id!) ? 'rotate-90' : 'rotate-0'}`}>▶</span>
                      <h4 className={`text-md font-bold uppercase tracking-widest transition-colors ${expandedLessons.has(lesson.id!) ? 'text-sky-700' : 'text-slate-600'}`}>📂 {lesson.title}</h4>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleMove('lesson', lesson.id ?? '', lesson.title)} className="rounded-lg border border-sky-200/60 bg-sky-50 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-sky-700 transition hover:bg-sky-100">Move</button>
                      <button onClick={() => handleRename('lesson', lesson.id ?? '', lesson.title)} className="rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-100">Rename</button>
                      <button onClick={() => handleDelete('lesson', lesson.id ?? '', lesson.title)} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-500/5 text-red-500 border border-red-500/10 rounded-lg hover:bg-red-500/10 transition">Delete</button>
                    </div>
                  </div>
                  {expandedLessons.has(lesson.id!) && (
                     <ul className="space-y-2 mt-4 animate-in slide-in-from-top-2 duration-300">
                      {lesson.content?.length === 0 && (
                        <p className="px-6 text-[9px] italic text-slate-500">No files added yet</p>
                      )}
                      {lesson.content?.map((item: ContentNode) => (
                        <li key={item.id} className="card-hover group/item flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-6 py-4 text-xs shadow-sm shadow-slate-200/50">
                          <div className="flex items-center gap-4">
                            <input type="checkbox" checked={selectedItems.has(item.id ?? '')} onChange={() => toggleSelectItem(item.id ?? '')} className="accent-indigo-500 w-4 h-4 rounded-lg" />
                            <span className="text-lg font-normal text-slate-500">
                              {item.type === 'folder' ? '📁' :
                               item.type === 'vimeo' ? '🎬' : 
                               item.fileType === 'video' ? '📽️' : 
                               item.fileType === 'pdf' ? '📕' : 
                               item.fileType === 'image' ? '🖼️' : 
                               item.name.toLowerCase().endsWith('.docx') || item.name.toLowerCase().endsWith('.doc') ? '📝' : 
                               '📄'}
                            </span>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{item.name}</span>
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border ${
                                  item.type === 'folder' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  item.type === 'vimeo' || item.fileType === 'video' ? 'bg-sky-50 border-sky-200/60 text-sky-700' :
                                  item.fileType === 'pdf' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                  item.name.toLowerCase().includes('.doc') ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                  'bg-slate-50 border-slate-200/80 text-slate-600'
                                }`}>
                                  {item.type === 'folder' ? 'FOLDER' : item.type === 'vimeo' ? 'VIMEO' : (item.fileType || 'FILE').toUpperCase()}
                                </span>
                              </div>
                              {item.type !== 'folder' && (
                                <span className="font-mono text-[8px] uppercase tracking-tighter text-slate-500 opacity-70">{item.id}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3 opacity-0 group-hover/item:opacity-100 transition-all">
                            <button onClick={() => handleMove('item', item.id ?? '', item.name ?? '')} className="text-[7px] font-black uppercase tracking-widest text-sky-700 transition hover:text-sky-800">Move</button>
                            <button onClick={() => handleRename('item', item.id ?? '', item.name ?? '')} className="text-[7px] font-black uppercase tracking-widest text-slate-500 transition hover:text-slate-900">Rename</button>
                            <button onClick={() => handleDelete('item', item.id ?? '', item.name ?? '')} className="text-red-500 hover:scale-125 transition">🗑️</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!localSubjects.length ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 lg:col-span-2">
            No subjects or lessons created yet. Open Add lessons to create the
            first subject.
          </p>
        ) : null}
      </div>

      {selectedItems.size > 0 && (
        <div className="fixed bottom-10 left-[calc(320px+50%)] -translate-x-1/2 bg-red-500 text-white p-8 rounded-[3rem] flex items-center gap-12 shadow-2xl z-[100] animate-in zoom-in-95">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-black text-2xl shadow-inner">!</div>
              <div>
                <p className="font-black uppercase tracking-[0.2em] text-sm">{selectedItems.size} Selected Files</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Ready to delete</p>
              </div>
           </div>
           <div className="flex gap-4">
              <button onClick={() => setSelectedItems(new Set())} className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition px-4">Cancel</button>
              <button onClick={onBatchDelete} className="rounded-2xl border border-red-200/60 bg-white px-10 py-4 text-[10px] font-black uppercase tracking-widest text-red-700 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md">Delete Selected</button>
           </div>
        </div>
      )}
    </div>
  );
}
