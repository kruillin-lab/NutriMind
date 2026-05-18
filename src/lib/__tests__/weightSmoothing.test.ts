import { describe, it, expect } from "vitest";
import {
  movingAverage,
  exponentialMovingAverage,
  WeightPoint,
} from "../weightSmoothing";

function makePoint(dateStr: string, weightKg: number): WeightPoint {
  return { date: new Date(dateStr + "T00:00:00.000Z"), weightKg };
}

describe("movingAverage", () => {
  it("returns empty for empty input", () => {
    expect(movingAverage([], 7)).toEqual([]);
  });

  it("rejects window < 1", () => {
    expect(() => movingAverage([makePoint("2025-01-01", 70)], 0)).toThrow();
  });

  it("returns raw value when only one point in window", () => {
    const result = movingAverage([makePoint("2025-01-01", 70)], 7);
    expect(result).toHaveLength(1);
    expect(result[0].weightKg).toBe(70);
  });

  it("averages consecutive days within window", () => {
    const points = [
      makePoint("2025-01-01", 70),
      makePoint("2025-01-02", 72),
      makePoint("2025-01-03", 74),
    ];
    const result = movingAverage(points, 3);
    expect(result[0].weightKg).toBe(70);
    expect(result[1].weightKg).toBe(71);
    expect(result[2].weightKg).toBe(72);
  });

  it("drops points outside the calendar-day window", () => {
    const points = [
      makePoint("2025-01-01", 100),
      makePoint("2025-01-02", 70),
      makePoint("2025-01-10", 80),
    ];
    const result = movingAverage(points, 7);
    expect(result[0].weightKg).toBe(100);
    expect(result[1].weightKg).toBe(85);
    expect(result[2].weightKg).toBe(80);
  });
});

describe("exponentialMovingAverage", () => {
  it("returns empty for empty input", () => {
    expect(exponentialMovingAverage([], 0.1)).toEqual([]);
  });

  it("rejects alpha outside (0, 1]", () => {
    const p = [makePoint("2025-01-01", 70)];
    expect(() => exponentialMovingAverage(p, 0)).toThrow();
    expect(() => exponentialMovingAverage(p, 1.5)).toThrow();
  });

  it("first value equals first input", () => {
    const result = exponentialMovingAverage([makePoint("2025-01-01", 70)], 0.1);
    expect(result[0].weightKg).toBe(70);
  });

  it("follows the classic EMA recurrence", () => {
    const points = [
      makePoint("2025-01-01", 70),
      makePoint("2025-01-02", 80),
    ];
    const result = exponentialMovingAverage(points, 0.5);
    expect(result[1].weightKg).toBe(75);
  });

  it("smooths a noisy series toward the mean", () => {
    const points = [
      makePoint("2025-01-01", 70),
      makePoint("2025-01-02", 71),
      makePoint("2025-01-03", 69),
      makePoint("2025-01-04", 72),
      makePoint("2025-01-05", 70),
    ];
    const result = exponentialMovingAverage(points, 0.1);
    expect(result[result.length - 1].weightKg).toBeGreaterThan(69);
    expect(result[result.length - 1].weightKg).toBeLessThan(72);
  });
});
