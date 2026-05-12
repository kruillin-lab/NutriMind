import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json(
        { error: "Missing required fields: mealPlanId, items" },
        { status: 400 }
      );
    }

    const plan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
    });

    if (!plan || plan.userId !== userId) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
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

    return NextResponse.json({ success: true, count: createdItems.count });
  } catch (error) {
    console.error("Error adding meal plan items:", error);
    return NextResponse.json(
      { error: "Failed to add meal plan items" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing item ID" },
        { status: 400 }
      );
    }

    const item = await prisma.mealPlanItem.findUnique({
      where: { id },
      include: { mealPlan: true },
    });

    if (!item || item.mealPlan.userId !== userId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.mealPlanItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal plan item:", error);
    return NextResponse.json(
      { error: "Failed to delete meal plan item" },
      { status: 500 }
    );
  }
}
