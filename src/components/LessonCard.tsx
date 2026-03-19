import Link from 'next/link';

interface LessonCardProps {
  subjectSlug: string;
  slug: string;
  title: string;
  hasVideo: boolean;
  hasPdf: boolean;
  imageCount: number;
  index: number;
}

export default function LessonCard({
  subjectSlug,
  slug,
  title,
  hasVideo,
  hasPdf,
  imageCount,
  index,
}: LessonCardProps) {
  return (
    <Link
      href={`/subjects/${subjectSlug}/${slug}`}
      id={`lesson-${slug}`}
      className="group flex items-center gap-4 glass-card rounded-xl p-4 card-hover cursor-pointer"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Index circle */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm group-hover:bg-indigo-500/20 transition-colors">
        {index + 1}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          {hasVideo && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Video
            </span>
          )}
          {hasPdf && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </span>
          )}
          {imageCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {imageCount} image{imageCount !== 1 ? 's' : ''}
            </span>
          )}
          {!hasVideo && !hasPdf && imageCount === 0 && (
            <span className="text-xs text-gray-600">No media yet</span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <svg
        className="w-5 h-5 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
