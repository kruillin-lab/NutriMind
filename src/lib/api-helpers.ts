import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { addZonedDays, DEFAULT_TIMEZONE, isValidLocalDateKey, parseZonedDate, zonedMidnightUtc } from "@/lib/date-utils";
import { prisma } from "@/src/lib/prisma";

// Shared helpers for API route handlers: auth guards, JSON error responses,
// a try/catch wrapper, and single-day date-window math.

/**
 * Error carrying an HTTP status code. Throw inside a `handleRoute` callback
 * to short-circuit into a JSON error response with that status.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Returns the authenticated Clerk user id.
 * Throws ApiError(401) when the request is unauthenticated.
 */
export async function requireUserId(): Promise<string> {
  if (process.env.NODE_ENV !== "production") {
    const headersList = await headers();
    const testUserId = headersList.get("X-Test-User-Id");
    if (testUserId) {
      return testUserId;
    }
  }

  const { userId } = await auth();
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }
  return userId;
}

/**
 * Returns the authenticated user's database record.
 * Throws ApiError(401) when unauthenticated, ApiError(404) when the
 * user row does not exist.
 */
export async function requireUser() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
}

/**
 * Returns the authenticated user's timezone (`UserProfile.timezone`),
 * falling back to `DEFAULT_TIMEZONE` when the user has no profile yet or
 * no timezone on record. Use this before any "what day is it for this
 * user" computation — never the server's own clock/timezone.
 */
export async function requireUserTimezone(userId: string): Promise<string> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  return profile?.timezone || DEFAULT_TIMEZONE;
}

/**
 * JSON error response in the shape all routes use: `{ error: message }`.
 */
export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wraps a route handler body: returns `NextResponse.json(await fn())`,
 * converts thrown `ApiError`s into matching JSON error responses, and
 * logs anything else before returning a 500 with `fallbackMessage`.
 */
export async function handleRoute<T>(fallbackMessage: string, fn: () => Promise<T>) {
  try {
    return NextResponse.json(await fn());
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.status, error.message);
    }
    console.error(fallbackMessage, error);
    return jsonError(500, fallbackMessage);
  }
}

/**
 * Computes the `[start, end)` window of a single day in the user's `timezone`.
 * `start` is `dateParam` (a YYYY-MM-DD key) at local midnight in that zone,
 * or today's local midnight when `dateParam` is omitted. `end` is exactly
 * one zoned calendar day later (DST-safe, so not always +24h).
 * Throws `ApiError(400)` when `dateParam` is present but malformed.
 */
export function dayRange(timezone: string, dateParam?: string | null): { start: Date; end: Date } {
  if (dateParam != null && !isValidLocalDateKey(dateParam)) {
    throw new ApiError(400, "Invalid date");
  }

  const start = dateParam ? parseZonedDate(dateParam, timezone) : zonedMidnightUtc(timezone);
  const end = addZonedDays(start, 1, timezone);

  return { start, end };
}
