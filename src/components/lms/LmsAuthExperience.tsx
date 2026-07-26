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
      <span className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 backdrop-blur-md transition focus-within:border-purple-500/50 focus-within:ring-4 focus-within:ring-purple-500/10">
        <Icon className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
        <input
          className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
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
}: LmsAuthExperienceProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('sms');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const [phoneWarning, setPhoneWarning] = useState('');

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
        : process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      throw new Error('The authentication callback origin is not configured.');
    }

    const callback = new URL('/auth/callback', origin);
    if (!next) return callback.toString();
    callback.searchParams.set('next', next);
    return callback.toString();
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
        setError(signInError.message);
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError('We could not sign you in. Please try again.');
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
          },
          emailRedirectTo: callbackUrl('/dashboard'),
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
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
    setError(authError.message);
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
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: otpPhone,
        token: otpCode,
        type: 'sms',
      });
      if (verifyError) {
        showPhoneAuthError(verifyError);
        return;
      }

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
      const redirectTo = callbackUrl();
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
        setError(signInError.message);
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
        setError(resendError.message);
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
        setError(resetError.message);
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
        setError(updateError.message);
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
      className="text-zinc-500 transition hover:text-white"
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
    <main className="grid min-h-screen w-full grid-cols-1 overflow-x-hidden bg-zinc-950 text-white lg:grid-cols-2">
      <section className="relative hidden min-w-0 overflow-hidden border-r border-white/10 bg-black p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(124,58,237,.38),transparent_32%),radial-gradient(circle_at_80%_68%,rgba(37,99,235,.2),transparent_30%),linear-gradient(145deg,#09090b,#030712)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:52px_52px]"
        />

        <Link className="relative flex w-fit items-center gap-3" href="/catalog">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-black shadow-xl shadow-violet-500/20">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-black">Way Ground LMS</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.24em] text-violet-300">
              Learn. Build. Progress.
            </span>
          </span>
        </Link>

        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Your learning command center
          </span>
          <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] xl:text-6xl">
            Welcome back to your{' '}
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
              learning space.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-zinc-400">
            Structured courses, practical resources, and live classrooms that
            keep every next step clear.
          </p>
        </div>

        <div className="relative grid min-w-0 grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-black/30 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">
              <UsersRound className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-black">300+</span>
              <span className="block truncate text-xs text-zinc-500">
                Active students
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-black/30 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
              <Radio className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-black">Live</span>
              <span className="block truncate text-xs text-zinc-500">
                Session hubs
              </span>
            </span>
          </div>
        </div>
      </section>

      <section className="relative flex min-w-0 items-center justify-center overflow-hidden px-4 py-10 sm:px-8 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(124,58,237,.18),transparent_65%)] lg:hidden"
        />
        <div className="relative flex w-full max-w-md min-w-0 flex-col">
          <Link
            className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white lg:hidden"
            href="/catalog"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to catalog
          </Link>

          {verificationEmail ? (
            <div className="flex min-w-0 flex-col items-center rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 text-center shadow-2xl shadow-violet-950/20 backdrop-blur-2xl sm:p-8">
              <span className="relative flex size-20 items-center justify-center rounded-3xl bg-violet-400/15 text-violet-300">
                <Mail className="size-9 animate-bounce" aria-hidden="true" />
                <span className="absolute right-1 top-1 size-3 rounded-full bg-emerald-300 shadow-lg shadow-emerald-400/50" />
              </span>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                One last step
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Check your inbox
              </h1>
              <p className="mt-4 text-sm leading-7 text-zinc-400">
                We sent a confirmation link to{' '}
                <strong className="break-all text-white">
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
                className="mt-7 flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-black transition hover:border-violet-400/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="mt-3 text-sm font-bold text-zinc-500 transition hover:text-white"
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
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-black shadow-lg shadow-violet-500/20 lg:hidden">
                  <GraduationCap className="size-6" aria-hidden="true" />
                </span>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
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
                            : 'Sign in to Way Ground.'}
                </h1>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
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
                  className="mb-6 grid min-w-0 grid-cols-2 rounded-2xl border border-white/10 bg-black/40 p-1"
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
                            ? 'bg-white text-black shadow-lg'
                            : 'text-zinc-500 hover:text-white',
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
                                ? 'border-violet-300 bg-violet-300 text-black'
                                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white',
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
                          className="text-xs font-bold text-violet-300 transition hover:text-violet-200"
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
                        className="text-zinc-500 transition hover:text-white"
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
                  <p className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                    {notice}
                  </p>
                ) : null}
                {phoneWarning ? (
                  <div
                    className="flex min-w-0 items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-3 text-sm leading-5 text-amber-100"
                    role="status"
                  >
                    <Smartphone
                      className="mt-0.5 size-4 shrink-0 text-amber-300"
                      aria-hidden="true"
                    />
                    <p className="min-w-0 flex-1">{phoneWarning}</p>
                    <button
                      aria-label="Dismiss phone sign-in warning"
                      className="shrink-0 rounded-md p-1 text-amber-300 transition hover:bg-amber-300/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
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
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  className="mt-1 flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-400 to-fuchsia-500 px-4 text-sm font-black text-black shadow-xl shadow-violet-950/40 transition hover:from-violet-300 hover:to-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
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

              {mode === 'signin' ? (
                <button
                  className="mt-3 flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] px-4 text-sm font-black text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-400/10"
                  onClick={() => switchMode('phone')}
                  type="button"
                >
                  <Smartphone className="size-4" aria-hidden="true" />
                  Sign in with Phone
                </button>
              ) : mode === 'phone' ? (
                <button
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
                  onClick={() => switchMode('signin')}
                  type="button"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back to email sign in
                </button>
              ) : mode === 'otp' ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    className="h-11 rounded-xl border border-white/10 text-xs font-black text-zinc-400 transition hover:bg-white/5 hover:text-white"
                    onClick={() => switchMode('phone')}
                    type="button"
                  >
                    Change number
                  </button>
                  <button
                    className="h-11 rounded-xl border border-white/10 text-xs font-black text-violet-200 transition hover:bg-white/5 disabled:opacity-50"
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
                  <div className="my-6 flex items-center gap-3 text-xs font-bold text-zinc-600">
                    <span className="h-px flex-1 bg-white/10" />
                    OR
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <button
                    className="flex h-12 w-full min-w-0 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-black transition hover:border-white/20 hover:bg-white/[0.07] disabled:opacity-60"
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
                  className="mt-5 flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
                  onClick={() => switchMode('signin')}
                  type="button"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back to sign in
                </button>
              ) : null}

              <p className="mt-7 text-center text-xs leading-5 text-zinc-600">
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
