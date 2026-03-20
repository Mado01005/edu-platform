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
          className="flex items-center justify-between w-full glass-card hover:bg-white/10 px-4 py-3 rounded-xl transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{isOpen ? '📂' : '📁'}</span>
            <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
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
