"use client";

import { useState } from "react";
import { DailySummary } from "./DailySummary";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  loggedAt: Date;
}

interface DailySummaryClientProps {
  targetCalories: number;
  initialConsumedCalories: number;
  initialMeals: Meal[];
  initialWaterIntake: number;
  waterTarget: number;
  userId: string;
}

export function DailySummaryClient({
  targetCalories,
  initialConsumedCalories,
  initialMeals,
  initialWaterIntake,
  waterTarget,
  userId,
}: DailySummaryClientProps) {
  const [waterIntake, setWaterIntake] = useState(initialWaterIntake);
  const [meals, setMeals] = useState(initialMeals);
  const [consumedCalories, setConsumedCalories] = useState(initialConsumedCalories);
  const [isAddingWater, setIsAddingWater] = useState(false);

  const handleAddWater = async () => {
    if (isAddingWater) return;
    
    setIsAddingWater(true);
    try {
      const response = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl: 250 }),
      });

      if (response.ok) {
        const data = await response.json();
        setWaterIntake(data.totalWaterMl);
      } else {
        console.error("Failed to add water");
      }
    } catch (error) {
      console.error("Error adding water:", error);
    } finally {
      setIsAddingWater(false);
    }
  };

  const handleAddMeal = () => {
    // For now, just refresh the page to get updated data
    // In the future, this could open a modal or navigate to a meal logging page
    window.location.reload();
  };

  return (
    <DailySummary
      targetCalories={targetCalories}
      consumedCalories={consumedCalories}
      meals={meals}
      waterIntake={waterIntake}
      waterTarget={waterTarget}
      onAddMeal={handleAddMeal}
      onAddWater={handleAddWater}
    />
  );
}
