'use client';

import { type ClipboardEvent, type KeyboardEvent, useRef } from 'react';
import { cn } from '@/lib/utils';

interface InputOTPProps {
  className?: string;
  disabled?: boolean;
  length?: number;
  onChange: (value: string) => void;
  value: string;
}

export function InputOTP({
  className,
  disabled,
  length = 6,
  onChange,
  value,
}: InputOTPProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.replace(/\D/g, '').slice(0, length);

  function updateDigit(index: number, nextDigit: string) {
    const next = Array.from({ length }, (_, itemIndex) => digits[itemIndex] ?? '');
    next[index] = nextDigit.replace(/\D/g, '').slice(-1);
    const result = next.join('').slice(0, length);
    onChange(result);

    if (next[index] && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length);
    onChange(pasted);
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div
      aria-label={`${length}-digit verification code`}
      className={cn('grid min-w-0 grid-cols-6 gap-2', className)}
      role="group"
    >
      {Array.from({ length }, (_, index) => (
        <input
          aria-label={`Verification digit ${index + 1}`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          className="h-12 min-w-0 rounded-xl border border-slate-300 bg-white text-center font-mono text-lg font-semibold text-slate-900 outline-none transition focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 disabled:opacity-70"
          disabled={disabled}
          inputMode="numeric"
          key={index}
          maxLength={1}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={handlePaste}
          pattern="[0-9]*"
          ref={(input) => {
            inputsRef.current[index] = input;
          }}
          type="text"
          value={digits[index] ?? ''}
        />
      ))}
    </div>
  );
}
