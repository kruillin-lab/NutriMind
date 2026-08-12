import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { addZonedDays, formatZonedDateKey, zonedMidnightUtc } from "@/lib/date-utils";
import { ApiError, jsonError, requireUserId, requireUserTimezone } from "@/src/lib/api-helpers";

function escapeCsv(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  // Not wrapped in handleRoute: the success response is a raw CSV body with
  // download headers, not JSON.
  try {
    const userId = await requireUserId();
    const timezone = await requireUserTimezone(userId);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const days = parseInt(searchParams.get("days") || "90", 10);

    const startDate = addZonedDays(zonedMidnightUtc(timezone), -days, timezone);

    let csvContent = "";

    if (type === "all" || type === "meals") {
      const meals = await prisma.meal.findMany({
        where: {
          dailyLog: { userId, date: { gte: startDate } },
        },
        include: { dailyLog: true },
        orderBy: { createdAt: "asc" },
      });

      csvContent += "MEALS\n";
      csvContent += "Date,Name,Meal Type,Calories,Protein (g),Carbs (g),Fat (g),Fiber (g),Sugar (g),Sodium (mg),Vitamin C (mg),Calcium (mg),Iron (mg),Potassium (mg),Source,Logged At\n";
      for (const meal of meals) {
        csvContent += [
          formatZonedDateKey(meal.dailyLog.date, timezone),
          meal.name,
          meal.mealType,
          meal.calories,
          meal.proteinG,
          meal.carbsG,
          meal.fatG,
          meal.fiberG,
          meal.sugarG,
          meal.sodiumMg,
          meal.vitaminCMg,
          meal.calciumMg,
          meal.ironMg,
          meal.potassiumMg,
          meal.source,
          meal.createdAt.toISOString(),
        ].map(escapeCsv).join(",") + "\n";
      }
      csvContent += "\n";
    }

    if (type === "all" || type === "daily") {
      const dailyLogs = await prisma.dailyLog.findMany({
        where: { userId, date: { gte: startDate } },
        orderBy: { date: "asc" },
      });

      csvContent += "DAILY LOGS\n";
      csvContent += "Date,Calories Consumed,Calorie Target,Protein (g),Carbs (g),Fat (g),Fiber (g),Sugar (g),Sodium (mg),Vitamin C (mg),Calcium (mg),Iron (mg),Potassium (mg),Water (ml),Exercise (min),Calories Burned,Notes\n";
      for (const log of dailyLogs) {
        csvContent += [
          formatZonedDateKey(log.date, timezone),
          log.caloriesConsumed,
          log.calorieTarget,
          log.proteinG,
          log.carbsG,
          log.fatG,
          log.fiberG,
          log.sugarG,
          log.sodiumMg,
          log.vitaminCMg,
          log.calciumMg,
          log.ironMg,
          log.potassiumMg,
          log.waterMl,
          log.exerciseMinutes,
          log.caloriesBurned,
          log.notes,
        ].map(escapeCsv).join(",") + "\n";
      }
      csvContent += "\n";
    }

    if (type === "all" || type === "weight") {
      const weightEntries = await prisma.weightEntry.findMany({
        where: { userId, date: { gte: startDate } },
        orderBy: { date: "asc" },
      });

      csvContent += "WEIGHT\n";
      csvContent += "Date,Weight (kg),Source\n";
      for (const entry of weightEntries) {
        csvContent += [
          formatZonedDateKey(entry.date, timezone),
          entry.weightKg,
          entry.source,
        ].map(escapeCsv).join(",") + "\n";
      }
      csvContent += "\n";
    }

    if (type === "all" || type === "exercise") {
      const dailyLogs = await prisma.dailyLog.findMany({
        where: {
          userId,
          date: { gte: startDate },
          exerciseMinutes: { gt: 0 },
        },
        orderBy: { date: "asc" },
      });

      csvContent += "EXERCISE\n";
      csvContent += "Date,Duration (min),Calories Burned\n";
      for (const log of dailyLogs) {
        csvContent += [
          formatZonedDateKey(log.date, timezone),
          log.exerciseMinutes,
          log.caloriesBurned,
        ].map(escapeCsv).join(",") + "\n";
      }
      csvContent += "\n";
    }

    if (type === "all" || type === "journal") {
      const dailyLogs = await prisma.dailyLog.findMany({
        where: {
          userId,
          date: { gte: startDate },
          notes: { not: null },
        },
        orderBy: { date: "asc" },
      });

      csvContent += "JOURNAL\n";
      csvContent += "Date,Notes\n";
      for (const log of dailyLogs) {
        csvContent += [
          formatZonedDateKey(log.date, timezone),
          log.notes,
        ].map(escapeCsv).join(",") + "\n";
      }
    }

    const filename = `nutrimind-export-${formatZonedDateKey(new Date(), timezone)}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.status, error.message);
    }
    console.error("Error exporting data:", error);
    return jsonError(500, "Failed to export data");
  }
}
