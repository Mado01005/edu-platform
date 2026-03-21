'use client';

interface VideoPlayerProps {
  src: string;
  title: string;
}

export default function VideoPlayer({ src, title }: VideoPlayerProps) {
  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <div className="video-container rounded-2xl overflow-hidden shadow-inner bg-black/50">
        <video
          controls
          preload="metadata"
          className="rounded-2xl w-full"
          aria-label={`Video: ${title}`}
          id="lesson-video-player"
        >
          <source src={src} type="video/mp4" />
          <p className="text-gray-400 text-sm">
            Your browser does not support HTML5 video.{' '}
            <a href={src} className="text-indigo-400 underline">Download the video</a>
          </p>
        </video>
      </div>
    </div>
  );
}
