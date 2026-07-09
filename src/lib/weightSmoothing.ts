export interface WeightPoint {
  date: Date;
  weightKg: number;
}

const DAY_MS = 86_400_000;

function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function movingAverage(
  entries: WeightPoint[],
  windowDays: number
): WeightPoint[] {
  if (windowDays < 1) {
    throw new Error("windowDays must be >= 1");
  }
  if (entries.length === 0) return [];

  const result: WeightPoint[] = [];
  let windowStart = 0;
  let sum = 0;

  for (let i = 0; i < entries.length; i++) {
    sum += entries[i].weightKg;
    const cutoff = utcMidnightMs(entries[i].date) - (windowDays - 1) * DAY_MS;
    while (
      windowStart < i &&
      utcMidnightMs(entries[windowStart].date) < cutoff
    ) {
      sum -= entries[windowStart].weightKg;
      windowStart++;
    }
    const count = i - windowStart + 1;
    result.push({
      date: entries[i].date,
      weightKg: sum / count,
    });
  }
  return result;
}

export function exponentialMovingAverage(
  entries: WeightPoint[],
  alpha: number
): WeightPoint[] {
  if (alpha <= 0 || alpha > 1) {
    throw new Error("alpha must be in (0, 1]");
  }
  if (entries.length === 0) return [];

  const result: WeightPoint[] = [
    { date: entries[0].date, weightKg: entries[0].weightKg },
  ];
  let ema = entries[0].weightKg;
  for (let i = 1; i < entries.length; i++) {
    ema = alpha * entries[i].weightKg + (1 - alpha) * ema;
    result.push({ date: entries[i].date, weightKg: ema });
  }
  return result;
}
