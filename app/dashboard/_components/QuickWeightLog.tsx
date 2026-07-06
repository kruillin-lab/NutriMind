"use client";

import { useState } from "react";
import { Scale, TrendingUp, TrendingDown, Minus, Check, Loader2 } from "lucide-react";

interface WeightEntry {
  id: string;
  weightKg: number;
  date: Date;
}

interface QuickWeightLogProps {
  todayEntry: WeightEntry | null;
  previousEntry: WeightEntry | null;
}

export function QuickWeightLog({ todayEntry, previousEntry }: QuickWeightLogProps) {
  const [value, setValue] = useState(todayEntry?.weightKg.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(todayEntry);

  const trend =
    currentEntry && previousEntry
      ? currentEntry.weightKg - previousEntry.weightKg
      : null;

  const handleSave = async () => {
    const kg = parseFloat(value);
    if (!kg || kg <= 0 || kg > 500) return;
    setLoading(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: kg }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentEntry(data.weightEntry);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Error logging weight:", error);
    } finally {
      setLoading(false);
    }
  };

  const TrendIcon =
    trend === null ? null
    : trend > 0 ? TrendingUp
    : trend < 0 ? TrendingDown
    : Minus;

  const trendChip =
    trend === null ? ""
    : trend > 0 ? "chip-rose"
    : trend < 0 ? "chip-green"
    : "text-xs font-medium text-muted-foreground";

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Today&apos;s Weight
          </span>
        </div>
        {TrendIcon && trend !== null && (
          <span className={`flex items-center gap-1 ${trendChip}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(trend).toFixed(1)} kg
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              step="0.1"
              min="20"
              max="500"
              placeholder="e.g. 72.5"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="num w-full rounded-lg border border-input bg-card px-3 py-2 pr-8 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              kg
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={loading || !value || saved}
            className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : currentEntry ? (
              "Update"
            ) : (
              "Log"
            )}
          </button>
        </div>

        {currentEntry && !saved && (
          <p className="text-[11px] text-muted-foreground">
            Last logged:{" "}
            <span className="num font-serif font-medium text-foreground">
              {currentEntry.weightKg} kg
            </span>
          </p>
        )}

        {previousEntry && (
          <p className="text-[11px] text-muted-foreground">
            Previous: {previousEntry.weightKg} kg
          </p>
        )}
      </div>
    </div>
  );
}
