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
  searchParams: Promise<{
    error?: string;
    mode?: string;
    next?: string;
    reason?: string;
  }>;
}) {
  const { error, mode, next, reason } = await searchParams;
  const initialError =
    reason === 'concurrent_login'
      ? '⚠️ Session Terminated — Your account was accessed from another device.'
      : error?.slice(0, 240);

  return (
    <LmsAuthExperience
      initialError={initialError}
      initialMode={safeMode(mode)}
      nextPath={safeNextPath(next)}
    />
  );
}
