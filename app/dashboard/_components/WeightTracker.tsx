"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";

interface WeightEntry {
  id: string;
  weightKg: number;
  date: Date;
}

interface WeightTrackerProps {
  initialEntries?: WeightEntry[];
}

export function WeightTracker({ initialEntries = [] }: WeightTrackerProps) {
  const [entries, setEntries] = useState<WeightEntry[]>(initialEntries);
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeightData();
  }, []);

  const fetchWeightData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/weight?days=90");
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
      }
    } catch (error) {
      console.error("Error fetching weight data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWeight = async () => {
    const weight = parseFloat(weightInput);
    if (!weight || weight <= 0 || weight > 500) return;

    setIsLogging(true);
    try {
      const response = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: weight,
          date: dateInput || undefined,
        }),
      });

      if (response.ok) {
        setWeightInput("");
        setDateInput("");
        await fetchWeightData();
      }
    } catch (error) {
      console.error("Error logging weight:", error);
    } finally {
      setIsLogging(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/weight?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error("Error deleting weight entry:", error);
    }
  };

  const getWeightTrend = () => {
    if (entries.length < 2) return null;

    const first = entries[0].weightKg;
    const last = entries[entries.length - 1].weightKg;
    const diff = last - first;

    return {
      diff: diff.toFixed(1),
      isUp: diff > 0,
      isDown: diff < 0,
    };
  };

  const trend = getWeightTrend();
  const latestWeight = entries.length > 0 ? entries[entries.length - 1].weightKg : null;

  const simpleChart = () => {
    if (entries.length < 2) return null;

    const weights = entries.map((e) => e.weightKg);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const range = maxWeight - minWeight || 1;

    const chartHeight = 120;
    const chartWidth = 100;

    const points = entries.map((entry, index) => {
      const x = (index / (entries.length - 1)) * chartWidth;
      const y = chartHeight - ((entry.weightKg - minWeight) / range) * chartHeight;
      return { x, y, weight: entry.weightKg, date: entry.date };
    });

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

    return (
      <div className="mt-4 rounded-sm border border-border bg-secondary p-3">
        <div className="flex justify-between smallcaps mb-2">
          <span className="num">{minWeight.toFixed(1)} kg</span>
          <span className="num">{maxWeight.toFixed(1)} kg</span>
        </div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28" preserveAspectRatio="none">
          <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="rgba(23,20,13,0.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="rgba(23,20,13,0.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={areaD} fill="var(--brass)" fillOpacity="0.1" stroke="none" />
          <path d={pathD} fill="none" stroke="var(--brass)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--brass)" />
          ))}
        </svg>
        <div className="flex justify-between num text-xs text-muted-foreground mt-2">
          <span>{new Date(entries[0].date).toLocaleDateString()}</span>
          <span>{new Date(entries[entries.length - 1].date).toLocaleDateString()}</span>
        </div>
      </div>
    );
  };

  return (
    <section className="surface overflow-hidden">
      <div className="foil" />
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Scale className="h-4 w-4" style={{ color: "var(--brass)" }} />
        <h3 className="smallcaps">Weight Tracker</h3>
      </div>

      <div className="space-y-4 px-5 py-4">
        {loading ? (
          <div className="text-center py-4 smallcaps">Loading weight data...</div>
        ) : (
          <>
            {/* Current Weight Display */}
            {latestWeight && (
              <div className="flex items-center justify-between rounded-sm surface-raised p-4">
                <div>
                  <p className="num-display text-3xl text-foreground">
                    {latestWeight.toFixed(1)} kg
                  </p>
                  <p className="smallcaps mt-1">Current weight</p>
                </div>
                {trend && (
                  <span
                    className={`flex items-center gap-1 ${
                      trend.isDown ? "chip-green" : trend.isUp ? "chip-rose" : "num text-xs text-muted-foreground"
                    }`}
                  >
                    {trend.isDown ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : trend.isUp ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : null}
                    {trend.diff} kg
                  </span>
                )}
              </div>
            )}

            {/* Weight Chart */}
            {simpleChart()}

            {/* Log Weight Form */}
            <div className="space-y-3 border-t border-border pt-4">
              <Label className="smallcaps">Log Weight</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="weight" className="smallcaps">
                    Weight (kg)
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="70.5"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    min="20"
                    max="500"
                    className="num rounded-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="date" className="smallcaps">
                    Date (optional)
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="num rounded-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleLogWeight}
                disabled={isLogging || !weightInput}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLogging ? "Logging..." : "Log Weight"}
              </button>
            </div>

            {/* Recent Entries */}
            {entries.length > 0 && (
              <div className="border-t border-border pt-2">
                <Label className="smallcaps">Recent Entries</Label>
                <div className="max-h-40 overflow-y-auto mt-2">
                  {[...entries].reverse().slice(0, 7).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between border-t border-border py-2 first:border-t-0"
                    >
                      <div>
                        <p className="num text-sm font-medium text-foreground">
                          {entry.weightKg.toFixed(1)} kg
                        </p>
                        <p className="num text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="h-8 w-8 flex items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
