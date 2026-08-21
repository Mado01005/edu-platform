'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Radio,
  Send,
  Smartphone,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import {
  type ComponentProps,
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { InputOTP } from '@/components/UI/input-otp';
import { PhoneInput } from '@/components/UI/phone-input';
import {
  isValidE164PhoneNumber,
  normalizePhoneNumber,
} from '@/lib/phone';
import { createSupabaseBrowserClient } from '@/lib/supabase/ssr-client';
import {
  PRODUCTION_SITE_URL,
  getApplicationOAuthCallbackUrl,
} from '@/lib/supabase/config';
import { cn } from '@/lib/utils';

type AuthMode =
  | 'signin'
  | 'signup'
  | 'forgot'
  | 'recovery'
  | 'phone'
  | 'otp';
type OtpChannel = 'sms' | 'whatsapp';

interface LmsAuthExperienceProps {
  initialError?: string;
  initialMode: AuthMode;
  nextPath: string;
  phoneAuthEnabled?: boolean;
}

interface AuthFieldProps
  extends Omit<ComponentProps<'input'>, 'className'> {
  icon: typeof Mail;
  inputAction?: ReactNode;
  label: string;
  labelAction?: ReactNode;
}

const PASSWORD_MIN_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;
const PHONE_AUTH_PENDING_MESSAGE =
  'Phone sign-in is temporarily unavailable while SMS and WhatsApp delivery is being configured. Please use Email / Password or Google instead.';

function friendlyAuthError(error: unknown, fallback: string) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '').trim()
      : typeof error === 'string'
        ? error.trim()
        : '';

  return !message ||
    message === '{}' ||
    message === '[object Object]' ||
    /^\{.*\}$/.test(message)
    ? fallback
    : message;
}

async function activateAppSession(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
) {
  const response = await fetch('/api/lms/session', {
    credentials: 'same-origin',
    method: 'POST',
  });

  if (response.ok) return;

  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  throw new Error('The secure device session could not be started.');
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.509h3.232c1.891-1.741 2.981-4.305 2.981-7.35Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.041.955-3.386.955-2.605 0-4.809-1.759-5.6-4.123H3.059v2.591A9.997 9.997 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.9A6.014 6.014 0 0 1 6.086 12c0-.659.114-1.3.314-1.9V7.509H3.059A9.997 9.997 0 0 0 2 12c0 1.614.386 3.141 1.059 4.491L6.4 13.9Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.959 2.991 14.695 2 12 2a9.997 9.997 0 0 0-8.941 5.509L6.4 10.1c.791-2.364 2.995-4.123 5.6-4.123Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AuthField({
  icon: Icon,
  inputAction,
  label,
  labelAction,
  id,
  ...props
}: AuthFieldProps) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-bold" htmlFor={id}>
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span>{label}</span>
        {labelAction}
      </span>
      <span className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 transition focus-within:border-[#084B2B] focus-within:ring-2 focus-within:ring-emerald-100">
        <Icon className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          className="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          id={id}
          {...props}
        />
        {inputAction}
      </span>
    </label>
  );
}

export function LmsAuthExperience({
  initialError = '',
  initialMode,
  nextPath,
  phoneAuthEnabled = false,
}: LmsAuthExperienceProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('sms');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(
    friendlyAuthError(
      initialError,
      initialError ? 'Authentication failed. Please try again.' : '',
    ),
  );
  const [notice, setNotice] = useState('');
  const [phoneWarning, setPhoneWarning] = useState('');

  useEffect(() => {
    if (initialMode === 'phone' && !phoneAuthEnabled) {
      setMode('signin');
      setPhoneWarning(PHONE_AUTH_PENDING_MESSAGE);
    }
  }, [initialMode, phoneAuthEnabled]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPhoneWarning('');
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
  }

  function callbackUrl(next?: string) {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL;
    return getApplicationOAuthCallbackUrl(origin, next);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setNotice('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(
          friendlyAuthError(
            signInError,
            'Invalid credentials. Please check your email and password.',
          ),
        );
        return;
      }

      await activateAppSession(supabase);
      router.push(nextPath);
      router.refresh();
    } catch (caughtError) {
      setError(
        friendlyAuthError(
          caughtError,
          'Invalid credentials. Please check your email and password.',
        ),
      );
    } finally {
      setPending(false);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = normalizePhoneNumber(phoneNumber);

    if (cleanName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanPhone) {
      setError('Enter a valid international mobile number.');
      return;
    }
    if (!/^GRADE_(?:[1-9]|1[0-2])$/.test(gradeLevel)) {
      setError('Select the student grade level.');
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setPending(true);
    setError('');
    setNotice('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            name: cleanName,
            phone_number: cleanPhone,
            grade_level: gradeLevel,
          },
          emailRedirectTo: callbackUrl('/dashboard'),
        },
      });

      if (signUpError) {
        setError(
          friendlyAuthError(
            signUpError,
            'We could not create your account. Please check the form and try again.',
          ),
        );
        return;
      }

      if (data.session) {
        await activateAppSession(supabase);
        router.push('/dashboard');
        router.refresh();
        return;
      }

      setVerificationEmail(cleanEmail);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('We could not create your account. Please try again.');
    } finally {
      setPending(false);
    }
  }

  function isPhoneProviderUnavailable(authError: {
    code?: string;
    message: string;
  }) {
    const normalized = authError.message.toLowerCase();
    return (
      authError.code === 'otp_disabled' ||
      normalized.includes('unsupported phone provider') ||
      normalized.includes('phone provider is not enabled') ||
      normalized.includes('sms provider is not enabled') ||
      normalized.includes('phone signups are disabled')
    );
  }

  function showPhoneAuthError(authError: {
    code?: string;
    message: string;
  }) {
    if (isPhoneProviderUnavailable(authError)) {
      setError('');
      setPhoneWarning(PHONE_AUTH_PENDING_MESSAGE);
      setMode('signin');
      return;
    }

    setPhoneWarning('');
    const normalized = authError.message.toLowerCase();
    if (
      normalized.includes('signups not allowed') ||
      normalized.includes('user not found')
    ) {
      setError('No verified account is linked to that phone number.');
      return;
    }
    setError(friendlyAuthError(authError, 'Unable to verify that code.'));
  }

  async function requestPhoneOtp(
    requestedPhone: string,
    channel: OtpChannel,
  ) {
    const cleanPhone = normalizePhoneNumber(requestedPhone);
    if (!cleanPhone || !isValidE164PhoneNumber(cleanPhone)) {
      setError('Enter a valid international mobile number.');
      return false;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: cleanPhone,
      options: {
        channel,
        shouldCreateUser: false,
      },
    });
    if (otpError) {
      showPhoneAuthError(otpError);
      return false;
    }

    setOtpPhone(cleanPhone);
    setOtpCode('');
    setCooldown(RESEND_COOLDOWN_SECONDS);
    return true;
  }

  async function handlePhoneSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setNotice('');
    setPhoneWarning('');

    try {
      if (await requestPhoneOtp(phoneNumber, otpChannel)) {
        setMode('otp');
        setNotice(
          `A 6-digit code was sent by ${
            otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'
          }.`,
        );
      }
    } catch {
      setError('We could not send a verification code. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function handlePhoneOtpVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      setError('Enter the complete 6-digit verification code.');
      return;
    }

    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/phone', {
        body: JSON.stringify({ phone: otpPhone, token: otpCode }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        showPhoneAuthError({ message: result.error ?? 'Unable to verify that code.' });
        return;
      }

      const supabase = createSupabaseBrowserClient();
      await activateAppSession(supabase);
      router.push(nextPath);
      router.refresh();
    } catch {
      setError('We could not verify that code. Please request a new one.');
    } finally {
      setPending(false);
    }
  }

  async function handlePhoneResend() {
    if (!otpPhone || cooldown > 0) return;
    setPending(true);
    setError('');
    setNotice('');
    setPhoneWarning('');

    try {
      if (await requestPhoneOtp(otpPhone, otpChannel)) {
        setNotice('A new verification code is on its way.');
      }
    } catch {
      setError('We could not resend the verification code.');
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleSignIn() {
    setPending(true);
    setError('');
    setNotice('');

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = callbackUrl(nextPath);
      if (process.env.NODE_ENV !== 'production') {
        console.info('[LMS_GOOGLE_OAUTH_REDIRECT]', redirectTo);
      }
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo,
        },
      });

      if (signInError) {
        setError(
          friendlyAuthError(
            signInError,
            'Google sign-in could not be started. Please try again.',
          ),
        );
        setPending(false);
      }
    } catch {
      setError('Google sign-in could not be started. Please try again.');
      setPending(false);
    }
  }

  async function handleResend() {
    if (!verificationEmail || cooldown > 0) return;

    setPending(true);
    setError('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: { emailRedirectTo: callbackUrl('/dashboard') },
      });

      if (resendError) {
        setError(
          friendlyAuthError(
            resendError,
            'We could not resend the confirmation email.',
          ),
        );
        return;
      }

      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice('A new confirmation email is on its way.');
    } catch {
      setError('We could not resend the confirmation email.');
    } finally {
      setPending(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Enter your email address first.');
      return;
    }

    setPending(true);
    setError('');
    setNotice('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        { redirectTo: callbackUrl('/lms/login?mode=recovery') },
      );

      if (resetError) {
        setError(
          friendlyAuthError(resetError, 'We could not send the reset email.'),
        );
        return;
      }

      setNotice('Check your inbox for a secure password reset link.');
    } catch {
      setError('We could not send the reset email. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function handlePasswordRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setPending(true);
    setError('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(
          friendlyAuthError(
            updateError,
            'We could not update your password. Please request a new link.',
          ),
        );
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('We could not update your password. Please request a new link.');
    } finally {
      setPending(false);
    }
  }

  const passwordToggle = (
    <button
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      className="text-slate-500 transition hover:text-[#084B2B]"
      onClick={() => setShowPassword((value) => !value)}
      type="button"
    >
      {showPassword ? (
        <EyeOff className="size-4" aria-hidden="true" />
      ) : (
        <Eye className="size-4" aria-hidden="true" />
      )}
    </button>
  );

  return (
    <main className="grid min-h-screen w-full grid-cols-1 overflow-x-hidden bg-white text-slate-900 lg:grid-cols-2">
      <section className="relative hidden min-w-0 overflow-hidden border-r border-emerald-950/10 bg-emerald-50 p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">

        <Link className="relative flex w-fit items-center gap-3" href="/catalog">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#084B2B] text-white shadow-sm">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-black">Oqool Academy</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.24em] text-[#084B2B]">
              Learn. Build. Progress.
            </span>
          </span>
        </Link>

        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#084B2B]">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Your learning space
          </span>
          <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] xl:text-6xl">
            Welcome back to your{' '}
            <span className="text-[#084B2B]">
              learning space.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">
            Structured courses, practical resources, and live classrooms that
            keep every next step clear.
          </p>
        </div>

        <div className="relative grid min-w-0 grid-cols-2 gap-3 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#F8FAF7] p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#084B2B]">
              <UsersRound className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-black">300+</span>
              <span className="block truncate text-xs text-slate-500">
                Active students
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#F8FAF7] p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Radio className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-black">Live</span>
              <span className="block truncate text-xs text-slate-500">
                Session hubs
              </span>
            </span>
          </div>
        </div>
      </section>

      <section className="relative flex min-w-0 items-center justify-center overflow-hidden px-4 py-10 sm:px-8 lg:px-12">
        <div className="relative flex w-full max-w-md min-w-0 flex-col">
          <Link
            className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#084B2B] lg:hidden"
            href="/catalog"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to catalog
          </Link>

          {verificationEmail ? (
            <div className="flex min-w-0 flex-col items-center rounded-2xl border border-emerald-950/10 bg-white p-6 text-center shadow-sm sm:p-8">
              <span className="relative flex size-20 items-center justify-center rounded-2xl bg-emerald-100 text-[#084B2B]">
                <Mail className="size-9 animate-bounce" aria-hidden="true" />
                <span className="absolute right-1 top-1 size-3 rounded-full bg-emerald-300 shadow-lg shadow-emerald-400/50" />
              </span>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-[#084B2B]">
                One last step
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Check your inbox
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                We sent a confirmation link to{' '}
                <strong className="break-all text-slate-900">
                  {verificationEmail}
                </strong>
                . Click the link in the email to activate your account.
              </p>
              {notice ? (
                <p className="mt-5 flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {notice}
                </p>
              ) : null}
              {error ? (
                <p
                  aria-live="polite"
                  className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                >
                  {error}
                </p>
              ) : null}
              <button
                className="mt-7 flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending || cooldown > 0}
                onClick={() => void handleResend()}
                type="button"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
                {cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : 'Resend confirmation email'}
              </button>
              <button
                className="mt-3 text-sm font-bold text-slate-500 transition hover:text-[#084B2B]"
                onClick={() => {
                  setVerificationEmail('');
                  switchMode('signin');
                }}
                type="button"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#084B2B] text-white shadow-sm lg:hidden">
                  <GraduationCap className="size-6" aria-hidden="true" />
                </span>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-[#084B2B]">
                  {mode === 'signup'
                    ? 'Start learning today'
                    : mode === 'phone'
                      ? 'Passwordless access'
                      : mode === 'otp'
                        ? 'Verify your mobile'
                        : mode === 'forgot'
                          ? 'Account recovery'
                          : mode === 'recovery'
                            ? 'Choose a new password'
                            : 'Welcome back'}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  {mode === 'signup'
                    ? 'Create your account.'
                    : mode === 'phone'
                      ? 'Sign in with your phone.'
                      : mode === 'otp'
                        ? 'Enter your 6-digit code.'
                        : mode === 'forgot'
                          ? 'Reset your password.'
                          : mode === 'recovery'
                            ? 'Secure your account.'
                            : 'Sign in to Oqool Academy.'}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {mode === 'signup'
                    ? 'Build your profile and unlock your learning dashboard.'
                    : mode === 'phone'
                      ? 'Choose SMS or WhatsApp to receive a one-time code.'
                      : mode === 'otp'
                        ? `We sent a secure code to ${otpPhone}.`
                        : mode === 'forgot'
                          ? 'We will send a secure reset link to your inbox.'
                          : mode === 'recovery'
                            ? 'Use at least eight characters for your new password.'
                            : 'Continue your courses, resources, and live sessions.'}
                </p>
              </div>

              {mode === 'signin' ||
              mode === 'signup' ||
              mode === 'phone' ||
              mode === 'otp' ? (
                <div
                  aria-label="Authentication mode"
                  className="mb-6 grid min-w-0 grid-cols-2 rounded-2xl border border-emerald-950/10 bg-slate-100 p-1"
                  role="tablist"
                >
                  {(['signin', 'signup'] as const).map((tab) => {
                    const active =
                      tab === 'signup'
                        ? mode === 'signup'
                        : mode === 'signin' ||
                          mode === 'phone' ||
                          mode === 'otp';
                    return (
                      <button
                        aria-selected={active}
                        className={cn(
                          'h-10 rounded-xl text-sm font-black transition',
                          active
                            ? 'bg-white text-[#084B2B] shadow-sm'
                            : 'text-slate-500 hover:text-[#084B2B]',
                        )}
                        key={tab}
                        onClick={() => switchMode(tab)}
                        role="tab"
                        type="button"
                      >
                        {tab === 'signin' ? 'Sign In' : 'Create Account'}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <form
                className="flex min-w-0 flex-col gap-4"
                onSubmit={
                  mode === 'signup'
                    ? handleSignUp
                    : mode === 'phone'
                      ? handlePhoneSignIn
                      : mode === 'otp'
                        ? handlePhoneOtpVerify
                        : mode === 'forgot'
                          ? handleForgotPassword
                          : mode === 'recovery'
                            ? handlePasswordRecovery
                            : handleSignIn
                }
              >
                {mode === 'signup' ? (
                  <AuthField
                    autoComplete="name"
                    icon={UserRound}
                    id="full-name"
                    label="Full Name"
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Dr. Abdallah Saad"
                    required
                    type="text"
                    value={fullName}
                  />
                ) : null}

                {mode === 'signup' ? (
                  <label
                    className="flex min-w-0 flex-col gap-2 text-sm font-bold"
                    htmlFor="signup-phone"
                  >
                    Mobile Number
                    <PhoneInput
                      id="signup-phone"
                      onChange={setPhoneNumber}
                      required
                      value={phoneNumber}
                    />
                  </label>
                ) : null}

                {mode === 'signup' ? (
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-bold">
                    Grade Level
                    <select
                      className="h-12 w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#084B2B] focus:ring-2 focus:ring-emerald-100"
                      onChange={(event) => setGradeLevel(event.target.value)}
                      required
                      value={gradeLevel}
                    >
                      <option value="">Select Grade 1–12</option>
                      {Array.from({ length: 12 }, (_, index) => (
                        <option
                          key={`GRADE_${index + 1}`}
                          value={`GRADE_${index + 1}`}
                        >
                          Grade {index + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {mode === 'phone' ? (
                  <>
                    <label
                      className="flex min-w-0 flex-col gap-2 text-sm font-bold"
                      htmlFor="phone-sign-in"
                    >
                      Mobile Number
                      <PhoneInput
                        id="phone-sign-in"
                        onChange={setPhoneNumber}
                        required
                        value={phoneNumber}
                      />
                    </label>
                    <fieldset className="min-w-0">
                      <legend className="text-sm font-bold">
                        Send code via
                      </legend>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {(['sms', 'whatsapp'] as const).map((channel) => (
                          <label
                            className={cn(
                              'flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-black transition',
                              otpChannel === channel
                                ? 'border-[#084B2B] bg-[#084B2B] text-white'
                                : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-300 hover:text-[#084B2B]',
                            )}
                            key={channel}
                          >
                            <input
                              checked={otpChannel === channel}
                              className="sr-only"
                              name="otp-channel"
                              onChange={() => setOtpChannel(channel)}
                              type="radio"
                              value={channel}
                            />
                            {channel === 'sms' ? 'SMS' : 'WhatsApp'}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </>
                ) : null}

                {mode === 'otp' ? (
                  <div className="min-w-0">
                    <label
                      className="mb-2 block text-sm font-bold"
                      id="phone-otp-label"
                    >
                      Verification code
                    </label>
                    <InputOTP
                      disabled={pending}
                      onChange={setOtpCode}
                      value={otpCode}
                    />
                  </div>
                ) : null}

                {mode === 'signin' ||
                mode === 'signup' ||
                mode === 'forgot' ? (
                  <AuthField
                    autoComplete="email"
                    icon={Mail}
                    id="email"
                    label="Email Address"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                  />
                ) : null}

                {mode === 'signin' ||
                mode === 'signup' ||
                mode === 'recovery' ? (
                  <AuthField
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    icon={mode === 'recovery' ? KeyRound : LockKeyhole}
                    id="password"
                    label={mode === 'recovery' ? 'New Password' : 'Password'}
                    minLength={
                      mode === 'signup' || mode === 'recovery'
                        ? PASSWORD_MIN_LENGTH
                        : undefined
                    }
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      mode === 'signin'
                        ? 'Enter your password'
                        : 'At least 8 characters'
                    }
                    required
                    inputAction={passwordToggle}
                    labelAction={
                      mode === 'signin' ? (
                        <button
                          className="text-xs font-bold text-[#084B2B] transition hover:text-[#084B2B]"
                          onClick={() => switchMode('forgot')}
                          type="button"
                        >
                          Forgot password?
                        </button>
                      ) : null
                    }
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                ) : null}

                {mode === 'signup' || mode === 'recovery' ? (
                  <AuthField
                    autoComplete="new-password"
                    icon={LockKeyhole}
                    id="confirm-password"
                    label="Confirm Password"
                    minLength={PASSWORD_MIN_LENGTH}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Repeat your password"
                    required
                    inputAction={
                      <button
                        aria-label={
                          showConfirmPassword
                            ? 'Hide confirmation password'
                            : 'Show confirmation password'
                        }
                        className="text-slate-500 transition hover:text-[#084B2B]"
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                        type="button"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" aria-hidden="true" />
                        ) : (
                          <Eye className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    }
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                  />
                ) : null}

                {notice ? (
                  <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                    {notice}
                  </p>
                ) : null}
                {phoneWarning ? (
                  <div
                    className="flex min-w-0 items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-5 text-amber-800"
                    role="status"
                  >
                    <Smartphone
                      className="mt-0.5 size-4 shrink-0 text-amber-700"
                      aria-hidden="true"
                    />
                    <p className="min-w-0 flex-1">{phoneWarning}</p>
                    <button
                      aria-label="Dismiss phone sign-in warning"
                      className="shrink-0 rounded-md p-1 text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      onClick={() => setPhoneWarning('')}
                      type="button"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
                {error ? (
                  <p
                    aria-live="polite"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  className="mt-1 flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#084B2B] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#063B22] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {mode === 'signup'
                    ? 'Create Account'
                    : mode === 'phone'
                      ? `Send ${
                          otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'
                        } Code`
                      : mode === 'otp'
                        ? 'Verify & Sign In'
                        : mode === 'forgot'
                          ? 'Send Reset Link'
                          : mode === 'recovery'
                            ? 'Update Password'
                            : 'Sign In'}
                  {!pending ? (
                    <ArrowRight className="size-4" aria-hidden="true" />
                  ) : null}
                </button>
              </form>

              {mode === 'signin' && phoneAuthEnabled ? (
                <button
                  className="mt-3 flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-[#084B2B] transition hover:border-emerald-300 hover:bg-emerald-100"
                  onClick={() => switchMode('phone')}
                  type="button"
                >
                  <Smartphone className="size-4" aria-hidden="true" />
                  Sign in with Phone
                </button>
              ) : mode === 'phone' ? (
                <button
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#084B2B]"
                  onClick={() => switchMode('signin')}
                  type="button"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back to email sign in
                </button>
              ) : mode === 'otp' ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    className="h-11 rounded-xl border border-slate-300 text-xs font-black text-slate-600 transition hover:bg-[#F8FAF7] hover:text-[#084B2B]"
                    onClick={() => switchMode('phone')}
                    type="button"
                  >
                    Change number
                  </button>
                  <button
                    className="h-11 rounded-xl border border-slate-300 text-xs font-black text-[#084B2B] transition hover:bg-emerald-50 disabled:opacity-50"
                    disabled={pending || cooldown > 0}
                    onClick={() => void handlePhoneResend()}
                    type="button"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              ) : null}

              {mode === 'signin' ||
              mode === 'signup' ||
              mode === 'phone' ? (
                <>
                  <div className="my-6 flex items-center gap-3 text-xs font-bold text-slate-500">
                    <span className="h-px flex-1 bg-slate-200" />
                    OR
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <button
                    className="flex h-12 w-full min-w-0 items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-emerald-300 hover:bg-[#F8FAF7] disabled:opacity-60"
                    disabled={pending}
                    onClick={() => void handleGoogleSignIn()}
                    type="button"
                  >
                    <GoogleLogo />
                    Continue with Google
                  </button>
                </>
              ) : mode === 'forgot' || mode === 'recovery' ? (
                <button
                  className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#084B2B]"
                  onClick={() => switchMode('signin')}
                  type="button"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back to sign in
                </button>
              ) : null}

              <p className="mt-7 text-center text-xs leading-5 text-slate-500">
                By continuing, you agree to use this learning space responsibly
                and keep your account secure.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
