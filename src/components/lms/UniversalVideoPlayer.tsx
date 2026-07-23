'use client';

import type { ContentType } from '@prisma/client';
import { Download, Film } from 'lucide-react';
import { useState } from 'react';
import { getVideoEmbedUrl } from '@/lib/lms/video';

type UniversalVideoPlayerProps = {
  title: string;
  type: ContentType;
  url?: string | null;
};

export function UniversalVideoPlayer({
  title,
  type,
  url,
}: UniversalVideoPlayerProps) {
  const [mediaFailed, setMediaFailed] = useState(false);

  if (!url) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 text-zinc-500">
        <div className="flex flex-col items-center gap-3 text-sm">
          <Film className="size-8" />
          This lesson has no video.
        </div>
      </div>
    );
  }

  let safeUrl: URL | null = null;
  try {
    const candidate = new URL(url);
    safeUrl = candidate.protocol === 'https:' ? candidate : null;
  } catch {
    safeUrl = null;
  }

  if (!safeUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-200">
        This media URL is invalid or unsafe.
      </div>
    );
  }

  if (type === 'R2_VIDEO') {
    if (mediaFailed) {
      return (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center text-sm text-amber-100">
          This video could not be loaded.
          <a
            className="font-bold underline"
            href={safeUrl.toString()}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open the video directly
          </a>
        </div>
      );
    }

    return (
      <video
        className="aspect-video w-full rounded-2xl bg-black"
        controls
        controlsList="nodownload"
        playsInline
        preload="metadata"
        src={safeUrl.toString()}
        onError={() => setMediaFailed(true)}
      >
        Your browser does not support HTML5 video.
      </video>
    );
  }

  if (type === 'PDF') {
    return (
      <div className="flex min-h-56 w-full items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          href={safeUrl.toString()}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Download className="size-4" />
          Open PDF resource
        </a>
      </div>
    );
  }

  if (type === 'TEXT') {
    return null;
  }

  const embedUrl = getVideoEmbedUrl(safeUrl.toString(), type);

  if (!embedUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-200">
        This video URL is invalid or uses an unsupported host.
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="size-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={embedUrl}
        title={title}
      />
    </div>
  );
}
