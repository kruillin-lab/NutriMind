"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Utensils,
  Flame,
  Droplets,
  Plus,
  ChevronDown,
  ChevronUp,
  Leaf,
  Pencil,
  Trash2,
  Copy,
  Save,
} from "lucide-react";
import { CopyMealDialog } from "./CopyMealDialog";
import { SaveAsTemplateDialog } from "./SaveAsTemplateDialog";

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
  mealType?: string;
  loggedAt: Date;
}

interface MicroBarProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  isLimit: boolean;
}

function MicroBar({ label, value, target, unit, isLimit }: MicroBarProps) {
  const pct = target > 0 ? (value / target) * 100 : 0;
  const fill = isLimit
    ? pct >= 100 ? "fill-rose" : pct >= 80 ? "fill-amber" : "fill-green"
    : pct >= 80 ? "fill-green" : pct >= 50 ? "fill-amber" : "fill-rose";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#6B5738]">{label}</span>
        <span className="text-[#8A7350] tabular-nums">{Math.round(value)}/{target}{unit}</span>
      </div>
      <div className="track">
        <div className={fill} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

interface DailySummaryProps {
  targetCalories: number;
  consumedCalories: number;
  meals: Meal[];
  waterIntake: number;
  waterTarget: number;
  onAddMeal: () => void;
  onAddWater: () => void;
  onEditMeal?: (meal: Meal) => void;
  onDeleteMeal?: (id: string) => void;
  macroTargets?: {
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  bankBalance?: number;
}

export function DailySummary({
  targetCalories,
  consumedCalories,
  meals,
  waterIntake,
  waterTarget,
  onAddMeal,
  onAddWater,
  onEditMeal,
  onDeleteMeal,
  macroTargets,
  bankBalance = 0,
}: DailySummaryProps) {
  const remaining = targetCalories - consumedCalories;
  const calPct = Math.min((consumedCalories / targetCalories) * 100, 100);
  const waterPct = Math.min((waterIntake / waterTarget) * 100, 100);
  const isOver = remaining < 0;

  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs   = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat     = meals.reduce((s, m) => s + (m.fat || 0), 0);
  const totalFiber   = meals.reduce((s, m) => s + (m.fiberG || 0), 0);
  const totalSugar   = meals.reduce((s, m) => s + (m.sugarG || 0), 0);
  const totalSodium  = meals.reduce((s, m) => s + (m.sodiumMg || 0), 0);
  const totalVitC    = meals.reduce((s, m) => s + (m.vitaminCMg || 0), 0);
  const totalCalcium = meals.reduce((s, m) => s + (m.calciumMg || 0), 0);
  const totalIron    = meals.reduce((s, m) => s + (m.ironMg || 0), 0);
  const totalPotassium = meals.reduce((s, m) => s + (m.potassiumMg || 0), 0);

  const hasMicro = totalFiber > 0 || totalSugar > 0 || totalSodium > 0 ||
    totalVitC > 0 || totalCalcium > 0 || totalIron > 0 || totalPotassium > 0;

  const [showMicro, setShowMicro] = useState(false);

  const hasMacroTargets = macroTargets &&
    (macroTargets.proteinG > 0 || macroTargets.carbsG > 0 || macroTargets.fatG > 0);

  return (
    <div className="surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-black/[0.08] px-5 py-4">
        <Flame className="h-4 w-4 text-[#FF5A3D]" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B5738]">Today&apos;s Summary</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Calorie hero numbers */}
        <div className="flex items-end justify-between">
          <div>
            <p className="num text-4xl font-semibold text-[#18120E]">{consumedCalories}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-[#6B5738]">consumed</p>
          </div>
          <div className="text-right">
            <p className={`num text-4xl font-semibold ${isOver ? "text-[#FF5A3D]" : "text-[#00C875]"}`}>
              {isOver ? "" : "+"}{remaining}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-[#6B5738]">
              {isOver ? "over budget" : "remaining"}
            </p>
          </div>
        </div>

        {/* Calorie progress bar */}
        <div>
          <div className="track-lg">
            <div
              className={isOver ? "fill-rose" : "fill-indigo"}
              style={{ width: `${calPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-[#6B5738]">
            <span>Target: {targetCalories} kcal</span>
            <span>{Math.round(calPct)}%</span>
          </div>
        </div>

        {/* Bank balance row */}
        <div className="flex items-center justify-between rounded-lg border-2 border-[#18120E]/18 bg-[#FFF0B8] px-3.5 py-2.5 shadow-[2px_2px_0_#18120E]">
          <span className="text-[11px] uppercase tracking-wider text-[#6B5738]">Bank Balance</span>
          <span className={`num text-sm font-semibold ${bankBalance >= 0 ? "text-[#00895A]" : "text-[#FF5A3D]"}`}>
            {bankBalance >= 0 ? "+" : ""}{Math.round(bankBalance)} kcal
          </span>
        </div>

        {/* Macros */}
        <div className="space-y-3 border-t border-black/[0.08] pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B5738]">Macros</span>

          {hasMacroTargets ? (
            <div className="space-y-2.5">
              {[
                { label: "Protein", value: totalProtein, target: macroTargets!.proteinG, color: "fill-green" },
                { label: "Carbs",   value: totalCarbs,   target: macroTargets!.carbsG,   color: "fill-amber" },
                { label: "Fat",     value: totalFat,     target: macroTargets!.fatG,     color: "fill-rose" },
              ].map(({ label, value, target, color }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#3A2A1B]">{label}</span>
                    <span className="tabular-nums text-[#6B5738]">{Math.round(value)}/{target}g</span>
                  </div>
                  <div className="track">
                    <div className={color} style={{ width: `${target > 0 ? Math.min((value / target) * 100, 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Protein", value: totalProtein, color: "text-[#00C875]" },
                { label: "Carbs",   value: totalCarbs,   color: "text-[#FFB000]" },
                { label: "Fat",     value: totalFat,     color: "text-[#FF5A3D]" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg border-2 border-[#18120E]/18 bg-[#FFF0B8] p-3 text-center shadow-[2px_2px_0_#18120E]">
                  <p className={`num text-lg font-semibold ${color}`}>{Math.round(value)}<span className="ml-0.5 text-xs text-[#6B5738]">g</span></p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#6B5738]">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Micronutrients */}
        {hasMicro && (
          <div className="space-y-3 border-t border-black/[0.08] pt-1">
            <button
              onClick={() => setShowMicro(!showMicro)}
              className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B5738] transition-colors hover:text-[#18120E]"
            >
              <div className="flex items-center gap-1.5">
                <Leaf className="h-3 w-3 text-[#00C875]" />
                Micronutrients
              </div>
              {showMicro ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showMicro && (
              <div className="space-y-2.5">
                <MicroBar label="Fiber"     value={totalFiber}    target={30}   unit="g"  isLimit={false} />
                <MicroBar label="Sugar"     value={totalSugar}    target={50}   unit="g"  isLimit={true}  />
                <MicroBar label="Sodium"    value={totalSodium}   target={2300} unit="mg" isLimit={true}  />
                <MicroBar label="Vitamin C" value={totalVitC}     target={90}   unit="mg" isLimit={false} />
                <MicroBar label="Calcium"   value={totalCalcium}  target={1300} unit="mg" isLimit={false} />
                <MicroBar label="Iron"      value={totalIron}     target={18}   unit="mg" isLimit={false} />
                <MicroBar label="Potassium" value={totalPotassium} target={4700} unit="mg" isLimit={false} />
              </div>
            )}
          </div>
        )}

        {/* Water */}
        <div className="space-y-2.5 border-t border-black/[0.08] pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.18em] text-[#6B5738]">
              <Droplets className="h-3 w-3 text-blue-400" />
              Water
            </div>
            <span className="tabular-nums text-[#6B5738]">{waterIntake}/{waterTarget} ml</span>
          </div>
          <div className="track">
            <div className="fill-indigo" style={{ width: `${waterPct}%`, background: "#00C8FF" }} />
          </div>
          <button
            onClick={onAddWater}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/[0.16] bg-[#FFF8E7] py-2 text-xs text-[#6B5738] transition-colors hover:bg-[#FFE8A8] hover:text-[#18120E]"
          >
            <Plus className="h-3 w-3" />
            Add 250ml
          </button>
        </div>

        {/* Recent Meals */}
        <div className="space-y-2 border-t border-black/[0.08] pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B5738]">
              <Utensils className="h-3 w-3" />
              Today&apos;s Meals
            </div>
            <button onClick={onAddMeal} className="flex h-6 w-6 items-center justify-center rounded-md text-[#6B5738] transition-colors hover:bg-[#FFE8A8] hover:text-[#18120E]">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {meals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-[#6B5738]">No meals logged today</p>
              <button
                onClick={onAddMeal}
                className="mt-2 text-xs font-semibold text-[#00895A] transition-colors hover:text-[#18120E]"
              >
                Log your first meal →
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {meals.slice(0, 5).map((meal) => (
                <div key={meal.id} className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[#FFE8A8]">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-[#2A2017]">{meal.name}</p>
                    <p className="text-[11px] text-[#6B5738]">
                      {new Date(meal.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="num shrink-0 text-xs tabular-nums text-[#3A2A1B]">{meal.calories} kcal</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <CopyMealDialog meal={{ id: meal.id, name: meal.name, calories: meal.calories, proteinG: meal.protein, carbsG: meal.carbs, fatG: meal.fat, fiberG: meal.fiberG, sugarG: meal.sugarG, sodiumMg: meal.sodiumMg, vitaminCMg: meal.vitaminCMg, calciumMg: meal.calciumMg, ironMg: meal.ironMg, potassiumMg: meal.potassiumMg, servingSizeG: meal.servingSizeG, mealType: meal.mealType }}>
                      <button className="flex h-6 w-6 items-center justify-center rounded text-[#6B5738] transition-colors hover:text-[#18120E]">
                        <Copy className="h-3 w-3" />
                      </button>
                    </CopyMealDialog>
                    <SaveAsTemplateDialog meal={{ id: meal.id, name: meal.name, calories: meal.calories, proteinG: meal.protein, carbsG: meal.carbs, fatG: meal.fat, fiberG: meal.fiberG, sugarG: meal.sugarG, sodiumMg: meal.sodiumMg, vitaminCMg: meal.vitaminCMg, calciumMg: meal.calciumMg, ironMg: meal.ironMg, potassiumMg: meal.potassiumMg, servingSizeG: meal.servingSizeG, mealType: meal.mealType }}>
                      <button className="flex h-6 w-6 items-center justify-center rounded text-[#6B5738] transition-colors hover:text-[#18120E]">
                        <Save className="h-3 w-3" />
                      </button>
                    </SaveAsTemplateDialog>
                    {onEditMeal && (
                      <button onClick={() => onEditMeal(meal)} className="flex h-6 w-6 items-center justify-center rounded text-[#6B5738] transition-colors hover:text-[#18120E]">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {onDeleteMeal && (
                      <button onClick={() => onDeleteMeal(meal.id)} className="flex h-6 w-6 items-center justify-center rounded text-[#6B5738] transition-colors hover:text-[#FF5A3D]">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {meals.length > 0 && (
            <Link href="/meals" className="block pt-1 text-center text-[11px] text-[#6B5738] transition-colors hover:text-[#18120E]">
              View meal history
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
