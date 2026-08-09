import type { CalorieBank, DailyLog, Prisma } from "@/src/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../calorieBank", () => ({
  applyCalorieBankOverageAdjustment: vi.fn(),
}));

import { applyCalorieBankOverageAdjustment } from "../calorieBank";
import { recordMeal } from "../nutrition-day";

const day = {
  start: new Date("2026-07-09T00:00:00.000Z"),
  end: new Date("2026-07-10T00:00:00.000Z"),
};

const nutrition = {
  calories: 650,
  proteinG: 42,
  carbsG: 71,
  fatG: 19,
  fiberG: 8,
  sugarG: 6,
  sodiumMg: 720,
  vitaminCMg: 24,
  calciumMg: 180,
  ironMg: 4,
  potassiumMg: 640,
};

function createDailyLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    id: "log-1",
    userId: "user-1",
    date: day.start,
    caloriesConsumed: 1_700,
    proteinG: 80,
    carbsG: 190,
    fatG: 55,
    fiberG: 20,
    sugarG: 30,
    sodiumMg: 1_500,
    vitaminCMg: 60,
    calciumMg: 700,
    ironMg: 10,
    potassiumMg: 2_000,
    calorieTarget: 2_000,
    caloriesBurned: 0,
    exerciseMinutes: 0,
    bankedAmount: 0,
    waterMl: 0,
    notes: null,
    ...overrides,
  };
}

function createBank(): CalorieBank {
  return {
    id: "bank-1",
    userId: "user-1",
    currentBalance: 1_000,
    totalBanked: 1_000,
    totalSpent: 0,
    dailyTarget: 2_000,
    weeklyAverage: 0,
    recommendedSpend: null,
    spendByDate: null,
    allowNegative: false,
    expireAfterDays: 30,
    autoAdjustTarget: false,
    expiredAmount: 0,
    proteinTargetG: 0,
    carbsTargetG: 0,
    fatTargetG: 0,
    createdAt: day.start,
    updatedAt: day.start,
  };
}

function createTx(existingLog: DailyLog | null, updatedLog: DailyLog) {
  return {
    dailyLog: {
      findFirst: vi.fn().mockResolvedValue(existingLog),
      create: vi.fn().mockResolvedValue(existingLog ?? createDailyLog({ caloriesConsumed: 0 })),
      update: vi.fn().mockResolvedValue(updatedLog),
    },
    meal: {
      create: vi.fn().mockResolvedValue({ id: "meal-1", name: "Bowl" }),
    },
  };
}

describe("recordMeal", () => {
  beforeEach(() => {
    vi.mocked(applyCalorieBankOverageAdjustment).mockReset();
    vi.mocked(applyCalorieBankOverageAdjustment).mockResolvedValue({
      adjustment: { type: "spend", amount: 350 },
      bankUpdate: null,
      bankTransaction: null,
    });
  });

  it("creates a missing nutrition day at the supplied day boundary", async () => {
    const createdLog = createDailyLog({ caloriesConsumed: 0 });
    const updatedLog = createDailyLog({ caloriesConsumed: 650 });
    const tx = createTx(null, updatedLog);

    await recordMeal({
      tx: tx as unknown as Prisma.TransactionClient,
      userId: "user-1",
      bank: createBank(),
      day,
      calorieTarget: 2_000,
      meal: { name: "Bowl", mealType: "LUNCH", ...nutrition },
      spendReason: "Meal spend",
      refundReason: "Meal refund",
    });

    expect(tx.dailyLog.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", date: { gte: day.start, lt: day.end } },
    });
    expect(tx.dailyLog.create).toHaveBeenCalledWith({
      data: { userId: "user-1", date: day.start, calorieTarget: 2_000 },
    });
    expect(createdLog.id).toBe("log-1");
  });

  it("records every nutrient and source field on the meal", async () => {
    const tx = createTx(createDailyLog(), createDailyLog({ caloriesConsumed: 2_350 }));

    await recordMeal({
      tx: tx as unknown as Prisma.TransactionClient,
      userId: "user-1",
      bank: createBank(),
      day,
      calorieTarget: 2_000,
      meal: {
        name: "Planned bowl",
        mealType: "DINNER",
        source: "meal_plan",
        servingSizeG: 420,
        ...nutrition,
      },
      spendReason: "Meal spend",
      refundReason: "Meal refund",
    });

    expect(tx.meal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dailyLogId: "log-1",
        name: "Planned bowl",
        mealType: "DINNER",
        source: "meal_plan",
        servingSizeG: 420,
        ...nutrition,
      }),
    });
  });

  it("increments every DailyLog aggregate atomically", async () => {
    const tx = createTx(createDailyLog(), createDailyLog({ caloriesConsumed: 2_350 }));

    await recordMeal({
      tx: tx as unknown as Prisma.TransactionClient,
      userId: "user-1",
      bank: createBank(),
      day,
      calorieTarget: 2_000,
      meal: { name: "Bowl", mealType: "LUNCH", ...nutrition },
      spendReason: "Meal spend",
      refundReason: "Meal refund",
    });

    expect(tx.dailyLog.update).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: {
        caloriesConsumed: { increment: 650 },
        proteinG: { increment: 42 },
        carbsG: { increment: 71 },
        fatG: { increment: 19 },
        fiberG: { increment: 8 },
        sugarG: { increment: 6 },
        sodiumMg: { increment: 720 },
        vitaminCMg: { increment: 24 },
        calciumMg: { increment: 180 },
        ironMg: { increment: 4 },
        potassiumMg: { increment: 640 },
      },
    });
  });

  it("applies the bank delta from the committed aggregate totals", async () => {
    const tx = createTx(createDailyLog(), createDailyLog({ caloriesConsumed: 2_350 }));

    const result = await recordMeal({
      tx: tx as unknown as Prisma.TransactionClient,
      userId: "user-1",
      bank: createBank(),
      day,
      calorieTarget: 2_000,
      meal: { name: "Bowl", mealType: "LUNCH", ...nutrition },
      spendReason: "Meal spend",
      refundReason: "Meal refund",
    });

    expect(applyCalorieBankOverageAdjustment).toHaveBeenCalledWith(expect.objectContaining({
      previousConsumed: 1_700,
      nextConsumed: 2_350,
      calorieTarget: 2_000,
      sourceId: "log-1",
    }));
    expect(result.remainingCalories).toBe(-350);
  });
});
