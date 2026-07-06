import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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
 * Computes the `[start, end)` window of a single day. `start` is `dateParam`
 * (or now, when absent) normalized to midnight; `end` is exactly one day
 * later. Defaults to local-time midnight (`setHours`); pass `{ utc: true }`
 * for routes that normalize with `setUTCHours`. Both semantics exist in this
 * codebase and must be preserved — do not change a route's choice.
 */
export function dayRange(
  dateParam?: string | null,
  opts?: { utc?: boolean }
): { start: Date; end: Date } {
  const start = dateParam ? new Date(dateParam) : new Date();
  if (opts?.utc) {
    start.setUTCHours(0, 0, 0, 0);
  } else {
    start.setHours(0, 0, 0, 0);
  }

  const end = new Date(start);
  if (opts?.utc) {
    end.setUTCDate(end.getUTCDate() + 1);
  } else {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}
