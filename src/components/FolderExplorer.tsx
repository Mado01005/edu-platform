'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ContentNode } from '@/types';
import VideoPlayer from '@/components/VideoPlayer';
import PDFViewer from '@/components/PDFViewer';
import ImageGallery from '@/components/ImageGallery';
import VimeoPlayer from '@/components/VimeoPlayer';

interface FolderExplorerProps {
  content: ContentNode[];
  subject: {
    title: string;
    slug: string;
  };
  lesson: {
    title: string;
    slug: string;
  };
}

export default function FolderExplorer({ content, subject, lesson }: FolderExplorerProps) {
  const [currentPath, setCurrentPath] = useState<ContentNode[]>([]);

  const currentNodes = currentPath.length === 0 
    ? content 
    : (currentPath[currentPath.length - 1].children || []);

  const handleFolderClick = (folder: ContentNode) => {
    setCurrentPath([...currentPath, folder]);
  };

  const handleCrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentPath([]);
    } else {
      setCurrentPath(currentPath.slice(0, index + 1));
    }
  };

  const folders = currentNodes.filter(n => n.type === 'folder');
  
  const images = currentNodes
    .filter(c => c.type === 'file' && c.fileType === 'image' && c.url)
    .map(c => c.url!) as string[];
    
  const otherFiles = currentNodes.filter(c => !(c.type === 'file' && c.fileType === 'image') && c.type !== 'folder');

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

      {/* Folders Grid */}
      {folders.length > 0 && (
        <div className="mb-10 fade-in">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Folders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.map((folder, idx) => (
              <button
                key={`folder-${idx}`}
                onClick={() => handleFolderClick(folder)}
                className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.2)] text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                  📁
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-white truncate text-base group-hover:text-indigo-300 transition-colors">{folder.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{folder.children?.length || 0} items</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Files Display */}
      {images.length > 0 && (
        <div className="mb-10 fade-in">
          <ImageGallery images={images} title="Gallery" />
        </div>
      )}

      {otherFiles.length > 0 && (
        <div className="space-y-8 fade-in">
          {otherFiles.length > 0 && folders.length > 0 && (
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Files</h3>
          )}
          {otherFiles.map((node, idx) => {
            if (node.type === 'vimeo' && node.vimeoId) {
              return (
                <div key={`vimeo-${idx}`} className="fade-in">
                  <VimeoPlayer vimeoId={node.vimeoId} title={node.name} />
                </div>
              );
            }
            if (node.fileType === 'video' && node.url) {
              return (
                <div key={`video-${idx}`} className="fade-in">
                  <div className="flex items-center gap-2 mb-2 ml-1 text-sm text-gray-400">
                    <span>🎬</span> <span>{node.name}</span>
                  </div>
                  <VideoPlayer src={node.url} title={node.name} />
                </div>
              );
            }
            if (node.fileType === 'pdf' && node.url) {
              return (
                <div key={`pdf-${idx}`} className="fade-in">
                  <PDFViewer src={node.url} title={node.name} />
                </div>
              );
            }
            if (node.fileType === 'powerpoint' && node.url) {
              const encodedUrl = encodeURIComponent(node.url);
              return (
                <div key={`ppt-${idx}`} className="fade-in min-h-[500px] h-[60vh] md:min-h-[700px] flex flex-col bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="flex items-center gap-3 mb-4 ml-1">
                    <span className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-sm shadow-inner">📊</span>
                    <span className="text-sm font-bold text-orange-400 tracking-wide uppercase">{node.name}</span>
                  </div>
                  <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-black/50">
                    <iframe 
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`}
                      className="w-full h-full bg-white"
                      title={node.name}
                    />
                  </div>
                </div>
              );
            }
            if (node.url && (node.name.toLowerCase().endsWith('.doc') || node.name.toLowerCase().endsWith('.docx'))) {
              const encodedUrl = encodeURIComponent(node.url);
              return (
                <div key={`doc-${idx}`} className="fade-in min-h-[500px] h-[60vh] md:min-h-[700px] flex flex-col bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="flex items-center justify-between mb-4 ml-1">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm shadow-inner">📝</span>
                      <span className="text-sm font-bold text-blue-400 tracking-wide uppercase">{node.name}</span>
                    </div>
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
                  <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-black/50">
                    <iframe 
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`}
                      className="w-full h-full bg-white"
                      title={node.name}
                    />
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {currentNodes.length === 0 && (
        <div className="text-center py-20 text-gray-500 fade-in border border-dashed border-white/10 rounded-3xl">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg font-medium">This folder is empty</p>
          <p className="text-sm mt-2">No files or subfolders found here.</p>
        </div>
      )}
    </div>
  );
}
