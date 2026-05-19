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
  Mic,
  MicOff,
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
  void userId;
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
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [popularFoods, setPopularFoods] = useState<CachedFood[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [mealType, setMealType] = useState("OTHER");

  useEffect(() => {
    const fetch_ = async () => {
      setIsLoadingPopular(true);
      try {
        const res = await fetch("/api/cached-foods?limit=6");
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
  }, []);

  const handleVoice = () => {
    setVoiceError(null);
    type AnyRecognition = {
      lang: string; interimResults: boolean; maxAlternatives: number;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: ((e: { error: string }) => void) | null;
      onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
      start: () => void;
    };
    type RecognitionCtor = new () => AnyRecognition;
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Ctor = (typeof window !== "undefined" && (w.SpeechRecognition || w.webkitSpeechRecognition)) || null;
    if (!Ctor) {
      setVoiceError("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error !== "no-speech") setVoiceError("Couldn't hear anything. Try again.");
    };
    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput((prev) => prev ? `${prev}, ${transcript}` : transcript);
        setVoiceError(null);
      }
    };
    recognition.start();
  };

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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        <div className="flex items-center justify-between border-b border-black/[0.08] px-5 py-4">
          <div className="flex items-center gap-2">
            {mode === "ai" ? (
              <Sparkles className="h-4 w-4 text-[#FF5A3D]" />
            ) : (
              <ClipboardPenLine className="h-4 w-4 text-[#00C875]" />
            )}
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B5738]">Quick Log</span>
          </div>
          <div className="flex rounded-lg border border-[#18120E]/20 bg-[#FFF0B8] p-0.5">
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
                className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  mode === option.value
                    ? "bg-[#18120E] text-[#DFFF35]"
                    : "text-[#6B5738] hover:bg-[#FFE8A8] hover:text-[#18120E]"
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
                onClick={() => setMealType(t)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider border transition-colors ${
                  mealType === t
                    ? "border-[#18120E] bg-[#DFFF35] text-[#18120E] shadow-[2px_2px_0_#18120E]"
                    : "border-black/[0.12] text-[#6B5738] hover:border-black/[0.2] hover:bg-[#FFE8A8] hover:text-[#18120E]"
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
                  className="w-full resize-none rounded-lg border-2 border-[#18120E]/20 bg-[#FFF0B8] px-3.5 py-3 pr-20 text-sm text-[#18120E] outline-none transition-colors placeholder:text-[#8A7350] focus:border-[#18120E] focus:ring-2 focus:ring-[#DFFF35]/70"
                />
                <div className="absolute bottom-2.5 right-2.5 flex gap-1">
                  <button
                    onClick={handleVoice}
                    disabled={isListening}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                      isListening
                        ? "bg-red-500/20 text-red-500 animate-pulse"
                        : "text-[#6B5738] hover:bg-[#FFF8E7] hover:text-[#18120E]"
                    }`}
                    title={isListening ? "Listening…" : "Voice input"}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B5738] transition-colors hover:bg-[#FFF8E7] hover:text-[#18120E]"
                    title="Scan barcode or nutrition label"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {voiceError && (
                <p className="text-[11px] text-rose-400">{voiceError}</p>
              )}

              {/* Parse button */}
              <button
                onClick={() => handleParse(0)}
                disabled={!input.trim() || isLoading || isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#18120E] bg-[#DFFF35] py-2.5 text-sm font-semibold text-[#18120E] shadow-[4px_4px_0_#18120E] transition-all hover:bg-[#00C8FF] hover:shadow-[2px_2px_0_#18120E] disabled:cursor-not-allowed disabled:opacity-40"
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
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B5738]">
                  Meal name
                </label>
                <input
                  value={manualMeal.name}
                  onChange={(e) => handleManualChange("name", e.target.value)}
                  placeholder="e.g. Chicken rice bowl"
                  className="w-full rounded-lg border-2 border-[#18120E]/20 bg-[#FFF0B8] px-3.5 py-2.5 text-sm text-[#18120E] outline-none transition-colors placeholder:text-[#8A7350] focus:border-[#18120E] focus:ring-2 focus:ring-[#DFFF35]/70"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {MANUAL_MACRO_FIELDS.map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B5738]">
                      {field.label}{field.required ? " *" : ""} <span className="normal-case tracking-normal text-[#8A7350]">({field.unit})</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={manualMeal[field.key]}
                      onChange={(e) => handleManualChange(field.key, e.target.value)}
                      className="h-9 w-full rounded-lg border-2 border-[#18120E]/20 bg-[#FFF8E7] px-2.5 text-sm text-[#18120E] outline-none transition-colors focus:border-[#18120E] focus:ring-2 focus:ring-[#DFFF35]/70"
                    />
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={!manualMeal.name.trim() || !manualMeal.calories.trim() || isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#18120E] bg-[#00C875] py-2.5 text-sm font-semibold text-[#18120E] shadow-[4px_4px_0_#18120E] transition-all hover:bg-[#DFFF35] hover:shadow-[2px_2px_0_#18120E] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPenLine className="h-4 w-4" />}
                Log manual meal
              </button>
            </form>
          )}

          {/* Error */}
          {mode === "ai" && error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.07] p-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-rose-300 font-medium">Failed to parse</p>
                  <p className="text-xs text-rose-400/70 mt-0.5">{error}</p>
                </div>
              </div>
              <button
                onClick={() => handleParse(0)}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-rose-500/20 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Try Again
              </button>
            </div>
          )}

          {/* Parsed results */}
          {mode === "ai" && showParsed && parsedFoods.length > 0 && (
            <div className="overflow-hidden rounded-lg border-2 border-[#18120E]/18 bg-[#FFF0B8]">
              <div className="flex items-center justify-between border-b border-black/[0.08] px-3.5 py-2.5">
                <span className="text-xs font-medium text-[#3A2A1B]">Detected items</span>
                <button onClick={() => setShowParsed(false)} className="text-[#6B5738] transition-colors hover:text-[#18120E]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-[140px] divide-y divide-black/[0.06] overflow-y-auto">
                {parsedFoods.map((food, i) => (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2">
                    <div>
                      <p className="text-sm text-[#2A2017]">{food.name}</p>
                      <p className="text-[11px] text-[#6B5738]">
                        P:{food.protein ?? 0}g · C:{food.carbs ?? 0}g · F:{food.fat ?? 0}g
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num text-sm font-semibold text-[#2A2017]">{food.calories}</p>
                      <p className="text-[11px] font-semibold text-[#00895A]">{Math.round(food.confidence * 100)}%</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-black/[0.08] px-3.5 py-2.5">
                <span className="num text-sm font-semibold text-[#2A2017]">Total: {totalCal} kcal</span>
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-lg border border-[#18120E] bg-[#00C875] px-3 py-1.5 text-xs font-semibold text-[#18120E] transition-colors hover:bg-[#DFFF35] disabled:opacity-40"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Log Meal
                </button>
              </div>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.07] p-3">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-300">{submitError}</p>
            </div>
          )}

          {/* Popular foods */}
          {mode === "ai" && (isLoadingPopular || popularFoods.length > 0) && (
            <div className="space-y-2 border-t border-black/[0.08] pt-1">
              <div className="flex items-center gap-1.5 text-[11px] text-[#6B5738]">
                <TrendingUp className="h-3 w-3" />
                Popular
              </div>
              {isLoadingPopular ? (
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading…
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {popularFoods.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => { setInput(food.originalText); setIsExpanded(false); }}
                      disabled={isSubmitting}
                      title={`${food.calories} kcal · Used ${food.hitCount}×`}
                      className="rounded-full border border-black/[0.12] bg-[#FFF0B8] px-2.5 py-0.5 text-[11px] text-[#3A2A1B] transition-colors hover:border-black/[0.24] hover:bg-[#DFFF35] hover:text-[#18120E] disabled:opacity-40"
                    >
                      {food.name}
                      <span className="ml-1 text-[#6B5738]">{food.calories}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick add */}
          <div className="space-y-2 border-t border-black/[0.08] pt-1">
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Coffee", cal: 5 },
                { label: "Apple", cal: 95 },
                { label: "Egg", cal: 70 },
                { label: "Pizza slice", cal: 285 },
              ].map(({ label, cal }) => (
                <button
                  key={label}
                  onClick={() => handleQuickAdd(label, cal)}
                  disabled={isSubmitting}
                  className="rounded-full border border-black/[0.12] bg-[#FFF8E7] px-2.5 py-0.5 text-[11px] text-[#3A2A1B] transition-colors hover:border-black/[0.24] hover:bg-[#FFE8A8] hover:text-[#18120E] disabled:opacity-40"
                >
                  {label} <span className="text-[#6B5738]">{cal}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions toggle */}
          {mode === "ai" && (
          <div className="border-t border-black/[0.08] pt-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[11px] text-[#6B5738] transition-colors hover:text-[#18120E]"
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
                    onClick={() => { setInput(s); setIsExpanded(false); }}
                    className="block w-full rounded px-2 py-1 text-left text-[11px] text-[#6B5738] transition-colors hover:bg-[#FFE8A8] hover:text-[#18120E]"
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
