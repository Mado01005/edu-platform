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
      <div className="flex h-12 min-w-0 items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition focus-within:border-purple-500/50 focus-within:ring-4 focus-within:ring-purple-500/10">
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Choose phone country code"
          className="flex h-full shrink-0 items-center gap-2 border-r border-white/10 px-3 text-sm font-bold text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span aria-hidden="true">{selected?.flag ?? '🌐'}</span>
          <span>+{selected?.callingCode ?? ''}</span>
          <ChevronDown className="size-3.5 text-zinc-500" aria-hidden="true" />
        </button>
        <input
          aria-label="Phone number"
          autoComplete="tel-national"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-zinc-600"
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
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl shadow-black/60">
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
            <Search className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <span className="sr-only">Search countries</span>
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"
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
                className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-white/5"
                key={option.code}
                onClick={() => selectCountry(option.code)}
                role="option"
                type="button"
              >
                <span className="text-base" aria-hidden="true">
                  {option.flag}
                </span>
                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                <span className="shrink-0 font-mono text-xs text-zinc-500">
                  +{option.callingCode}
                </span>
                {option.code === country ? (
                  <Check className="size-4 shrink-0 text-violet-300" />
                ) : null}
              </button>
            ))}
            {!visibleCountries.length ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">
                No countries match that search.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
