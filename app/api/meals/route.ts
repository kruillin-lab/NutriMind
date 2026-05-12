import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";
import { addLocalDays, getLocalMidnight, parseLocalDate } from "@/lib/date-utils";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, vitaminCMg, calciumMg, ironMg, potassiumMg, servingSizeG, mealType = "OTHER", date: dateParam } = body;

    if (!name || calories == null || calories < 0) {
      return NextResponse.json(
        { error: "Invalid meal data" },
        { status: 400 }
      );
    }

    // Get user with profile and calorie bank
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        calorieBank: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.calorieBank) {
      return NextResponse.json(
        { error: "Calorie bank not initialized" },
        { status: 400 }
      );
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
            name,
            calories,
            proteinG: proteinG || 0,
            carbsG: carbsG || 0,
            fatG: fatG || 0,
            fiberG: fiberG || 0,
            sugarG: sugarG || 0,
            sodiumMg: sodiumMg || 0,
            vitaminCMg: vitaminCMg || 0,
            calciumMg: calciumMg || 0,
            ironMg: ironMg || 0,
            potassiumMg: potassiumMg || 0,
            servingSizeG: servingSizeG != null ? servingSizeG : null,
            mealType,
          },
        });

        // Update daily log consumed calories and all nutrients
        const newConsumed = dailyLog.caloriesConsumed + calories;
        const remaining = dailyLog.calorieTarget - newConsumed;

        const updatedLog = await tx.dailyLog.update({
          where: { id: dailyLog.id },
          data: {
            caloriesConsumed: newConsumed,
            proteinG: (dailyLog.proteinG || 0) + (proteinG || 0),
            carbsG: (dailyLog.carbsG || 0) + (carbsG || 0),
            fatG: (dailyLog.fatG || 0) + (fatG || 0),
            fiberG: (dailyLog.fiberG || 0) + (fiberG || 0),
            sugarG: (dailyLog.sugarG || 0) + (sugarG || 0),
            sodiumMg: (dailyLog.sodiumMg || 0) + (sodiumMg || 0),
            vitaminCMg: (dailyLog.vitaminCMg || 0) + (vitaminCMg || 0),
            calciumMg: (dailyLog.calciumMg || 0) + (calciumMg || 0),
            ironMg: (dailyLog.ironMg || 0) + (ironMg || 0),
            potassiumMg: (dailyLog.potassiumMg || 0) + (potassiumMg || 0),
          },
        });

        // Update Calorie Bank if user went over budget
        let bankTransaction = null;
        let bankUpdate = null;
        
        if (remaining < 0) {
          const overspend = Math.abs(remaining);
          const currentBalance = user.calorieBank!.currentBalance;
          const newBalance = currentBalance - overspend;

          // Only allow if balance permits or negative balances are allowed
          if (newBalance >= 0 || user.calorieBank!.allowNegative) {
            bankUpdate = await tx.calorieBank.update({
              where: { userId: user.id },
              data: {
                currentBalance: newBalance,
                totalSpent: {
                  increment: overspend,
                },
              },
            });

            // Create bank transaction record
            bankTransaction = await tx.bankTransaction.create({
              data: {
                bankId: user.calorieBank!.id,
                type: "SPEND",
                amount: overspend,
                reason: `Overspend from meal: ${name}`,
                caloriesConsumed: newConsumed,
                caloriesTarget: dailyTarget,
                sourceType: "daily_log",
              },
            });
          }
        }

        return { meal, dailyLog: updatedLog, bankTransaction, remaining, bankUpdate };
      }
    );

    return NextResponse.json({
      success: true,
      meal: result.meal,
      remainingCalories: result.remaining,
      bankBalance: result.bankUpdate?.currentBalance ?? user.calorieBank.currentBalance,
      message:
        result.remaining >= 0
          ? `Logged ${calories} calories. ${Math.round(result.remaining)} remaining today.`
          : result.bankTransaction
            ? `Logged ${calories} calories. Used ${Math.abs(Math.round(result.remaining))} from bank.`
            : `Logged ${calories} calories. ${Math.abs(Math.round(result.remaining))} over budget (insufficient bank balance).`,
    });
  } catch (error) {
    console.error("Error logging meal:", error);
    return NextResponse.json(
      { error: "Failed to log meal" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
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
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error fetching meals:", error);
    return NextResponse.json(
      { error: "Failed to fetch meals" },
      { status: 500 }
    );
  }
}
