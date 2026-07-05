"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Dumbbell className="h-5 w-5 text-[#FFB000]" />
          Exercise Log
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Today's Summary */}
        {(exerciseMinutes > 0 || caloriesBurned > 0) && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#FFB000]/10 rounded-lg border border-[#FFB000]/30">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#FFB000]" />
              <div>
                <p className="text-lg font-bold text-[#B87A00]">{exerciseMinutes} min</p>
                <p className="text-xs text-[#B87A00]">Total today</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#FF5A3D]" />
              <div>
                <p className="text-lg font-bold text-[#FF5A3D]">{caloriesBurned} kcal</p>
                <p className="text-xs text-[#FF5A3D]/80">Burned today</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Add</Label>
          <div className="grid grid-cols-2 gap-2">
            {EXERCISE_PRESETS.slice(0, 4).map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="justify-start text-xs h-auto py-2 px-3"
                onClick={() => handlePresetSelect(preset.name)}
              >
                <div className="text-left">
                  <p className="font-medium">{preset.name.split(" (")[0]}</p>
                  <p className="text-muted-foreground">
                    {preset.minutes}min · {preset.calories}kcal
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Entry */}
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Custom Entry</Label>

          <div>
            <Label htmlFor="exercise-type" className="text-xs text-muted-foreground">
              Exercise Type
            </Label>
            <Select value={selectedPreset} onValueChange={handlePresetSelect}>
              <SelectTrigger id="exercise-type">
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
              <Label htmlFor="minutes" className="text-xs text-muted-foreground">
                Duration (minutes)
              </Label>
              <Input
                id="minutes"
                type="number"
                placeholder="30"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="calories" className="text-xs text-muted-foreground">
                Calories burned
              </Label>
              <Input
                id="calories"
                type="number"
                placeholder="150"
                value={customCalories}
                onChange={(e) => setCustomCalories(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <Button
            onClick={handleLogExercise}
            disabled={isLogging || !customMinutes}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLogging ? "Logging..." : "Log Exercise"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
