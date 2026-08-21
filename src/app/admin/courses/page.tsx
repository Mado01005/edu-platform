import { CoursePriceForm } from '@/components/Admin/course-price-form';
import { requireLmsPageRole } from '@/lib/lms/auth';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminCoursePricingPage() {
  await requireLmsPageRole(['SUPER_ADMIN']);
  const courses = await getPrisma().course.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, priceEGP: true, priceUSD: true, title: true },
  });

  return (
    <main className="flex min-h-screen w-full flex-col items-center overflow-x-hidden bg-[#F8FAF7] px-4 py-8 text-slate-900">
      <div className="flex w-full max-w-md min-w-0 flex-col gap-4">
        <header>
          <p className="text-xs font-black uppercase tracking-wider text-[#084B2B]">Super Admin only</p>
          <h1 className="mt-1 text-3xl font-black">Course pricing</h1>
          <p className="mt-2 text-sm text-slate-600">Teachers cannot view or edit these commercial settings.</p>
        </header>
        {courses.map((course) => (
          <CoursePriceForm
            course={{
              ...course,
              priceEGP: course.priceEGP.toFixed(2),
              priceUSD: course.priceUSD.toFixed(2),
            }}
            key={course.id}
          />
        ))}
        {!courses.length ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No courses available.</p> : null}
      </div>
    </main>
  );
}
