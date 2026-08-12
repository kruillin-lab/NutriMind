import { describe, it, expect, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

// api-helpers imports Clerk and the Prisma client at module scope; mock both
// so these unit tests stay dependency-free (dayRange and handleRoute never
// touch them).
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/src/lib/prisma", () => ({ prisma: {} }));

import { ApiError, dayRange, handleRoute, requireUserId } from "../api-helpers";

describe("dayRange", () => {
  it("defaults to today at zoned midnight in the given timezone and spans exactly one day", () => {
    const { start, end } = dayRange("America/New_York");

    const startParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(start);
    const partMap = Object.fromEntries(startParts.map((p) => [p.type, p.value]));
    expect(partMap.hour).toBe("00");
    expect(partMap.minute).toBe("00");
    expect(partMap.second).toBe("00");
    expect(start.getMilliseconds()).toBe(0);

    // end is exactly the next zoned calendar day's midnight, not necessarily +24h (DST).
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    expect(end.getTime() - start.getTime()).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
    expect(end.getTime() - start.getTime()).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
  });

  it("normalizes an explicit date param to that day's midnight in UTC", () => {
    const { start, end } = dayRange("UTC", "2025-01-10");

    expect(start.toISOString()).toBe("2025-01-10T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-01-11T00:00:00.000Z");
  });

  it("normalizes an explicit date param to that day's midnight in a non-UTC timezone", () => {
    const { start, end } = dayRange("America/New_York", "2025-01-10");

    // EST is UTC-5 in January.
    expect(start.toISOString()).toBe("2025-01-10T05:00:00.000Z");
    expect(end.toISOString()).toBe("2025-01-11T05:00:00.000Z");
  });

  it("rejects a malformed date param", () => {
    expect(() => dayRange("UTC", "not-a-date")).toThrow(ApiError);
    expect(() => dayRange("UTC", "2025-13-40")).toThrow(ApiError);
  });
});

describe("ApiError", () => {
  it("carries the HTTP status and message", () => {
    const err = new ApiError(404, "User not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe("User not found");
  });
});

describe("requireUserId", () => {
  it("uses the non-production test auth header before Clerk auth", async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ "X-Test-User-Id": "test-user-1" }));

    await expect(requireUserId()).resolves.toBe("test-user-1");
    expect(auth).not.toHaveBeenCalled();
  });
});

describe("handleRoute", () => {
  it("returns the handler result as JSON on success", async () => {
    const res = await handleRoute("Failed", async () => ({ ok: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("propagates a thrown ApiError's status and message", async () => {
    const res = await handleRoute("Failed", async () => {
      throw new ApiError(401, "Unauthorized");
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("propagates a 404 ApiError from a nested guard", async () => {
    const guard = async () => {
      throw new ApiError(404, "User not found");
    };
    const res = await handleRoute("Failed", async () => {
      await guard();
      return { unreachable: true };
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "User not found" });
  });

  it("maps unknown errors to a 500 with the fallback message and logs them", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleRoute("Failed to load data", async () => {
      throw new Error("boom");
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to load data" });
    expect(consoleError).toHaveBeenCalledWith("Failed to load data", expect.any(Error));
    consoleError.mockRestore();
  });
});
