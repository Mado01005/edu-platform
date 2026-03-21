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
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: '56.25%' }}>
        <iframe
          src={`https://player.vimeo.com/video/${finalId}`}
          className="absolute top-0 left-0 w-full h-full border-0 rounded-2xl shadow-inner bg-black/50"
          allow="autoplay; fullscreen; picture-in-picture"
          title={title}
          allowFullScreen
        />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-base font-bold text-gray-300 truncate tracking-wide">{title}</span>
        <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/30 shadow-[inset_0_0_8px_rgba(99,102,241,0.1)]">Vimeo</span>
      </div>
    </div>
  );
}
