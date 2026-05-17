import { describe, expect, it } from "vitest";
import {
  calculateCompletedDaySurplus,
  calculateOverageAdjustment,
  createCalorieBankResetData,
} from "../calorieBank";

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
