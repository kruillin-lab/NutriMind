import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, requireUserId } from "@/src/lib/api-helpers";
import { prisma } from "@/src/lib/prisma";
import { GET, POST } from "./route";

vi.mock("@/src/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/api-helpers")>("@/src/lib/api-helpers");
  return { ...actual, requireUserId: vi.fn() };
});

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userProfile: { findUnique: vi.fn() },
    dailyLog: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const tx = {
  dailyLog: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  calorieBank: { update: vi.fn() },
  bankTransaction: { create: vi.fn() },
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/exercise", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(url = "http://localhost/api/exercise") {
  return new NextRequest(url, { method: "GET" });
}

describe("POST /api/exercise", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      calorieBank: { id: "bank-1", currentBalance: 100, dailyTarget: 2_000 },
    } as never);
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue({
      timezone: "America/New_York",
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));
    tx.dailyLog.findFirst.mockResolvedValue({
      id: "log-1",
      exerciseMinutes: 10,
      caloriesBurned: 50,
      caloriesConsumed: 1_200,
      calorieTarget: 2_000,
    } as never);
    tx.dailyLog.create.mockResolvedValue({
      id: "log-new",
      exerciseMinutes: 0,
      caloriesBurned: 0,
      caloriesConsumed: 0,
      calorieTarget: 2_000,
    } as never);
    tx.dailyLog.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "log-1",
      caloriesConsumed: 1_200,
      calorieTarget: 2_000,
      ...data,
    }));
    tx.calorieBank.update.mockResolvedValue({} as never);
    tx.bankTransaction.create.mockResolvedValue({} as never);
  });

  it("adds exercise to the existing daily log and banks burned calories", async () => {
    const response = await POST(postRequest({
      exerciseMinutes: 30,
      caloriesBurned: 200,
      description: "Evening run",
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      exerciseMinutes: 40,
      caloriesBurned: 250,
    });

    expect(tx.dailyLog.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "log-1" },
      data: { exerciseMinutes: 40, caloriesBurned: 250 },
    }));
    expect(tx.calorieBank.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        currentBalance: { increment: 200 },
        totalBanked: { increment: 200 },
      },
    });
    expect(tx.bankTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        bankId: "bank-1",
        type: "BANK",
        amount: 200,
        reason: "Exercise: Evening run (+200 kcal)",
        sourceType: "exercise",
      }),
    }));
  });

  it("creates the daily log when none exists and skips the bank update for zero burned calories", async () => {
    tx.dailyLog.findFirst.mockResolvedValue(null);

    const response = await POST(postRequest({ exerciseMinutes: 15 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      exerciseMinutes: 15,
      caloriesBurned: 0,
    });

    expect(tx.dailyLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user-1", calorieTarget: 2_000 }),
    }));
    expect(tx.calorieBank.update).not.toHaveBeenCalled();
    expect(tx.bankTransaction.create).not.toHaveBeenCalled();
  });

  it("rejects a non-positive exercise duration", async () => {
    const response = await POST(postRequest({ exerciseMinutes: 0, caloriesBurned: 200 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid exercise duration" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects non-numeric calories burned", async () => {
    const response = await POST(postRequest({ exerciseMinutes: 30, caloriesBurned: "lots" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid calories burned" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 when the user has no calorie bank", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1", calorieBank: null } as never);

    const response = await POST(postRequest({ exerciseMinutes: 30, caloriesBurned: 200 }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "User or calorie bank not found" });
  });
});

describe("GET /api/exercise", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue({
      timezone: "America/New_York",
    } as never);
    vi.mocked(prisma.dailyLog.findFirst).mockResolvedValue({
      exerciseMinutes: 45,
      caloriesBurned: 320,
    } as never);
  });

  it("returns the stored exercise data for the requested day", async () => {
    const response = await GET(getRequest("http://localhost/api/exercise?date=2026-02-10"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exerciseMinutes: 45,
      caloriesBurned: 320,
    });
    expect(prisma.dailyLog.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: "user-1" }),
    }));
  });

  it("returns zeros when there is no daily log for the day", async () => {
    vi.mocked(prisma.dailyLog.findFirst).mockResolvedValue(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ exerciseMinutes: 0, caloriesBurned: 0 });
  });

  it("rejects a malformed date parameter", async () => {
    const response = await GET(getRequest("http://localhost/api/exercise?date=not-a-date"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid date" });
    expect(prisma.dailyLog.findFirst).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new ApiError(401, "Unauthorized"));

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
