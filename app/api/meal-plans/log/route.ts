import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { addLocalDays, getLocalMidnight, isValidLocalDateKey, parseLocalDate } from "@/lib/date-utils";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";
import { recordMeal } from "@/src/lib/nutrition-day";

export async function POST(req: NextRequest) {
  return handleRoute("Failed to log planned meal", async () => {
    const userId = await requireUserId();

    const body = await req.json().catch(() => {
      throw new ApiError(400, "Invalid meal plan data");
    });
    const { itemId, date } = body;

    if (!itemId) {
      throw new ApiError(400, "Missing required field: itemId");
    }

    if (date != null && !isValidLocalDateKey(date)) {
      throw new ApiError(400, "Invalid date");
    }

    const targetDate = date ? parseLocalDate(date) : getLocalMidnight();
    const nextDay = addLocalDays(targetDate, 1);

    return prisma.$transaction(async (tx) => {
      const planItem = await tx.mealPlanItem.findUnique({
        where: { id: itemId },
        include: { mealPlan: true },
      });

      if (!planItem || planItem.mealPlan.userId !== userId) {
        throw new ApiError(404, "Meal plan item not found");
      }

      const claim = await tx.mealPlanItem.updateMany({
        where: { id: itemId, isLogged: false },
        data: { isLogged: true },
      });

      if (claim.count === 0) {
        throw new ApiError(400, "This meal has already been logged");
      }

      const calorieBank = await tx.calorieBank.findUnique({ where: { userId } });
      if (!calorieBank) {
        throw new ApiError(400, "Calorie bank not initialized");
      }

      const result = await recordMeal({
        tx,
        userId,
        bank: calorieBank,
        day: { start: targetDate, end: nextDay },
        calorieTarget: calorieBank.dailyTarget,
        meal: {
          name: planItem.name,
          mealType: planItem.mealType,
          calories: planItem.calories,
          proteinG: planItem.proteinG,
          carbsG: planItem.carbsG,
          fatG: planItem.fatG,
          fiberG: planItem.fiberG,
          sugarG: planItem.sugarG,
          sodiumMg: planItem.sodiumMg,
          vitaminCMg: 0,
          calciumMg: 0,
          ironMg: 0,
          potassiumMg: 0,
          source: "meal_plan",
        },
        spendReason: `Overspend from planned meal: ${planItem.name}`,
        refundReason: `Refund from planned meal: ${planItem.name}`,
      });

      await tx.mealPlanItem.update({
        where: { id: itemId },
        data: { loggedMealId: result.meal.id },
      });

      return { success: true, meal: result.meal };
    });
  });
}
