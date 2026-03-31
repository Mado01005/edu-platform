'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ContentUploader from './ContentUploader';

interface AdminActionBarProps {
  subject: {
    id: string;
    slug: string;
    title: string;
  };
  lesson?: {
    id: string;
    slug: string;
    title: string;
  };
  currentPath?: string;
  currentPathId?: string;
  onFolderCreated?: () => void;
}

export default function AdminActionBar({ 
  subject, 
  lesson, 
  currentPath = '', 
  currentPathId,
  onFolderCreated 
}: AdminActionBarProps) {
  const router = useRouter();
  const [showUploader, setShowUploader] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson?.id || null, // Can be null if creating a lesson/folder at subject level
          subjectId: subject.id,
          folderName: newFolderName.trim(),
          parentId: currentPathId || null
        })
      });
      if (!res.ok) throw new Error('Failed to create folder');
      setNewFolderName('');
      setIsCreatingFolder(false);
      if (onFolderCreated) onFolderCreated();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-10 animate-in slide-in-from-top-4 duration-500 relative z-40">
      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] p-6 backdrop-blur-xl shadow-[0_20px_50px_-15px_rgba(99,102,241,0.15)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
              <h3 className="text-sm font-black text-indigo-300 uppercase tracking-widest">Contextual Management</h3>
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
              Scope: <span className="text-gray-400">{lesson ? `${subject.slug} / ${lesson.slug}` : subject.slug}</span>
              {currentPath && <span className="text-indigo-400/60 ml-2">→ {currentPath}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowUploader(!showUploader)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                showUploader 
                  ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                  : 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 hover:scale-105 active:scale-95'
              }`}
            >
              {showUploader ? 'Close Uploader' : '↑ Transmission Hub'}
            </button>
            <button 
              onClick={() => setIsCreatingFolder(true)}
              className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
            >
              + New {lesson ? 'Subfolder' : 'Module'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showUploader && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden"
            >
              <div className="pt-6 mt-6 border-t border-white/5">
                <ContentUploader 
                  variant="compact"
                  selectedSubjectId={subject.id}
                  selectedLessonId={lesson?.id}
                  currentPathId={currentPathId}
                  currentPath={currentPath}
                  subjectSlug={subject.slug}
                  lessonSlug={lesson?.slug}
                  onComplete={() => {
                    setShowUploader(false);
                    router.refresh();
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCreatingFolder && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden"
            >
              <div className="pt-6 mt-6 border-t border-white/5">
                <div className="flex items-center gap-3 p-4 bg-black/40 border border-white/5 rounded-2xl ring-1 ring-white/5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl shadow-inner">📁</div>
                  <input 
                    autoFocus
                    placeholder={`Enter ${lesson ? 'folder' : 'lesson'} name...`}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white px-2 font-medium placeholder:text-gray-600"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCreateFolder}
                      disabled={isSubmitting}
                      className="bg-white text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? '...' : 'Create'}
                    </button>
                    <button 
                      onClick={() => setIsCreatingFolder(false)}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
