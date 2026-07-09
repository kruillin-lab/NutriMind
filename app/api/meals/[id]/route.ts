import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { Prisma } from '@prisma/client';
import { applyCalorieBankOverageAdjustment } from '@/src/lib/calorieBank';
import { ApiError, handleRoute, requireUserId } from '@/src/lib/api-helpers';
import { clampInt, clampNumber, truncate } from '@/src/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return handleRoute('Failed to update meal', async () => {
    const userId = await requireUserId();

    const { id } = await params;
    const body = await req.json();
    const { name, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, vitaminCMg, calciumMg, ironMg, potassiumMg, servingSizeG, mealType } = body;

    const safeName = truncate(name, 200);
    const safeCalories = clampInt(calories, 0, 10000);

    if (!safeName || safeCalories === null) {
      throw new ApiError(400, 'Invalid meal data');
    }

    // Find the meal and verify ownership
    const existingMeal = await prisma.meal.findUnique({
      where: { id },
      include: {
        dailyLog: {
          include: {
            user: {
              include: {
                calorieBank: true,
              },
            },
          },
        },
      },
    });

    if (!existingMeal) {
      throw new ApiError(404, 'Meal not found');
    }

    if (existingMeal.dailyLog.user.id !== userId) {
      throw new ApiError(403, 'Forbidden');
    }

    const nutrients = {
      proteinG: proteinG !== undefined ? clampNumber(proteinG, 0, 1000) ?? 0 : existingMeal.proteinG,
      carbsG: carbsG !== undefined ? clampNumber(carbsG, 0, 1000) ?? 0 : existingMeal.carbsG,
      fatG: fatG !== undefined ? clampNumber(fatG, 0, 1000) ?? 0 : existingMeal.fatG,
      fiberG: fiberG !== undefined ? clampNumber(fiberG, 0, 1000) ?? 0 : existingMeal.fiberG,
      sugarG: sugarG !== undefined ? clampNumber(sugarG, 0, 1000) ?? 0 : existingMeal.sugarG,
      sodiumMg: sodiumMg !== undefined ? clampNumber(sodiumMg, 0, 10000) ?? 0 : existingMeal.sodiumMg,
      vitaminCMg: vitaminCMg !== undefined ? clampNumber(vitaminCMg, 0, 10000) ?? 0 : existingMeal.vitaminCMg,
      calciumMg: calciumMg !== undefined ? clampNumber(calciumMg, 0, 10000) ?? 0 : existingMeal.calciumMg,
      ironMg: ironMg !== undefined ? clampNumber(ironMg, 0, 10000) ?? 0 : existingMeal.ironMg,
      potassiumMg: potassiumMg !== undefined ? clampNumber(potassiumMg, 0, 10000) ?? 0 : existingMeal.potassiumMg,
    };
    const safeServingSizeG = servingSizeG !== undefined
      ? (servingSizeG !== null ? clampNumber(servingSizeG, 0, 10000) : null)
      : existingMeal.servingSizeG;
    const calorieDifference = safeCalories - existingMeal.calories;
    const user = existingMeal.dailyLog.user;

    // Update meal and daily log in transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Update the meal
        const updatedMeal = await tx.meal.update({
          where: { id },
          data: {
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
            mealType: mealType || existingMeal.mealType,
          },
        });

        // Update daily log consumed calories and all nutrients
        const newConsumed = existingMeal.dailyLog.caloriesConsumed + calorieDifference;
        const updatedLog = await tx.dailyLog.update({
          where: { id: existingMeal.dailyLog.id },
          data: {
            caloriesConsumed: newConsumed,
            proteinG: (existingMeal.dailyLog.proteinG || 0) + (updatedMeal.proteinG - existingMeal.proteinG),
            carbsG: (existingMeal.dailyLog.carbsG || 0) + (updatedMeal.carbsG - existingMeal.carbsG),
            fatG: (existingMeal.dailyLog.fatG || 0) + (updatedMeal.fatG - existingMeal.fatG),
            fiberG: (existingMeal.dailyLog.fiberG || 0) + (updatedMeal.fiberG - existingMeal.fiberG),
            sugarG: (existingMeal.dailyLog.sugarG || 0) + (updatedMeal.sugarG - existingMeal.sugarG),
            sodiumMg: (existingMeal.dailyLog.sodiumMg || 0) + (updatedMeal.sodiumMg - existingMeal.sodiumMg),
            vitaminCMg: (existingMeal.dailyLog.vitaminCMg || 0) + (updatedMeal.vitaminCMg - existingMeal.vitaminCMg),
            calciumMg: (existingMeal.dailyLog.calciumMg || 0) + (updatedMeal.calciumMg - existingMeal.calciumMg),
            ironMg: (existingMeal.dailyLog.ironMg || 0) + (updatedMeal.ironMg - existingMeal.ironMg),
            potassiumMg: (existingMeal.dailyLog.potassiumMg || 0) + (updatedMeal.potassiumMg - existingMeal.potassiumMg),
          },
        });

        const bankAdjustment = await applyCalorieBankOverageAdjustment({
          bank: user.calorieBank,
          tx,
          previousConsumed: existingMeal.dailyLog.caloriesConsumed,
          nextConsumed: newConsumed,
          calorieTarget: existingMeal.dailyLog.calorieTarget,
          sourceId: existingMeal.dailyLog.id,
          spendReason: `Overspend from edited meal: ${safeName}`,
          refundReason: `Refund from edited meal: ${safeName}`,
        });

        return { meal: updatedMeal, dailyLog: updatedLog, bankUpdate: bankAdjustment.bankUpdate };
      }
    );

    return {
      success: true,
      meal: result.meal,
      remainingCalories: result.dailyLog.calorieTarget - result.dailyLog.caloriesConsumed,
      bankBalance: result.bankUpdate?.currentBalance ?? user.calorieBank?.currentBalance,
    };
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return handleRoute('Failed to delete meal', async () => {
    const userId = await requireUserId();

    const { id } = await params;

    // Find the meal and verify ownership
    const existingMeal = await prisma.meal.findUnique({
      where: { id },
      include: {
        dailyLog: {
          include: {
            user: {
              include: {
                calorieBank: true,
              },
            },
          },
        },
      },
    });

    if (!existingMeal) {
      throw new ApiError(404, 'Meal not found');
    }

    if (existingMeal.dailyLog.user.id !== userId) {
      throw new ApiError(403, 'Forbidden');
    }

    const user = existingMeal.dailyLog.user;
    // Delete meal and update daily log in transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Delete the meal
        await tx.meal.delete({
          where: { id },
        });

        // Update daily log consumed calories and subtract all nutrients
        const newConsumed = existingMeal.dailyLog.caloriesConsumed - existingMeal.calories;
        const updatedLog = await tx.dailyLog.update({
          where: { id: existingMeal.dailyLog.id },
          data: {
            caloriesConsumed: newConsumed,
            proteinG: Math.max(0, (existingMeal.dailyLog.proteinG || 0) - (existingMeal.proteinG || 0)),
            carbsG: Math.max(0, (existingMeal.dailyLog.carbsG || 0) - (existingMeal.carbsG || 0)),
            fatG: Math.max(0, (existingMeal.dailyLog.fatG || 0) - (existingMeal.fatG || 0)),
            fiberG: Math.max(0, (existingMeal.dailyLog.fiberG || 0) - (existingMeal.fiberG || 0)),
            sugarG: Math.max(0, (existingMeal.dailyLog.sugarG || 0) - (existingMeal.sugarG || 0)),
            sodiumMg: Math.max(0, (existingMeal.dailyLog.sodiumMg || 0) - (existingMeal.sodiumMg || 0)),
            vitaminCMg: Math.max(0, (existingMeal.dailyLog.vitaminCMg || 0) - (existingMeal.vitaminCMg || 0)),
            calciumMg: Math.max(0, (existingMeal.dailyLog.calciumMg || 0) - (existingMeal.calciumMg || 0)),
            ironMg: Math.max(0, (existingMeal.dailyLog.ironMg || 0) - (existingMeal.ironMg || 0)),
            potassiumMg: Math.max(0, (existingMeal.dailyLog.potassiumMg || 0) - (existingMeal.potassiumMg || 0)),
          },
        });

        const bankAdjustment = await applyCalorieBankOverageAdjustment({
          bank: user.calorieBank,
          tx,
          previousConsumed: existingMeal.dailyLog.caloriesConsumed,
          nextConsumed: newConsumed,
          calorieTarget: existingMeal.dailyLog.calorieTarget,
          sourceId: existingMeal.dailyLog.id,
          spendReason: `Overspend after deleting meal: ${existingMeal.name}`,
          refundReason: `Refund from deleted meal: ${existingMeal.name}`,
        });

        return { dailyLog: updatedLog, bankUpdate: bankAdjustment.bankUpdate };
      }
    );

    return {
      success: true,
      remainingCalories: result.dailyLog.calorieTarget - result.dailyLog.caloriesConsumed,
      bankBalance: result.bankUpdate?.currentBalance ?? user.calorieBank?.currentBalance,
    };
  });
}
