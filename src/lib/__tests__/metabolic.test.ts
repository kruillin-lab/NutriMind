import { describe, it, expect } from "vitest";
import {
  recalcMetabolism,
  recommendDailyTarget,
  IntakeSample,
  WeightSample,
} from "../metabolic";

function w(dateStr: string, weightKg: number): WeightSample {
  return { date: new Date(dateStr + "T00:00:00.000Z"), weightKg };
}

function i(dateStr: string, caloriesConsumed: number): IntakeSample {
  return { date: new Date(dateStr + "T00:00:00.000Z"), caloriesConsumed };
}

function intakeRun(
  startStr: string,
  days: number,
  perDay: number
): IntakeSample[] {
  const start = new Date(startStr + "T00:00:00.000Z").getTime();
  const samples: IntakeSample[] = [];
  for (let d = 0; d < days; d++) {
    samples.push({
      date: new Date(start + d * 86_400_000),
      caloriesConsumed: perDay,
    });
  }
  return samples;
}

const BASE = {
  bmrEstimate: 1700,
  currentTMR: 2200,
  predictionsMade: 0,
  predictionsCorrect: 0,
};

describe("recalcMetabolism", () => {
  it("skips when fewer than 2 weight entries", () => {
    const result = recalcMetabolism({
      ...BASE,
      weights: [w("2025-01-01", 80)],
      intake: intakeRun("2025-01-01", 1, 2000),
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/insufficient weight/);
  });

  it("skips when weight window is too short", () => {
    const result = recalcMetabolism({
      ...BASE,
      weights: [w("2025-01-01", 80), w("2025-01-04", 79.8)],
      intake: intakeRun("2025-01-01", 4, 2000),
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/too short/);
  });

  it("skips when intake coverage is below threshold", () => {
    const result = recalcMetabolism({
      ...BASE,
      weights: [w("2025-01-01", 80), w("2025-01-08", 79.5)],
      intake: [i("2025-01-01", 2000), i("2025-01-02", 2000), i("2025-01-03", 2000)],
    });
    expect(result.applied).toBe(false);
    expect(result.reason).toMatch(/intake coverage/);
  });

  it("derives observed TMR from energy balance algebra", () => {
    // 0.5 kg lost over 7 days at avg 1800 kcal/day
    // → 0.5 * 7700 / 7 = 550 kcal/day deficit → observed TMR = 2350
    const result = recalcMetabolism({
      ...BASE,
      weights: [w("2025-01-01", 80), w("2025-01-08", 79.5)],
      intake: intakeRun("2025-01-01", 8, 1800),
    });
    expect(result.applied).toBe(true);
    expect(result.observedTMR).toBeCloseTo(2350, 0);
    expect(result.weightDeltaKg).toBeCloseTo(-0.5, 5);
    expect(result.avgDailyIntake).toBeCloseTo(1800, 0);
  });

  it("blends observed TMR with current rather than replacing it", () => {
    const result = recalcMetabolism({
      ...BASE,
      weights: [w("2025-01-01", 80), w("2025-01-08", 79.5)],
      intake: intakeRun("2025-01-01", 8, 1800),
    });
    expect(result.applied).toBe(true);
    // observed = 2350, current = 2200, blend = 2200*0.7 + 2350*0.3 = 2245
    expect(result.newTMR).toBeCloseTo(2245, 0);
  });

  it("clamps TMR within sane bounds of BMR", () => {
    // simulate absurd weight loss (5 kg in 7 days) → observed TMR would
    // be > 2.5x BMR; result should clip to 2.5 * BMR
    const bmrEstimate = 1700;
    const result = recalcMetabolism({
      ...BASE,
      bmrEstimate,
      weights: [w("2025-01-01", 80), w("2025-01-08", 75)],
      intake: intakeRun("2025-01-01", 8, 1800),
    });
    expect(result.applied).toBe(true);
    expect(result.newTMR).toBeLessThanOrEqual(bmrEstimate * 2.5 + 0.0001);
  });

  it("records a correct prediction when expected weight loss matches actual", () => {
    // current TMR 2200, avg intake 1700 → expected deficit 500 kcal/day
    // over 7 days = 3500 kcal = 0.45 kg expected loss
    // simulated actual loss 0.5 kg → within 0.5 kg tolerance → correct
    const result = recalcMetabolism({
      ...BASE,
      weights: [w("2025-01-01", 80), w("2025-01-08", 79.5)],
      intake: intakeRun("2025-01-01", 8, 1700),
    });
    expect(result.predictionsMade).toBe(1);
    expect(result.predictionsCorrect).toBe(1);
    expect(result.predictionAccuracy).toBe(1);
  });

  it("records a wrong prediction when reality diverges", () => {
    // expected loss ~0.45 kg, actual gain of 1 kg → divergence > 0.5 kg
    const result = recalcMetabolism({
      ...BASE,
      weights: [w("2025-01-01", 80), w("2025-01-08", 81)],
      intake: intakeRun("2025-01-01", 8, 1700),
    });
    expect(result.predictionsMade).toBe(1);
    expect(result.predictionsCorrect).toBe(0);
    expect(result.predictionAccuracy).toBe(0);
  });
});

describe("recommendDailyTarget", () => {
  const base = {
    trueMetabolicRate: 2300,
    currentDailyTarget: 2000,
    currentWeightKg: 80,
    predictionAccuracy: 0.8,
    predictionsMade: 5,
  };

  it("refuses to recommend before enough cycles", () => {
    const r = recommendDailyTarget({ ...base, predictionsMade: 2, goalWeightKg: 75 });
    expect(r.applied).toBe(false);
    expect(r.reason).toMatch(/cycles/);
  });

  it("refuses to recommend when accuracy is low", () => {
    const r = recommendDailyTarget({
      ...base,
      predictionAccuracy: 0.4,
      goalWeightKg: 75,
    });
    expect(r.applied).toBe(false);
    expect(r.reason).toMatch(/accuracy/);
  });

  it("recommends a deficit when goal weight is lower", () => {
    // unbounded would be 2300 - 500 = 1800; max delta = 2000 * 0.1 = 200
    // clamped = max(1800, 2000-200) = 1800
    const r = recommendDailyTarget({ ...base, goalWeightKg: 75 });
    expect(r.applied).toBe(true);
    expect(r.newDailyTarget).toBe(1800);
  });

  it("recommends a surplus when goal weight is higher", () => {
    // unbounded = 2300 + 300 = 2600; clamped to 2000 + 200 = 2200
    const r = recommendDailyTarget({ ...base, goalWeightKg: 85 });
    expect(r.applied).toBe(true);
    expect(r.newDailyTarget).toBe(2200);
  });

  it("recommends maintenance when at goal weight", () => {
    // unbounded = TMR = 2300; clamped to 2000 + 200 = 2200
    const r = recommendDailyTarget({
      ...base,
      goalWeightKg: 80,
    });
    expect(r.applied).toBe(true);
    expect(r.newDailyTarget).toBe(2200);
  });

  it("caps movement to ±10% of current target per cycle", () => {
    // Big jump in TMR shouldn't move target by more than 10%
    const r = recommendDailyTarget({
      ...base,
      trueMetabolicRate: 3500,
      goalWeightKg: 85,
    });
    expect(r.applied).toBe(true);
    expect(r.newDailyTarget).toBe(2200);
  });

  it("returns no-op when the change would round to zero", () => {
    const r = recommendDailyTarget({
      ...base,
      trueMetabolicRate: 2000,
      goalWeightKg: 80,
    });
    expect(r.applied).toBe(false);
  });
});
