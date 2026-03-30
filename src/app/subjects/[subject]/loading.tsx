import Navbar from '@/components/Navbar';

export default function SubjectLoading() {
  return (
    <div className="min-h-screen bg-[#05050A] relative overflow-hidden">
      <div className="relative z-10">
        {/* Mock Navbar */}
        <div className="h-16 border-b border-white/10 flex items-center px-4 sm:px-6 lg:px-8">
           <div className="w-32 h-6 shimmer rounded-md"></div>
           <div className="ml-auto flex gap-4">
              <div className="w-8 h-8 rounded-full shimmer"></div>
           </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Breadcrumb Skeleton */}
          <div className="w-48 h-4 mb-8 shimmer rounded-md"></div>

          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-12 text-center md:text-left mt-6">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-[2rem] shimmer flex-shrink-0"></div>
            <div className="flex-1 mt-2 w-full flex flex-col items-center md:items-start">
              <div className="w-3/4 md:w-1/2 h-12 md:h-16 shimmer rounded-xl mb-4"></div>
              <div className="w-32 h-6 shimmer rounded-md"></div>
            </div>
          </div>

          <div className="w-full h-px bg-white/10 mb-12" />

          {/* Lessons Skeleton List */}
          <div className="relative pl-0 sm:pl-2 md:pl-6 space-y-6">
            <div className="absolute left-[38px] md:left-[51px] top-6 bottom-16 w-1 sm:w-1.5 rounded-full bg-white/5 hidden sm:block"></div>
            
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-row items-stretch sm:items-center gap-4 md:gap-6">
                <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl shimmer mt-4 sm:mt-0"></div>
                <div className="flex-1 w-full h-24 sm:h-20 shimmer rounded-3xl border border-white/5"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
