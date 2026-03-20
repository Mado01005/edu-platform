'use client';

interface VimeoPlayerProps {
  vimeoId: string;
  title: string;
}

export default function VimeoPlayer({ vimeoId, title }: VimeoPlayerProps) {
  // Extract ID if a full URL was pasted into the .vimeo text file
  const idMatch = vimeoId.match(/(?:vimeo\.com\/|video\/)(\d+)/);
  const finalId = idMatch ? idMatch[1] : vimeoId.trim();

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: '56.25%' }}>
        <iframe
          src={`https://player.vimeo.com/video/${finalId}`}
          className="absolute top-0 left-0 w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          title={title}
          allowFullScreen
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400 truncate">{title}</span>
        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30">Vimeo</span>
      </div>
    </div>
  );
}
