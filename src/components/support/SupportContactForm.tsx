'use client';

import { CheckCircle2, LoaderCircle, RotateCcw, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLanguage } from '@/components/i18n/language-provider';
import type { Locale, LocalizedText } from '@/lib/landing/types';

type FieldName = 'firstName' | 'lastName' | 'phone' | 'email' | 'message';
type FormValues = Record<FieldName, string>;
type FormErrors = Partial<Record<FieldName, true>>;
type SubmissionReceipt = {
  emailDelivery: 'pending' | 'sent';
  reference: string;
};

const initialValues: FormValues = {
  email: '',
  firstName: '',
  lastName: '',
  message: '',
  phone: '',
};

const copy = {
  email: { en: 'Email address', ar: 'البريد الإلكتروني' },
  emailInvalid: {
    en: 'Enter a valid email address.',
    ar: 'أدخل عنوان بريد إلكتروني صحيحًا.',
  },
  error: {
    en: 'We could not send your message. Please try again or use WhatsApp.',
    ar: 'تعذر إرسال رسالتك. حاول مرة أخرى أو تواصل عبر واتساب.',
  },
  firstName: { en: 'First name', ar: 'الاسم الأول' },
  lastName: { en: 'Last name', ar: 'اسم العائلة' },
  message: { en: 'Message or questions', ar: 'الرسالة أو الأسئلة' },
  messageInvalid: {
    en: 'Tell us how we can help in at least 10 characters.',
    ar: 'أخبرنا كيف يمكننا مساعدتك في ١٠ أحرف على الأقل.',
  },
  nameInvalid: {
    en: 'Enter at least 2 characters.',
    ar: 'أدخل حرفين على الأقل.',
  },
  phone: { en: 'Phone number', ar: 'رقم الهاتف' },
  phoneHint: {
    en: 'Include the country code, for example +20 or +966.',
    ar: 'أضف رمز الدولة، مثل +20 أو +966.',
  },
  phoneInvalid: {
    en: 'Enter a valid phone number with its country code.',
    ar: 'أدخل رقم هاتف صحيحًا مع رمز الدولة.',
  },
  reference: { en: 'Reference', ar: 'الرقم المرجعي' },
  reset: { en: 'Send another message', ar: 'إرسال رسالة أخرى' },
  send: { en: 'Send message', ar: 'إرسال الرسالة' },
  sending: { en: 'Sending securely…', ar: 'جارٍ الإرسال بأمان…' },
  successBody: {
    en: 'Your message was saved and emailed to the Oqool support team. We will respond using the contact details you provided.',
    ar: 'تم حفظ رسالتك وإرسالها بالبريد الإلكتروني إلى فريق دعم عقول. سنتواصل معك عبر بيانات الاتصال التي أرسلتها.',
  },
  successBodyPending: {
    en: 'Your request is saved, but the email notification is temporarily pending. The Oqool support team can still review it in the support portal.',
    ar: 'تم حفظ طلبك، لكن إشعار البريد الإلكتروني قيد الانتظار مؤقتًا. لا يزال بإمكان فريق دعم عقول مراجعته في بوابة الدعم.',
  },
  successTitle: { en: 'Message received', ar: 'تم استلام رسالتك' },
} satisfies Record<string, LocalizedText>;

function text(locale: Locale, value: LocalizedText) {
  return value[locale];
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^\+[1-9]\d{7,14}$/;

  if (values.firstName.trim().length < 2) {
    errors.firstName = true;
  }
  if (values.lastName.trim().length < 2) {
    errors.lastName = true;
  }
  if (!phonePattern.test(values.phone.replace(/[\s()-]/g, ''))) {
    errors.phone = true;
  }
  if (!emailPattern.test(values.email.trim())) {
    errors.email = true;
  }
  if (values.message.trim().length < 10) {
    errors.message = true;
  }

  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="mt-1.5 text-xs font-bold text-red-700" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

export function SupportContactForm() {
  const { locale } = useLanguage();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionReceipt | null>(null);

  const updateField = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const website = new FormData(event.currentTarget).get('website');

    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/api/support/inquiries', {
        body: JSON.stringify({
          ...values,
          locale,
          website: typeof website === 'string' ? website : '',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result: unknown = await response.json().catch(() => null);
      const receivedReference =
        result &&
        typeof result === 'object' &&
        typeof Reflect.get(result, 'reference') === 'string'
          ? String(Reflect.get(result, 'reference'))
          : '';
      const emailDelivery =
        result &&
        typeof result === 'object' &&
        Reflect.get(result, 'emailDelivery') === 'sent'
          ? 'sent'
          : 'pending';

      if (!response.ok || !receivedReference) {
        throw new Error('Support inquiry submission failed.');
      }

      setSubmission({ emailDelivery, reference: receivedReference });
      setValues(initialValues);
      setErrors({});
    } catch {
      setFormError(text(locale, copy.error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submission) {
    return (
      <div className="flex min-h-[34rem] flex-col items-center justify-center rounded-[2rem] border border-emerald-200 bg-emerald-50/80 p-6 text-center sm:p-10" role="status">
        <span className="flex size-16 items-center justify-center rounded-full bg-[#084B2B] text-white shadow-[0_16px_40px_rgba(8,75,43,0.2)]">
          <CheckCircle2 aria-hidden="true" className="size-8" />
        </span>
        <h2 className="mt-6 text-3xl font-black tracking-tight text-[#042D1A]">
          {text(locale, copy.successTitle)}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
          {text(
            locale,
            submission.emailDelivery === 'sent'
              ? copy.successBody
              : copy.successBodyPending,
          )}
        </p>
        <p className="mt-6 rounded-full border border-[#D4AF37]/40 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#8A6A16]">
          {text(locale, copy.reference)}: <span dir="ltr">{submission.reference}</span>
        </p>
        <button
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-950/10 bg-white px-5 text-sm font-black text-[#084B2B] outline-none hover:border-[#D4AF37] hover:bg-[#FBF6E2] focus-visible:ring-4 focus-visible:ring-emerald-200"
          onClick={() => setSubmission(null)}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          {text(locale, copy.reset)}
        </button>
      </div>
    );
  }

  const inputClass =
    'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-emerald-950/12 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 hover:border-emerald-800/30 focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100';

  return (
    <form className="min-w-0" noValidate onSubmit={handleSubmit}>
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-black text-[#042D1A]">
          {text(locale, copy.firstName)}
          <input
            aria-describedby={errors.firstName ? 'support-first-name-error' : undefined}
            aria-invalid={Boolean(errors.firstName)}
            autoComplete="given-name"
            className={inputClass}
            maxLength={80}
            name="firstName"
            onChange={(event) => updateField('firstName', event.target.value)}
            required
            value={values.firstName}
          />
          <FieldError
            id="support-first-name-error"
            message={errors.firstName ? text(locale, copy.nameInvalid) : undefined}
          />
        </label>

        <label className="min-w-0 text-sm font-black text-[#042D1A]">
          {text(locale, copy.lastName)}
          <input
            aria-describedby={errors.lastName ? 'support-last-name-error' : undefined}
            aria-invalid={Boolean(errors.lastName)}
            autoComplete="family-name"
            className={inputClass}
            maxLength={80}
            name="lastName"
            onChange={(event) => updateField('lastName', event.target.value)}
            required
            value={values.lastName}
          />
          <FieldError
            id="support-last-name-error"
            message={errors.lastName ? text(locale, copy.nameInvalid) : undefined}
          />
        </label>

        <label className="min-w-0 text-sm font-black text-[#042D1A]">
          {text(locale, copy.phone)}
          <input
            aria-describedby={errors.phone ? 'support-phone-error' : 'support-phone-hint'}
            aria-invalid={Boolean(errors.phone)}
            autoComplete="tel"
            className={inputClass}
            dir="ltr"
            inputMode="tel"
            maxLength={32}
            name="phone"
            onChange={(event) => updateField('phone', event.target.value)}
            required
            value={values.phone}
          />
          <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500" id="support-phone-hint">
            {text(locale, copy.phoneHint)}
          </p>
          <FieldError
            id="support-phone-error"
            message={errors.phone ? text(locale, copy.phoneInvalid) : undefined}
          />
        </label>

        <label className="min-w-0 text-sm font-black text-[#042D1A]">
          {text(locale, copy.email)}
          <input
            aria-describedby={errors.email ? 'support-email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            className={inputClass}
            dir="ltr"
            inputMode="email"
            maxLength={254}
            name="email"
            onChange={(event) => updateField('email', event.target.value)}
            required
            type="email"
            value={values.email}
          />
          <FieldError
            id="support-email-error"
            message={errors.email ? text(locale, copy.emailInvalid) : undefined}
          />
        </label>

        <label className="min-w-0 text-sm font-black text-[#042D1A] sm:col-span-2">
          {text(locale, copy.message)}
          <textarea
            aria-describedby={errors.message ? 'support-message-error' : undefined}
            aria-invalid={Boolean(errors.message)}
            className={`${inputClass} min-h-40 resize-y py-3 leading-6`}
            maxLength={4_000}
            name="message"
            onChange={(event) => updateField('message', event.target.value)}
            required
            value={values.message}
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError
              id="support-message-error"
              message={errors.message ? text(locale, copy.messageInvalid) : undefined}
            />
            <span className="ms-auto shrink-0 text-xs font-bold text-slate-400" dir="ltr">
              {values.message.length}/4000
            </span>
          </div>
        </label>
      </div>

      <input aria-hidden="true" autoComplete="off" className="hidden" name="website" tabIndex={-1} type="text" />

      {formError ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700" role="alert">
          {formError}
        </p>
      ) : null}

      <button
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(8,75,43,0.16)] outline-none hover:bg-[#0F6E41] focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="size-4 rtl:-scale-x-100" />
        )}
        {text(locale, isSubmitting ? copy.sending : copy.send)}
      </button>
    </form>
  );
}
