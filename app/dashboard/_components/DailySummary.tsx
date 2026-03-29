"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, Flame, Droplets, Dumbbell, Plus } from "lucide-react";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  loggedAt: Date;
}

interface DailySummaryProps {
  targetCalories: number;
  consumedCalories: number;
  meals: Meal[];
  waterIntake: number;
  waterTarget: number;
  onAddMeal: () => void;
  onAddWater: () => void;
}

export function DailySummary({
  targetCalories,
  consumedCalories,
  meals,
  waterIntake,
  waterTarget,
  onAddMeal,
  onAddWater,
}: DailySummaryProps) {
  const remainingCalories = targetCalories - consumedCalories;
  const calorieProgress = Math.min(
    (consumedCalories / targetCalories) * 100,
    100
  );
  const waterProgress = Math.min((waterIntake / waterTarget) * 100, 100);

  const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Flame className="h-5 w-5 text-orange-500" />
          Today's Summary
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Calorie Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-3xl font-bold">{consumedCalories}</p>
              <p className="text-sm text-muted-foreground">consumed</p>
            </div>
            <div className="text-right">
              <p
                className={`text-3xl font-bold ${
                  remainingCalories >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {remainingCalories}
              </p>
              <p className="text-sm text-muted-foreground">
                {remainingCalories >= 0 ? "remaining" : "over budget"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Progress
              value={calorieProgress}
              className="h-3 [&>div]:bg-orange-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target: {targetCalories} kcal</span>
              <span>{Math.round(calorieProgress)}%</span>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold text-blue-600">
              {Math.round(totalProtein)}g
            </p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-yellow-600">
              {Math.round(totalCarbs)}g
            </p>
            <p className="text-xs text-muted-foreground">Carbs</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600">
              {Math.round(totalFat)}g
            </p>
            <p className="text-xs text-muted-foreground">Fat</p>
          </div>
        </div>

        {/* Water Tracker */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Water</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {waterIntake}/{waterTarget} ml
            </span>
          </div>
          <Progress
            value={waterProgress}
            className="h-2 [&>div]:bg-blue-500"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onAddWater}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add 250ml
          </Button>
        </div>

        {/* Recent Meals */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <span className="font-medium">Recent Meals</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onAddMeal}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {meals.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No meals logged today</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={onAddMeal}>
                Log your first meal
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {meals.slice(0, 5).map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{meal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(meal.loggedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="font-mono">
                      {meal.calories} kcal
                    </Badge>
                    {(meal.protein || meal.carbs || meal.fat) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        P: {meal.protein || 0}g · C: {meal.carbs || 0}g · F:{" "}
                        {meal.fat || 0}g
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
