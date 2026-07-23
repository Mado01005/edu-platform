'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

type LocalDateTimeProps = {
  date: string | Date;
  dateOnly?: boolean;
  timeOnly?: boolean;
};

export function LocalDateTime({
  date,
  dateOnly = false,
  timeOnly = false,
}: LocalDateTimeProps) {
  const isClient = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const value = new Date(date);
  const options: Intl.DateTimeFormatOptions = timeOnly
    ? { hour: '2-digit', minute: '2-digit' }
    : dateOnly
      ? { year: 'numeric', month: 'short', day: 'numeric' }
      : {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        };

  const formatter = new Intl.DateTimeFormat('en-US', {
    ...options,
    ...(isClient ? {} : { timeZone: 'UTC', timeZoneName: 'short' }),
  });

  return <time dateTime={value.toISOString()}>{formatter.format(value)}</time>;
}
