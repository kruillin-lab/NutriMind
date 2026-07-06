import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";
import { addLocalDays, getLocalMidnight, parseLocalDate } from "@/lib/date-utils";
import { applyCalorieBankOverageAdjustment } from "@/src/lib/calorieBank";
import { clampInt, clampNumber, isValidDateString, truncate } from "@/src/lib/validation";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

export async function POST(req: NextRequest) {
  return handleRoute("Failed to log meal", async () => {
    const userId = await requireUserId();

    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid meal data");
    });
    const { name, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, vitaminCMg, calciumMg, ironMg, potassiumMg, servingSizeG, mealType = "OTHER", date: dateParam } = body;

    const safeName = truncate(name, 200);
    const safeCalories = clampInt(calories, 0, 10000);

    if (!safeName || safeCalories === null) {
      throw new ApiError(400, "Invalid meal data");
    }

    if (dateParam != null && !isValidDateString(dateParam)) {
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

    // Create meal and update daily log in transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Find or create today's daily log
        let dailyLog = await tx.dailyLog.findFirst({
          where: {
            userId: user.id,
            date: {
              gte: targetDate,
              lt: nextDay,
            },
          },
        });

        if (!dailyLog) {
          dailyLog = await tx.dailyLog.create({
            data: {
              userId: user.id,
              date: targetDate,
              calorieTarget: dailyTarget,
            },
          });
        }

        // Create the meal
        const meal = await tx.meal.create({
          data: {
            dailyLogId: dailyLog.id,
            name: safeName,
            calories: safeCalories,
            proteinG: nutrients.proteinG,
            carbsG: nutrients.carbsG,
            fatG: nutrients.fatG,
            fiberG: nutrients.fiberG,
            sugarG: nutrients.sugarG,
            sodiumMg: nutrients.sodiumMg,
            vitaminCMg: nutrients.vitaminCMg,
            calciumMg: nutrients.calciumMg,
            ironMg: nutrients.ironMg,
            potassiumMg: nutrients.potassiumMg,
            servingSizeG: safeServingSizeG,
            mealType,
          },
        });

        // Update daily log consumed calories and all nutrients
        const newConsumed = dailyLog.caloriesConsumed + safeCalories;
        const remaining = dailyLog.calorieTarget - newConsumed;

        const updatedLog = await tx.dailyLog.update({
          where: { id: dailyLog.id },
          data: {
            caloriesConsumed: newConsumed,
            proteinG: (dailyLog.proteinG || 0) + nutrients.proteinG,
            carbsG: (dailyLog.carbsG || 0) + nutrients.carbsG,
            fatG: (dailyLog.fatG || 0) + nutrients.fatG,
            fiberG: (dailyLog.fiberG || 0) + nutrients.fiberG,
            sugarG: (dailyLog.sugarG || 0) + nutrients.sugarG,
            sodiumMg: (dailyLog.sodiumMg || 0) + nutrients.sodiumMg,
            vitaminCMg: (dailyLog.vitaminCMg || 0) + nutrients.vitaminCMg,
            calciumMg: (dailyLog.calciumMg || 0) + nutrients.calciumMg,
            ironMg: (dailyLog.ironMg || 0) + nutrients.ironMg,
            potassiumMg: (dailyLog.potassiumMg || 0) + nutrients.potassiumMg,
          },
        });

        const bankAdjustment = await applyCalorieBankOverageAdjustment({
          bank: user.calorieBank,
          tx,
          previousConsumed: dailyLog.caloriesConsumed,
          nextConsumed: newConsumed,
          calorieTarget: dailyLog.calorieTarget,
          sourceId: dailyLog.id,
          spendReason: `Overspend from meal: ${safeName}`,
          refundReason: `Refund from meal: ${safeName}`,
        });

        return {
          meal,
          dailyLog: updatedLog,
          bankTransaction: bankAdjustment.bankTransaction,
          bankAdjustment: bankAdjustment.adjustment,
          remaining,
          bankUpdate: bankAdjustment.bankUpdate,
        };
      }
    );

    return {
      success: true,
      meal: result.meal,
      remainingCalories: result.remaining,
      bankBalance: result.bankUpdate?.currentBalance ?? user.calorieBank.currentBalance,
      message:
        result.remaining >= 0
          ? `Logged ${safeCalories} calories. ${Math.round(result.remaining)} remaining today.`
          : result.bankTransaction
            ? `Logged ${safeCalories} calories. Used ${Math.round(result.bankAdjustment.amount)} from bank.`
            : `Logged ${safeCalories} calories. ${Math.abs(Math.round(result.remaining))} over budget (insufficient bank balance).`,
    };
  });
}

export async function GET(req: NextRequest) {
  return handleRoute("Failed to fetch meals", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    if (dateParam && !isValidDateString(dateParam)) {
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
      meals: dailyLog.meals.map((meal) => ({
        id: meal.id,
        name: meal.name,
        calories: meal.calories,
        protein: meal.proteinG,
        carbs: meal.carbsG,
        fat: meal.fatG,
        fiber: meal.fiberG,
        sugar: meal.sugarG,
        sodium: meal.sodiumMg,
        vitaminC: meal.vitaminCMg,
        calcium: meal.calciumMg,
        iron: meal.ironMg,
        potassium: meal.potassiumMg,
        servingSizeG: meal.servingSizeG,
        mealType: meal.mealType,
        createdAt: meal.createdAt,
      })),
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
