import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { RecipeIngredient } from "../route";

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

async function getRecipeForUser(id: string, clerkId: string) {
  const user = await prisma.user.findUnique({ where: { id: clerkId } });
  if (!user) return null;
  return prisma.recipe.findFirst({ where: { id, userId: user.id } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipe = await getRecipeForUser(id, userId);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, servings, ingredients } = body as {
    name?: string;
    description?: string;
    servings?: number;
    ingredients?: RecipeIngredient[];
  };

  const ingredientList: RecipeIngredient[] = ingredients ?? JSON.parse(recipe.ingredients);
  const t = totals(ingredientList);

  const updated = await prisma.recipe.update({
    where: { id },
    data: {
      name: name?.trim() ?? recipe.name,
      description: description !== undefined ? description?.trim() || null : recipe.description,
      servings: servings ? Math.max(1, servings) : recipe.servings,
      ingredients: JSON.stringify(ingredientList),
      ...t,
    },
  });

  return NextResponse.json({ success: true, recipe: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipe = await getRecipeForUser(id, userId);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// Log a recipe as a meal (per-serving macros)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipe = await getRecipeForUser(id, userId);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { mealType?: string; servings?: number };
  const servingCount = Math.max(0.25, body.servings ?? 1);
  const scale = servingCount / recipe.servings;

  const mealRes = await fetch(new URL("/api/meals", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
    body: JSON.stringify({
      name: recipe.servings === 1 || servingCount === recipe.servings
        ? recipe.name
        : `${recipe.name} (${servingCount} serving${servingCount !== 1 ? "s" : ""})`,
      calories: Math.round(recipe.calories * scale),
      proteinG: Math.round(recipe.proteinG * scale * 10) / 10,
      carbsG: Math.round(recipe.carbsG * scale * 10) / 10,
      fatG: Math.round(recipe.fatG * scale * 10) / 10,
      fiberG: Math.round(recipe.fiberG * scale * 10) / 10,
      sugarG: Math.round(recipe.sugarG * scale * 10) / 10,
      sodiumMg: Math.round(recipe.sodiumMg * scale),
      mealType: body.mealType ?? "OTHER",
      source: "recipe",
    }),
  });

  if (!mealRes.ok) {
    const d = await mealRes.json().catch(() => ({}));
    return NextResponse.json({ error: d.error ?? "Failed to log meal" }, { status: mealRes.status });
  }

  // Bump useCount
  await prisma.recipe.update({ where: { id }, data: { useCount: { increment: 1 }, lastUsedAt: new Date() } });

  return NextResponse.json({ success: true });
}
