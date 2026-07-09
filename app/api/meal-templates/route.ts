import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

export async function GET(req: NextRequest) {
  void req;
  return handleRoute("Failed to fetch meal templates", async () => {
    const userId = await requireUserId();

    const templates = await prisma.mealTemplate.findMany({
      where: { userId },
      orderBy: [{ useCount: "desc" }, { name: "asc" }],
    });

    return { success: true, templates };
  });
}

export async function POST(req: NextRequest) {
  return handleRoute("Failed to create meal template", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { name, mealType, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, vitaminCMg, calciumMg, ironMg, potassiumMg, servingSizeG } = body;

    if (!name || !calories || calories < 0) {
      throw new ApiError(400, "Invalid template data");
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

    return { success: true, template };
  });
}

export async function PUT(req: NextRequest) {
  return handleRoute("Failed to update meal template", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      throw new ApiError(400, "Missing template ID");
    }

    const existing = await prisma.mealTemplate.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, "Template not found");
    }

    const template = await prisma.mealTemplate.update({
      where: { id },
      data,
    });

    return { success: true, template };
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute("Failed to delete meal template", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new ApiError(400, "Missing template ID");
    }

    const existing = await prisma.mealTemplate.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, "Template not found");
    }

    await prisma.mealTemplate.delete({ where: { id } });

    return { success: true };
  });
}
