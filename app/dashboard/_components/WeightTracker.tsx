"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

    return (
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>{minWeight.toFixed(1)} kg</span>
          <span>{maxWeight.toFixed(1)} kg</span>
        </div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28">
          <path d={pathD} fill="none" stroke="hsl(142, 76%, 36%)" strokeWidth="2" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill="hsl(142, 76%, 36%)" />
          ))}
        </svg>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{new Date(entries[0].date).toLocaleDateString()}</span>
          <span>{new Date(entries[entries.length - 1].date).toLocaleDateString()}</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Scale className="h-5 w-5 text-teal-500" />
          Weight Tracker
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading weight data...</div>
        ) : (
          <>
            {/* Current Weight Display */}
            {latestWeight && (
              <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-100">
                <div>
                  <p className="text-2xl font-bold text-teal-700">{latestWeight.toFixed(1)} kg</p>
                  <p className="text-xs text-teal-600">Current weight</p>
                </div>
                {trend && (
                  <div className={`flex items-center gap-1 ${trend.isDown ? "text-green-600" : trend.isUp ? "text-red-600" : "text-gray-500"}`}>
                    {trend.isDown ? <TrendingDown className="h-5 w-5" /> : trend.isUp ? <TrendingUp className="h-5 w-5" /> : null}
                    <span className="text-sm font-medium">{trend.diff} kg</span>
                  </div>
                )}
              </div>
            )}

            {/* Weight Chart */}
            {simpleChart()}

            {/* Log Weight Form */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">Log Weight</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="weight" className="text-xs text-muted-foreground">
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
                  />
                </div>
                <div>
                  <Label htmlFor="date" className="text-xs text-muted-foreground">
                    Date (optional)
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleLogWeight}
                disabled={isLogging || !weightInput}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLogging ? "Logging..." : "Log Weight"}
              </Button>
            </div>

            {/* Recent Entries */}
            {entries.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">Recent Entries</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {[...entries].reverse().slice(0, 7).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{entry.weightKg.toFixed(1)} kg</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
