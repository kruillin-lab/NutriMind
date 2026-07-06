import { describe, it, expect, vi } from "vitest";

// api-helpers imports Clerk and the Prisma client at module scope; mock both
// so these unit tests stay dependency-free (dayRange and handleRoute never
// touch them).
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/src/lib/prisma", () => ({ prisma: {} }));

import { ApiError, dayRange, handleRoute } from "../api-helpers";

describe("dayRange", () => {
  it("defaults to today at local midnight and spans exactly one day", () => {
    const { start, end } = dayRange();

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);

    const expectedEnd = new Date(start);
    expectedEnd.setDate(expectedEnd.getDate() + 1);
    expect(end.getTime()).toBe(expectedEnd.getTime());
  });

  it("defaults to today at UTC midnight when opts.utc is set", () => {
    const { start, end } = dayRange(null, { utc: true });

    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);
    expect(start.getUTCMilliseconds()).toBe(0);

    const expectedEnd = new Date(start);
    expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 1);
    expect(end.getTime()).toBe(expectedEnd.getTime());
  });

  it("normalizes an explicit date param to that day's UTC window", () => {
    const { start, end } = dayRange("2025-01-10", { utc: true });

    expect(start.toISOString()).toBe("2025-01-10T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-01-11T00:00:00.000Z");
  });

  it("normalizes an explicit date param to local midnight by default", () => {
    // Local-time timestamp (no Z suffix) so the parsed day is 2025-01-10
    // in the machine's timezone regardless of where the test runs.
    const { start, end } = dayRange("2025-01-10T12:34:56");

    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);

    expect(end.getDate()).toBe(11);
    expect(end.getHours()).toBe(0);
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
