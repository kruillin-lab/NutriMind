"use client";

import { useState, useEffect } from "react";
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

// Vault ledger palette: green = under target (deposit), brass = over target (drawn down)
const BAR_GREEN = "var(--ledger-green)";
const BAR_BRASS = "var(--brass)";
const BAR_EMPTY = "color-mix(in srgb, var(--foreground) 8%, transparent)";

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
    return log.isUnderTarget ? BAR_GREEN : BAR_BRASS;
  };

  return (
    <section className="surface overflow-hidden">
      <div className="foil" />
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="flex items-center gap-2 smallcaps">
          <BarChart3 className="h-4 w-4" style={{ color: "var(--brass)" }} />
          {range === "week" ? "This Week" : "This Month"}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setRange("week")}
            className={range === "week" ? "btn-primary h-8 px-3 text-xs" : "btn-ghost h-8 px-3 text-xs"}
          >
            Week
          </button>
          <button
            onClick={() => setRange("month")}
            className={range === "month" ? "btn-primary h-8 px-3 text-xs" : "btn-ghost h-8 px-3 text-xs"}
          >
            Month
          </button>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden border border-border bg-border">
                <div className="bg-card p-3">
                  <p className="smallcaps">Avg Consumed</p>
                  <p className="num-display text-lg text-foreground">{stats.avgConsumed}</p>
                  <p className="smallcaps">cal/day</p>
                </div>
                <div className="bg-card p-3">
                  <p className="smallcaps">Compliance</p>
                  <p className="num-display text-lg text-foreground">{stats.complianceRate}%</p>
                  <p className="smallcaps">days under target</p>
                </div>
                <div className="bg-card p-3">
                  <p className="smallcaps">Avg Protein</p>
                  <p className="num-display text-lg text-foreground">{stats.avgProtein}g</p>
                  <p className="smallcaps">per day</p>
                </div>
                <div className="bg-card p-3">
                  <p className="smallcaps">Avg Carbs</p>
                  <p className="num-display text-lg text-foreground">{stats.avgCarbs}g</p>
                  <p className="smallcaps">per day</p>
                </div>
              </div>
            )}

            {/* Bar Chart — ledger columns */}
            <div className="relative">
              <div className="flex justify-between smallcaps mb-1">
                <span className="num">{dailyTarget} cal target</span>
                <span className="num">{maxCalories} cal max</span>
              </div>

              <div className="flex items-end gap-1 h-[160px] border-b-2 border-foreground px-1 pb-0">
                {/* Target line */}
                <div
                  className="absolute left-0 right-0 border-t border-dashed"
                  style={{ bottom: `${(dailyTarget / maxCalories) * 100}%`, borderColor: "var(--destructive)" }}
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
                        className="w-full transition-opacity hover:opacity-80"
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
                    className="num flex-1 text-center text-[10px] text-muted-foreground truncate"
                  >
                    {getDayLabel(log.date)}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals — double rule */}
            {stats && (
              <div className="flex items-baseline justify-between border-t-2 border-foreground pt-3">
                <span className="smallcaps">Days under target</span>
                <span className="num-display text-xl text-foreground">
                  {stats.daysUnderTarget}
                  <span className="text-sm text-muted-foreground">/{stats.daysTotal}</span>
                </span>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 smallcaps">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: BAR_GREEN }} />
                <span>Under target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: BAR_BRASS }} />
                <span>Over target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: BAR_EMPTY }} />
                <span>No data</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 border-t border-dashed" style={{ borderColor: "var(--destructive)" }} />
                <span>Target line</span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
