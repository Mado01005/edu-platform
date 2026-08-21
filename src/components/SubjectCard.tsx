import Link from 'next/link';
import ProgressRing from './ProgressRing';

interface SubjectCardProps {
  slug: string;
  title: string;
  icon: string;
  color: string;
  lessonCount: number;
  completedCount?: number;
}

export default function SubjectCard({ slug, title, icon, lessonCount, completedCount }: SubjectCardProps) {
  return (
    <Link
      href={`/subjects/${encodeURIComponent(slug)}`}
      id={`subject-${slug}`}
      className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md md:p-8"
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-50" />

      <div className="relative z-10 mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl transition-transform duration-200 group-hover:scale-105">
        {icon}
      </div>

      <h2 className="relative z-10 mb-1.5 text-xl font-semibold text-slate-900 transition-colors group-hover:text-[#084B2B]">
        {title}
      </h2>

      <p className="relative z-10 text-sm font-medium text-slate-500">
        {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'} available
      </p>

      {/* Progress Ring */}
      {completedCount !== undefined && lessonCount > 0 && (
        <div className="relative z-10 mt-6 flex items-center justify-between border-t border-emerald-950/10 pt-5">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Course Progress</p>
            <p className="text-sm font-medium text-slate-600">{completedCount} of {lessonCount} completed</p>
          </div>
          <ProgressRing percentage={(completedCount / lessonCount) * 100} />
        </div>
      )}

      {/* Action Prompt */}
      <div className={`relative z-10 flex items-center gap-2 ${completedCount !== undefined ? 'mt-5' : 'mt-6'} text-sm font-semibold text-[#084B2B] transition`}>
        <span>Open Course</span>
        <svg className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
