export interface IntakeSample {
  date: Date;
  caloriesConsumed: number;
}

export interface WeightSample {
  date: Date;
  weightKg: number;
}

export interface MetabolicRecalcInput {
  weights: WeightSample[];
  intake: IntakeSample[];
  currentTMR: number;
  bmrEstimate: number;
  predictionsMade: number;
  predictionsCorrect: number;
}

export interface MetabolicRecalcResult {
  applied: boolean;
  reason?: string;
  newTMR?: number;
  adaptiveFactor?: number;
  observedTMR?: number;
  predictionsMade?: number;
  predictionsCorrect?: number;
  predictionAccuracy?: number;
  windowDays?: number;
  weightDeltaKg?: number;
  avgDailyIntake?: number;
}

export interface TargetRecommendationInput {
  trueMetabolicRate: number;
  currentDailyTarget: number;
  currentWeightKg: number;
  goalWeightKg: number | null | undefined;
  predictionAccuracy: number;
  predictionsMade: number;
}

export interface TargetRecommendation {
  applied: boolean;
  reason?: string;
  newDailyTarget?: number;
}

const KCAL_PER_KG = 7700;
const MIN_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 30;
const MIN_INTAKE_COVERAGE = 0.7;
const BLEND_FACTOR = 0.3;
const TMR_LOWER_MULT = 1.0;
const TMR_UPPER_MULT = 2.5;
const PREDICTION_TOLERANCE_KG = 0.5;

const MIN_ACCURATE_CYCLES = 3;
const MIN_ACCURACY_FOR_TARGET = 0.6;
const MAX_TARGET_DELTA_PCT = 0.1;
const WEIGHT_LOSS_DEFICIT = 500;
const WEIGHT_GAIN_SURPLUS = 300;
const GOAL_TOLERANCE_KG = 0.5;

function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function daysBetween(earlier: Date, later: Date): number {
  return Math.round((utcMidnightMs(later) - utcMidnightMs(earlier)) / 86_400_000);
}

export function recalcMetabolism(
  input: MetabolicRecalcInput
): MetabolicRecalcResult {
  const weights = [...input.weights].sort(
    (a, b) => utcMidnightMs(a.date) - utcMidnightMs(b.date)
  );

  if (weights.length < 2) {
    return { applied: false, reason: "insufficient weight entries" };
  }

  const earliest = weights[0];
  const latest = weights[weights.length - 1];
  const windowDays = daysBetween(earliest.date, latest.date);

  if (windowDays < MIN_WINDOW_DAYS) {
    return { applied: false, reason: "weight window too short" };
  }
  if (windowDays > MAX_WINDOW_DAYS) {
    return { applied: false, reason: "weight window too long" };
  }

  const startMs = utcMidnightMs(earliest.date);
  const endMs = utcMidnightMs(latest.date);
  const intakeInWindow = input.intake.filter((sample) => {
    const ms = utcMidnightMs(sample.date);
    return ms >= startMs && ms <= endMs && sample.caloriesConsumed > 0;
  });

  if (intakeInWindow.length / windowDays < MIN_INTAKE_COVERAGE) {
    return { applied: false, reason: "insufficient intake coverage" };
  }

  const totalIntake = intakeInWindow.reduce(
    (sum, s) => sum + s.caloriesConsumed,
    0
  );
  const avgDailyIntake = totalIntake / intakeInWindow.length;
  const weightDeltaKg = latest.weightKg - earliest.weightKg;
  const observedTMR =
    avgDailyIntake - (weightDeltaKg * KCAL_PER_KG) / windowDays;

  const blended =
    input.currentTMR * (1 - BLEND_FACTOR) + observedTMR * BLEND_FACTOR;
  const lowerBound = input.bmrEstimate * TMR_LOWER_MULT;
  const upperBound = input.bmrEstimate * TMR_UPPER_MULT;
  const newTMR = Math.max(lowerBound, Math.min(upperBound, blended));

  const adaptiveFactor =
    input.bmrEstimate > 0 ? newTMR / input.bmrEstimate - 1 : 0;

  const expectedWeightLossKg =
    ((input.currentTMR - avgDailyIntake) * windowDays) / KCAL_PER_KG;
  const actualWeightLossKg = -weightDeltaKg;
  const isPredictionCorrect =
    Math.abs(expectedWeightLossKg - actualWeightLossKg) <
    PREDICTION_TOLERANCE_KG;

  const predictionsMade = input.predictionsMade + 1;
  const predictionsCorrect =
    input.predictionsCorrect + (isPredictionCorrect ? 1 : 0);
  const predictionAccuracy = predictionsCorrect / predictionsMade;

  return {
    applied: true,
    newTMR,
    adaptiveFactor,
    observedTMR,
    predictionsMade,
    predictionsCorrect,
    predictionAccuracy,
    windowDays,
    weightDeltaKg,
    avgDailyIntake,
  };
}

export function recommendDailyTarget(
  input: TargetRecommendationInput
): TargetRecommendation {
  if (input.predictionsMade < MIN_ACCURATE_CYCLES) {
    return { applied: false, reason: "not enough cycles to trust target" };
  }
  if (input.predictionAccuracy < MIN_ACCURACY_FOR_TARGET) {
    return { applied: false, reason: "prediction accuracy below threshold" };
  }
  if (input.trueMetabolicRate <= 0) {
    return { applied: false, reason: "invalid TMR" };
  }

  let unbounded: number;
  if (
    input.goalWeightKg == null ||
    Math.abs(input.currentWeightKg - input.goalWeightKg) < GOAL_TOLERANCE_KG
  ) {
    unbounded = input.trueMetabolicRate;
  } else if (input.currentWeightKg > input.goalWeightKg) {
    unbounded = input.trueMetabolicRate - WEIGHT_LOSS_DEFICIT;
  } else {
    unbounded = input.trueMetabolicRate + WEIGHT_GAIN_SURPLUS;
  }

  const maxDelta = input.currentDailyTarget * MAX_TARGET_DELTA_PCT;
  const clamped = Math.max(
    input.currentDailyTarget - maxDelta,
    Math.min(input.currentDailyTarget + maxDelta, unbounded)
  );

  if (Math.abs(clamped - input.currentDailyTarget) < 1) {
    return { applied: false, reason: "no meaningful change" };
  }

  return { applied: true, newDailyTarget: Math.round(clamped) };
}
