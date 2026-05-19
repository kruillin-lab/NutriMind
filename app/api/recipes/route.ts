import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export interface RecipeIngredient {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

function totals(ingredients: RecipeIngredient[]) {
  return ingredients.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      proteinG: acc.proteinG + i.proteinG,
      carbsG: acc.carbsG + i.carbsG,
      fatG: acc.fatG + i.fatG,
      fiberG: acc.fiberG + i.fiberG,
      sugarG: acc.sugarG + i.sugarG,
      sodiumMg: acc.sodiumMg + i.sodiumMg,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 }
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    orderBy: [{ useCount: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ success: true, recipes });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, servings, ingredients } = body as {
    name: string;
    description?: string;
    servings?: number;
    ingredients: RecipeIngredient[];
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!Array.isArray(ingredients) || ingredients.length === 0)
    return NextResponse.json({ error: "At least one ingredient required" }, { status: 400 });

  const t = totals(ingredients);
  const recipe = await prisma.recipe.create({
    data: {
      userId: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      servings: Math.max(1, servings ?? 1),
      ingredients: JSON.stringify(ingredients),
      ...t,
    },
  });

  return NextResponse.json({ success: true, recipe });
}
