'use client';

import type { ContentType } from '@prisma/client';
import { FileText, Gauge, RotateCcw, RotateCw, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getVideoEmbedUrl } from '@/lib/lms/video';
import { DocumentViewer } from '@/components/course/document-viewer';

type YouTubePlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackQuality?: (quality: string) => void;
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

type VideoQuality = 'auto' | '1080p' | '720p' | '480p' | '360p';
type QualitySources = Partial<Record<Exclude<VideoQuality, 'auto'>, string | null>>;

const VIDEO_QUALITY_STORAGE_KEY = 'preferred_video_quality';
const CLASSROOM_CHANNEL = 'oqool-classroom-playback';
const CLASSROOM_HEARTBEAT_KEY = 'oqool-classroom-playback-heartbeat';
const COMPLETION_PERCENTAGE = 85;
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const VIDEO_QUALITY_OPTIONS: readonly { label: string; value: VideoQuality }[] = [
  { label: 'Auto (Adaptive)', value: 'auto' },
  { label: '1080p (HD)', value: '1080p' },
  { label: '720p (HD)', value: '720p' },
  { label: '480p (SD)', value: '480p' },
  { label: '360p (Data Saver)', value: '360p' },
];
const EMPTY_QUALITY_SOURCES: QualitySources = {};
const YOUTUBE_QUALITY: Record<VideoQuality, string> = {
  auto: 'default',
  '1080p': 'hd1080',
  '720p': 'hd720',
  '480p': 'large',
  '360p': 'medium',
};

function normalizeVideoQuality(value: string | null | undefined): VideoQuality {
  const normalized = value?.trim().toLowerCase();
  return VIDEO_QUALITY_OPTIONS.some((option) => option.value === normalized)
    ? (normalized as VideoQuality)
    : 'auto';
}

function safeHttpsUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const candidate = new URL(value);
    return candidate.protocol === 'https:' ? candidate.toString() : null;
  } catch {
    return null;
  }
}

function QualityControl({
  currentQuality,
  error,
  isAvailable,
  onChange,
}: {
  currentQuality: VideoQuality;
  error: string;
  isAvailable: (quality: VideoQuality) => boolean;
  onChange: (quality: VideoQuality) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-zinc-950 px-3 py-2">
      {error ? (
        <span aria-live="polite" className="min-w-0 flex-1 text-xs text-amber-200">
          {error}
        </span>
      ) : null}
      <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-zinc-300">
        <Settings2 aria-hidden="true" className="size-4 shrink-0" />
        <span className="whitespace-nowrap">Video quality</span>
        <select
          aria-label="Video quality"
          className="min-h-9 min-w-0 rounded-lg border border-white/10 bg-black px-2 text-xs font-bold text-white"
          onChange={(event) => onChange(event.target.value as VideoQuality)}
          value={currentQuality}
        >
          {VIDEO_QUALITY_OPTIONS.map((option) => (
            <option
              disabled={!isAvailable(option.value)}
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function PlaybackControls({
  onSeek,
  onSpeedChange,
  playbackSpeed,
}: {
  onSeek: (seconds: number) => void;
  onSpeedChange: (speed: number) => void;
  playbackSpeed: number;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-white/10 bg-zinc-950 px-3 py-2 text-white">
      <button
        aria-label="Skip backward 10 seconds"
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-white/10 px-2 text-xs font-bold hover:bg-white/10"
        onClick={() => onSeek(-10)}
        type="button"
      >
        <RotateCcw className="size-4" /> 10s
      </button>
      <button
        aria-label="Skip forward 10 seconds"
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-white/10 px-2 text-xs font-bold hover:bg-white/10"
        onClick={() => onSeek(10)}
        type="button"
      >
        10s <RotateCw className="size-4" />
      </button>
      <label className="ml-auto flex min-w-0 items-center gap-2 text-xs font-bold text-zinc-300">
        <Gauge className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Speed</span>
        <select
          aria-label="Playback speed"
          className="min-h-9 rounded-lg border border-white/10 bg-black px-2 text-xs font-bold text-white"
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          value={playbackSpeed}
        >
          {PLAYBACK_RATES.map((rate) => (
            <option key={rate} value={rate}>{rate}x</option>
          ))}
        </select>
      </label>
    </div>
  );
}

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
  qualitySources?: QualitySources;
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
  qualitySources = EMPTY_QUALITY_SOURCES,
  title,
  type,
  url,
}: UniversalVideoPlayerProps) {
  const router = useRouter();
  const [failedMediaUrl, setFailedMediaUrl] = useState<string | null>(null);
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>(() =>
    normalizeVideoQuality(preferredQuality),
  );
  const [activeHtmlSource, setActiveHtmlSource] = useState(url ?? '');
  const [qualityError, setQualityError] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(() =>
    PLAYBACK_RATES.includes(defaultPlaybackSpeed as (typeof PLAYBACK_RATES)[number])
      ? defaultPlaybackSpeed
      : 1,
  );
  const [playbackGuardMessage, setPlaybackGuardMessage] = useState('');
  const htmlVideoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingPlaybackRestore = useRef<{
    currentTime: number;
    paused: boolean;
  } | null>(null);
  const qualityPreference = useRef(currentQuality);
  const vimeoPlayerRef = useRef<import('@vimeo/player').default | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const confirmedPercentage = useRef(initialWatchPercentage);
  const targetPercentage = useRef(initialWatchPercentage);
  const progressWorker = useRef<Promise<boolean> | null>(null);
  const watchedSeconds = useRef(0);
  const lastPlaybackPosition = useRef<number | null>(null);
  const playerInstanceId = useRef(
    typeof crypto === 'undefined' ? String(Date.now()) : crypto.randomUUID(),
  );
  const playbackHeartbeat = useRef<number | null>(null);

  const reportProgress = useCallback(
    (percentage: number) => {
      if (!lessonId) return Promise.resolve(true);
      const normalized = Math.min(100, Math.max(0, percentage));
      const checkpoint =
        normalized >= COMPLETION_PERCENTAGE
          ? COMPLETION_PERCENTAGE
          : Math.floor(normalized / 10) * 10;
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
      const completed = confirmedPercentage.current >= COMPLETION_PERCENTAGE;

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

  const isQualityAvailable = useCallback(
    (quality: VideoQuality) => {
      if (quality === 'auto' || type !== 'R2_VIDEO') return true;
      return Boolean(safeHttpsUrl(qualitySources[quality]));
    },
    [qualitySources, type],
  );

  const pausePlayback = useCallback(() => {
    const htmlVideo = htmlVideoRef.current;
    if (htmlVideo && !htmlVideo.paused) htmlVideo.pause();
    const vimeo = vimeoPlayerRef.current;
    if (vimeo) void vimeo.pause().catch(() => undefined);
    youtubePlayerRef.current?.pauseVideo();
    lastPlaybackPosition.current = null;
  }, []);

  const seekPlayback = useCallback((delta: number) => {
    const htmlVideo = htmlVideoRef.current;
    if (htmlVideo) {
      htmlVideo.currentTime = Math.max(
        0,
        Math.min(
          Number.isFinite(htmlVideo.duration) ? htmlVideo.duration : Infinity,
          htmlVideo.currentTime + delta,
        ),
      );
      return;
    }
    const vimeo = vimeoPlayerRef.current;
    if (vimeo) {
      void Promise.all([vimeo.getCurrentTime(), vimeo.getDuration()])
        .then(([current, duration]) =>
          vimeo.setCurrentTime(Math.max(0, Math.min(duration, current + delta))),
        )
        .catch(() => undefined);
      return;
    }
    const youtube = youtubePlayerRef.current;
    if (youtube) {
      youtube.seekTo(
        Math.max(0, Math.min(youtube.getDuration(), youtube.getCurrentTime() + delta)),
        true,
      );
    }
  }, []);

  const changePlaybackSpeed = useCallback((speed: number) => {
    if (!PLAYBACK_RATES.includes(speed as (typeof PLAYBACK_RATES)[number])) return;
    setPlaybackSpeed(speed);
    const htmlVideo = htmlVideoRef.current;
    if (htmlVideo) htmlVideo.playbackRate = speed;
    const vimeo = vimeoPlayerRef.current;
    if (vimeo) void vimeo.setPlaybackRate(speed).catch(() => undefined);
    youtubePlayerRef.current?.setPlaybackRate(speed);
  }, []);

  const claimPlayback = useCallback(() => {
    if (!lessonId) return true;
    const now = Date.now();
    try {
      const raw = window.localStorage.getItem(CLASSROOM_HEARTBEAT_KEY);
      const current = raw
        ? (JSON.parse(raw) as { expiresAt?: unknown; instanceId?: unknown })
        : null;
      if (
        current &&
        current.instanceId !== playerInstanceId.current &&
        typeof current.expiresAt === 'number' &&
        current.expiresAt > now
      ) {
        setPlaybackGuardMessage('Another classroom tab is already playing. Pause it before continuing here.');
        pausePlayback();
        return false;
      }
      const heartbeat = JSON.stringify({
        expiresAt: now + 5_000,
        instanceId: playerInstanceId.current,
        lessonId,
      });
      window.localStorage.setItem(CLASSROOM_HEARTBEAT_KEY, heartbeat);
      setPlaybackGuardMessage('');
      return true;
    } catch {
      return true;
    }
  }, [lessonId, pausePlayback]);

  const startPlaybackHeartbeat = useCallback(() => {
    if (!lessonId || !claimPlayback()) return false;
    if (playbackHeartbeat.current) window.clearInterval(playbackHeartbeat.current);
    playbackHeartbeat.current = window.setInterval(claimPlayback, 2_000);
    return true;
  }, [claimPlayback, lessonId]);

  const stopPlaybackHeartbeat = useCallback(() => {
    if (playbackHeartbeat.current) {
      window.clearInterval(playbackHeartbeat.current);
      playbackHeartbeat.current = null;
    }
    try {
      const raw = window.localStorage.getItem(CLASSROOM_HEARTBEAT_KEY);
      const current = raw
        ? (JSON.parse(raw) as { instanceId?: unknown })
        : null;
      if (current?.instanceId === playerInstanceId.current) {
        window.localStorage.removeItem(CLASSROOM_HEARTBEAT_KEY);
      }
    } catch {
      // Storage can be unavailable in hardened browser modes.
    }
  }, []);

  const handleQualityChange = useCallback(
    async (quality: VideoQuality) => {
      setQualityError('');
      if (!isQualityAvailable(quality)) {
        setQualityError('That rendition has not been uploaded for this lesson.');
        return;
      }

      qualityPreference.current = quality;
      setCurrentQuality(quality);
      window.localStorage.setItem(VIDEO_QUALITY_STORAGE_KEY, quality);

      try {
        if (type === 'R2_VIDEO') {
          const nextSource = safeHttpsUrl(
            quality === 'auto' ? url : qualitySources[quality],
          );
          if (!nextSource) {
            setQualityError('That video source is unavailable.');
            return;
          }

          const video = htmlVideoRef.current;
          if (video && video.currentSrc !== nextSource) {
            pendingPlaybackRestore.current = {
              currentTime: video.currentTime,
              paused: video.paused,
            };
          }
          setActiveHtmlSource(nextSource);
          return;
        }

        if (type === 'VIMEO') {
          const player = vimeoPlayerRef.current;
          if (!player) return;
          const [currentTime, paused] = await Promise.all([
            player.getCurrentTime(),
            player.getPaused(),
          ]);
          await player.setQuality(quality);
          await player.setCurrentTime(currentTime);
          if (!paused) await player.play();
          return;
        }

        if (type === 'YOUTUBE') {
          const player = youtubePlayerRef.current;
          if (!player) return;
          const currentTime = player.getCurrentTime();
          const wasPlaying = player.getPlayerState() === 1;
          player.setPlaybackQuality?.(YOUTUBE_QUALITY[quality]);
          player.seekTo(currentTime, true);
          if (wasPlaying) player.playVideo();
        }
      } catch {
        setQualityError(
          'This provider does not offer that quality for the current video.',
        );
      }
    },
    [isQualityAvailable, qualitySources, type, url],
  );

  useEffect(() => {
    const storedQuality = normalizeVideoQuality(
      window.localStorage.getItem(VIDEO_QUALITY_STORAGE_KEY) ??
        preferredQuality,
    );
    const initialQuality = isQualityAvailable(storedQuality)
      ? storedQuality
      : 'auto';
    void handleQualityChange(initialQuality);
  }, [handleQualityChange, isQualityAvailable, preferredQuality]);

  useEffect(() => {
    if (!lessonId) return;

    let disposed = false;
    async function verifyActiveSession() {
      try {
        const response = await fetch('/api/lms/session', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (disposed || response.ok) return;

        const payload = (await response.json().catch(() => ({}))) as {
          reason?: unknown;
        };
        const next = `${window.location.pathname}${window.location.search}`;
        const loginUrl = new URL('/lms/login', window.location.origin);
        loginUrl.searchParams.set('next', next);
        if (payload.reason === 'concurrent_login') {
          loginUrl.searchParams.set('reason', 'concurrent_login');
        }
        window.location.assign(loginUrl);
      } catch {
        // A transient network failure must not interrupt an in-progress lesson.
      }
    }

    void verifyActiveSession();
    const interval = window.setInterval(verifyActiveSession, 15_000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [lessonId]);

  useEffect(() => {
    const channel = lessonId && 'BroadcastChannel' in window
      ? new BroadcastChannel(CLASSROOM_CHANNEL)
      : null;
    const pauseForBackground = () => {
      if (document.hidden || !document.hasFocus()) {
        pausePlayback();
        stopPlaybackHeartbeat();
        setPlaybackGuardMessage('Playback paused while this window is not active.');
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CLASSROOM_HEARTBEAT_KEY || !event.newValue) return;
      try {
        const value = JSON.parse(event.newValue) as { instanceId?: unknown };
        if (value.instanceId !== playerInstanceId.current) {
          pausePlayback();
          stopPlaybackHeartbeat();
          setPlaybackGuardMessage('Playback moved to another classroom tab.');
        }
      } catch {
        // Ignore malformed values owned by extensions or old builds.
      }
    };
    const onChannelMessage = (event: MessageEvent<{ instanceId?: string }>) => {
      if (event.data.instanceId && event.data.instanceId !== playerInstanceId.current) {
        pausePlayback();
        stopPlaybackHeartbeat();
        setPlaybackGuardMessage('Playback moved to another classroom tab.');
      }
    };
    const announce = () => channel?.postMessage({ instanceId: playerInstanceId.current });
    const onPlaying = () => {
      if (startPlaybackHeartbeat()) announce();
    };

    document.addEventListener('visibilitychange', pauseForBackground);
    window.addEventListener('blur', pauseForBackground);
    window.addEventListener('storage', onStorage);
    window.addEventListener('oqool:video-playing', onPlaying);
    channel?.addEventListener('message', onChannelMessage);
    return () => {
      document.removeEventListener('visibilitychange', pauseForBackground);
      window.removeEventListener('blur', pauseForBackground);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('oqool:video-playing', onPlaying);
      channel?.removeEventListener('message', onChannelMessage);
      channel?.close();
      stopPlaybackHeartbeat();
    };
  }, [lessonId, pausePlayback, startPlaybackHeartbeat, stopPlaybackHeartbeat]);

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
    const handlePlay = () => {
      window.dispatchEvent(new Event('oqool:video-playing'));
    };
    const handlePause = () => {
      stopPlaybackHeartbeat();
      lastPlaybackPosition.current = null;
    };
    const handleEnded = (event: { duration: number; seconds: number }) => {
      stopPlaybackHeartbeat();
      void finishPlayback(event.seconds, event.duration);
    };

    void import('@vimeo/player').then(({ default: VimeoPlayer }) => {
      if (disposed) return;
      player = new VimeoPlayer(iframe);
      vimeoPlayerRef.current = player;
      player.on('timeupdate', handleTimeUpdate);
      player.on('seeking', handleSeeking);
      player.on('play', handlePlay);
      player.on('pause', handlePause);
      player.on('ended', handleEnded);
      void player.setPlaybackRate(playbackSpeed).catch(() => undefined);
      void player
        .setQuality(qualityPreference.current)
        .catch(() => undefined);
    });

    return () => {
      disposed = true;
      if (!player) return;
      if (vimeoPlayerRef.current === player) vimeoPlayerRef.current = null;
      player.off('timeupdate', handleTimeUpdate);
      player.off('seeking', handleSeeking);
      player.off('play', handlePlay);
      player.off('pause', handlePause);
      player.off('ended', handleEnded);
    };
  }, [
    playbackSpeed,
    embedUrl,
    finishPlayback,
    reportWatchedTime,
    stopPlaybackHeartbeat,
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
              youtubePlayerRef.current = target;
              target.setPlaybackRate(playbackSpeed);
              target.setPlaybackQuality?.(
                YOUTUBE_QUALITY[qualityPreference.current],
              );
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
                window.dispatchEvent(new Event('oqool:video-playing'));
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
                stopPlaybackHeartbeat();
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
      youtubePlayerRef.current = null;
    };
  }, [
    playbackSpeed,
    embedUrl,
    finishPlayback,
    reportWatchedTime,
    stopPlaybackHeartbeat,
    type,
  ]);

  if (!url) {
    return (
      <div className="flex min-h-28 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-[#084B2B]">
        <FileText aria-hidden="true" className="size-5 shrink-0 text-[#084B2B]" />
        <span>Text Lesson / Notes</span>
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
    if (failedMediaUrl) {
      return (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center text-sm text-amber-100">
          This video could not be loaded.
          <a
            className="font-bold underline"
            href={safeHttpsUrl(failedMediaUrl) ?? safeUrl.toString()}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open the video directly
          </a>
        </div>
      );
    }

    return (
      <div className="w-full min-w-0 overflow-hidden rounded-2xl bg-black">
        <video
          className="aspect-video w-full bg-black"
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          data-preferred-quality={currentQuality}
          playsInline
          preload="metadata"
          ref={htmlVideoRef}
          src={safeHttpsUrl(activeHtmlSource) ?? safeUrl.toString()}
          onEnded={(event) => {
            const { currentTime, duration } = event.currentTarget;
            stopPlaybackHeartbeat();
            void finishPlayback(currentTime, duration);
          }}
          onError={(event) => setFailedMediaUrl(event.currentTarget.currentSrc)}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            video.playbackRate = playbackSpeed;
            const restore = pendingPlaybackRestore.current;
            if (!restore) return;
            pendingPlaybackRestore.current = null;
            video.currentTime = Math.min(
              restore.currentTime,
              Number.isFinite(video.duration)
                ? Math.max(0, video.duration - 0.1)
                : restore.currentTime,
            );
            if (!restore.paused) void video.play().catch(() => undefined);
          }}
          onPause={(event) => {
            const { currentTime, duration } = event.currentTarget;
            void reportWatchedTime(currentTime, duration, 5);
            lastPlaybackPosition.current = null;
            stopPlaybackHeartbeat();
          }}
          onPlaying={(event) => {
            window.dispatchEvent(new Event('oqool:video-playing'));
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
        {playbackGuardMessage ? (
          <p aria-live="polite" className="border-t border-amber-400/30 bg-amber-950 px-3 py-2 text-xs text-amber-100">
            {playbackGuardMessage}
          </p>
        ) : null}
        <PlaybackControls
          onSeek={seekPlayback}
          onSpeedChange={changePlaybackSpeed}
          playbackSpeed={playbackSpeed}
        />
        <QualityControl
          currentQuality={currentQuality}
          error={qualityError}
          isAvailable={isQualityAvailable}
          onChange={(quality) => void handleQualityChange(quality)}
        />
      </div>
    );
  }

  if (type === 'PDF') {
    return <DocumentViewer fileType="PDF" title={title} url={safeUrl.toString()} />;
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
    <div className="w-full min-w-0 overflow-hidden rounded-2xl bg-black">
      <div className="aspect-video w-full">
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
      {playbackGuardMessage ? (
        <p aria-live="polite" className="border-t border-amber-400/30 bg-amber-950 px-3 py-2 text-xs text-amber-100">
          {playbackGuardMessage}
        </p>
      ) : null}
      <PlaybackControls
        onSeek={seekPlayback}
        onSpeedChange={changePlaybackSpeed}
        playbackSpeed={playbackSpeed}
      />
      <QualityControl
        currentQuality={currentQuality}
        error={qualityError}
        isAvailable={isQualityAvailable}
        onChange={(quality) => void handleQualityChange(quality)}
      />
    </div>
  );
}
