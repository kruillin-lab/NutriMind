import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { addLocalDays, getLocalMidnight, isValidLocalDateKey, parseLocalDate } from "@/lib/date-utils";
import { recordMeal } from "@/src/lib/nutrition-day";
import { clampInt, clampNumber, truncate } from "@/src/lib/validation";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";
import { checkAndAwardAchievements } from "@/src/lib/achievements";
import { toMealActivityItem } from "@/src/lib/meal-activity";

const MEAL_SOURCES = new Set(["manual", "ai", "barcode", "label", "photo", "meal_plan"]);

export async function POST(req: NextRequest) {
  return handleRoute("Failed to log meal", async () => {
    const userId = await requireUserId();

    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid meal data");
    });
    const { name, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, vitaminCMg, calciumMg, ironMg, potassiumMg, servingSizeG, mealType = "OTHER", date: dateParam, source, aiConfidence } = body;

    const safeName = truncate(name, 200);
    const safeCalories = clampInt(calories, 0, 10000);

    if (!safeName || safeCalories === null) {
      throw new ApiError(400, "Invalid meal data");
    }

    if (dateParam != null && !isValidLocalDateKey(dateParam)) {
      throw new ApiError(400, "Invalid date");
    }

    // Clamp macros (grams) to 0..1000 and micros (mg) to 0..10000; non-numeric values fall back to 0
    const nutrients = {
      proteinG: clampNumber(proteinG, 0, 1000) ?? 0,
      carbsG: clampNumber(carbsG, 0, 1000) ?? 0,
      fatG: clampNumber(fatG, 0, 1000) ?? 0,
      fiberG: clampNumber(fiberG, 0, 1000) ?? 0,
      sugarG: clampNumber(sugarG, 0, 1000) ?? 0,
      sodiumMg: clampNumber(sodiumMg, 0, 10000) ?? 0,
      vitaminCMg: clampNumber(vitaminCMg, 0, 10000) ?? 0,
      calciumMg: clampNumber(calciumMg, 0, 10000) ?? 0,
      ironMg: clampNumber(ironMg, 0, 10000) ?? 0,
      potassiumMg: clampNumber(potassiumMg, 0, 10000) ?? 0,
    };
    const safeServingSizeG = servingSizeG != null ? clampNumber(servingSizeG, 0, 10000) : null;
    const safeSource = typeof source === "string" && MEAL_SOURCES.has(source) ? source : "manual";
    const safeAiConfidence = aiConfidence == null ? null : clampNumber(aiConfidence, 0, 1);

    // Get user with profile and calorie bank
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        calorieBank: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!user.calorieBank) {
      throw new ApiError(400, "Calorie bank not initialized");
    }

    const dailyTarget = user.calorieBank.dailyTarget;
    // Use UTC dates to ensure consistency across server/API boundaries
    const targetDate = dateParam ? parseLocalDate(dateParam) : getLocalMidnight();
    const nextDay = addLocalDays(targetDate, 1);

    const result = await prisma.$transaction((tx) => recordMeal({
      tx,
      userId: user.id,
      bank: user.calorieBank,
      day: { start: targetDate, end: nextDay },
      calorieTarget: dailyTarget,
      meal: {
        name: safeName,
        calories: safeCalories,
        mealType,
        servingSizeG: safeServingSizeG,
        source: safeSource,
        aiConfidence: safeAiConfidence,
        ...nutrients,
      },
      spendReason: `Overspend from meal: ${safeName}`,
      refundReason: `Refund from meal: ${safeName}`,
    }));

    // Fire-and-forget achievement check — never blocks the response
    checkAndAwardAchievements(user.id).catch(() => {});

    return {
      success: true,
      meal: result.meal,
      remainingCalories: result.remainingCalories,
      bankBalance: result.bankUpdate?.currentBalance ?? user.calorieBank.currentBalance,
      message:
        result.remainingCalories >= 0
          ? `Logged ${safeCalories} calories. ${Math.round(result.remainingCalories)} remaining today.`
          : result.bankTransaction
            ? `Logged ${safeCalories} calories. Used ${Math.round(result.bankAdjustment.amount)} from bank.`
            : `Logged ${safeCalories} calories. ${Math.abs(Math.round(result.remainingCalories))} over budget (insufficient bank balance).`,
    };
  });
}

export async function GET(req: NextRequest) {
  return handleRoute("Failed to fetch meals", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    if (dateParam && !isValidLocalDateKey(dateParam)) {
      throw new ApiError(400, "Invalid date");
    }
    const date = dateParam ? parseLocalDate(dateParam) : getLocalMidnight();
    const nextDay = addLocalDays(date, 1);

    // Get user with daily log and meals for the date
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        calorieBank: true,
        dailyLogs: {
          where: {
            date: {
              gte: date,
              lt: nextDay,
            },
          },
          include: {
            meals: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const dailyLog = user.dailyLogs[0] || {
      calorieTarget: user.calorieBank?.dailyTarget || 2000,
      caloriesConsumed: 0,
      bankedAmount: 0,
      waterMl: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
      vitaminCMg: 0,
      calciumMg: 0,
      ironMg: 0,
      potassiumMg: 0,
      meals: [],
    };

    const remainingCalories = dailyLog.calorieTarget - dailyLog.caloriesConsumed;

    return {
      targetCalories: dailyLog.calorieTarget,
      consumedCalories: dailyLog.caloriesConsumed,
      remainingCalories,
      meals: dailyLog.meals.map(toMealActivityItem),
      dailyTotals: {
        protein: dailyLog.proteinG || 0,
        carbs: dailyLog.carbsG || 0,
        fat: dailyLog.fatG || 0,
        fiber: dailyLog.fiberG || 0,
        sugar: dailyLog.sugarG || 0,
        sodium: dailyLog.sodiumMg || 0,
        vitaminC: dailyLog.vitaminCMg || 0,
        calcium: dailyLog.calciumMg || 0,
        iron: dailyLog.ironMg || 0,
        potassium: dailyLog.potassiumMg || 0,
      },
      calorieBank: {
        balance: user.calorieBank?.currentBalance || 0,
        dailyTarget: user.calorieBank?.dailyTarget || 2000,
        totalBanked: user.calorieBank?.totalBanked || 0,
        totalSpent: user.calorieBank?.totalSpent || 0,
        borrowed: remainingCalories < 0 ? Math.abs(remainingCalories) : 0,
        remaining: remainingCalories < 0
          ? Math.max(0, (user.calorieBank?.currentBalance || 0) - Math.abs(remainingCalories))
          : remainingCalories,
      },
    };
  });
}
