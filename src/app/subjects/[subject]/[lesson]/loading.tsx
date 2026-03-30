import Navbar from '@/components/Navbar';

export default function LessonLoading() {
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
          <div className="w-1/2 md:w-1/3 h-10 mb-14 shimmer rounded-lg"></div>

          {/* Title Header Skeleton */}
          <div className="mb-14">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-xl shimmer"></div>
               <div className="w-24 h-8 rounded-md shimmer"></div>
            </div>
            <div className="w-5/6 md:w-2/3 h-12 md:h-16 rounded-xl shimmer"></div>
          </div>

          {/* Content Space Skeleton */}
          <div className="space-y-6 mb-12">
            <div className="w-32 h-6 shimmer rounded-md mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                 <div key={i} className="h-20 rounded-2xl shimmer"></div>
              ))}
            </div>
            
            <div className="w-full h-64 md:h-96 rounded-3xl shimmer mt-8"></div>
          </div>

          {/* Action Row Skeleton */}
          <div className="flex items-center gap-3">
             <div className="w-40 h-10 rounded-full shimmer"></div>
             <div className="w-32 h-10 rounded-full shimmer"></div>
             <div className="w-36 h-10 rounded-full shimmer"></div>
          </div>
        </main>
      </div>
    </div>
  );
}
