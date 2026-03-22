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

export default function SubjectCard({ slug, title, icon, color, lessonCount, completedCount }: SubjectCardProps) {
  return (
    <Link
      href={`/subjects/${encodeURIComponent(slug)}`}
      id={`subject-${slug}`}
      className="group block relative bg-[#0A0A0B]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 md:p-8 cursor-pointer overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] hover:border-white/10"
    >
      {/* Dynamic ambient hover glow based on subject color */}
      <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[60px] opacity-[0.15] bg-gradient-to-br ${color} transition-opacity duration-700 group-hover:opacity-40`}></div>
      
      {/* Glowing top active border line */}
      <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${color} opacity-70 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.3)]`} />

      {/* Volumetric Icon Pod */}
      <div className={`relative z-10 inline-flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-gradient-to-br ${color} text-3xl mb-5 shadow-lg group-hover:scale-110 transition-transform duration-500 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]`}>
        {icon}
      </div>

      {/* Typography Block */}
      <h2 className="relative z-10 text-xl font-bold text-white mb-1.5 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all duration-300">
        {title}
      </h2>

      <p className="relative z-10 text-sm text-gray-400 font-medium">
        {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'} available
      </p>

      {/* Progress Ring */}
      {completedCount !== undefined && lessonCount > 0 && (
        <div className="mt-6 pt-5 border-t border-white/5 relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Course Progress</p>
            <p className="text-sm text-gray-300 font-medium">{completedCount} of {lessonCount} completed</p>
          </div>
          <ProgressRing percentage={(completedCount / lessonCount) * 100} color={color} />
        </div>
      )}

      {/* Action Prompt */}
      <div className={`relative z-10 flex items-center gap-2 ${completedCount !== undefined ? 'mt-5' : 'mt-6'} text-indigo-400 text-sm font-bold tracking-wide opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0`}>
        <span>Open Course</span>
        <svg className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
