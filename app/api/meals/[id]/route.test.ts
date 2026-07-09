import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/src/lib/prisma";
import { PUT } from "./route";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    meal: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const user = {
  id: "user-1",
  calorieBank: {
    id: "bank-1",
    currentBalance: 0,
    totalSpent: 0,
    allowNegative: false,
  },
};

const existingMeal = {
  id: "meal-1",
  dailyLogId: "log-1",
  name: "Existing meal",
  calories: 50,
  proteinG: 1,
  carbsG: 2,
  fatG: 3,
  fiberG: 4,
  sugarG: 5,
  sodiumMg: 6,
  vitaminCMg: 7,
  calciumMg: 8,
  ironMg: 9,
  potassiumMg: 10,
  servingSizeG: null,
  mealType: "SNACK" as const,
  source: "MANUAL",
  aiConfidence: null,
  createdAt: new Date("2026-07-09T12:00:00.000Z"),
  dailyLog: {
    id: "log-1",
    caloriesConsumed: 100,
    calorieTarget: 2000,
    proteinG: 1,
    carbsG: 2,
    fatG: 3,
    fiberG: 4,
    sugarG: 5,
    sodiumMg: 6,
    vitaminCMg: 7,
    calciumMg: 8,
    ironMg: 9,
    potassiumMg: 10,
    user,
  },
};

function putRequest(body: unknown) {
  return new NextRequest("http://localhost/api/meals/meal-1", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("PUT /api/meals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-numeric calories before corrupting totals", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-1" } as never);

    const res = await PUT(
      putRequest({ name: "bad edit", calories: "banana" }),
      { params: Promise.resolve({ id: "meal-1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid meal data" });
    expect(prisma.meal.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts a legitimate zero-calorie edit", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-1" } as never);
    vi.mocked(prisma.meal.findUnique).mockResolvedValue(existingMeal);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        meal: {
          update: vi.fn().mockResolvedValue({ ...existingMeal, name: "Water", calories: 0 }),
        },
        dailyLog: {
          update: vi.fn().mockResolvedValue({
            ...existingMeal.dailyLog,
            caloriesConsumed: 50,
          }),
        },
      };

      return fn(tx as never);
    });

    const res = await PUT(
      putRequest({ name: "Water", calories: 0 }),
      { params: Promise.resolve({ id: "meal-1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      success: true,
      remainingCalories: 1950,
    });
  });
});
