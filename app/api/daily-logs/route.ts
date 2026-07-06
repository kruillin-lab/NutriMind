import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { calculateStreaks } from "@/src/lib/streakUtils";
import { handleRoute, requireUserId } from "@/src/lib/api-helpers";

export async function GET(req: NextRequest) {
  return handleRoute("Failed to fetch daily logs", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "week";
    const days = range === "month" ? 30 : range === "week" ? 7 : 14;

    const dailyLogs = await prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      take: 365,
    });

    const calorieBank = await prisma.calorieBank.findUnique({
      where: { userId },
      select: { dailyTarget: true },
    });

    const dailyTarget = calorieBank?.dailyTarget || 2000;
    const { currentStreak, maxStreak } = calculateStreaks(dailyLogs, dailyTarget);

    // Filter logs for the requested range
    const rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);
    rangeStart.setDate(rangeStart.getDate() - days + 1);

    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + days);

    const rangeLogs = dailyLogs.filter(
      (log) => log.date >= rangeStart && log.date < rangeEnd
    );

    const logs = rangeLogs.map((log) => ({
      id: log.id,
      date: log.date.toISOString(),
      caloriesConsumed: log.caloriesConsumed,
      calorieTarget: log.calorieTarget || dailyTarget,
      proteinG: log.proteinG || 0,
      carbsG: log.carbsG || 0,
      fatG: log.fatG || 0,
      fiberG: log.fiberG || 0,
      waterMl: log.waterMl || 0,
      exerciseMinutes: log.exerciseMinutes || 0,
      caloriesBurned: log.caloriesBurned || 0,
      isUnderTarget: log.caloriesConsumed <= (log.calorieTarget || dailyTarget),
    }));

    const avgConsumed = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.caloriesConsumed, 0) / logs.length)
      : 0;

    const daysUnderTarget = logs.filter((l) => l.isUnderTarget).length;
    const avgProtein = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.proteinG, 0) / logs.length)
      : 0;
    const avgCarbs = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.carbsG, 0) / logs.length)
      : 0;
    const avgFat = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.fatG, 0) / logs.length)
      : 0;

    return {
      logs,
      dailyTarget,
      stats: {
        avgConsumed,
        daysUnderTarget,
        daysTotal: days,
        complianceRate: days > 0 ? Math.round((daysUnderTarget / days) * 100) : 0,
        avgProtein,
        avgCarbs,
        avgFat,
        currentStreak,
        maxStreak,
      },
    };
  });
}
