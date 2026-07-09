"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Pencil, Trash2, Copy, Save } from "lucide-react";
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
  // Ledger green strictly for positive outcomes, ledger red for negative; quiet ink otherwise.
  const overLimit = isLimit && pct >= 100;
  const onTrack = !isLimit && pct >= 80;
  const fillColor = overLimit
    ? "var(--destructive)"
    : onTrack
      ? "var(--ledger-green)"
      : "color-mix(in srgb, var(--foreground) 35%, transparent)";

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="smallcaps">{label}</span>
        <span className="num text-xs text-muted-foreground">
          {Math.round(value)}/{target}
          {unit}
        </span>
      </div>
      <div className="track">
        <div
          className="h-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: fillColor }}
        />
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
  currentStreak?: number;
  maxStreak?: number;
  userId: string;
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
  currentStreak,
  maxStreak,
  userId,
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

  const statementLines: {
    label: string;
    value: string;
    tone: string;
    style?: { color: string };
  }[] = [
    { label: "Target", value: targetCalories.toLocaleString(), tone: "text-foreground" },
    { label: "Consumed", value: consumedCalories.toLocaleString(), tone: "text-foreground" },
    {
      label: isOver ? "Over target" : "Remaining",
      value: `${isOver ? "−" : "+"}${Math.abs(remaining).toLocaleString()}`,
      tone: isOver ? "text-destructive" : "",
      style: isOver ? undefined : { color: "var(--ledger-green)" },
    },
    { label: "Water", value: `${waterIntake.toLocaleString()} ml`, tone: "text-foreground" },
  ];

  return (
    <section aria-labelledby="daily-statement-heading" className="surface overflow-hidden">
      <div className="foil" />
      <div className="flex items-baseline justify-between px-6 pt-5">
        <div>
          <h3 id="daily-statement-heading" className="text-sm font-bold tracking-tight text-foreground">
            Today&apos;s nutrition statement
          </h3>
          <p className="smallcaps mt-0.5">
            <span className="num">{Math.round(calPct)}%</span> of {targetCalories.toLocaleString()} kcal
          </p>
        </div>
        {maxStreak !== undefined && (
          <span className="pill">Streak {currentStreak ?? 0} &middot; best {maxStreak}</span>
        )}
      </div>

      {/* Statement lines — ruled rows, mono figures */}
      <div className="mt-4 px-6">
        {statementLines.map((line) => (
          <div key={line.label} className="ledger-row">
            <span className="smallcaps">{line.label}</span>
            <span className={`num text-sm ${line.tone}`} style={line.style}>
              {line.value}
            </span>
          </div>
        ))}
      </div>

      {/* Double rule — day total */}
      <div className="mt-1 flex items-baseline justify-between border-t-2 border-foreground bg-secondary px-6 py-3">
        <span className="smallcaps">Balance carried</span>
        <span className={`num-display text-xl ${isOver ? "text-destructive" : "text-foreground"}`}>
          {isOver ? "−" : "+"}
          {Math.abs(remaining).toLocaleString()} kcal
        </span>
      </div>

      {/* Day progress — hairline track, quiet ink */}
      <div className="px-6 pt-5">
        <div className="track-lg">
          <div
            className="h-full transition-all"
            style={{
              width: `${calPct}%`,
              background: isOver
                ? "var(--destructive)"
                : "var(--brass)",
            }}
          />
        </div>
      </div>

      {/* Macros — ruled rows with track bars */}
      <div className="rule mx-6 mt-8 pt-5">
        <p className="smallcaps">Macros</p>

        {hasMacroTargets ? (
          <div className="mt-4 space-y-3.5">
            {[
              { label: "Protein", value: totalProtein, target: macroTargets!.proteinG },
              { label: "Carbs",   value: totalCarbs,   target: macroTargets!.carbsG },
              { label: "Fat",     value: totalFat,     target: macroTargets!.fatG },
            ].map(({ label, value, target }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-foreground">{label}</span>
                  <span className="num text-xs text-muted-foreground">
                    {Math.round(value)}/{target}g
                  </span>
                </div>
                <div className="track">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${target > 0 ? Math.min((value / target) * 100, 100) : 0}%`,
                      background: "var(--brass)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="num mt-3 text-sm text-foreground">
            P {Math.round(totalProtein)}g
            <span className="mx-2 text-muted-foreground">·</span>
            C {Math.round(totalCarbs)}g
            <span className="mx-2 text-muted-foreground">·</span>
            F {Math.round(totalFat)}g
          </p>
        )}
      </div>

      {/* Micronutrients */}
      {hasMicro && (
        <div className="rule mx-6 mt-8 pt-5">
          <button
            type="button"
            onClick={() => setShowMicro(!showMicro)}
            aria-expanded={showMicro}
            aria-controls="daily-micronutrient-details"
            className="smallcaps flex w-full items-center justify-between transition-colors hover:text-foreground"
          >
            Micronutrients
            {showMicro ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showMicro && (
            <div id="daily-micronutrient-details" className="mt-4 space-y-3.5">
              <MicroBar label="Fiber"     value={totalFiber}     target={30}   unit="g"  isLimit={false} />
              <MicroBar label="Sugar"     value={totalSugar}     target={50}   unit="g"  isLimit={true}  />
              <MicroBar label="Sodium"    value={totalSodium}    target={2300} unit="mg" isLimit={true}  />
              <MicroBar label="Vitamin C" value={totalVitC}      target={90}   unit="mg" isLimit={false} />
              <MicroBar label="Calcium"   value={totalCalcium}   target={1300} unit="mg" isLimit={false} />
              <MicroBar label="Iron"      value={totalIron}      target={18}   unit="mg" isLimit={false} />
              <MicroBar label="Potassium" value={totalPotassium} target={4700} unit="mg" isLimit={false} />
            </div>
          )}
        </div>
      )}

      {/* Water */}
      <div className="rule mx-6 mt-8 pt-5">
        <div className="flex items-baseline justify-between">
          <span className="smallcaps">Water</span>
          <span className="num text-xs text-muted-foreground">
            {waterIntake.toLocaleString()}/{waterTarget.toLocaleString()} ml
          </span>
        </div>
        <div className="track mt-2">
          <div
            className="h-full transition-all"
            style={{
              width: `${waterPct}%`,
              background: "var(--brass)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={onAddWater}
          className="smallcaps accent-text mt-3 transition-colors hover:text-foreground"
        >
          + Add 250 ml
        </button>
      </div>

      {/* Meals — a dated ledger closing on the bank balance */}
      <div className="rule mx-6 mt-8 pb-5 pt-5">
        <div className="flex items-baseline justify-between">
          <span className="smallcaps">Today&apos;s meals</span>
          <button
            type="button"
            onClick={onAddMeal}
            className="smallcaps accent-text transition-colors hover:text-foreground"
          >
            + Add
          </button>
        </div>

        {meals.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No meals logged today.</p>
            <button
              onClick={onAddMeal}
              className="btn-ghost mt-3"
            >
              Log your first meal &rarr;
            </button>
          </div>
        ) : (
          <div className="mt-4">
            {meals.slice(0, 5).map((meal) => (
              <div key={meal.id} className="ledger-row group">
                <span className="num w-16 shrink-0 text-xs text-muted-foreground">
                  {new Date(meal.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{meal.name}</span>
                <span className="flex shrink-0 gap-0.5 self-center transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <CopyMealDialog userId={userId} meal={{ id: meal.id, name: meal.name, calories: meal.calories, proteinG: meal.protein, carbsG: meal.carbs, fatG: meal.fat, fiberG: meal.fiberG, sugarG: meal.sugarG, sodiumMg: meal.sodiumMg, vitaminCMg: meal.vitaminCMg, calciumMg: meal.calciumMg, ironMg: meal.ironMg, potassiumMg: meal.potassiumMg, servingSizeG: meal.servingSizeG, mealType: meal.mealType }}>
                    <button className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" aria-label={`Copy ${meal.name}`}>
                      <Copy className="h-3 w-3" />
                    </button>
                  </CopyMealDialog>
                  <SaveAsTemplateDialog userId={userId} meal={{ id: meal.id, name: meal.name, calories: meal.calories, proteinG: meal.protein, carbsG: meal.carbs, fatG: meal.fat, fiberG: meal.fiberG, sugarG: meal.sugarG, sodiumMg: meal.sodiumMg, vitaminCMg: meal.vitaminCMg, calciumMg: meal.calciumMg, ironMg: meal.ironMg, potassiumMg: meal.potassiumMg, servingSizeG: meal.servingSizeG, mealType: meal.mealType }}>
                    <button className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" aria-label={`Save ${meal.name} as template`}>
                      <Save className="h-3 w-3" />
                    </button>
                  </SaveAsTemplateDialog>
                  {onEditMeal && (
                    <button onClick={() => onEditMeal(meal)} className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" aria-label={`Edit ${meal.name}`}>
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {onDeleteMeal && (
                    <button onClick={() => onDeleteMeal(meal.id)} className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-destructive" aria-label={`Delete ${meal.name}`}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </span>
                <span className="num shrink-0 text-sm text-foreground">{meal.calories} kcal</span>
              </div>
            ))}

            <div className="flex items-baseline justify-between border-t-2 border-foreground bg-secondary px-3 py-3">
              <span className="smallcaps">Bank balance</span>
              <span
                className="num-display text-sm"
                style={{ color: bankBalance >= 0 ? "var(--ledger-green)" : "var(--ledger-red)" }}
              >
                {bankBalance >= 0 ? "+" : "−"}
                {Math.abs(Math.round(bankBalance)).toLocaleString()} kcal
              </span>
            </div>
          </div>
        )}

        {meals.length > 0 && (
          <Link
            href="/meals"
            className="smallcaps mt-4 inline-block underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
          >
            View meal history
          </Link>
        )}
      </div>
    </section>
  );
}
