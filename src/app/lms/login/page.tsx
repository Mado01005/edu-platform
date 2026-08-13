import { LmsAuthExperience } from '@/components/lms/LmsAuthExperience';

function safeNextPath(value: string | undefined) {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard';
}

type LoginMode = 'signin' | 'signup' | 'forgot' | 'recovery' | 'phone';

function safeMode(value: string | undefined): LoginMode {
  return value === 'signup' || value === 'forgot' || value === 'recovery' || value === 'phone'
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
  const phoneAuthEnabled =
    process.env.SUPABASE_PHONE_AUTH_CONFIGURED === 'true';
  const requestedMode = safeMode(mode);
  const initialError =
    reason === 'concurrent_login'
      ? '⚠️ Session Terminated — Your account was accessed from another device.'
      : error?.slice(0, 240);

  return (
    <LmsAuthExperience
      initialError={initialError}
      initialMode={requestedMode}
      nextPath={safeNextPath(next)}
      phoneAuthEnabled={phoneAuthEnabled}
    />
  );
}
