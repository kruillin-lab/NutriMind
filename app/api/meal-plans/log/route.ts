import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { formatLocalDateKey } from "@/lib/date-utils";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, date } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "Missing required field: itemId" },
        { status: 400 }
      );
    }

    const planItem = await prisma.mealPlanItem.findUnique({
      where: { id: itemId },
      include: { mealPlan: true },
    });

    if (!planItem || planItem.mealPlan.userId !== userId) {
      return NextResponse.json(
        { error: "Meal plan item not found" },
        { status: 404 }
      );
    }

    if (planItem.isLogged) {
      return NextResponse.json(
        { error: "This meal has already been logged" },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true, meal });
  } catch (error) {
    console.error("Error logging planned meal:", error);
    return NextResponse.json(
      { error: "Failed to log planned meal" },
      { status: 500 }
    );
  }
}
