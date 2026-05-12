export interface DailyLogEntry {
  date: Date;
  caloriesConsumed: number;
  calorieTarget: number;
}

function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export interface StreakResult {
  currentStreak: number;
  maxStreak: number;
}

export function calculateStreaks(
  logs: DailyLogEntry[],
  effectiveTarget: number,
  referenceDate?: Date
): StreakResult {
  if (logs.length === 0) return { currentStreak: 0, maxStreak: 0 };

  // Logs must be sorted ascending by date
  const sorted = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());

  const logByDate = new Map(
    sorted.map((l) => [toDateKey(l.date), l])
  );

  const todayUTC = referenceDate ? new Date(referenceDate) : new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  let currentStreak = 0;
  const checkDate = new Date(todayUTC);
  while (true) {
    const log = logByDate.get(toDateKey(checkDate));
    if (!log) break;
    if (log.caloriesConsumed > (log.calorieTarget || effectiveTarget)) break;
    currentStreak++;
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  let maxStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];
    const isUnder = log.caloriesConsumed <= (log.calorieTarget || effectiveTarget);
    if (isUnder) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sorted[i - 1].date);
        prevDate.setUTCDate(prevDate.getUTCDate() + 1);
        const isConsecutive = toDateKey(prevDate) === toDateKey(log.date);
        tempStreak = isConsecutive ? tempStreak + 1 : 1;
      }
      maxStreak = Math.max(maxStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { currentStreak, maxStreak };
}

export function calcBankSurplus(
  caloriesConsumed: number,
  calorieTarget: number
): number | null {
  if (caloriesConsumed >= calorieTarget) return null;
  return calorieTarget - caloriesConsumed;
}
