"use client";

import { useState, useEffect } from "react";
import { ScannerModal, type NutritionResult } from "./ScannerModal";
import {
  Camera,
  ClipboardPenLine,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  AlertCircle,
  RotateCcw,
  TrendingUp,
} from "lucide-react";

interface ParsedFood {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  servingSize?: number;
  confidence: number;
}

interface CachedFood {
  id: string;
  normalizedKey: string;
  originalText: string;
  name: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  aiConfidence: number;
  source: string;
  hitCount: number;
  lastUsedAt: string;
  createdAt: string;
}

interface QuickLogClientProps {
  userId: string;
}

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"];
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const INITIAL_MANUAL_MEAL = {
  name: "",
  calories: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
  fiberG: "",
  sugarG: "",
  sodiumMg: "",
  servingSizeG: "",
};

type LogMode = "ai" | "manual";
type ManualMealState = typeof INITIAL_MANUAL_MEAL;
type ManualMealNumberKey = Exclude<keyof ManualMealState, "name">;

const MANUAL_MACRO_FIELDS: Array<{
  key: ManualMealNumberKey;
  label: string;
  unit: string;
  required?: boolean;
}> = [
  { key: "calories", label: "Calories", unit: "kcal", required: true },
  { key: "proteinG", label: "Protein", unit: "g" },
  { key: "carbsG", label: "Carbs", unit: "g" },
  { key: "fatG", label: "Fat", unit: "g" },
  { key: "fiberG", label: "Fiber", unit: "g" },
  { key: "sugarG", label: "Sugar", unit: "g" },
  { key: "sodiumMg", label: "Sodium", unit: "mg" },
  { key: "servingSizeG", label: "Serving", unit: "g" },
];

function parseManualNumber(value: string) {
  if (!value.trim()) return 0;
  return Number(value);
}

export function QuickLogClient({ userId }: QuickLogClientProps) {
  const [mode, setMode] = useState<LogMode>("ai");
  const [input, setInput] = useState("");
  const [manualMeal, setManualMeal] = useState<ManualMealState>(INITIAL_MANUAL_MEAL);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedFoods, setParsedFoods] = useState<ParsedFood[]>([]);
  const [showParsed, setShowParsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [popularFoods, setPopularFoods] = useState<CachedFood[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [mealType, setMealType] = useState("OTHER");

  const jsonHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.NODE_ENV !== "production") {
      headers["X-Test-User-Id"] = userId;
    }
    return headers;
  };

  useEffect(() => {
    const fetch_ = async () => {
      setIsLoadingPopular(true);
      try {
        const headers: Record<string, string> = {};
        if (process.env.NODE_ENV !== "production") {
          headers["X-Test-User-Id"] = userId;
        }
        const res = await fetch("/api/cached-foods?limit=6", { headers });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (data.success) setPopularFoods(data.foods);
      } catch {
        // silent — popular foods are non-critical
      } finally {
        setIsLoadingPopular(false);
      }
    };
    fetch_();
  }, [userId]);

  const handleScanResult = (result: NutritionResult) => {
    setParsedFoods([{
      name: result.name, calories: result.calories,
      protein: result.proteinG, carbs: result.carbsG, fat: result.fatG,
      fiber: result.fiberG, sugar: result.sugarG, sodium: result.sodiumMg,
      vitaminC: result.vitaminCMg, calcium: result.calciumMg,
      iron: result.ironMg, potassium: result.potassiumMg, confidence: 1.0,
    }]);
    setShowParsed(true);
    setShowScanner(false);
    setError(null);
  };

  const handleParse = async (attempt = 0) => {
    if (!input.trim()) return;
    setIsLoading(true);
    setParsedFoods([]);
    setShowParsed(false);
    setError(null);
    try {
      const res = await fetch("/api/parse-meal", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ text: input.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to parse");
      setParsedFoods(data.foods);
      setShowParsed(true);
      setRetryCount(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse meal";
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, INITIAL_RETRY_DELAY * Math.pow(2, attempt)));
        setRetryCount(attempt + 1);
        return handleParse(attempt + 1);
      }
      setError(msg);
      setRetryCount(MAX_RETRIES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitError(null);
    const sum = (fn: (f: ParsedFood) => number | undefined) =>
      parsedFoods.reduce((a, f) => a + (fn(f) ?? 0), 0);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          name: parsedFoods.map(f => f.name).join(", "),
          calories: sum(f => f.calories),
          proteinG: sum(f => f.protein),
          carbsG: sum(f => f.carbs),
          fatG: sum(f => f.fat),
          fiberG: sum(f => f.fiber),
          sugarG: sum(f => f.sugar),
          sodiumMg: sum(f => f.sodium),
          vitaminCMg: sum(f => f.vitaminC),
          calciumMg: sum(f => f.calcium),
          ironMg: sum(f => f.iron),
          potassiumMg: sum(f => f.potassium),
          servingSizeG: sum(f => f.servingSize) || null,
          mealType,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed (${res.status})`);
      }
      setInput("");
      setParsedFoods([]);
      setShowParsed(false);
      window.location.reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to log meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualChange = (field: keyof ManualMealState, value: string) => {
    setManualMeal((current) => ({ ...current, [field]: value }));
    setSubmitError(null);
  };

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const name = manualMeal.name.trim();
    const calories = parseManualNumber(manualMeal.calories);

    if (!name) {
      setSubmitError("Add a meal name before logging.");
      return;
    }

    if (!Number.isFinite(calories) || calories < 0) {
      setSubmitError("Calories must be a valid number.");
      return;
    }

    const parsedNumbers = MANUAL_MACRO_FIELDS.reduce<Record<ManualMealNumberKey, number>>(
      (values, field) => ({
        ...values,
        [field.key]: parseManualNumber(manualMeal[field.key]),
      }),
      {
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 0,
        servingSizeG: 0,
      }
    );

    const invalidField = MANUAL_MACRO_FIELDS.find((field) => {
      const value = parsedNumbers[field.key];
      return !Number.isFinite(value) || value < 0;
    });

    if (invalidField) {
      setSubmitError(`${invalidField.label} must be zero or higher.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          name,
          calories: parsedNumbers.calories,
          proteinG: parsedNumbers.proteinG,
          carbsG: parsedNumbers.carbsG,
          fatG: parsedNumbers.fatG,
          fiberG: parsedNumbers.fiberG,
          sugarG: parsedNumbers.sugarG,
          sodiumMg: parsedNumbers.sodiumMg,
          servingSizeG: manualMeal.servingSizeG.trim() ? parsedNumbers.servingSizeG : null,
          mealType,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed (${res.status})`);
      }

      setManualMeal(INITIAL_MANUAL_MEAL);
      window.location.reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to log meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (name: string, calories: number) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ name, calories, proteinG: 0, carbsG: 0, fatG: 0, mealType: "SNACK" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed (${res.status})`);
      }
      window.location.reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to log meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCal = parsedFoods.reduce((s, f) => s + f.calories, 0);

  return (
    <>
      <div className="surface overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            {mode === "ai" ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : (
              <ClipboardPenLine className="h-4 w-4 text-chart-2" />
            )}
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick Log</span>
          </div>
          <div className="flex rounded-full border border-border bg-secondary p-0.5">
            {([
              { value: "ai", label: "AI" },
              { value: "manual", label: "Manual" },
            ] satisfies Array<{ value: LogMode; label: string }>).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setMode(option.value);
                  setSubmitError(null);
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  mode === option.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Meal type */}
          <div className="flex gap-1.5 flex-wrap">
            {MEAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMealType(t)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider border transition-colors ${
                  mealType === t
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {mode === "ai" ? (
            <>
              {/* Textarea */}
              <div className="relative">
                <textarea
                  placeholder="Describe what you ate in natural language…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3.5 py-3 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Scan barcode or nutrition label"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              {/* Parse button */}
              <button
                type="button"
                onClick={() => handleParse(0)}
                disabled={!input.trim() || isLoading || isSubmitting}
                className="btn-primary w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing…{retryCount > 0 && ` (retry ${retryCount}/${MAX_RETRIES})`}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Parse with AI
                  </>
                )}
              </button>
            </>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Meal name
                </label>
                <input
                  value={manualMeal.name}
                  onChange={(e) => handleManualChange("name", e.target.value)}
                  placeholder="e.g. Chicken rice bowl"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {MANUAL_MACRO_FIELDS.map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {field.label}{field.required ? " *" : ""} <span className="normal-case tracking-normal text-muted-foreground/70">({field.unit})</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={manualMeal[field.key]}
                      onChange={(e) => handleManualChange(field.key, e.target.value)}
                      className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={!manualMeal.name.trim() || !manualMeal.calories.trim() || isSubmitting}
                className="btn-primary w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPenLine className="h-4 w-4" />}
                Log manual meal
              </button>
            </form>
          )}

          {/* Error */}
          {mode === "ai" && error && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-destructive font-medium">Failed to parse</p>
                  <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleParse(0)}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/25 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Try Again
              </button>
            </div>
          )}

          {/* Parsed results */}
          {mode === "ai" && showParsed && parsedFoods.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-secondary">
              <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                <span className="text-xs font-medium text-foreground">Detected items</span>
                <button type="button" onClick={() => setShowParsed(false)} className="text-muted-foreground transition-colors hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-[140px] divide-y divide-border overflow-y-auto">
                {parsedFoods.map((food, i) => (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2">
                    <div>
                      <p className="text-sm text-foreground">{food.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        P:{food.protein ?? 0}g · C:{food.carbs ?? 0}g · F:{food.fat ?? 0}g
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num text-sm font-semibold text-foreground">{food.calories}</p>
                      <p className="text-[11px] font-semibold text-chart-2">{Math.round(food.confidence * 100)}%</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5">
                <span className="num text-sm font-semibold text-foreground">Total: {totalCal} kcal</span>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Log Meal
                </button>
              </div>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{submitError}</p>
            </div>
          )}

          {/* Popular foods */}
          {mode === "ai" && (isLoadingPopular || popularFoods.length > 0) && (
            <div className="space-y-2 border-t border-border pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Popular
              </div>
              {isLoadingPopular ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading…
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {popularFoods.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => { setInput(food.originalText); setIsExpanded(false); }}
                      disabled={isSubmitting}
                      title={`${food.calories} kcal · Used ${food.hitCount}×`}
                      className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] text-foreground transition-colors hover:border-input hover:bg-accent disabled:opacity-40"
                    >
                      {food.name}
                      <span className="ml-1 text-muted-foreground">{food.calories}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick add */}
          <div className="space-y-2 border-t border-border pt-1">
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Coffee", cal: 5 },
                { label: "Apple", cal: 95 },
                { label: "Egg", cal: 70 },
                { label: "Pizza slice", cal: 285 },
              ].map(({ label, cal }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleQuickAdd(label, cal)}
                  disabled={isSubmitting}
                  className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-foreground transition-colors hover:border-input hover:bg-secondary disabled:opacity-40"
                >
                  {label} <span className="text-muted-foreground">{cal}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions toggle */}
          {mode === "ai" && (
          <div className="border-t border-border pt-1">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {isExpanded ? "Hide examples" : "Show example phrases"}
            </button>
            {isExpanded && (
              <div className="mt-2 space-y-1">
                {[
                  "Had a grilled chicken salad with avocado and olive oil dressing",
                  "Coffee with oat milk and a banana",
                  "Large pepperoni pizza, 2 slices",
                  "Salmon fillet with quinoa and steamed broccoli",
                  "Protein shake after gym",
                ].map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setInput(s); setIsExpanded(false); }}
                    className="block w-full rounded-lg px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    &ldquo;{s}&rdquo;
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {showScanner && (
        <ScannerModal
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
