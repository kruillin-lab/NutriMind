/**
 * Timezone-aware date utilities.
 *
 * "Today" for a user must be computed in *their* IANA timezone
 * (`UserProfile.timezone`), never the server's clock. The deploy target
 * (Cloudflare Workers) always reports "UTC" as its local timezone, so any
 * server-local `Date` math (`setHours`, `getDate`, ...) silently computes
 * UTC calendar days instead of the user's — evening activity gets filed
 * under tomorrow's log once UTC has rolled over.
 *
 * Every function below takes an explicit IANA `timezone` string and derives
 * day boundaries via `Intl.DateTimeFormat`, which is DST- and
 * offset-direction-safe (unlike naive `setUTCHours`/`setHours` arithmetic).
 */

/** Fallback IANA timezone used only when a user has no timezone on record. */
export const DEFAULT_TIMEZONE = "America/New_York";

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/**
 * Find the UTC instant of local midnight for the given Y-M-D in `timezone`.
 * `month`/`day` may be out of their normal range (e.g. `day: 0` or `day: 32`)
 * — `Date.UTC` normalizes the overflow, which is how day arithmetic is done.
 */
function zonedMidnightFromParts(timezone: string, year: number, month: number, day: number): Date {
  let guessMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  // Iteratively correct: format the guess in `timezone`, measure how far its
  // wall-clock reading is from the desired Y-M-D 00:00:00, and shift the
  // guess by that delta. Converges in 1-2 iterations for every real-world
  // zone (offsets change by whole/half/quarter hours); 3 is a safety margin.
  for (let i = 0; i < 3; i++) {
    const parts = getZonedParts(new Date(guessMs), timezone);
    const currentAsUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const desiredAsUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0);
    const diff = currentAsUtcMs - desiredAsUtcMs;
    if (diff === 0) break;
    guessMs -= diff;
  }
  return new Date(guessMs);
}

/** Get the UTC instant of local midnight (00:00:00.000) for `reference`'s calendar day in `timezone`. */
export function zonedMidnightUtc(timezone: string, reference: Date = new Date()): Date {
  const { year, month, day } = getZonedParts(reference, timezone);
  return zonedMidnightFromParts(timezone, year, month, day);
}

/** Add N calendar days (in `timezone`) to `date`, landing on that day's local midnight. */
export function addZonedDays(date: Date, days: number, timezone: string): Date {
  const { year, month, day } = getZonedParts(date, timezone);
  return zonedMidnightFromParts(timezone, year, month, day + days);
}

/** Format `date` as YYYY-MM-DD as seen in `timezone`. */
export function formatZonedDateKey(date: Date, timezone: string): string {
  const { year, month, day } = getZonedParts(date, timezone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse a YYYY-MM-DD key as local midnight in `timezone`. */
export function parseZonedDate(dateStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return zonedMidnightFromParts(timezone, year, month, day);
}

/** Get the `[start, end)` window of the calendar day containing `reference` in `timezone`. */
export function getZonedDayRange(timezone: string, reference: Date = new Date()): { start: Date; end: Date } {
  const start = zonedMidnightUtc(timezone, reference);
  const end = addZonedDays(start, 1, timezone);
  return { start, end };
}

/** Validate an exact YYYY-MM-DD key without allowing Date rollover. Timezone-agnostic string check. */
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

/**
 * Get the browser/runtime's own IANA timezone (e.g. "America/New_York").
 *
 * Only meaningful when called client-side: on the server (Cloudflare
 * Workers) this always resolves to "UTC", which is not the user's
 * timezone. Server code must use `UserProfile.timezone` (falling back to
 * `DEFAULT_TIMEZONE`), never this function.
 */
export function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
