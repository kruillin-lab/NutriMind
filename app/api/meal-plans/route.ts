import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

export async function GET(req: NextRequest) {
  return handleRoute("Failed to fetch meal plans", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const includeItems = searchParams.get("includeItems") === "true";

    let where: { userId: string; startDate?: { lte: Date }; endDate?: { gte: Date } } = { userId };

    if (date) {
      const targetDate = new Date(date);
      where = {
        userId,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      };
    }

    const plans = await prisma.mealPlan.findMany({
      where,
      include: includeItems
        ? {
            items: {
              orderBy: [{ plannedDate: "asc" }, { mealType: "asc" }],
            },
          }
        : undefined,
      orderBy: { startDate: "desc" },
    });

    return { success: true, plans };
  });
}

export async function POST(req: NextRequest) {
  return handleRoute("Failed to create meal plan", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { name, description, startDate, endDate, items, isTemplate } = body;

    if (!name || !startDate || !endDate) {
      throw new ApiError(400, "Missing required fields: name, startDate, endDate");
    }

    const plan = await prisma.mealPlan.create({
      data: {
        userId,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isTemplate: isTemplate || false,
        items: {
          create:
            items?.map((item: { plannedDate: string; mealType?: string; name: string; description?: string; calories?: number; proteinG?: number; carbsG?: number; fatG?: number; fiberG?: number; sugarG?: number; sodiumMg?: number; mealTemplateId?: string }) => ({
              plannedDate: new Date(item.plannedDate),
              mealType: item.mealType || "OTHER",
              name: item.name,
              description: item.description,
              calories: item.calories || 0,
              proteinG: item.proteinG || 0,
              carbsG: item.carbsG || 0,
              fatG: item.fatG || 0,
              fiberG: item.fiberG || 0,
              sugarG: item.sugarG || 0,
              sodiumMg: item.sodiumMg || 0,
              mealTemplateId: item.mealTemplateId,
            })) || [],
        },
      },
      include: {
        items: {
          orderBy: [{ plannedDate: "asc" }, { mealType: "asc" }],
        },
      },
    });

    return { success: true, plan };
  });
}

export async function PUT(req: NextRequest) {
  return handleRoute("Failed to update meal plan", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      throw new ApiError(400, "Missing plan ID");
    }

    const existing = await prisma.mealPlan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, "Plan not found");
    }

    const { items, ...planData } = data;
    void items;

    const plan = await prisma.mealPlan.update({
      where: { id },
      data: {
        ...planData,
        startDate: planData.startDate
          ? new Date(planData.startDate)
          : undefined,
        endDate: planData.endDate ? new Date(planData.endDate) : undefined,
      },
      include: {
        items: {
          orderBy: [{ plannedDate: "asc" }, { mealType: "asc" }],
        },
      },
    });

    return { success: true, plan };
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute("Failed to delete meal plan", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new ApiError(400, "Missing plan ID");
    }

    const existing = await prisma.mealPlan.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, "Plan not found");
    }

    await prisma.mealPlan.delete({ where: { id } });

    return { success: true };
  });
}
