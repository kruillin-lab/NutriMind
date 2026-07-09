import type { CalorieBank, MealType, Prisma } from "@prisma/client";
import { applyCalorieBankOverageAdjustment } from "@/src/lib/calorieBank";

export interface MealNutrition {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  vitaminCMg: number;
  calciumMg: number;
  ironMg: number;
  potassiumMg: number;
}

interface RecordMealInput {
  tx: Prisma.TransactionClient;
  userId: string;
  bank: CalorieBank | null;
  day: { start: Date; end: Date };
  calorieTarget: number;
  meal: MealNutrition & {
    name: string;
    mealType: MealType;
    servingSizeG?: number | null;
    source?: string;
    aiConfidence?: number | null;
  };
  spendReason: string;
  refundReason: string;
}

/**
 * Canonical command for adding a meal to a nutrition day.
 *
 * Route handlers own authentication and input validation. This command owns
 * the transaction-local invariants shared by every meal entry surface:
 * creating the day when needed, recording the meal, updating every aggregate,
 * and applying the Calorie Bank overage delta.
 */
export async function recordMeal({
  tx,
  userId,
  bank,
  day,
  calorieTarget,
  meal: input,
  spendReason,
  refundReason,
}: RecordMealInput) {
  let dailyLog = await tx.dailyLog.findFirst({
    where: {
      userId,
      date: { gte: day.start, lt: day.end },
    },
  });

  if (!dailyLog) {
    dailyLog = await tx.dailyLog.create({
      data: {
        userId,
        date: day.start,
        calorieTarget,
      },
    });
  }

  const meal = await tx.meal.create({
    data: {
      dailyLogId: dailyLog.id,
      name: input.name,
      mealType: input.mealType,
      calories: input.calories,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      fiberG: input.fiberG,
      sugarG: input.sugarG,
      sodiumMg: input.sodiumMg,
      vitaminCMg: input.vitaminCMg,
      calciumMg: input.calciumMg,
      ironMg: input.ironMg,
      potassiumMg: input.potassiumMg,
      servingSizeG: input.servingSizeG ?? null,
      source: input.source ?? "manual",
      aiConfidence: input.aiConfidence ?? null,
    },
  });

  const updatedLog = await tx.dailyLog.update({
    where: { id: dailyLog.id },
    data: {
      caloriesConsumed: { increment: input.calories },
      proteinG: { increment: input.proteinG },
      carbsG: { increment: input.carbsG },
      fatG: { increment: input.fatG },
      fiberG: { increment: input.fiberG },
      sugarG: { increment: input.sugarG },
      sodiumMg: { increment: input.sodiumMg },
      vitaminCMg: { increment: input.vitaminCMg },
      calciumMg: { increment: input.calciumMg },
      ironMg: { increment: input.ironMg },
      potassiumMg: { increment: input.potassiumMg },
    },
  });

  const previousConsumed = updatedLog.caloriesConsumed - input.calories;
  const bankAdjustment = await applyCalorieBankOverageAdjustment({
    bank,
    tx,
    previousConsumed,
    nextConsumed: updatedLog.caloriesConsumed,
    calorieTarget: updatedLog.calorieTarget,
    sourceId: dailyLog.id,
    spendReason,
    refundReason,
  });

  return {
    meal,
    dailyLog: updatedLog,
    remainingCalories: updatedLog.calorieTarget - updatedLog.caloriesConsumed,
    bankTransaction: bankAdjustment.bankTransaction,
    bankAdjustment: bankAdjustment.adjustment,
    bankUpdate: bankAdjustment.bankUpdate,
  };
}
