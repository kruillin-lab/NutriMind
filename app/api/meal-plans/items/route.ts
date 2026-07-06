import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

export async function POST(req: NextRequest) {
  return handleRoute("Failed to add meal plan items", async () => {
    const userId = await requireUserId();

    interface MealPlanItemInput {
      plannedDate: string;
      mealType?: string;
      name: string;
      description?: string;
      calories?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
      fiberG?: number;
      sugarG?: number;
      sodiumMg?: number;
      mealTemplateId?: string;
    }

    const body = await req.json();
    const mealPlanId = body.mealPlanId as string;
    const items = body.items as MealPlanItemInput[];

    if (!mealPlanId || !items || !Array.isArray(items)) {
      throw new ApiError(400, "Missing required fields: mealPlanId, items");
    }

    const plan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
    });

    if (!plan || plan.userId !== userId) {
      throw new ApiError(404, "Plan not found");
    }

    const createdItems = await prisma.mealPlanItem.createMany({
      data: items.map((item: MealPlanItemInput) => ({
        mealPlanId,
        plannedDate: new Date(item.plannedDate),
        mealType: item.mealType || "OTHER",
        name: item.name,
        description: item.description ?? null,
        calories: item.calories || 0,
        proteinG: item.proteinG || 0,
        carbsG: item.carbsG || 0,
        fatG: item.fatG || 0,
        fiberG: item.fiberG || 0,
        sugarG: item.sugarG || 0,
        sodiumMg: item.sodiumMg || 0,
        mealTemplateId: item.mealTemplateId ?? null,
      })) as Prisma.MealPlanItemCreateManyInput[],
    });

    return { success: true, count: createdItems.count };
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute("Failed to delete meal plan item", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new ApiError(400, "Missing item ID");
    }

    const item = await prisma.mealPlanItem.findUnique({
      where: { id },
      include: { mealPlan: true },
    });

    if (!item || item.mealPlan.userId !== userId) {
      throw new ApiError(404, "Item not found");
    }

    await prisma.mealPlanItem.delete({ where: { id } });

    return { success: true };
  });
}
