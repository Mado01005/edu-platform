import Link from 'next/link';

interface SubjectCardProps {
  slug: string;
  title: string;
  icon: string;
  color: string;
  lessonCount: number;
  completedCount?: number;
}

export default function SubjectCard({ slug, title, icon, color, lessonCount, completedCount }: SubjectCardProps) {
  return (
    <Link
      href={`/subjects/${encodeURIComponent(slug)}`}
      id={`subject-${slug}`}
      className="group block glass-card rounded-2xl p-6 card-hover cursor-pointer"
    >
      {/* Gradient top bar */}
      <div className={`w-full h-1 rounded-full bg-gradient-to-r ${color} mb-5 transition-all duration-300 group-hover:h-1.5`} />

      {/* Icon */}
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${color} text-2xl mb-4 shadow-lg`}>
        {icon}
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
        {title}
      </h2>

      {/* Lesson count */}
      <p className="text-sm text-gray-400">
        {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
      </p>

      {/* Progress Bar Container */}
      {completedCount !== undefined && lessonCount > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Progress</span>
            <span className="font-semibold">{Math.round((completedCount / lessonCount) * 100)}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-green-400 h-1.5 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${(completedCount / lessonCount) * 100}%` }} 
            />
          </div>
        </div>
      )}

      {/* Arrow */}
      <div className={`flex items-center gap-1 ${completedCount !== undefined ? 'mt-4' : 'mt-4'} text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity`}>
        <span>View lessons</span>
        <svg className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
