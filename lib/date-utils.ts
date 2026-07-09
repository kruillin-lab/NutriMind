/**
 * Date utilities that operate in the system's local timezone.
 * All functions avoid UTC conversions to ensure dates align with local time.
 */

/** Get a Date set to local midnight (00:00:00.000) */
export function getLocalMidnight(d: Date = new Date()): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Add N days to a date in local time */
export function addLocalDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/** Format a date as YYYY-MM-DD in local time */
export function formatLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Validate an exact YYYY-MM-DD key without allowing Date rollover. */
export function isValidLocalDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(0);
  candidate.setFullYear(year, month - 1, day);
  candidate.setHours(0, 0, 0, 0);

  return candidate.getFullYear() === year
    && candidate.getMonth() === month - 1
    && candidate.getDate() === day;
}

/** Parse a YYYY-MM-DD string as local midnight */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date();
  d.setFullYear(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get the system's IANA timezone (e.g. "America/New_York") */
export function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
