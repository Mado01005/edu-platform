'use client';

import type { ContentType } from '@prisma/client';
import { Download, Film } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getVideoEmbedUrl } from '@/lib/lms/video';

type YouTubePlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (rate: number) => void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady: (event: { target: YouTubePlayer }) => void;
        onStateChange: (event: { data: number; target: YouTubePlayer }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: {
    BUFFERING: number;
    ENDED: number;
    PAUSED: number;
    PLAYING: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube player API did not initialize.'));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (existing) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.youtube.com/iframe_api';
    script.addEventListener(
      'error',
      () => reject(new Error('YouTube player API could not be loaded.')),
      { once: true },
    );
    document.head.append(script);
  });

  return youtubeApiPromise;
}

type UniversalVideoPlayerProps = {
  autoPlayNextHref?: string;
  defaultPlaybackSpeed?: number;
  initialWatchPercentage?: number;
  lessonId?: string;
  preferredQuality?: string;
  title: string;
  type: ContentType;
  url?: string | null;
};

export function UniversalVideoPlayer({
  autoPlayNextHref,
  defaultPlaybackSpeed = 1,
  initialWatchPercentage = 0,
  lessonId,
  preferredQuality = 'AUTO',
  title,
  type,
  url,
}: UniversalVideoPlayerProps) {
  const router = useRouter();
  const [failedMediaUrl, setFailedMediaUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const confirmedPercentage = useRef(initialWatchPercentage);
  const targetPercentage = useRef(initialWatchPercentage);
  const progressWorker = useRef<Promise<boolean> | null>(null);
  const watchedSeconds = useRef(0);
  const lastPlaybackPosition = useRef<number | null>(null);

  const reportProgress = useCallback(
    (percentage: number) => {
      if (!lessonId) return Promise.resolve(true);
      const normalized = Math.min(100, Math.max(0, percentage));
      const checkpoint = normalized >= 95 ? 95 : Math.floor(normalized / 10) * 10;
      targetPercentage.current = Math.max(targetPercentage.current, checkpoint);
      if (confirmedPercentage.current >= targetPercentage.current) {
        return Promise.resolve(true);
      }
      if (progressWorker.current) return progressWorker.current;

      const worker: Promise<boolean> = (async () => {
        while (confirmedPercentage.current < targetPercentage.current) {
          const current = confirmedPercentage.current;
          const nextBoundary = Math.floor(current / 10) * 10 + 10;
          const nextPercentage = Math.min(
            targetPercentage.current,
            Math.max(current, nextBoundary),
          );
          if (nextPercentage <= current) return false;

          let response: Response;
          try {
            response = await fetch('/api/lms/progress/video', {
              body: JSON.stringify({
                durationMin: Math.floor(watchedSeconds.current / 60),
                lessonId,
                watchPercentage: nextPercentage,
              }),
              headers: { 'Content-Type': 'application/json' },
              keepalive: true,
              method: 'POST',
            });
          } catch {
            return false;
          }

          if (response.status === 429) {
            const body = (await response.json().catch(() => ({}))) as {
              retryAfterMs?: unknown;
            };
            const retryAfterMs =
              typeof body.retryAfterMs === 'number'
                ? Math.min(5_000, Math.max(250, body.retryAfterMs))
                : 2_000;
            await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
            continue;
          }
          if (!response.ok) return false;

          const result = (await response.json().catch(() => ({}))) as {
            watchPercentage?: unknown;
          };
          confirmedPercentage.current =
            typeof result.watchPercentage === 'number'
              ? Math.max(nextPercentage, result.watchPercentage)
              : nextPercentage;
        }
        return true;
      })();

      progressWorker.current = worker;
      const clearWorker = () => {
        if (progressWorker.current === worker) progressWorker.current = null;
      };
      void worker.then(clearWorker, clearWorker);
      return worker;
    },
    [lessonId],
  );

  const reportWatchedTime = useCallback(
    (currentTime: number, duration: number, maximumExpectedDelta = 3) => {
      const previousTime = lastPlaybackPosition.current;
      lastPlaybackPosition.current = currentTime;
      if (
        previousTime === null ||
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        return progressWorker.current ?? Promise.resolve(true);
      }

      const elapsed = currentTime - previousTime;
      if (elapsed <= 0 || elapsed > maximumExpectedDelta) {
        return progressWorker.current ?? Promise.resolve(true);
      }
      watchedSeconds.current = Math.min(
        duration,
        watchedSeconds.current + elapsed,
      );
      return reportProgress(
        initialWatchPercentage + (watchedSeconds.current / duration) * 100,
      );
    },
    [initialWatchPercentage, reportProgress],
  );

  const finishPlayback = useCallback(
    async (currentTime: number, duration: number) => {
      await reportWatchedTime(currentTime, duration, 5);
      const trackedPercentage =
        Number.isFinite(duration) && duration > 0
          ? initialWatchPercentage +
            (watchedSeconds.current / duration) * 100
          : targetPercentage.current;
      const persisted = await reportProgress(trackedPercentage);
      const completed = confirmedPercentage.current >= 95;

      if (persisted && completed && autoPlayNextHref) {
        router.push(autoPlayNextHref);
      }
    },
    [
      autoPlayNextHref,
      initialWatchPercentage,
      reportProgress,
      reportWatchedTime,
      router,
    ],
  );

  let safeUrl: URL | null = null;
  if (url) {
    try {
      const candidate = new URL(url);
      safeUrl = candidate.protocol === 'https:' ? candidate : null;
    } catch {
      safeUrl = null;
    }
  }
  const embedUrl = safeUrl
    ? getVideoEmbedUrl(safeUrl.toString(), type)
    : null;
  const iframeUrl =
    type === 'YOUTUBE' && embedUrl
      ? `${embedUrl}?enablejsapi=1`
      : embedUrl;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (type !== 'VIMEO' || !iframe || !embedUrl) return;

    let disposed = false;
    let player: import('@vimeo/player').default | null = null;
    const handleTimeUpdate = (event: { duration: number; seconds: number }) => {
      reportWatchedTime(event.seconds, event.duration);
    };
    const handleSeeking = () => {
      lastPlaybackPosition.current = null;
    };
    const handleEnded = (event: { duration: number; seconds: number }) => {
      void finishPlayback(event.seconds, event.duration);
    };

    void import('@vimeo/player').then(({ default: VimeoPlayer }) => {
      if (disposed) return;
      player = new VimeoPlayer(iframe);
      player.on('timeupdate', handleTimeUpdate);
      player.on('seeking', handleSeeking);
      player.on('ended', handleEnded);
      void player.setPlaybackRate(defaultPlaybackSpeed).catch(() => undefined);
    });

    return () => {
      disposed = true;
      if (!player) return;
      player.off('timeupdate', handleTimeUpdate);
      player.off('seeking', handleSeeking);
      player.off('ended', handleEnded);
    };
  }, [
    defaultPlaybackSpeed,
    embedUrl,
    finishPlayback,
    reportWatchedTime,
    type,
  ]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (type !== 'YOUTUBE' || !iframe || !embedUrl) return;

    let disposed = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let player: YouTubePlayer | null = null;

    void loadYouTubeApi()
      .then((youtube) => {
        if (disposed) return;
        player = new youtube.Player(iframe, {
          events: {
            onReady: ({ target }) => {
              target.setPlaybackRate(defaultPlaybackSpeed);
              interval = setInterval(() => {
                if (!player || player.getPlayerState() !== youtube.PlayerState.PLAYING) {
                  lastPlaybackPosition.current = null;
                  return;
                }
                reportWatchedTime(
                  player.getCurrentTime(),
                  player.getDuration(),
                );
              }, 1_000);
            },
            onStateChange: ({ data, target }) => {
              if (data === youtube.PlayerState.PLAYING) {
                lastPlaybackPosition.current = target.getCurrentTime();
              } else if (
                data === youtube.PlayerState.PAUSED ||
                data === youtube.PlayerState.BUFFERING
              ) {
                void reportWatchedTime(
                  target.getCurrentTime(),
                  target.getDuration(),
                  5,
                );
                lastPlaybackPosition.current = null;
              } else if (data === youtube.PlayerState.ENDED) {
                void finishPlayback(
                  target.getCurrentTime(),
                  target.getDuration(),
                );
              }
            },
          },
        });
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
    };
  }, [
    defaultPlaybackSpeed,
    embedUrl,
    finishPlayback,
    reportWatchedTime,
    type,
  ]);

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

  if (!safeUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-200">
        This media URL is invalid or unsafe.
      </div>
    );
  }

  if (type === 'R2_VIDEO') {
    if (failedMediaUrl === url) {
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
        data-preferred-quality={preferredQuality}
        playsInline
        preload="metadata"
        src={safeUrl.toString()}
        onEnded={(event) => {
          const { currentTime, duration } = event.currentTarget;
          void finishPlayback(currentTime, duration);
        }}
        onError={() => setFailedMediaUrl(url)}
        onLoadedMetadata={(event) => {
          event.currentTarget.playbackRate = defaultPlaybackSpeed;
        }}
        onPause={(event) => {
          const { currentTime, duration } = event.currentTarget;
          void reportWatchedTime(currentTime, duration, 5);
          lastPlaybackPosition.current = null;
        }}
        onPlaying={(event) => {
          lastPlaybackPosition.current = event.currentTarget.currentTime;
        }}
        onSeeking={() => {
          lastPlaybackPosition.current = null;
        }}
        onTimeUpdate={(event) => {
          const { currentTime, duration } = event.currentTarget;
          reportWatchedTime(currentTime, duration);
        }}
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
        ref={iframeRef}
        referrerPolicy="strict-origin-when-cross-origin"
        src={iframeUrl ?? undefined}
        title={title}
      />
    </div>
  );
}
