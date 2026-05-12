import { describe, it, expect } from "vitest";
import { calculateStreaks, calcBankSurplus, DailyLogEntry } from "../streakUtils";

function makeLog(dateStr: string, consumed: number, target: number): DailyLogEntry {
  const date = new Date(dateStr + "T00:00:00.000Z");
  return { date, caloriesConsumed: consumed, calorieTarget: target };
}

describe("calculateStreaks", () => {
  it("returns zero streaks for empty log list", () => {
    const result = calculateStreaks([], 2000);
    expect(result).toEqual({ currentStreak: 0, maxStreak: 0 });
  });

  it("counts a single under-target day as streak 1", () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const logs = [makeLog(todayStr, 1800, 2000)];
    const result = calculateStreaks(logs, 2000, today);
    expect(result.currentStreak).toBe(1);
    expect(result.maxStreak).toBe(1);
  });

  it("breaks current streak on over-target day", () => {
    const ref = new Date("2025-01-10T00:00:00.000Z");
    const logs = [
      makeLog("2025-01-08", 2100, 2000), // over
      makeLog("2025-01-09", 1800, 2000), // under
      makeLog("2025-01-10", 1900, 2000), // under — today
    ];
    const result = calculateStreaks(logs, 2000, ref);
    // Current streak starts at today and walks back: today=under, yesterday=under, day before=over → streak=2
    expect(result.currentStreak).toBe(2);
  });

  it("breaks current streak on missing day", () => {
    const ref = new Date("2025-01-10T00:00:00.000Z");
    const logs = [
      makeLog("2025-01-08", 1800, 2000), // under, but gap on 01-09
      makeLog("2025-01-10", 1900, 2000), // under — today
    ];
    const result = calculateStreaks(logs, 2000, ref);
    // Gap on 01-09 breaks current streak; today alone = 1
    expect(result.currentStreak).toBe(1);
  });

  it("returns 0 current streak when today is over target", () => {
    const ref = new Date("2025-01-10T00:00:00.000Z");
    const logs = [makeLog("2025-01-10", 2500, 2000)];
    const result = calculateStreaks(logs, 2000, ref);
    expect(result.currentStreak).toBe(0);
  });

  it("returns 0 current streak when today has no log", () => {
    const ref = new Date("2025-01-10T00:00:00.000Z");
    const logs = [makeLog("2025-01-09", 1800, 2000)];
    const result = calculateStreaks(logs, 2000, ref);
    expect(result.currentStreak).toBe(0);
  });

  it("calculates max streak correctly across gaps", () => {
    const ref = new Date("2025-01-15T00:00:00.000Z");
    const logs = [
      makeLog("2025-01-01", 1800, 2000), // run of 3
      makeLog("2025-01-02", 1700, 2000),
      makeLog("2025-01-03", 1900, 2000),
      makeLog("2025-01-05", 1800, 2000), // gap breaks it; run of 5
      makeLog("2025-01-06", 1800, 2000),
      makeLog("2025-01-07", 1800, 2000),
      makeLog("2025-01-08", 1800, 2000),
      makeLog("2025-01-09", 1800, 2000),
    ];
    const result = calculateStreaks(logs, 2000, ref);
    expect(result.maxStreak).toBe(5);
  });

  it("uses per-day calorieTarget over effectiveTarget", () => {
    const ref = new Date("2025-01-01T00:00:00.000Z");
    // Per-day target is 1500, consumed is 1600 — over per-day target
    const logs = [makeLog("2025-01-01", 1600, 1500)];
    const result = calculateStreaks(logs, 2000, ref);
    // caloriesConsumed (1600) > calorieTarget (1500) → streak breaks
    expect(result.currentStreak).toBe(0);
  });
});

describe("calcBankSurplus", () => {
  it("returns null when consumed equals target", () => {
    expect(calcBankSurplus(2000, 2000)).toBeNull();
  });

  it("returns null when consumed exceeds target", () => {
    expect(calcBankSurplus(2200, 2000)).toBeNull();
  });

  it("returns surplus when under target", () => {
    expect(calcBankSurplus(1800, 2000)).toBe(200);
  });

  it("returns full target as surplus when nothing was consumed", () => {
    expect(calcBankSurplus(0, 2000)).toBe(2000);
  });

  it("handles fractional calorie surplus correctly", () => {
    expect(calcBankSurplus(1999.5, 2000)).toBeCloseTo(0.5);
  });
});
