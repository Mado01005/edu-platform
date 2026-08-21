'use client';

import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_PHONE_COUNTRY,
  normalizePartialPhoneNumber,
} from '@/lib/phone';
import { cn } from '@/lib/utils';

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(country: CountryCode) {
  return displayNames.of(country) ?? country;
}

function countryFlag(country: CountryCode) {
  return country
    .split('')
    .map((character) =>
      String.fromCodePoint(127397 + character.charCodeAt(0)),
    )
    .join('');
}

const COUNTRIES = getCountries()
  .map((country) => ({
    callingCode: getCountryCallingCode(country),
    code: country,
    flag: countryFlag(country),
    name: countryName(country),
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

function countryFromValue(value: string, fallback: CountryCode) {
  return parsePhoneNumberFromString(value)?.country ?? fallback;
}

function nationalValue(value: string, country: CountryCode) {
  const parsed = parsePhoneNumberFromString(value);
  if (parsed?.country === country) return parsed.formatNational();
  return value;
}

interface PhoneInputProps
  extends Omit<ComponentProps<'input'>, 'onChange' | 'type' | 'value'> {
  country?: CountryCode;
  onChange: (value: string) => void;
  value: string;
}

export function PhoneInput({
  className,
  country: initialCountry = DEFAULT_PHONE_COUNTRY,
  disabled,
  id,
  onChange,
  placeholder = '10 1234 5678',
  required,
  value,
  ...props
}: PhoneInputProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const resolvedInitialCountry = countryFromValue(value, initialCountry);
  const [country, setCountry] = useState(resolvedInitialCountry);
  const [inputValue, setInputValue] = useState(() =>
    nationalValue(value, resolvedInitialCountry),
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  const visibleCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return COUNTRIES;

    return COUNTRIES.filter(
      (option) =>
        option.name.toLowerCase().includes(normalizedQuery) ||
        option.code.toLowerCase().includes(normalizedQuery) ||
        option.callingCode.includes(normalizedQuery.replace(/\D/g, '')),
    );
  }, [query]);

  const selected = COUNTRIES.find((option) => option.code === country);

  function selectCountry(nextCountry: CountryCode) {
    setCountry(nextCountry);
    setOpen(false);
    setQuery('');
    onChange(normalizePartialPhoneNumber(inputValue, nextCountry));
  }

  return (
    <div className={cn('relative min-w-0', className)} ref={rootRef}>
      <div className="flex h-12 min-w-0 items-center rounded-xl border border-slate-300 bg-white transition focus-within:border-[#084B2B] focus-within:ring-4 focus-within:ring-emerald-100">
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Choose phone country code"
          className="flex h-full shrink-0 items-center gap-2 border-r border-emerald-950/10 px-3 text-sm font-medium text-slate-700 transition hover:bg-[#F8FAF7] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span aria-hidden="true">{selected?.flag ?? '🌐'}</span>
          <span>+{selected?.callingCode ?? ''}</span>
          <ChevronDown className="size-3.5 text-slate-400" aria-hidden="true" />
        </button>
        <input
          aria-label="Phone number"
          autoComplete="tel-national"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          disabled={disabled}
          id={id}
          inputMode="tel"
          onChange={(event) => {
            const nextValue = event.target.value;
            setInputValue(nextValue);

            if (nextValue.trim().startsWith('+')) {
              const parsed = parsePhoneNumberFromString(nextValue);
              if (parsed?.country) setCountry(parsed.country);
            }

            onChange(normalizePartialPhoneNumber(nextValue, country));
          }}
          placeholder={placeholder}
          required={required}
          type="tel"
          value={inputValue}
          {...props}
        />
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 min-w-0 overflow-hidden rounded-2xl border border-emerald-950/10 bg-white p-2 shadow-sm">
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-emerald-950/10 bg-[#F8FAF7] px-3">
            <Search className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="sr-only">Search countries</span>
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country or dialing code"
              type="search"
              value={query}
            />
          </label>
          <div
            aria-label="Phone countries"
            className="mt-2 max-h-64 overflow-y-auto overscroll-contain"
            role="listbox"
          >
            {visibleCountries.map((option) => (
              <button
                aria-selected={option.code === country}
                className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl px-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
                key={option.code}
                onClick={() => selectCountry(option.code)}
                role="option"
                type="button"
              >
                <span className="text-base" aria-hidden="true">
                  {option.flag}
                </span>
                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                <span className="shrink-0 font-mono text-xs text-slate-500">
                  +{option.callingCode}
                </span>
                {option.code === country ? (
                  <Check className="size-4 shrink-0 text-[#084B2B]" />
                ) : null}
              </button>
            ))}
            {!visibleCountries.length ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                No countries match that search.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
