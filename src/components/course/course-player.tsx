import { FileText } from 'lucide-react';
import { DocumentViewer } from '@/components/course/document-viewer';
import { UniversalVideoPlayer } from '@/components/lms/UniversalVideoPlayer';
import type { PrimaryLessonContent } from '@/lib/lms/course-player';

type QualitySources = {
  '1080p'?: string | null;
  '360p'?: string | null;
  '480p'?: string | null;
  '720p'?: string | null;
};

export function CoursePlayer({
  autoPlayNextHref,
  defaultPlaybackSpeed,
  initialWatchPercentage,
  lessonId,
  primaryContent,
  preferredQuality,
  qualitySources,
  title,
  watermark,
}: {
  autoPlayNextHref?: string;
  defaultPlaybackSpeed: number;
  initialWatchPercentage: number;
  lessonId?: string;
  primaryContent: PrimaryLessonContent;
  preferredQuality: string;
  qualitySources: QualitySources;
  title: string;
  watermark?: string;
}) {
  if (primaryContent.kind === 'video') {
    return (
      <UniversalVideoPlayer
        autoPlayNextHref={autoPlayNextHref}
        defaultPlaybackSpeed={defaultPlaybackSpeed}
        initialWatchPercentage={initialWatchPercentage}
        lessonId={lessonId}
        preferredQuality={preferredQuality}
        qualitySources={qualitySources}
        title={title}
        type={primaryContent.type}
        url={primaryContent.url}
      />
    );
  }

  if (primaryContent.kind === 'document') {
    return (
      <DocumentViewer
        downloadHref={
          primaryContent.isDownloadable && primaryContent.materialId
            ? `/api/lms/materials/${primaryContent.materialId}/download`
            : undefined
        }
        fileType={primaryContent.fileType}
        title={primaryContent.title}
        url={primaryContent.url}
        watermark={watermark}
      />
    );
  }

  return (
    <div className="flex min-h-28 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-[#084B2B]">
      <FileText aria-hidden="true" className="size-5 shrink-0 text-[#084B2B]" />
      <span>Text Lesson / Notes</span>
    </div>
  );
}
