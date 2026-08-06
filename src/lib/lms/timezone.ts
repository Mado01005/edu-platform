const CAIRO_TIME_ZONE = 'Africa/Cairo';

function partsAt(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function cairoDateTimeLocalToUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const wanted = Date.UTC(+year, +month - 1, +day, +hour, +minute, 0);
  let guess = new Date(wanted);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = partsAt(guess);
    const represented = Date.UTC(
      +actual.year,
      +actual.month - 1,
      +actual.day,
      +actual.hour,
      +actual.minute,
      +actual.second,
    );
    guess = new Date(guess.getTime() + wanted - represented);
  }

  const final = partsAt(guess);
  return final.year === year && final.month === month && final.day === day &&
    final.hour === hour && final.minute === minute
    ? guess
    : null;
}

export function formatCairoDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: CAIRO_TIME_ZONE,
    timeZoneName: 'short',
  }).format(new Date(value));
}

export function formatUtcDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value));
}
