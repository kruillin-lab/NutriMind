import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkAndAwardAchievements } from "@/src/lib/achievements";
import { requireUserId } from "@/src/lib/api-helpers";
import { prisma } from "@/src/lib/prisma";
import { recordMeal } from "@/src/lib/nutrition-day";
import { POST } from "./route";

vi.mock("@/src/lib/achievements", () => ({
  checkAndAwardAchievements: vi.fn(),
}));

vi.mock("@/src/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/api-helpers")>("@/src/lib/api-helpers");
  return { ...actual, requireUserId: vi.fn() };
});

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/src/lib/nutrition-day", () => ({
  recordMeal: vi.fn(),
}));

function mealRequest(body: unknown) {
  return new NextRequest("http://localhost/api/meals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/meals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      calorieBank: { currentBalance: 240, dailyTarget: 2_000 },
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback({} as never));
    vi.mocked(recordMeal).mockResolvedValue({
      meal: { id: "meal-1" },
      remainingCalories: 1_360,
      bankUpdate: null,
      bankTransaction: null,
      bankAdjustment: { amount: 0 },
    } as never);
    vi.mocked(checkAndAwardAchievements).mockResolvedValue([]);
  });

  it("forwards validated photo provenance to the canonical meal transaction", async () => {
    const response = await POST(mealRequest({
      name: "Chicken rice bowl",
      calories: 640,
      proteinG: 44,
      carbsG: 72,
      fatG: 18,
      source: "photo",
      aiConfidence: 0.72,
    }));

    expect(response.status).toBe(200);
    expect(recordMeal).toHaveBeenCalledWith(expect.objectContaining({
      meal: expect.objectContaining({
        source: "photo",
        aiConfidence: 0.72,
      }),
    }));
  });
});
