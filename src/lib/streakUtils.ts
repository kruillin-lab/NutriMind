import { addZonedDays, formatZonedDateKey, parseZonedDate } from "@/lib/date-utils";

export interface DailyLogEntry {
  date: Date;
  caloriesConsumed: number;
  calorieTarget: number;
}

export interface StreakResult {
  currentStreak: number;
  maxStreak: number;
}

export function calculateStreaks(
  logs: DailyLogEntry[],
  effectiveTarget: number,
  timezone: string,
  referenceDate: Date = new Date()
): StreakResult {
  if (logs.length === 0) return { currentStreak: 0, maxStreak: 0 };

  // Logs must be sorted ascending by date
  const sorted = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());

  const logByDate = new Map(
    sorted.map((l) => [formatZonedDateKey(l.date, timezone), l])
  );

  const todayKey = formatZonedDateKey(referenceDate, timezone);

  let currentStreak = 0;
  let cursor = parseZonedDate(todayKey, timezone);
  while (true) {
    const log = logByDate.get(formatZonedDateKey(cursor, timezone));
    if (!log) break;
    if (log.caloriesConsumed > (log.calorieTarget || effectiveTarget)) break;
    currentStreak++;
    cursor = addZonedDays(cursor, -1, timezone);
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
        const expectedKey = formatZonedDateKey(addZonedDays(sorted[i - 1].date, 1, timezone), timezone);
        const isConsecutive = expectedKey === formatZonedDateKey(log.date, timezone);
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
