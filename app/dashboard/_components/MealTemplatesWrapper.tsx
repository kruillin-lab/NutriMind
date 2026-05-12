"use client";

import { MealTemplates } from "./MealTemplates";

interface MealTemplate {
  id: string;
  name: string;
  mealType: string;
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
  useCount: number;
  lastUsedAt: string | null;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function scaleValue(value: number | null | undefined, quantity: number) {
  return Math.round(((value ?? 0) * quantity) * 10) / 10;
}

export function MealTemplatesWrapper() {
  const handleUseTemplate = async (template: MealTemplate, quantity: number) => {
    const name = quantity === 1 ? template.name : `${template.name} x${formatQuantity(quantity)}`;

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          calories: scaleValue(template.calories, quantity),
          proteinG: scaleValue(template.proteinG, quantity),
          carbsG: scaleValue(template.carbsG, quantity),
          fatG: scaleValue(template.fatG, quantity),
          fiberG: scaleValue(template.fiberG, quantity),
          sugarG: scaleValue(template.sugarG, quantity),
          sodiumMg: scaleValue(template.sodiumMg, quantity),
          vitaminCMg: scaleValue(template.vitaminCMg, quantity),
          calciumMg: scaleValue(template.calciumMg, quantity),
          ironMg: scaleValue(template.ironMg, quantity),
          potassiumMg: scaleValue(template.potassiumMg, quantity),
          servingSizeG: template.servingSizeG == null ? null : scaleValue(template.servingSizeG, quantity),
          mealType: template.mealType,
        }),
      });

      if (response.ok) {
        await fetch(`/api/meal-templates`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: template.id,
            useCount: template.useCount + 1,
            lastUsedAt: new Date().toISOString(),
          }),
        });

        window.location.reload();
      }
    } catch (error) {
      console.error("Error logging template meal:", error);
    }
  };

  return <MealTemplates onUseTemplate={handleUseTemplate} />;
}
