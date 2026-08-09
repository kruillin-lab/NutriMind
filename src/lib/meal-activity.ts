import type { Meal as PrismaMeal } from "@/src/generated/prisma/client";

export interface MealActivityItem {
  id: string;
  name: string;
  mealType: PrismaMeal["mealType"];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  vitaminCMg: number;
  calciumMg: number;
  ironMg: number;
  potassiumMg: number;
  servingSizeG: number | null;
  source: "AI_PARSED" | "MANUAL_ENTRY";
  aiConfidence: number | null;
  createdAt: string;
}

export function toMealActivityItem(meal: PrismaMeal): MealActivityItem {
  const isAiParsed = meal.aiConfidence !== null || meal.source.toLowerCase().includes("ai");

  return {
    id: meal.id,
    name: meal.name,
    mealType: meal.mealType,
    calories: meal.calories,
    proteinG: meal.proteinG,
    carbsG: meal.carbsG,
    fatG: meal.fatG,
    fiberG: meal.fiberG,
    sugarG: meal.sugarG,
    sodiumMg: meal.sodiumMg,
    vitaminCMg: meal.vitaminCMg,
    calciumMg: meal.calciumMg,
    ironMg: meal.ironMg,
    potassiumMg: meal.potassiumMg,
    servingSizeG: meal.servingSizeG,
    source: isAiParsed ? "AI_PARSED" : "MANUAL_ENTRY",
    aiConfidence: meal.aiConfidence,
    createdAt: meal.createdAt.toISOString(),
  };
}
