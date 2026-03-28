'use client';

import { useState } from 'react';
import { SubjectMeta, LessonMeta, ContentNode } from '@/types';

interface ManageTabProps {
  localSubjects: SubjectMeta[];
  handleDelete: (type: 'subject' | 'lesson' | 'item', id: string, name: string) => void;
  handleRename: (type: 'subject' | 'lesson' | 'item', id: string, oldName: string) => void;
  handleMove: (type: 'lesson' | 'item', id: string, name: string) => void;
  handleBatchDelete: (ids: string[]) => void;
}

export default function ManageTab({
  localSubjects,
  handleDelete,
  handleRename,
  handleMove,
  handleBatchDelete
}: ManageTabProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

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
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-4 max-w-2xl px-2">
        <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Curriculum Control</h2>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">Full administrative override for subjects, modules, and binary assets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {localSubjects.map(subject => (
          <div key={subject.id} className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden transition-all duration-500 hover:border-white/20 hover:shadow-2xl">
            <div className="flex items-center justify-between p-8 bg-white/5 border-b border-white/5">
              <h3 className="text-lg font-black text-white flex gap-3 items-center tracking-tight">{subject.icon} {subject.title}</h3>
              <div className="flex gap-2">
                 <button onClick={() => handleRename('subject', subject.id ?? '', subject.title)} className="p-3 hover:bg-white/10 rounded-2xl transition text-gray-500">✏️</button>
                 <button onClick={() => handleDelete('subject', subject.id ?? '', subject.title)} className="p-3 hover:bg-red-500/10 rounded-2xl transition text-red-500">🗑️</button>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {(subject.lessons as LessonMeta[]).map((lesson: LessonMeta) => (
                <div key={lesson.id} className="p-8 pb-10 group">
                  <div className={`flex items-center justify-between cursor-pointer rounded-2xl p-4 transition-all duration-300 ${expandedLessons.has(lesson.id!) ? 'bg-white/5 mb-6' : 'hover:bg-white/[0.02]'}`} onClick={() => toggleLesson(lesson.id!)}>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs transition-transform duration-300 ${expandedLessons.has(lesson.id!) ? 'rotate-90' : 'rotate-0'}`}>▶</span>
                      <h4 className={`text-md font-bold uppercase tracking-widest transition-colors ${expandedLessons.has(lesson.id!) ? 'text-indigo-400' : 'text-gray-500'}`}>📂 {lesson.title}</h4>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleMove('lesson', lesson.id ?? '', lesson.title)} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded-lg hover:bg-indigo-500/20 transition">Move</button>
                      <button onClick={() => handleRename('lesson', lesson.id ?? '', lesson.title)} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition">Rename</button>
                      <button onClick={() => handleDelete('lesson', lesson.id ?? '', lesson.title)} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-500/5 text-red-500 border border-red-500/10 rounded-lg hover:bg-red-500/10 transition">Delete</button>
                    </div>
                  </div>
                  {expandedLessons.has(lesson.id!) && (
                     <ul className="space-y-2 mt-4 animate-in slide-in-from-top-2 duration-300">
                      {lesson.content?.length === 0 && (
                        <p className="text-[9px] text-gray-700 italic px-6">Folder is currently empty</p>
                      )}
                      {lesson.content?.map((item: ContentNode) => (
                        <li key={item.id} className="flex justify-between items-center text-xs py-4 px-6 rounded-2xl hover:bg-white/5 transition border border-transparent hover:border-white/5 group/item bg-black/40">
                          <div className="flex items-center gap-4">
                            <input type="checkbox" checked={selectedItems.has(item.id ?? '')} onChange={() => toggleSelectItem(item.id ?? '')} className="accent-indigo-500 w-4 h-4 rounded-lg" />
                            <span className="text-gray-500 font-normal text-lg">
                              {item.type === 'vimeo' ? '🎬' : 
                               item.fileType === 'video' ? '📽️' : 
                               item.fileType === 'pdf' ? '📕' : 
                               item.fileType === 'image' ? '🖼️' : 
                               item.name.toLowerCase().endsWith('.docx') || item.name.toLowerCase().endsWith('.doc') ? '📝' : 
                               '📄'}
                            </span>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-300">{item.name}</span>
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border ${
                                  item.type === 'vimeo' || item.fileType === 'video' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                  item.fileType === 'pdf' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                  item.name.toLowerCase().includes('.doc') ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                  'bg-white/5 border-white/10 text-gray-500'
                                }`}>
                                  {item.type === 'vimeo' ? 'VIMEO' : (item.fileType || 'FILE').toUpperCase()}
                                </span>
                              </div>
                              <span className="text-[8px] text-gray-700 font-mono tracking-tighter opacity-50 uppercase">{item.id}</span>
                            </div>
                          </div>
                          <div className="flex gap-3 opacity-0 group-hover/item:opacity-100 transition-all">
                            <button onClick={() => handleMove('item', item.id ?? '', item.name ?? '')} className="text-[7px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition">Move</button>
                            <button onClick={() => handleRename('item', item.id ?? '', item.name ?? '')} className="text-[7px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition">Rename</button>
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
      </div>

      {selectedItems.size > 0 && (
        <div className="fixed bottom-10 left-[calc(320px+50%)] -translate-x-1/2 bg-red-500 text-white p-8 rounded-[3rem] flex items-center gap-12 shadow-2xl z-[100] animate-in zoom-in-95">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-black text-2xl shadow-inner">!</div>
              <div>
                <p className="font-black uppercase tracking-[0.2em] text-sm">{selectedItems.size} Selected Assets</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Marked for secure deletion</p>
              </div>
           </div>
           <div className="flex gap-4">
              <button onClick={() => setSelectedItems(new Set())} className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition px-4">Cancel</button>
              <button onClick={onBatchDelete} className="bg-black/20 hover:bg-black/40 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl">Purge Cluster</button>
           </div>
        </div>
      )}
    </div>
  );
}
