"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Calendar, Plus, Check, Loader2, CalendarDays } from "lucide-react";
import { formatLocalDateKey } from "@/lib/date-utils";

interface MealPlanItem {
  id: string;
  plannedDate: string;
  mealType: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isLogged: boolean;
}

interface MealPlan {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  items: MealPlanItem[];
}

export default function MealPlanner() {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/meal-plans?includeItems=true");
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error("Failed to fetch meal plans:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async () => {
    if (!newPlan.name || !newPlan.startDate || !newPlan.endDate) return;

    setCreating(true);
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      });
      const data = await res.json();
      if (data.success) {
        setPlans([data.plan, ...plans]);
        setNewPlan({ name: "", startDate: "", endDate: "" });
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to create plan:", error);
    } finally {
      setCreating(false);
    }
  };

  const logMeal = async (itemId: string) => {
    setLoggingId(itemId);
    try {
      const res = await fetch("/api/meal-plans/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        await fetchPlans();
      }
    } catch (error) {
      console.error("Failed to log meal:", error);
    } finally {
      setLoggingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getTodayPlans = () => {
    const today = formatLocalDateKey(new Date());
    return plans
      .filter(
        (p) =>
          new Date(p.startDate) <= new Date(today) &&
          new Date(p.endDate) >= new Date(today)
      )
      .flatMap((p) =>
        p.items
          .filter((i) => i.plannedDate.startsWith(today))
          .map((i) => ({ ...i, planName: p.name }))
      );
  };

  const todayPlans = getTodayPlans();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Meal Planner</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Plan
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Meal Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="planName">Plan Name</Label>
                  <Input
                    id="planName"
                    placeholder="e.g., Week of Jan 20"
                    value={newPlan.name}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newPlan.startDate}
                      onChange={(e) =>
                        setNewPlan({ ...newPlan, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newPlan.endDate}
                      onChange={(e) =>
                        setNewPlan({ ...newPlan, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={createPlan}
                  disabled={creating || !newPlan.name || !newPlan.startDate || !newPlan.endDate}
                  className="w-full"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : todayPlans.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Today&apos;s Planned Meals
            </div>
            {todayPlans.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {item.mealType.toLowerCase()}
                    </span>
                  </div>
                  <div className="num text-xs text-muted-foreground mt-1">
                    {item.calories} cal · P: {item.proteinG}g · C: {item.carbsG}g
                    · F: {item.fatG}g
                  </div>
                </div>
                {item.isLogged ? (
                  <div className="flex items-center gap-1 text-chart-2 text-sm">
                    <Check className="h-4 w-4" />
                    <span className="text-xs">Logged</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => logMeal(item.id)}
                    disabled={loggingId === item.id}
                  >
                    {loggingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1 text-xs">Log</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : plans.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              No meals planned for today
            </div>
            <div className="space-y-2">
              {plans.slice(0, 3).map((plan) => (
                <div
                  key={plan.id}
                  className="p-3 rounded-xl border border-border bg-card/50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-sm">{plan.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(plan.startDate)} - {formatDate(plan.endDate)} ·{" "}
                      {plan.items.length} meals
                    </div>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No meal plans yet.</p>
            <p className="text-xs mt-1">Create a plan to start scheduling meals.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
