import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { redirect } from 'next/navigation';
import { ParentLoginForm } from '@/app/mps/login/ParentLoginForm';
import { getParentPortalSession } from '@/lib/lms/parent-portal';

export const dynamic = 'force-dynamic';

export default async function MpsLoginPage() {
  if (await getParentPortalSession()) redirect('/mps');
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-black px-4 text-white">
      <main className="box-border w-full max-w-md rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.2),transparent_50%)] p-5">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-300 text-black"><GraduationCap className="size-6" /></span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">MPS+ secure family access</p>
        <h1 className="mt-2 text-3xl font-black">Parent radar</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Use the phone number and 4-digit PIN issued by the academy. Five failed attempts lock access for 15 minutes.</p>
        <div className="mt-6"><ParentLoginForm /></div>
        <Link className="mt-5 block text-center text-xs font-bold text-zinc-500 hover:text-white" href="/catalog">Back to Way Ground</Link>
      </main>
    </div>
  );
}
