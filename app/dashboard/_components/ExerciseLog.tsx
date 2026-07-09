"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Flame, Clock, Plus } from "lucide-react";

const EXERCISE_PRESETS = [
  { name: "Walking (30 min)", minutes: 30, calories: 150 },
  { name: "Running (30 min)", minutes: 30, calories: 300 },
  { name: "Cycling (30 min)", minutes: 30, calories: 250 },
  { name: "Swimming (30 min)", minutes: 30, calories: 280 },
  { name: "Weight Training (30 min)", minutes: 30, calories: 200 },
  { name: "Yoga (30 min)", minutes: 30, calories: 120 },
  { name: "HIIT (20 min)", minutes: 20, calories: 250 },
  { name: "Dancing (30 min)", minutes: 30, calories: 200 },
];

interface ExerciseLogProps {
  initialExerciseMinutes?: number;
  initialCaloriesBurned?: number;
}

export function ExerciseLog({
  initialExerciseMinutes = 0,
  initialCaloriesBurned = 0,
}: ExerciseLogProps) {
  const [exerciseMinutes, setExerciseMinutes] = useState(initialExerciseMinutes);
  const [caloriesBurned, setCaloriesBurned] = useState(initialCaloriesBurned);
  const [isLogging, setIsLogging] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");

  const handlePresetSelect = (presetName: string | null) => {
    if (!presetName) return;
    setSelectedPreset(presetName);
    const preset = EXERCISE_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setCustomMinutes(preset.minutes.toString());
      setCustomCalories(preset.calories.toString());
    }
  };

  const handleLogExercise = async () => {
    const minutes = parseInt(customMinutes, 10);
    const calories = parseInt(customCalories, 10);

    if (!minutes || minutes <= 0) return;

    setIsLogging(true);
    try {
      const response = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseMinutes: minutes,
          caloriesBurned: calories || 0,
          description: selectedPreset || "Custom exercise",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExerciseMinutes(data.exerciseMinutes);
        setCaloriesBurned(data.caloriesBurned);
        setCustomMinutes("");
        setCustomCalories("");
        setSelectedPreset("");
      }
    } catch (error) {
      console.error("Error logging exercise:", error);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <section className="surface overflow-hidden">
      <div className="foil" />
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Dumbbell className="h-4 w-4" style={{ color: "var(--brass)" }} />
        <h3 className="smallcaps">Exercise Log</h3>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Today's Summary */}
        {(exerciseMinutes > 0 || caloriesBurned > 0) && (
          <div className="grid grid-cols-2 gap-3 rounded-sm border border-border bg-secondary p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="num-display text-lg text-foreground">{exerciseMinutes} min</p>
                <p className="smallcaps">Total today</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4" style={{ color: "var(--brass)" }} />
              <div>
                <p className="num-display text-lg text-foreground">{caloriesBurned} kcal</p>
                <p className="smallcaps">Burned today</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-2">
          <Label className="smallcaps">Quick Add</Label>
          <div className="grid grid-cols-2 gap-2">
            {EXERCISE_PRESETS.slice(0, 4).map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset.name)}
                className="btn-ghost h-auto justify-start px-3 py-2 text-left normal-case tracking-normal"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">{preset.name.split(" (")[0]}</p>
                  <p className="num text-xs text-muted-foreground">
                    {preset.minutes}min &middot; {preset.calories}kcal
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Entry */}
        <div className="space-y-3 border-t border-border pt-4">
          <Label className="smallcaps">Custom Entry</Label>

          <div>
            <Label htmlFor="exercise-type" className="smallcaps">
              Exercise Type
            </Label>
            <Select value={selectedPreset} onValueChange={handlePresetSelect}>
              <SelectTrigger id="exercise-type" className="rounded-sm">
                <SelectValue placeholder="Select exercise type" />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_PRESETS.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="minutes" className="smallcaps">
                Duration (minutes)
              </Label>
              <Input
                id="minutes"
                type="number"
                placeholder="30"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                min="1"
                className="num rounded-sm"
              />
            </div>
            <div>
              <Label htmlFor="calories" className="smallcaps">
                Calories burned
              </Label>
              <Input
                id="calories"
                type="number"
                placeholder="150"
                value={customCalories}
                onChange={(e) => setCustomCalories(e.target.value)}
                min="0"
                className="num rounded-sm"
              />
            </div>
          </div>

          <button
            onClick={handleLogExercise}
            disabled={isLogging || !customMinutes}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLogging ? "Logging..." : "Log Exercise"}
          </button>
        </div>
      </div>
    </section>
  );
}
