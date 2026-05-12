"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    if (log.caloriesConsumed === 0) return "bg-gray-200";
    return log.isUnderTarget ? "bg-green-500" : "bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {range === "week" ? "This Week" : "This Month"}
          </CardTitle>
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
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No data yet. Start logging meals to see trends.</p>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">Avg Consumed</p>
                  <p className="text-lg font-bold text-blue-700">{stats.avgConsumed}</p>
                  <p className="text-xs text-blue-500">cal/day</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600">Compliance</p>
                  <p className="text-lg font-bold text-green-700">{stats.complianceRate}%</p>
                  <p className="text-xs text-green-500">days under target</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600">Avg Protein</p>
                  <p className="text-lg font-bold text-purple-700">{stats.avgProtein}g</p>
                  <p className="text-xs text-purple-500">per day</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-600">Avg Carbs</p>
                  <p className="text-lg font-bold text-orange-700">{stats.avgCarbs}g</p>
                  <p className="text-xs text-orange-500">per day</p>
                </div>
              </div>
            )}

            {/* Bar Chart */}
            <div className="relative">
              {/* Target line label */}
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{dailyTarget} cal target</span>
                <span>{maxCalories} cal max</span>
              </div>

              <div className="flex items-end gap-1 h-[160px] border-b border-l border-gray-200 px-1 pb-0">
                {/* Target line */}
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-red-300"
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
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        <p className="font-semibold">{log.caloriesConsumed} cal</p>
                        <p>P: {log.proteinG}g C: {log.carbsG}g F: {log.fatG}g</p>
                        {log.exerciseMinutes > 0 && (
                          <p>Exercise: {log.exerciseMinutes}min</p>
                        )}
                      </div>

                      <div
                        className={`w-full rounded-t ${getBarColor(log)} transition-all hover:opacity-80`}
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
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
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Under target</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Over target</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-200" />
                <span>No data</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 border-t-2 border-dashed border-red-300" />
                <span>Target line</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
