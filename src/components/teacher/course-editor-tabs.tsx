'use client';

import { BookOpen, FolderOpen, Radio, Settings } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/UI/tabs';

export function CourseEditorTabs() {
  return (
    <TabsList className="custom-scrollbar sticky top-[13rem] z-20 flex w-full min-w-0 justify-start overflow-x-auto rounded-2xl bg-zinc-950/95 p-1 backdrop-blur-xl sm:top-[9.25rem] sm:grid sm:grid-cols-4">
      <TabsTrigger className="min-w-40 shrink-0" value="details">
        <Settings className="size-4 shrink-0" /> Basic Details
      </TabsTrigger>
      <TabsTrigger className="min-w-48 shrink-0" value="curriculum">
        <BookOpen className="size-4 shrink-0" /> Curriculum & Lessons
      </TabsTrigger>
      <TabsTrigger className="min-w-44 shrink-0" value="resources">
        <FolderOpen className="size-4 shrink-0" /> Course Resources
      </TabsTrigger>
      <TabsTrigger className="min-w-48 shrink-0" value="zoom">
        <Radio className="size-4 shrink-0" /> Live Zoom Sessions
      </TabsTrigger>
    </TabsList>
  );
}
