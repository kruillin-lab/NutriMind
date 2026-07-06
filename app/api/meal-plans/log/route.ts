import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { formatLocalDateKey } from "@/lib/date-utils";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

export async function POST(req: NextRequest) {
  return handleRoute("Failed to log planned meal", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { itemId, date } = body;

    if (!itemId) {
      throw new ApiError(400, "Missing required field: itemId");
    }

    const planItem = await prisma.mealPlanItem.findUnique({
      where: { id: itemId },
      include: { mealPlan: true },
    });

    if (!planItem || planItem.mealPlan.userId !== userId) {
      throw new ApiError(404, "Meal plan item not found");
    }

    if (planItem.isLogged) {
      throw new ApiError(400, "This meal has already been logged");
    }

    const logDate = date
      ? new Date(date)
      : new Date();
    const dateStr = formatLocalDateKey(logDate);

    let dailyLog = await prisma.dailyLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: dateStr,
        },
      },
    });

    if (!dailyLog) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { calorieBank: true },
      });

      dailyLog = await prisma.dailyLog.create({
        data: {
          userId,
          date: dateStr,
          calorieTarget: user?.calorieBank?.dailyTarget || 2000,
        },
      });
    }

    const meal = await prisma.meal.create({
      data: {
        dailyLogId: dailyLog.id,
        name: planItem.name,
        mealType: planItem.mealType,
        calories: planItem.calories,
        proteinG: planItem.proteinG,
        carbsG: planItem.carbsG,
        fatG: planItem.fatG,
        fiberG: planItem.fiberG,
        sugarG: planItem.sugarG,
        sodiumMg: planItem.sodiumMg,
        source: "meal_plan",
      },
    });

    await prisma.mealPlanItem.update({
      where: { id: itemId },
      data: {
        isLogged: true,
        loggedMealId: meal.id,
      },
    });

    await prisma.dailyLog.update({
      where: { id: dailyLog.id },
      data: {
        caloriesConsumed: { increment: planItem.calories },
        proteinG: { increment: planItem.proteinG },
        carbsG: { increment: planItem.carbsG },
        fatG: { increment: planItem.fatG },
        fiberG: { increment: planItem.fiberG },
      },
    });

    return { success: true, meal };
  });
}
