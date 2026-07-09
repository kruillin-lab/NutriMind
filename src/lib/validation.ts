// Small dependency-free validation helpers for API route inputs.

/**
 * Coerce a value to an integer clamped to [min, max].
 * Returns null if the value is not a finite number.
 */
export function clampInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.min(Math.max(Math.round(value), min), max);
}

/**
 * Clamp a numeric value to [min, max] without rounding (for gram/float fields).
 * Returns null if the value is not a finite number.
 */
export function clampNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * True if the value is a reasonable, parseable date string (e.g. "2026-07-03").
 */
export function isValidDateString(s: unknown): boolean {
  if (typeof s !== "string") {
    return false;
  }
  const trimmed = s.trim();
  if (trimmed.length === 0 || trimmed.length > 40) {
    return false;
  }
  return !Number.isNaN(Date.parse(trimmed));
}

/**
 * Trim a string and truncate it to `max` characters.
 * Returns null if the value is not a string or is empty after trimming.
 */
export function truncate(s: unknown, max: number): string | null {
  if (typeof s !== "string") {
    return null;
  }
  const trimmed = s.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, max);
}
