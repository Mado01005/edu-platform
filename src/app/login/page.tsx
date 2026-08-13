import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const params = new URLSearchParams();
  if (from?.startsWith('/') && !from.startsWith('//')) params.set('next', from);
  redirect(`/lms/login${params.size ? `?${params.toString()}` : ''}`);
}
