import { KeyRound } from 'lucide-react';
import { CodeGenerator } from '@/app/admin/codes/CodeGenerator';
import { PortalShell } from '@/components/erp/PortalShell';
import { requireAdminPage } from '@/lib/lms/auth';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminCodesPage() {
  const admin = await requireAdminPage();
  const prisma = getPrisma();
  const [courses, codes] = await Promise.all([
    prisma.course.findMany({ where: { isPublished: true }, orderBy: { title: 'asc' }, select: { id: true, title: true } }),
    prisma.digitalAccessCode.findMany({
      orderBy: { createdAt: 'desc' },
      select: { batchId: true, codeLastFour: true, course: { select: { title: true } }, createdAt: true, gradeLevel: true },
      take: 300,
    }),
  ]);
  const grouped = new Map<string, { batchId: string; count: number; createdAt: string; lastFour: string[]; target: string }>();
  for (const code of codes) {
    const current = grouped.get(code.batchId);
    if (current) {
      current.count += 1;
      if (current.lastFour.length < 5) current.lastFour.push(code.codeLastFour);
    } else {
      grouped.set(code.batchId, {
        batchId: code.batchId,
        count: 1,
        createdAt: code.createdAt.toISOString(),
        lastFour: [code.codeLastFour],
        target: code.course?.title ?? code.gradeLevel?.replace('_', ' ') ?? 'Unknown target',
      });
    }
  }

  return (
    <PortalShell user={admin}>
      <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.22),transparent_55%)] p-5">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-300 text-black"><KeyRound className="size-5" /></span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-violet-300">Single-use digital access</p>
        <h1 className="mt-2 text-3xl font-black">Prepaid code desk</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Generate course or grade batches. Only HMAC hashes remain after this screen.</p>
      </header>
      <CodeGenerator courses={courses} recentBatches={Array.from(grouped.values()).slice(0, 20)} />
    </PortalShell>
  );
}
