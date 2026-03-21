'use client';

import { useState } from 'react';
import { ContentNode } from '@/lib/content';
import VideoPlayer from '@/components/VideoPlayer';
import PDFViewer from '@/components/PDFViewer';
import ImageGallery from '@/components/ImageGallery';
import VimeoPlayer from '@/components/VimeoPlayer';

interface FolderTreeProps {
  node: ContentNode;
  isRoot?: boolean;
}

export default function FolderTree({ node, isRoot = false }: FolderTreeProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Group multiple image nodes inside a folder into a single ImageGallery
  function renderChildren(children: ContentNode[]) {
    const images = children
      .filter((c) => c.type === 'file' && c.fileType === 'image' && c.url)
      .map((c) => c.url!) as string[];
      
    const others = children.filter((c) => !(c.type === 'file' && c.fileType === 'image'));

    return (
      <>
        {images.length > 0 && (
          <div className="my-4">
            <ImageGallery images={images} title="Gallery" />
          </div>
        )}
        {others.map((child, idx) => (
          <FolderTree key={`${child.name}-${idx}`} node={child} />
        ))}
      </>
    );
  }

  if (node.type === 'file') {
    if (node.fileType === 'video' && node.url) {
      return (
        <div className="my-4 fade-in">
          <div className="flex items-center gap-2 mb-2 ml-1 text-sm text-gray-400">
            <span>🎬</span> <span>{node.name}</span>
          </div>
          <VideoPlayer src={node.url} title={node.name} />
        </div>
      );
    }
    if (node.fileType === 'pdf' && node.url) {
      return (
        <div className="my-4 fade-in">
          <PDFViewer src={node.url} title={node.name} />
        </div>
      );
    }
    if (node.fileType === 'powerpoint' && node.url) {
      // The Microsoft Cloud Proxy inherently requires URL Encoded payloads to parse heavy files
      const encodedUrl = encodeURIComponent(node.url);
      return (
        <div className="my-6 fade-in min-h-[500px] h-[60vh] md:min-h-[700px] flex flex-col bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
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
    // Single images handled by renderChildren grouping, but just in case:
    if (node.fileType === 'image' && node.url) {
      return (
        <div className="my-4 fade-in">
          <ImageGallery images={[node.url]} title={node.name} />
        </div>
      );
    }
    return null;
  }

  if (node.type === 'vimeo' && node.vimeoId) {
    return (
      <div className="my-4 fade-in">
        <VimeoPlayer vimeoId={node.vimeoId} title={node.name} />
      </div>
    );
  }

  if (node.type === 'folder' && node.children) {
    const childrenUI = (
      <div className={isRoot ? 'space-y-2' : 'mt-3 ml-2 sm:ml-4 pl-4 border-l-2 border-white/10 space-y-2 fade-in'}>
        {renderChildren(node.children)}
      </div>
    );

    if (isRoot) return childrenUI;

    return (
      <div className="my-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between w-full bg-white/5 backdrop-blur-xl border transition-all duration-300 group px-5 py-4 rounded-2xl cursor-pointer ${isOpen ? 'border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.1)] bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'}`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#05050A] border border-white/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-inner group-hover:border-indigo-500/50">
               {isOpen ? '📂' : '📁'}
            </div>
            <span className="font-bold text-lg text-white tracking-widest uppercase truncate drop-shadow-md">
              {node.name}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && childrenUI}
      </div>
    );
  }

  return null;
}
