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
    <div className="relative z-40 mb-10 animate-in slide-in-from-top-4 duration-300">
      <div className="rounded-[2.5rem] border border-emerald-950/10 bg-white p-6 shadow-sm shadow-emerald-950/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-[#084B2B]"></span>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#084B2B]">Contextual Management</h3>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
              Scope: <span className="text-slate-600">{lesson ? `${subject.slug} / ${lesson.slug}` : subject.slug}</span>
              {currentPath && <span className="ml-2 text-[#084B2B]">→ {currentPath}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowUploader(!showUploader)}
              className={`rounded-2xl border px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
                showUploader 
                  ? 'border-emerald-200/60 bg-emerald-50 text-[#084B2B]'
                  : 'border-[#084B2B] bg-[#084B2B] text-white hover:bg-[#063B22] active:translate-y-0'
              }`}
            >
              {showUploader ? 'Close Uploader' : '↑ Upload Content'}
            </button>
            <button 
              onClick={() => setIsCreatingFolder(true)}
              className="rounded-2xl border border-emerald-950/10 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 hover:shadow-md active:translate-y-0"
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
              <div className="mt-6 border-t border-emerald-950/10 pt-6">
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
              <div className="mt-6 border-t border-emerald-950/10 pt-6">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-xl">📁</div>
                  <input 
                    autoFocus
                    placeholder={`Enter ${lesson ? 'folder' : 'lesson'} name...`}
                    className="flex-1 border-none bg-transparent px-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCreateFolder}
                      disabled={isSubmitting}
                      className="rounded-xl bg-[#084B2B] px-5 py-2.5 text-[10px] font-black uppercase text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063B22] hover:shadow-md disabled:translate-y-0 disabled:opacity-50"
                    >
                      {isSubmitting ? '...' : 'Create'}
                    </button>
                    <button 
                      onClick={() => setIsCreatingFolder(false)}
                      className="flex size-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
