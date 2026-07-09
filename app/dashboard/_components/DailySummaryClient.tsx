"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DailySummary } from "./DailySummary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSizeG?: number | null;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  vitaminCMg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
  loggedAt: Date;
}

interface DailySummaryClientProps {
  targetCalories: number;
  initialConsumedCalories: number;
  initialMeals: Meal[];
  initialWaterIntake: number;
  waterTarget: number;
  userId: string;
  macroTargets?: {
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  bankBalance?: number;
  currentStreak?: number;
  maxStreak?: number;
}

const PORTION_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function DailySummaryClient({
  targetCalories,
  initialConsumedCalories,
  initialMeals,
  initialWaterIntake,
  waterTarget,
  userId,
  macroTargets,
  bankBalance: initialBankBalance = 0,
  currentStreak,
  maxStreak,
}: DailySummaryClientProps) {
  const router = useRouter();

  // Match QuickLogClient's test-bypass pattern: header only exists in non-prod.
  const jsonHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.NODE_ENV !== "production") {
      headers["X-Test-User-Id"] = userId;
    }
    return headers;
  };

  const [waterIntake, setWaterIntake] = useState(initialWaterIntake);
  const [meals, setMeals] = useState(initialMeals);
  const [consumedCalories, setConsumedCalories] = useState(initialConsumedCalories);
  const [currentBankBalance, setCurrentBankBalance] = useState(initialBankBalance);
  const [isAddingWater, setIsAddingWater] = useState(false);

  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const [editName, setEditName] = useState("");
  const [editServingSizeG, setEditServingSizeG] = useState("");
  const [multiplier, setMultiplier] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCurrentBankBalance(initialBankBalance);
  }, [initialBankBalance]);

  const handleAddWater = async () => {
    if (isAddingWater) return;
    setIsAddingWater(true);
    try {
      const response = await fetch("/api/water", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ amountMl: 250 }),
      });
      if (response.ok) {
        const data = await response.json();
        setWaterIntake(data.waterMl);
      }
    } catch (error) {
      console.error("Error adding water:", error);
    } finally {
      setIsAddingWater(false);
    }
  };

  const handleEditMeal = (meal: Meal) => {
    setEditMeal(meal);
    setEditName(meal.name);
    setEditServingSizeG(meal.servingSizeG?.toString() ?? "");
    setMultiplier(1);
  };

  const handleSaveMeal = async () => {
    if (!editMeal) return;
    setIsSaving(true);
    try {
      const scale = (v: number | undefined) => Math.round(((v ?? 0) * multiplier) * 10) / 10;
      const newCalories = Math.round(editMeal.calories * multiplier);
      const servingSizeG = editServingSizeG.trim() ? Number(editServingSizeG) : null;

      if (servingSizeG !== null && (!Number.isFinite(servingSizeG) || servingSizeG < 0)) {
        return;
      }

      const response = await fetch(`/api/meals/${editMeal.id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({
          name: editName.trim() || editMeal.name,
          calories: newCalories,
          proteinG: scale(editMeal.protein),
          carbsG: scale(editMeal.carbs),
          fatG: scale(editMeal.fat),
          fiberG: scale(editMeal.fiberG),
          sugarG: scale(editMeal.sugarG),
          sodiumMg: scale(editMeal.sodiumMg),
          vitaminCMg: scale(editMeal.vitaminCMg),
          calciumMg: scale(editMeal.calciumMg),
          ironMg: scale(editMeal.ironMg),
          potassiumMg: scale(editMeal.potassiumMg),
          servingSizeG,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const calorieDiff = newCalories - editMeal.calories;
        setMeals((prev) =>
          prev.map((m) =>
            m.id === editMeal.id
              ? {
                  ...m,
                  name: editName.trim() || m.name,
                  calories: newCalories,
                  protein: scale(m.protein),
                  carbs: scale(m.carbs),
                  fat: scale(m.fat),
                  fiberG: scale(m.fiberG),
                  sugarG: scale(m.sugarG),
                  sodiumMg: scale(m.sodiumMg),
                  vitaminCMg: scale(m.vitaminCMg),
                  calciumMg: scale(m.calciumMg),
                  ironMg: scale(m.ironMg),
                  potassiumMg: scale(m.potassiumMg),
                  servingSizeG,
                }
              : m
          )
        );
        setConsumedCalories((prev) => prev + calorieDiff);
        if (typeof data.bankBalance === "number") {
          setCurrentBankBalance(data.bankBalance);
        }
        setEditMeal(null);
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating meal:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: "DELETE",
        headers: jsonHeaders(),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setMeals((prev) => prev.filter((m) => m.id !== mealId));
        setConsumedCalories((prev) => prev - meal.calories);
        if (typeof data.bankBalance === "number") {
          setCurrentBankBalance(data.bankBalance);
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting meal:", error);
    }
  };

  const newCalories = editMeal ? Math.round(editMeal.calories * multiplier) : 0;
  const hasMealChanges = editMeal
    ? multiplier !== 1 ||
      editName.trim() !== editMeal.name ||
      editServingSizeG !== (editMeal.servingSizeG?.toString() ?? "")
    : false;

  return (
    <div className="space-y-4">
      <DailySummary
        targetCalories={targetCalories}
        consumedCalories={consumedCalories}
        meals={meals}
        waterIntake={waterIntake}
        waterTarget={waterTarget}
        onAddMeal={() => router.refresh()}
        onAddWater={handleAddWater}
        onEditMeal={handleEditMeal}
        onDeleteMeal={handleDeleteMeal}
        macroTargets={macroTargets}
        bankBalance={currentBankBalance}
        currentStreak={currentStreak}
        maxStreak={maxStreak}
        userId={userId}
      />
      <Dialog open={!!editMeal} onOpenChange={(open) => !open && setEditMeal(null)}>
        <DialogContent className="rounded-sm sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-[-0.02em] text-foreground">
              Edit Meal
            </DialogTitle>
          </DialogHeader>
          {editMeal && (
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label className="smallcaps">Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Meal name"
                  className="rounded-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="smallcaps">Portion size</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PORTION_PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setMultiplier(p)}
                      className={
                        multiplier === p
                          ? "num rounded-sm border px-3 py-1 text-xs font-semibold"
                          : "num rounded-sm border border-input px-3 py-1 text-xs text-foreground transition-colors hover:border-[var(--brass)]"
                      }
                      style={
                        multiplier === p
                          ? { borderColor: "var(--brass)", color: "var(--brass-ink)", background: "color-mix(in srgb, var(--brass) 12%, transparent)" }
                          : undefined
                      }
                    >
                      &times;{p}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={multiplier}
                  onChange={(e) => setMultiplier(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  className="num w-full rounded-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="smallcaps">Serving size (g)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={editServingSizeG}
                  onChange={(e) => setEditServingSizeG(e.target.value)}
                  placeholder="Optional"
                  className="num rounded-sm"
                />
              </div>

              <div className="surface-raised px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="smallcaps">Calories</span>
                  <span className="num font-semibold text-foreground">
                    {newCalories} kcal
                    {multiplier !== 1 && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        (was {editMeal.calories})
                      </span>
                    )}
                  </span>
                </div>
                {(editMeal.protein || editMeal.carbs || editMeal.fat) && (
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span className="smallcaps">Macros</span>
                    <span className="num">
                      P: {Math.round((editMeal.protein ?? 0) * multiplier)}g &middot;{" "}
                      C: {Math.round((editMeal.carbs ?? 0) * multiplier)}g &middot;{" "}
                      F: {Math.round((editMeal.fat ?? 0) * multiplier)}g
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-ghost" onClick={() => setEditMeal(null)}>
                  Cancel
                </button>
                <button
                  className="btn-primary disabled:opacity-50"
                  onClick={handleSaveMeal}
                  disabled={isSaving || !hasMealChanges}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
