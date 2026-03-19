'use client';

interface VideoPlayerProps {
  src: string;
  title: string;
}

export default function VideoPlayer({ src, title }: VideoPlayerProps) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="video-container">
        <video
          controls
          preload="metadata"
          className="rounded-xl"
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
