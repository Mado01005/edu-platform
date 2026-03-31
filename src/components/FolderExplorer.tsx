'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ContentNode } from '@/types';
import VideoPlayer from '@/components/VideoPlayer';
import PDFViewer from '@/components/PDFViewer';
import ImageGallery from '@/components/ImageGallery';
import VimeoPlayer from '@/components/VimeoPlayer';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import ContentUploader from '@/components/Admin/ContentUploader';
import AdminActionBar from '@/components/Admin/AdminActionBar';

interface FolderExplorerProps {
  content: ContentNode[];
  subject: {
    id: string;
    title: string;
    slug: string;
  };
  lesson: {
    id: string;
    title: string;
    slug: string;
  };
}

export default function FolderExplorer({ content, subject, lesson }: FolderExplorerProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathQuery = searchParams.get('path') || '';

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Reconstruct currentPath from the URL pathQuery
  const currentPath: ContentNode[] = [];
  let currentNodes = content;

  if (pathQuery) {
    const segments = pathQuery.split('/').filter(Boolean);
    for (const segment of segments) {
      const found = currentNodes.find(n => n.type === 'folder' && n.name === segment);
      if (found) {
        currentPath.push(found);
        currentNodes = found.children || [];
      } else {
        break;
      }
    }
  }

  const handleFolderClick = (folder: ContentNode) => {
    const newPath = currentPath.length > 0 
      ? `${pathQuery}/${folder.name}` 
      : folder.name;
    const url = new URL(window.location.href);
    url.searchParams.set('path', newPath);
    router.push(url.pathname + url.search);
  };

  const handleCrumbClick = (index: number) => {
    const url = new URL(window.location.href);
    if (index === -1) {
      url.searchParams.delete('path');
    } else {
      const newPath = currentPath.slice(0, index + 1).map(f => f.name).join('/');
      url.searchParams.set('path', newPath);
    }
    router.push(url.pathname + url.search);
  };


  const handleDeleteItem = async (itemId: string, fileUrl?: string) => {
    if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return;
    setIsDeleting(itemId);
    try {
      const res = await fetch('/api/admin/delete-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, fileUrl })
      });
      if (!res.ok) throw new Error('Failed to delete item');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting item');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMoveItem = async (itemId: string) => {
    const targetName = prompt('Enter the name of the folder to move this to (e.g. "Drafts"). Leave empty to move to root.');
    if (targetName === null) return;
    
    // Find the target folder ID in the current nodes or peer nodes
    // Simplified for now: just prompt for a folder ID or name
    // A better UI would be a dropdown of folders in the lesson.
    // We'll search for the folder by name in the WHOLE lesson content.
    
    let targetId: string | null = null;
    if (targetName.trim()) {
      const findFolder = (nodes: ContentNode[]): string | null => {
        for (const n of nodes) {
          if (n.type === 'folder' && n.name.toLowerCase() === targetName.toLowerCase()) return n.id!;
          if (n.children) {
            const found = findFolder(n.children);
            if (found) return found;
          }
        }
        return null;
      };
      targetId = findFolder(content);
      if (!targetId) return alert(`Folder "${targetName}" not found in this module.`);
    }

    try {
      const res = await fetch('/api/admin/move-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, targetParentId: targetId })
      });
      if (!res.ok) throw new Error('Failed to move item');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error moving item');
    }
  };

  const folders = currentNodes.filter(n => n.type === 'folder');
  
  const images = currentNodes
    .filter(c => c.type === 'file' && c.fileType === 'image' && c.url)
    .map(c => c.url!) as string[];
    
  const otherFiles = currentNodes.filter(c => !(c.type === 'file' && c.fileType === 'image') && c.type !== 'folder');

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    },
    exit: { opacity: 0 }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', bounce: 0.4, duration: 0.6 }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  return (
    <div className="w-full">
      {/* Dynamic Breadcrumbs */}
      <nav className="flex items-center gap-3 text-xs md:text-sm text-gray-500 mb-10 fade-in flex-wrap font-mono tracking-widest uppercase bg-white/5 border border-white/10 px-4 py-2 rounded-lg inline-flex" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:text-indigo-400 transition-colors flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span>
          SYS
        </Link>
        <svg className="w-4 h-4 flex-shrink-0 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/subjects/${encodeURIComponent(subject.slug)}`} className="hover:text-indigo-400 transition-colors">
          {subject.title}
        </Link>
        <svg className="w-4 h-4 flex-shrink-0 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        
        {currentPath.length === 0 ? (
          <span className="text-white font-bold">{lesson.title}</span>
        ) : (
          <button 
            onClick={() => handleCrumbClick(-1)} 
            className="hover:text-indigo-400 transition-colors hover:underline underline-offset-4"
          >
            {lesson.title}
          </button>
        )}

        {currentPath.map((folder, idx) => {
          const isLast = idx === currentPath.length - 1;
          return (
            <div key={`${folder.name}-${idx}`} className="flex items-center gap-3">
              <svg className="w-4 h-4 flex-shrink-0 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {isLast ? (
                <span className="text-white font-bold">{folder.name}</span>
              ) : (
                <button 
                  onClick={() => handleCrumbClick(idx)} 
                  className="hover:text-indigo-400 transition-colors hover:underline underline-offset-4"
                >
                  {folder.name}
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {/* Admin Action Bar */}
      {isAdmin && (
        <AdminActionBar 
          subject={subject}
          lesson={lesson}
          currentPath={pathQuery}
          currentPathId={currentPath[currentPath.length - 1]?.id}
        />
      )}

      {/* Folders Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathQuery + 'folders'}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          {folders.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Folders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {folders.map((folder, idx) => (
                  <motion.button
                    variants={itemVariants}
                    key={folder.name || `folder-${idx}`}
                    onClick={() => handleFolderClick(folder)}
                    className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.2)] text-left"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl shrink-0 group-hover:bg-indigo-500/20 transition-all duration-300">
                      📁
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate text-base group-hover:text-indigo-300 transition-colors">{folder.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{folder.children?.length || 0} items</p>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(folder.id!);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                          disabled={isDeleting === folder.id}
                        >
                          {isDeleting === folder.id ? '...' : '🗑️'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveItem(folder.id!);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-indigo-500/20 text-gray-500 hover:text-indigo-400 transition-all"
                        >
                          📦
                        </button>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Files Display */}
      <AnimatePresence mode="wait">
        <motion.div
           key={pathQuery + 'files'}
           variants={containerVariants}
           initial="hidden"
           animate="show"
           exit="exit"
        >
          {images.length > 0 && (
            <motion.div variants={itemVariants} className="mb-10">
              <ImageGallery images={images} title="Gallery" />
            </motion.div>
          )}

          {otherFiles.length > 0 && (
            <div className="space-y-8">
              {otherFiles.length > 0 && folders.length > 0 && (
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Files</h3>
              )}
              {otherFiles.map((node, idx) => {
                const uniqueKey = node.name || `file-${idx}`;
                if (node.type === 'vimeo' && node.vimeoId) {
                  return (
                    <motion.div variants={itemVariants} key={`vimeo-${uniqueKey}`} className="group relative">
                      <VimeoPlayer vimeoId={node.vimeoId} title={node.name} />
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteItem(node.id!)}
                          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-md rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 border border-white/10 transition-all"
                          disabled={isDeleting === node.id}
                        >
                          {isDeleting === node.id ? '...' : '🗑️'}
                        </button>
                      )}
                    </motion.div>
                  );
                }
                if (node.fileType === 'video' && node.url) {
                  return (
                    <motion.div variants={itemVariants} key={`video-${uniqueKey}`} className="group relative">
                      <div className="flex items-center justify-between mb-2 ml-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>🎬</span> <span>{node.name}</span>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleMoveItem(node.id!)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-indigo-500/20 text-indigo-400 border border-white/10 transition-all shadow-lg"
                            >
                              📦
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(node.id!, node.url)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-red-400 border border-white/10 transition-all shadow-lg"
                              disabled={isDeleting === node.id}
                            >
                              {isDeleting === node.id ? '...' : '🗑️'}
                            </button>
                          </div>
                        )}
                      </div>
                      <VideoPlayer src={node.url} title={node.name} />
                    </motion.div>
                  );
                }
                if (node.fileType === 'pdf' && node.url) {
                  return (
                    <motion.div variants={itemVariants} key={`pdf-${uniqueKey}`} className="group relative">
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteItem(node.id!, node.url)}
                          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-md rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 border border-white/10 transition-all"
                          disabled={isDeleting === node.id}
                        >
                          {isDeleting === node.id ? '...' : '🗑️'}
                        </button>
                      )}
                      <PDFViewer src={node.url} title={node.name} />
                    </motion.div>
                  );
                }
                if (node.fileType === 'powerpoint' && node.url) {
                  const encodedUrl = encodeURIComponent(node.url);
                  return (
                    <motion.div variants={itemVariants} key={`ppt-${uniqueKey}`} className="min-h-[500px] h-[60vh] md:min-h-[700px] flex flex-col bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                      <div className="flex items-center justify-between mb-4 ml-1">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-sm shadow-inner">📊</span>
                          <span className="text-sm font-bold text-orange-400 tracking-wide uppercase">{node.name}</span>
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteItem(node.id!, node.url)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-red-400 border border-white/10 transition-all shadow-lg"
                            disabled={isDeleting === node.id}
                          >
                            {isDeleting === node.id ? '...' : '🗑️'}
                          </button>
                        )}
                      </div>
                      <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-black/50">
                        <iframe 
                          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`}
                          className="w-full h-full bg-white"
                          title={node.name}
                        />
                      </div>
                    </motion.div>
                  );
                }
                if (node.url && (node.name.toLowerCase().endsWith('.doc') || node.name.toLowerCase().endsWith('.docx'))) {
                  const encodedUrl = encodeURIComponent(node.url);
                  return (
                    <motion.div variants={itemVariants} key={`doc-${uniqueKey}`} className="min-h-[500px] h-[60vh] md:min-h-[700px] flex flex-col bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                      <div className="flex items-center justify-between mb-4 ml-1">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm shadow-inner">📝</span>
                          <span className="text-sm font-bold text-blue-400 tracking-wide uppercase">{node.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <button 
                              onClick={() => handleDeleteItem(node.id!, node.url)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-red-400 border border-white/10 transition-all shadow-lg"
                              disabled={isDeleting === node.id}
                            >
                              {isDeleting === node.id ? '...' : '🗑️'}
                            </button>
                          )}
                          <a 
                            href={node.url} 
                            download 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all"
                          >
                            Download Original
                          </a>
                        </div>
                      </div>
                      <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-black/50">
                        <iframe 
                          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`}
                          className="w-full h-full bg-white"
                          title={node.name}
                        />
                      </div>
                    </motion.div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {currentNodes.length === 0 && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 text-gray-500 border border-dashed border-white/10 rounded-3xl"
          >
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg font-medium">This folder is empty</p>
            <p className="text-sm mt-2">No files or subfolders found here.</p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
