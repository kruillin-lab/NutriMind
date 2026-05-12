import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    return NextResponse.json({ success: true, plans });
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch meal plans" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, startDate, endDate, items, isTemplate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields: name, startDate, endDate" },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Error creating meal plan:", error);
    return NextResponse.json(
      { error: "Failed to create meal plan" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing plan ID" },
        { status: 400 }
      );
    }

    const existing = await prisma.mealPlan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
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

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Error updating meal plan:", error);
    return NextResponse.json(
      { error: "Failed to update meal plan" },
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
        { error: "Missing plan ID" },
        { status: 400 }
      );
    }

    const existing = await prisma.mealPlan.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    await prisma.mealPlan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    return NextResponse.json(
      { error: "Failed to delete meal plan" },
      { status: 500 }
    );
  }
}
