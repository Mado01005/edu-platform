'use client';

import {
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  RotateCcw,
  Send,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLanguage } from '@/components/i18n/language-provider';
import type { Locale, LocalizedText } from '@/lib/landing/types';
import { normalizePhoneNumber } from '@/lib/phone';
import type { CountryCode } from 'libphonenumber-js/min';

type FieldName = 'firstName' | 'lastName' | 'phone' | 'email' | 'message';
type FormValues = Record<FieldName, string>;
type FormErrors = Partial<Record<FieldName, string>>;
type SubmissionReceipt = {
  emailDelivery: 'pending' | 'sent';
  reference: string;
};
type PhoneCountry = {
  code: CountryCode;
  dialCode: `+${string}`;
  flag: string;
  name: LocalizedText;
};

const initialValues: FormValues = {
  email: '',
  firstName: '',
  lastName: '',
  message: '',
  phone: '',
};

const phoneCountries = [
  {
    code: 'EG',
    dialCode: '+20',
    flag: '🇪🇬',
    name: { en: 'Egypt', ar: 'مصر' },
  },
  {
    code: 'SA',
    dialCode: '+966',
    flag: '🇸🇦',
    name: { en: 'Saudi Arabia', ar: 'السعودية' },
  },
  {
    code: 'AE',
    dialCode: '+971',
    flag: '🇦🇪',
    name: { en: 'United Arab Emirates', ar: 'الإمارات' },
  },
  {
    code: 'KW',
    dialCode: '+965',
    flag: '🇰🇼',
    name: { en: 'Kuwait', ar: 'الكويت' },
  },
  {
    code: 'QA',
    dialCode: '+974',
    flag: '🇶🇦',
    name: { en: 'Qatar', ar: 'قطر' },
  },
  {
    code: 'BH',
    dialCode: '+973',
    flag: '🇧🇭',
    name: { en: 'Bahrain', ar: 'البحرين' },
  },
  {
    code: 'JO',
    dialCode: '+962',
    flag: '🇯🇴',
    name: { en: 'Jordan', ar: 'الأردن' },
  },
] as const satisfies readonly PhoneCountry[];

const copy = {
  countryCode: { en: 'Country code', ar: 'رمز الدولة' },
  email: { en: 'Email', ar: 'البريد الإلكتروني' },
  emailRequired: {
    en: 'Email is required.',
    ar: 'البريد الإلكتروني مطلوب.',
  },
  emailInvalid: {
    en: 'Enter a valid email address.',
    ar: 'أدخل عنوان بريد إلكتروني صحيحًا.',
  },
  error: {
    en: 'We could not send your message. Please try again or use WhatsApp.',
    ar: 'تعذر إرسال رسالتك. حاول مرة أخرى أو تواصل عبر واتساب.',
  },
  firstName: { en: 'First name', ar: 'الاسم الأول' },
  firstNameRequired: {
    en: 'First name is required.',
    ar: 'الاسم الأول مطلوب.',
  },
  lastName: { en: 'Last name', ar: 'اسم العائلة' },
  lastNameRequired: {
    en: 'Last name is required.',
    ar: 'اسم العائلة مطلوب.',
  },
  message: { en: 'Message or questions', ar: 'الرسالة أو الأسئلة' },
  messageRequired: {
    en: 'Message or questions is required.',
    ar: 'الرسالة أو الأسئلة مطلوبة.',
  },
  messageInvalid: {
    en: 'Tell us how we can help in at least 10 characters.',
    ar: 'أخبرنا كيف يمكننا مساعدتك في ١٠ أحرف على الأقل.',
  },
  nameInvalid: {
    en: 'Enter at least 2 characters.',
    ar: 'أدخل حرفين على الأقل.',
  },
  phone: { en: 'Phone', ar: 'رقم الهاتف' },
  phoneRequired: {
    en: 'Phone number is required.',
    ar: 'رقم الهاتف مطلوب.',
  },
  phoneInvalid: {
    en: 'Enter a valid phone number.',
    ar: 'أدخل رقم هاتف صحيحًا.',
  },
  privacyLead: {
    en: 'By submitting this form I have read and acknowledged the',
    ar: 'بإرسال هذا النموذج، أقر بأنني قرأت',
  },
  privacyLink: {
    en: 'Privacy Policy',
    ar: 'سياسة الخصوصية',
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

function validate(
  values: FormValues,
  country: CountryCode,
  locale: Locale,
): FormErrors {
  const errors: FormErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!values.firstName.trim()) {
    errors.firstName = text(locale, copy.firstNameRequired);
  } else if (values.firstName.trim().length < 2) {
    errors.firstName = text(locale, copy.nameInvalid);
  }
  if (!values.lastName.trim()) {
    errors.lastName = text(locale, copy.lastNameRequired);
  } else if (values.lastName.trim().length < 2) {
    errors.lastName = text(locale, copy.nameInvalid);
  }
  if (!values.email.trim()) {
    errors.email = text(locale, copy.emailRequired);
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = text(locale, copy.emailInvalid);
  }
  if (!values.phone.trim()) {
    errors.phone = text(locale, copy.phoneRequired);
  } else if (!normalizePhoneNumber(values.phone, country)) {
    errors.phone = text(locale, copy.phoneInvalid);
  }
  if (!values.message.trim()) {
    errors.message = text(locale, copy.messageRequired);
  } else if (values.message.trim().length < 10) {
    errors.message = text(locale, copy.messageInvalid);
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

function RequiredLabel({ children }: { children: string }) {
  return (
    <>
      {children} <span className="text-red-600" aria-hidden="true">*</span>
    </>
  );
}

const baseInputClass =
  'mt-2 min-h-13 w-full min-w-0 rounded-2xl border bg-white px-4 text-[15px] text-slate-900 shadow-sm outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-400 hover:border-gray-400 focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100';

function inputClass(hasError: boolean) {
  return `${baseInputClass} ${
    hasError
      ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-100'
      : 'border-gray-300'
  }`;
}

export function SupportContactForm() {
  const { locale } = useLanguage();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('EG');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionReceipt | null>(null);

  const updateField = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const updatePhoneCountry = (value: string) => {
    const nextCountry = phoneCountries.find((country) => country.code === value);
    if (!nextCountry) return;

    setPhoneCountry(nextCountry.code);
    setErrors((current) => ({ ...current, phone: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const website = new FormData(event.currentTarget).get('website');

    const nextErrors = validate(values, phoneCountry, locale);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstInvalidField = (
        ['firstName', 'lastName', 'email', 'phone', 'message'] as const
      ).find((field) => nextErrors[field]);
      if (firstInvalidField) {
        requestAnimationFrame(() => {
          document.getElementById(`support-${firstInvalidField}`)?.focus();
        });
      }
      return;
    }

    const normalizedPhone = normalizePhoneNumber(values.phone, phoneCountry);
    if (!normalizedPhone) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/api/support/inquiries', {
        body: JSON.stringify({
          ...values,
          phone: normalizedPhone,
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

  const selectedCountry =
    phoneCountries.find((country) => country.code === phoneCountry) ??
    phoneCountries[0];

  return (
    <form className="min-w-0" noValidate onSubmit={handleSubmit}>
      <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5">
        <label className="min-w-0 text-sm font-black text-[#042D1A]">
          <RequiredLabel>{text(locale, copy.firstName)}</RequiredLabel>
          <input
            aria-describedby={errors.firstName ? 'support-first-name-error' : undefined}
            aria-invalid={Boolean(errors.firstName)}
            autoComplete="given-name"
            className={inputClass(Boolean(errors.firstName))}
            id="support-firstName"
            maxLength={80}
            name="firstName"
            onChange={(event) => updateField('firstName', event.target.value)}
            required
            value={values.firstName}
          />
          <FieldError id="support-first-name-error" message={errors.firstName} />
        </label>

        <label className="min-w-0 text-sm font-black text-[#042D1A]">
          <RequiredLabel>{text(locale, copy.lastName)}</RequiredLabel>
          <input
            aria-describedby={errors.lastName ? 'support-last-name-error' : undefined}
            aria-invalid={Boolean(errors.lastName)}
            autoComplete="family-name"
            className={inputClass(Boolean(errors.lastName))}
            id="support-lastName"
            maxLength={80}
            name="lastName"
            onChange={(event) => updateField('lastName', event.target.value)}
            required
            value={values.lastName}
          />
          <FieldError id="support-last-name-error" message={errors.lastName} />
        </label>

        <label className="col-span-2 min-w-0 text-sm font-black text-[#042D1A]">
          <RequiredLabel>{text(locale, copy.email)}</RequiredLabel>
          <input
            aria-describedby={errors.email ? 'support-email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            className={inputClass(Boolean(errors.email))}
            dir="ltr"
            id="support-email"
            inputMode="email"
            maxLength={254}
            name="email"
            onChange={(event) => updateField('email', event.target.value)}
            required
            type="email"
            value={values.email}
          />
          <FieldError id="support-email-error" message={errors.email} />
        </label>

        <div className="col-span-2 min-w-0 text-sm font-black text-[#042D1A]">
          <label htmlFor="support-phone">
            <RequiredLabel>{text(locale, copy.phone)}</RequiredLabel>
          </label>
          <div
            className={`mt-2 flex min-h-13 w-full min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-[border-color,box-shadow,background-color] duration-200 focus-within:ring-4 ${
              errors.phone
                ? 'border-red-400 bg-red-50/30 focus-within:border-red-500 focus-within:ring-red-100'
                : 'border-gray-300 hover:border-gray-400 focus-within:border-[#084B2B] focus-within:ring-emerald-100'
            }`}
            dir="ltr"
          >
            <div className="relative flex shrink-0 border-r border-gray-200 bg-gray-50/80">
              <select
                aria-label={text(locale, copy.countryCode)}
                className="min-h-13 appearance-none bg-transparent py-0 pl-4 pr-9 text-sm font-black text-[#084B2B] outline-none"
                onChange={(event) => updatePhoneCountry(event.target.value)}
                value={phoneCountry}
              >
                {phoneCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.dialCode}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              />
            </div>
            <input
              aria-describedby={errors.phone ? 'support-phone-error' : undefined}
              aria-invalid={Boolean(errors.phone)}
              autoComplete="tel-national"
              className="min-h-13 min-w-0 flex-1 bg-transparent px-3 text-[15px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 sm:px-4"
              id="support-phone"
              inputMode="tel"
              maxLength={24}
              name="phone"
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder={phoneCountry === 'EG' ? '100 000 0000' : undefined}
              required
              value={values.phone}
            />
            <span
              aria-label={`${text(locale, selectedCountry.name)} flag`}
              className="flex min-h-13 min-w-13 shrink-0 items-center justify-center border-l border-gray-200 bg-gray-50/80 text-xl"
              role="img"
            >
              {selectedCountry.flag}
            </span>
          </div>
          <FieldError id="support-phone-error" message={errors.phone} />
        </div>

        <label className="col-span-2 min-w-0 text-sm font-black text-[#042D1A]">
          <RequiredLabel>{text(locale, copy.message)}</RequiredLabel>
          <textarea
            aria-describedby={errors.message ? 'support-message-error' : undefined}
            aria-invalid={Boolean(errors.message)}
            className={`${inputClass(Boolean(errors.message))} min-h-40 resize-y py-3 leading-6`}
            id="support-message"
            maxLength={4_000}
            name="message"
            onChange={(event) => updateField('message', event.target.value)}
            required
            value={values.message}
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError
              id="support-message-error"
              message={errors.message}
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
        className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#084B2B] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(8,75,43,0.18)] outline-none transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-[#0F6E41] hover:shadow-[0_18px_34px_rgba(8,75,43,0.22)] focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65"
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
      <p className="mx-auto mt-4 max-w-xl text-center text-xs font-medium leading-5 text-slate-500">
        {text(locale, copy.privacyLead)}{' '}
        <a
          className="font-bold text-[#084B2B] underline decoration-emerald-700/30 underline-offset-4 hover:text-[#0F6E41] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          href="/privacy"
        >
          {text(locale, copy.privacyLink)}
        </a>
        .
      </p>
    </form>
  );
}
