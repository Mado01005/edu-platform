import Link from 'next/link';

interface SubjectCardProps {
  slug: string;
  title: string;
  icon: string;
  color: string;
  lessonCount: number;
}

export default function SubjectCard({ slug, title, icon, color, lessonCount }: SubjectCardProps) {
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

      {/* Arrow */}
      <div className="flex items-center gap-1 mt-4 text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        <span>View lessons</span>
        <svg className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
