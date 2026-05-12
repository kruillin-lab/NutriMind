import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(req: NextRequest) {
  void req;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.mealTemplate.findMany({
      where: { userId },
      orderBy: [{ useCount: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error("Error fetching meal templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch meal templates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  void req;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, mealType, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, vitaminCMg, calciumMg, ironMg, potassiumMg, servingSizeG } = body;

    if (!name || !calories || calories < 0) {
      return NextResponse.json(
        { error: "Invalid template data" },
        { status: 400 }
      );
    }

    const template = await prisma.mealTemplate.create({
      data: {
        userId,
        name,
        mealType: mealType || "OTHER",
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
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error("Error creating meal template:", error);
    return NextResponse.json(
      { error: "Failed to create meal template" },
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
        { error: "Missing template ID" },
        { status: 400 }
      );
    }

    const existing = await prisma.mealTemplate.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const template = await prisma.mealTemplate.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error("Error updating meal template:", error);
    return NextResponse.json(
      { error: "Failed to update meal template" },
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
        { error: "Missing template ID" },
        { status: 400 }
      );
    }

    const existing = await prisma.mealTemplate.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.mealTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal template:", error);
    return NextResponse.json(
      { error: "Failed to delete meal template" },
      { status: 500 }
    );
  }
}
