"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, BarChart3 } from "lucide-react";

interface DailyLog {
  id: string;
  date: string;
  caloriesConsumed: number;
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
  exerciseMinutes: number;
  caloriesBurned: number;
  isUnderTarget: boolean;
}

interface Stats {
  avgConsumed: number;
  daysUnderTarget: number;
  daysTotal: number;
  complianceRate: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
}

interface WeeklyViewProps {
  initialLogs?: DailyLog[];
  initialStats?: Stats;
  dailyTarget?: number;
}

// Approved chart palette: olive = under target, terracotta = over target
const BAR_OLIVE = "#7D8A63";
const BAR_TERRACOTTA = "#D97757";
const BAR_EMPTY = "rgba(20,20,19,0.08)";

export function WeeklyView({
  initialLogs = [],
  initialStats,
  dailyTarget = 2000,
}: WeeklyViewProps) {
  const [logs, setLogs] = useState<DailyLog[]>(initialLogs);
  const [stats, setStats] = useState<Stats | null>(initialStats || null);
  const [range, setRange] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs(range);
  }, [range]);

  const fetchLogs = async (r: "week" | "month") => {
    setLoading(true);
    try {
      const response = await fetch(`/api/daily-logs?range=${r}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching daily logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const maxCalories = Math.max(
    dailyTarget,
    ...logs.map((l) => l.caloriesConsumed),
  );

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (range === "week") {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getBarColor = (log: DailyLog) => {
    if (log.caloriesConsumed === 0) return BAR_EMPTY;
    return log.isUnderTarget ? BAR_OLIVE : BAR_TERRACOTTA;
  };

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          {range === "week" ? "This Week" : "This Month"}
        </h3>
        <div className="flex gap-1">
          <Button
            variant={range === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setRange("week")}
          >
            Week
          </Button>
          <Button
            variant={range === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setRange("month")}
          >
            Month
          </Button>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm">No data yet. Start logging meals to see trends.</p>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Avg Consumed</p>
                  <p className="num text-lg font-semibold text-foreground">{stats.avgConsumed}</p>
                  <p className="text-xs text-muted-foreground">cal/day</p>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Compliance</p>
                  <p className="num text-lg font-semibold text-foreground">{stats.complianceRate}%</p>
                  <p className="text-xs text-muted-foreground">days under target</p>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Avg Protein</p>
                  <p className="num text-lg font-semibold text-foreground">{stats.avgProtein}g</p>
                  <p className="text-xs text-muted-foreground">per day</p>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Avg Carbs</p>
                  <p className="num text-lg font-semibold text-foreground">{stats.avgCarbs}g</p>
                  <p className="text-xs text-muted-foreground">per day</p>
                </div>
              </div>
            )}

            {/* Bar Chart */}
            <div className="relative">
              {/* Target line label */}
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span className="num">{dailyTarget} cal target</span>
                <span className="num">{maxCalories} cal max</span>
              </div>

              <div className="flex items-end gap-1 h-[160px] border-b border-l border-border px-1 pb-0">
                {/* Target line */}
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-destructive/40"
                  style={{ bottom: `${(dailyTarget / maxCalories) * 100}%` }}
                />

                {logs.map((log) => {
                  const heightPct = log.caloriesConsumed > 0
                    ? (log.caloriesConsumed / maxCalories) * 100
                    : 0;

                  return (
                    <div
                      key={log.id}
                      className="flex-1 flex flex-col items-center justify-end group relative"
                      style={{ height: "100%" }}
                    >
                      {/* Tooltip */}
                      <div className="surface absolute bottom-full mb-2 hidden group-hover:block z-10 px-2 py-1 text-xs text-foreground whitespace-nowrap">
                        <p className="num font-semibold">{log.caloriesConsumed} cal</p>
                        <p className="num">P: {log.proteinG}g C: {log.carbsG}g F: {log.fatG}g</p>
                        {log.exerciseMinutes > 0 && (
                          <p className="num">Exercise: {log.exerciseMinutes}min</p>
                        )}
                      </div>

                      <div
                        className="w-full rounded-t transition-all hover:opacity-80"
                        style={{
                          height: `${Math.max(heightPct, 2)}%`,
                          backgroundColor: getBarColor(log),
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Day labels */}
              <div className="flex gap-1 mt-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex-1 text-center text-[10px] text-muted-foreground truncate"
                  >
                    {getDayLabel(log.date)}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: BAR_OLIVE }} />
                <span>Under target</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: BAR_TERRACOTTA }} />
                <span>Over target</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: BAR_EMPTY }} />
                <span>No data</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 border-t border-dashed border-destructive/40" />
                <span>Target line</span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
