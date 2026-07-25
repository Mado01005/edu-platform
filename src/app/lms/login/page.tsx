import { LmsAuthExperience } from '@/components/lms/LmsAuthExperience';

function safeNextPath(value: string | undefined) {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard';
}

type LoginMode = 'signin' | 'signup' | 'forgot' | 'recovery';

function safeMode(value: string | undefined): LoginMode {
  return value === 'signup' || value === 'forgot' || value === 'recovery'
    ? value
    : 'signin';
}

export default async function LmsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; next?: string }>;
}) {
  const { error, mode, next } = await searchParams;

  return (
    <LmsAuthExperience
      initialError={error?.slice(0, 240)}
      initialMode={safeMode(mode)}
      nextPath={safeNextPath(next)}
    />
  );
}
