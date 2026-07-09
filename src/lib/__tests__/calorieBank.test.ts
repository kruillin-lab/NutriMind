import type { CalorieBank, Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  applyCalorieBankOverageAdjustment,
  calculateCompletedDaySurplus,
  calculateOverageAdjustment,
  createCalorieBankResetData,
} from "../calorieBank";

function createBank(overrides: Partial<CalorieBank> = {}): CalorieBank {
  return {
    id: "bank-1",
    userId: "user-1",
    currentBalance: 0,
    totalBanked: 0,
    totalSpent: 0,
    dailyTarget: 2000,
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
    createdAt: new Date("2026-05-12T00:00:00.000Z"),
    updatedAt: new Date("2026-05-12T00:00:00.000Z"),
    ...overrides,
  };
}

describe("calculateOverageAdjustment", () => {
  it("spends only the amount that crosses over target", () => {
    expect(calculateOverageAdjustment({
      previousConsumed: 1900,
      nextConsumed: 2200,
      calorieTarget: 2000,
    })).toEqual({ type: "spend", amount: 200 });
  });

  it("spends only the additional overage when the day was already over target", () => {
    expect(calculateOverageAdjustment({
      previousConsumed: 2200,
      nextConsumed: 2300,
      calorieTarget: 2000,
    })).toEqual({ type: "spend", amount: 100 });
  });

  it("refunds only the reduced overage when the day stays over target", () => {
    expect(calculateOverageAdjustment({
      previousConsumed: 2500,
      nextConsumed: 2200,
      calorieTarget: 2000,
    })).toEqual({ type: "refund", amount: 300 });
  });

  it("refunds the full old overage when the day moves back under target", () => {
    expect(calculateOverageAdjustment({
      previousConsumed: 2500,
      nextConsumed: 1800,
      calorieTarget: 2000,
    })).toEqual({ type: "refund", amount: 500 });
  });

  it("does nothing while both totals stay under target", () => {
    expect(calculateOverageAdjustment({
      previousConsumed: 1200,
      nextConsumed: 1600,
      calorieTarget: 2000,
    })).toEqual({ type: "none", amount: 0 });
  });
});

describe("calculateCompletedDaySurplus", () => {
  it("returns surplus for an unbanked completed under-target day", () => {
    const today = new Date("2026-05-12T00:00:00.000Z");
    const date = new Date("2026-05-11T00:00:00.000Z");

    expect(calculateCompletedDaySurplus({
      date,
      caloriesConsumed: 1600,
      calorieTarget: 2000,
      bankedAmount: 0,
    }, today)).toBe(400);
  });

  it("does not bank today before the day is complete", () => {
    const today = new Date("2026-05-12T00:00:00.000Z");

    expect(calculateCompletedDaySurplus({
      date: today,
      caloriesConsumed: 1600,
      calorieTarget: 2000,
      bankedAmount: 0,
    }, today)).toBeNull();
  });

  it("does not bank a day that already has a banked amount", () => {
    const today = new Date("2026-05-12T00:00:00.000Z");

    expect(calculateCompletedDaySurplus({
      date: new Date("2026-05-11T00:00:00.000Z"),
      caloriesConsumed: 1600,
      calorieTarget: 2000,
      bankedAmount: 400,
    }, today)).toBeNull();
  });

  it("does not bank a full target for a past day with no food logged", () => {
    const today = new Date("2026-05-12T00:00:00.000Z");

    expect(calculateCompletedDaySurplus({
      date: new Date("2026-05-11T00:00:00.000Z"),
      caloriesConsumed: 0,
      calorieTarget: 2000,
      bankedAmount: 0,
    }, today)).toBeNull();
  });
});

describe("applyCalorieBankOverageAdjustment", () => {
  it("does not refund overage that was never spent from the bank", async () => {
    const bank = createBank({ currentBalance: 0, totalSpent: 0, allowNegative: false });
    const tx = {
      calorieBank: {
        findUnique: vi.fn().mockResolvedValue(bank),
        update: vi.fn(),
      },
      bankTransaction: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as Prisma.TransactionClient;

    const blockedSpend = await applyCalorieBankOverageAdjustment({
      bank,
      tx,
      previousConsumed: 2000,
      nextConsumed: 2500,
      calorieTarget: 2000,
      sourceId: "log-1",
      spendReason: "Overspend",
      refundReason: "Refund",
    });

    expect(blockedSpend.adjustment).toEqual({ type: "spend", amount: 500 });
    expect(tx.calorieBank.update).not.toHaveBeenCalled();
    expect(tx.bankTransaction.create).not.toHaveBeenCalled();

    const refund = await applyCalorieBankOverageAdjustment({
      bank,
      tx,
      previousConsumed: 2500,
      nextConsumed: 2000,
      calorieTarget: 2000,
      sourceId: "log-1",
      spendReason: "Overspend",
      refundReason: "Refund",
    });

    expect(refund.adjustment).toEqual({ type: "refund", amount: 500 });
    expect(refund.bankUpdate).toBeNull();
    expect(refund.bankTransaction).toBeNull();
    expect(tx.calorieBank.update).not.toHaveBeenCalled();
    expect(tx.bankTransaction.create).not.toHaveBeenCalled();
  });

  it("spends with an atomic decrement instead of an absolute balance write", async () => {
    const bank = createBank({ currentBalance: 1000, totalSpent: 0, allowNegative: false });
    const tx = {
      calorieBank: {
        findUnique: vi.fn().mockResolvedValue(bank),
        update: vi.fn().mockResolvedValue(createBank({ currentBalance: 600, totalSpent: 400 })),
      },
      bankTransaction: {
        create: vi.fn().mockResolvedValue({ id: "tx-1" }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as Prisma.TransactionClient;

    await applyCalorieBankOverageAdjustment({
      bank,
      tx,
      previousConsumed: 2000,
      nextConsumed: 2400,
      calorieTarget: 2000,
      sourceId: "log-1",
      spendReason: "Overspend",
      refundReason: "Refund",
    });

    expect(tx.calorieBank.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        currentBalance: { decrement: 400 },
        totalSpent: { increment: 400 },
      }),
    }));
  });
});

describe("createCalorieBankResetData", () => {
  it("resets only mutable balance totals and keeps goal settings untouched", () => {
    expect(createCalorieBankResetData()).toEqual({
      currentBalance: 0,
      totalBanked: 0,
      totalSpent: 0,
      expiredAmount: 0,
      recommendedSpend: null,
      spendByDate: null,
    });
  });
});
