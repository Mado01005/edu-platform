import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { redirect } from 'next/navigation';
import { OqoolEmblem, OqoolWordmark } from '@/components/branding/OqoolBrand';
import { PasswordlessParentLogin } from '@/components/parent/passwordless-parent-login';
import { getParentPortalSession } from '@/lib/lms/parent-portal';

export const dynamic = 'force-dynamic';

export default async function ParentLoginPage() {
  if (await getParentPortalSession()) redirect('/parent/dashboard');
  return <div className="flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-[#F8FAF8] px-4 py-8 text-[#1A2E22]"><main className="w-full max-w-md rounded-3xl border border-emerald-950/10 bg-white p-5 sm:p-7"><Link className="flex items-center gap-3" href="/"><OqoolEmblem className="size-11" /><OqoolWordmark /></Link><span className="mt-8 flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#084B2B]"><GraduationCap className="size-5" /></span><p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#0F6E41]">Secure family access</p><h1 className="mt-2 text-3xl font-black">Parent tracking portal</h1><p className="mt-2 text-sm leading-6 text-slate-600">Passwordless, read-only access to learning progress, attendance, scores, and teacher feedback.</p><div className="mt-6"><PasswordlessParentLogin enabled={process.env.SUPABASE_PHONE_AUTH_CONFIGURED === 'true'} /></div><Link className="mt-5 block text-center text-xs font-bold text-slate-500 hover:text-[#084B2B]" href="/">Back to Oqool Academy</Link></main></div>;
}
