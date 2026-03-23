import Link from 'next/link';

interface LessonCardProps {
  subjectSlug: string;
  slug: string;
  title: string;
  hasVideo: boolean;
  hasPdf: boolean;
  imageCount: number;
  index: number;
  color: string;
  isNew?: boolean;
  hasDocx: boolean;
}

export default function LessonCard({
  subjectSlug,
  slug,
  title,
  hasVideo,
  hasPdf,
  imageCount,
  index,
  color,
  isNew,
  hasDocx,
}: LessonCardProps) {
  return (
    <div
      className="group relative flex flex-row items-stretch sm:items-center gap-4 md:gap-6 transition-all duration-500"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Node / Index circle */}
      <div className="relative flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#05050A] border border-white/20 flex items-center justify-center text-gray-500 font-black text-lg group-hover:text-white transition-all duration-500 z-10 shadow-2xl group-hover:scale-110 group-hover:border-white/40 overflow-hidden self-start sm:self-auto mt-4 sm:mt-0">
         <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
         <span className="relative z-10">{index + 1}</span>
      </div>

      {/* Main Card */}
      <Link
        href={`/subjects/${encodeURIComponent(subjectSlug)}/${encodeURIComponent(slug)}`}
        id={`lesson-${slug}`}
        className="flex-1 w-full bg-[#05050A]/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 md:p-6 cursor-pointer group-hover:-translate-y-1.5 group-hover:border-white/30 group-hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.1)] relative overflow-hidden flex items-center justify-between transition-all duration-500"
      >
        {/* Subtle internal ambient glow on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500`}></div>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* NEW Badge */}
        {isNew && (
          <div className="absolute top-3 right-3 z-20">
            <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse">
              ✨ NEW
            </span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 relative z-10">
          <h3 className="text-lg md:text-xl font-bold text-gray-200 truncate group-hover:text-white transition-colors duration-300 mb-2">
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1">
            {hasVideo && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 tracking-wide uppercase shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Video
              </span>
            )}
            {hasPdf && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 tracking-wide uppercase shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </span>
            )}
            {hasDocx && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/10 border border-blue-600/20 text-xs font-bold text-blue-400 tracking-wide uppercase shadow-[0_0_10px_rgba(37,99,235,0.1)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414-5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                DOCX
              </span>
            )}
            {imageCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-400 tracking-wide uppercase shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {imageCount} Image{imageCount !== 1 ? 's' : ''}
              </span>
            )}
            {!hasVideo && !hasPdf && imageCount === 0 && (
              <span className="text-xs font-medium text-gray-600 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">No media yet</span>
            )}
          </div>
        </div>

        {/* Action Arrow */}
        <div className="relative z-10 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-white/10 transition-all duration-300 ml-4 flex-shrink-0">
          <svg
            className="w-5 h-5 text-white transform -translate-x-1 group-hover:translate-x-0 transition-transform duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </div>
  );
}
