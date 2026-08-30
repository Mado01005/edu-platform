'use client';

import {
  Check,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  RotateCcw,
  Search,
  Send,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLanguage } from '@/components/i18n/language-provider';
import type { Locale, LocalizedText } from '@/lib/landing/types';
import { normalizePhoneNumber } from '@/lib/phone';
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js/min';

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

const englishRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const arabicRegionNames = new Intl.DisplayNames(['ar'], { type: 'region' });

function countryFlag(countryCode: CountryCode) {
  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split('')
      .map((character) => 127397 + character.charCodeAt(0)),
  );
}

const phoneCountries: readonly PhoneCountry[] = getCountries().map((code) => ({
  code,
  dialCode: `+${getCountryCallingCode(code)}`,
  flag: countryFlag(code),
  name: {
    ar: arabicRegionNames.of(code) ?? code,
    en: englishRegionNames.of(code) ?? code,
  },
}));

const copy = {
  countryCode: { en: 'Country code', ar: 'رمز الدولة' },
  countrySearch: {
    en: 'Search country or code',
    ar: 'ابحث عن دولة أو رمز',
  },
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
  noCountries: {
    en: 'No countries found.',
    ar: 'لم يتم العثور على دول.',
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
    <p className="mt-1.5 text-xs font-bold text-red-300" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <>
      {children} <span className="text-[#E7CD78]" aria-hidden="true">*</span>
    </>
  );
}

const baseInputClass =
  'mt-2 min-h-13 w-full min-w-0 rounded-2xl border bg-[#063B25] px-4 text-[15px] text-[#FBF6E2] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-emerald-100/35 hover:border-white/25 focus:border-[#D4AF37]/80 focus:bg-[#07452B] focus:ring-4 focus:ring-[#D4AF37]/12';

function inputClass(hasError: boolean) {
  return `${baseInputClass} ${
    hasError
      ? 'border-red-400/90 bg-red-950/30 focus:border-red-300 focus:ring-red-500/15'
      : 'border-white/15'
  }`;
}

export function SupportContactForm() {
  const { locale } = useLanguage();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('EG');
  const [countrySearch, setCountrySearch] = useState('');
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionReceipt | null>(null);
  const countryPickerRef = useRef<HTMLDivElement>(null);
  const countryButtonRef = useRef<HTMLButtonElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);

  const selectedCountry =
    phoneCountries.find((country) => country.code === phoneCountry) ??
    phoneCountries[0];

  const localizedCountries = useMemo(
    () => [...phoneCountries].sort((first, second) =>
      text(locale, first.name).localeCompare(text(locale, second.name), locale),
    ),
    [locale],
  );

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLocaleLowerCase(locale);

    if (!query) return localizedCountries;

    return localizedCountries.filter((country) =>
      [
        country.code,
        country.dialCode,
        country.name.en,
        country.name.ar,
      ].some((candidate) => candidate.toLocaleLowerCase(locale).includes(query)),
    );
  }, [countrySearch, locale, localizedCountries]);

  useEffect(() => {
    if (!isCountryPickerOpen) return;

    countrySearchRef.current?.focus();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!countryPickerRef.current?.contains(event.target as Node)) {
        setIsCountryPickerOpen(false);
        setCountrySearch('');
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCountryPickerOpen(false);
        setCountrySearch('');
        requestAnimationFrame(() => countryButtonRef.current?.focus());
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isCountryPickerOpen]);

  const updateField = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const updatePhoneCountry = (value: CountryCode) => {
    const nextCountry = phoneCountries.find((country) => country.code === value);
    if (!nextCountry) return;

    setPhoneCountry(nextCountry.code);
    setIsCountryPickerOpen(false);
    setCountrySearch('');
    requestAnimationFrame(() => countryButtonRef.current?.focus());
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
      <div className="flex min-h-[34rem] flex-col items-center justify-center rounded-[2rem] border border-[#D4AF37]/25 bg-[#063B25] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-10" role="status">
        <span className="flex size-16 items-center justify-center rounded-full border border-[#D4AF37]/35 bg-[#0F6E41] text-[#FBF6E2] shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
          <CheckCircle2 aria-hidden="true" className="size-8" />
        </span>
        <h2 className="mt-6 text-3xl font-black tracking-tight text-[#FBF6E2]">
          {text(locale, copy.successTitle)}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-7 text-emerald-100/70 sm:text-base">
          {text(
            locale,
            submission.emailDelivery === 'sent'
              ? copy.successBody
              : copy.successBodyPending,
          )}
        </p>
        <p className="mt-6 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#E7CD78]">
          {text(locale, copy.reference)}: <span dir="ltr">{submission.reference}</span>
        </p>
        <button
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/8 px-5 text-sm font-black text-[#FBF6E2] outline-none transition-colors hover:border-[#D4AF37]/60 hover:bg-white/12 focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20"
          onClick={() => setSubmission(null)}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          {text(locale, copy.reset)}
        </button>
      </div>
    );
  }

  return (
    <form className="min-w-0" noValidate onSubmit={handleSubmit}>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-black text-[#FBF6E2]">
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

        <label className="min-w-0 text-sm font-black text-[#FBF6E2]">
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

        <label className="min-w-0 text-sm font-black text-[#FBF6E2] sm:col-span-2">
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

        <div className="min-w-0 text-sm font-black text-[#FBF6E2] sm:col-span-2">
          <label htmlFor="support-phone">
            <RequiredLabel>{text(locale, copy.phone)}</RequiredLabel>
          </label>
          <div className="relative mt-2" ref={countryPickerRef}>
            <div
              className={`flex min-h-13 w-full min-w-0 rounded-2xl border bg-[#063B25] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-[border-color,box-shadow,background-color] duration-200 focus-within:ring-4 ${
                errors.phone
                  ? 'border-red-400/90 bg-red-950/30 focus-within:border-red-300 focus-within:ring-red-500/15'
                  : 'border-white/15 hover:border-white/25 focus-within:border-[#D4AF37]/80 focus-within:bg-[#07452B] focus-within:ring-[#D4AF37]/12'
              }`}
              dir="ltr"
            >
              <button
                aria-controls="support-country-options"
                aria-expanded={isCountryPickerOpen}
                aria-haspopup="listbox"
                aria-label={`${text(locale, copy.countryCode)} ${selectedCountry.dialCode} ${text(locale, selectedCountry.name)}`}
                className="inline-flex min-h-13 min-w-[6.75rem] shrink-0 items-center justify-center gap-2 rounded-l-2xl border-r border-white/10 bg-white/[0.035] px-3 text-sm font-black text-[#E7CD78] outline-none transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37]/55"
                onClick={() => setIsCountryPickerOpen((current) => !current)}
                ref={countryButtonRef}
                type="button"
              >
                <span>{selectedCountry.dialCode}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`size-4 text-emerald-100/55 transition-transform ${
                    isCountryPickerOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <input
                aria-describedby={errors.phone ? 'support-phone-error' : undefined}
                aria-invalid={Boolean(errors.phone)}
                autoComplete="tel-national"
                className="min-h-13 min-w-0 flex-1 bg-transparent px-3 text-[15px] font-medium text-[#FBF6E2] outline-none placeholder:font-normal placeholder:text-emerald-100/35 sm:px-4"
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
                className="flex min-h-13 min-w-13 shrink-0 items-center justify-center rounded-r-2xl border-l border-white/10 bg-white/[0.035] text-xl"
                role="img"
              >
                {selectedCountry.flag}
              </span>
            </div>

            {isCountryPickerOpen ? (
              <div
                className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-full min-w-0 overflow-hidden rounded-2xl border border-[#D4AF37]/25 bg-[#042D1A] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
              >
                <label className="relative block">
                  <span className="sr-only">{text(locale, copy.countrySearch)}</span>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-emerald-100/45"
                  />
                  <input
                    aria-autocomplete="list"
                    aria-controls="support-country-options"
                    aria-expanded={isCountryPickerOpen}
                    aria-label={text(locale, copy.countrySearch)}
                    className="min-h-11 w-full rounded-xl border border-white/15 bg-[#063B25] pe-3 ps-10 text-sm font-semibold text-[#FBF6E2] outline-none placeholder:text-emerald-100/35 focus:border-[#D4AF37]/70 focus:ring-4 focus:ring-[#D4AF37]/10"
                    onChange={(event) => setCountrySearch(event.target.value)}
                    placeholder={text(locale, copy.countrySearch)}
                    ref={countrySearchRef}
                    role="combobox"
                    type="search"
                    value={countrySearch}
                  />
                </label>
                <div
                  aria-label={text(locale, copy.countryCode)}
                  className="mt-2 max-h-60 scroll-smooth overflow-y-auto overscroll-contain rounded-xl [scrollbar-color:#D4AF37_#063B25] [scrollbar-width:thin]"
                  id="support-country-options"
                  role="listbox"
                >
                  {filteredCountries.length ? (
                    filteredCountries.map((country) => {
                      const isSelected = country.code === phoneCountry;
                      return (
                        <button
                          aria-label={`${text(locale, country.name)} (${country.dialCode})`}
                          aria-selected={isSelected}
                          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start text-sm text-emerald-50 outline-none transition-colors hover:bg-white/[0.07] focus-visible:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37]/45"
                          key={country.code}
                          onClick={() => updatePhoneCountry(country.code)}
                          role="option"
                          type="button"
                        >
                          <span aria-hidden="true" className="text-lg">
                            {country.flag}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-bold">
                            {text(locale, country.name)}
                          </span>
                          <span
                            className="shrink-0 font-black text-[#E7CD78]"
                            dir="ltr"
                          >
                            ({country.dialCode})
                          </span>
                          {isSelected ? (
                            <Check
                              aria-hidden="true"
                              className="size-4 shrink-0 text-[#E7CD78]"
                            />
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-8 text-center text-sm font-semibold text-emerald-100/55">
                      {text(locale, copy.noCountries)}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <FieldError id="support-phone-error" message={errors.phone} />
        </div>

        <label className="min-w-0 text-sm font-black text-[#FBF6E2] sm:col-span-2">
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
            <span className="ms-auto shrink-0 text-xs font-bold text-emerald-100/40" dir="ltr">
              {values.message.length}/4000
            </span>
          </div>
        </label>
      </div>

      <input aria-hidden="true" autoComplete="off" className="hidden" name="website" tabIndex={-1} type="text" />

      {formError ? (
        <p className="mt-5 rounded-xl border border-red-400/40 bg-red-950/30 p-4 text-sm font-bold leading-6 text-red-200" role="alert">
          {formError}
        </p>
      ) : null}

      <button
        className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#D4AF37]/35 bg-[#0F6E41] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,0,0.24)] outline-none transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-[#13804D] hover:shadow-[0_18px_34px_rgba(0,0,0,0.28)] focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65"
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
      <p className="mx-auto mt-4 max-w-xl text-center text-xs font-medium leading-5 text-emerald-100/55">
        {text(locale, copy.privacyLead)}{' '}
        <a
          className="font-bold text-[#E7CD78] underline decoration-[#D4AF37]/35 underline-offset-4 hover:text-[#F2DC94] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/35"
          href="/privacy"
        >
          {text(locale, copy.privacyLink)}
        </a>
        .
      </p>
    </form>
  );
}
