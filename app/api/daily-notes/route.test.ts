import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, requireUserId, requireUserTimezone } from "@/src/lib/api-helpers";
import { prisma } from "@/src/lib/prisma";
import { GET, PUT } from "./route";

vi.mock("@/src/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/api-helpers")>("@/src/lib/api-helpers");
  return { ...actual, requireUserId: vi.fn(), requireUserTimezone: vi.fn() };
});

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    dailyLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    calorieBank: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

function getRequest(search = "") {
  return new NextRequest(`http://localhost/api/daily-notes${search}`);
}

function putRequest(body: unknown) {
  return new NextRequest("http://localhost/api/daily-notes", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/daily-notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(requireUserTimezone).mockResolvedValue("America/New_York");
  });

  it("returns the notes and log id stored for the requested day", async () => {
    vi.mocked(prisma.dailyLog.findFirst).mockResolvedValue({
      id: "log-1",
      notes: "Woke up early, felt strong",
    } as never);

    const res = await GET(getRequest("?date=2026-07-09"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      notes: "Woke up early, felt strong",
      logId: "log-1",
    });
    expect(prisma.dailyLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          date: { gte: expect.any(Date), lt: expect.any(Date) },
        },
        select: { id: true, notes: true },
      })
    );
  });

  it("returns empty notes when the day has no daily log yet", async () => {
    vi.mocked(prisma.dailyLog.findFirst).mockResolvedValue(null);

    const res = await GET(getRequest("?date=2026-07-09"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ notes: "", logId: null });
  });

  it("rejects a malformed date with 400", async () => {
    const res = await GET(getRequest("?date=not-a-date"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid date" });
    expect(prisma.dailyLog.findFirst).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new ApiError(401, "Unauthorized"));

    const res = await GET(getRequest("?date=2026-07-09"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(prisma.dailyLog.findFirst).not.toHaveBeenCalled();
  });
});

describe("PUT /api/daily-notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(requireUserTimezone).mockResolvedValue("America/New_York");
  });

  it("creates a daily log with the notes when none exists yet", async () => {
    const tx = {
      dailyLog: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "log-1", notes: "First entry" }),
        update: vi.fn(),
      },
      calorieBank: { findUnique: vi.fn().mockResolvedValue({ dailyTarget: 2400 }) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

    const res = await PUT(putRequest({ notes: "First entry", date: "2026-07-09" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, notes: "First entry" });
    expect(tx.dailyLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          date: { gte: expect.any(Date), lt: expect.any(Date) },
        },
      })
    );
    expect(tx.calorieBank.findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(tx.dailyLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        notes: "First entry",
        calorieTarget: 2400,
      }),
    });
    expect(tx.dailyLog.update).not.toHaveBeenCalled();
  });

  it("updates the notes on an existing daily log without touching the bank", async () => {
    const existing = { id: "log-1", notes: "Old notes" };
    const tx = {
      dailyLog: {
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ ...existing, notes: "Edited notes" }),
      },
      calorieBank: { findUnique: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

    const res = await PUT(putRequest({ notes: "Edited notes", date: "2026-07-09" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, notes: "Edited notes" });
    expect(tx.dailyLog.update).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { notes: "Edited notes" },
    });
    expect(tx.dailyLog.create).not.toHaveBeenCalled();
    expect(tx.calorieBank.findUnique).not.toHaveBeenCalled();
  });

  it("rejects notes that are not a string with 400", async () => {
    const res = await PUT(putRequest({ notes: 42, date: "2026-07-09" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Notes must be a string of at most 10000 characters",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects notes longer than 10000 characters with 400", async () => {
    const res = await PUT(putRequest({ notes: "x".repeat(10001), date: "2026-07-09" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Notes must be a string of at most 10000 characters",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a malformed date with 400 before opening a transaction", async () => {
    const res = await PUT(putRequest({ notes: "Fine notes", date: "not-a-date" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid date" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new ApiError(401, "Unauthorized"));

    const res = await PUT(putRequest({ notes: "Fine notes", date: "2026-07-09" }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
