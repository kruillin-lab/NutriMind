"use client";

import { useState, useEffect, useCallback } from "react";
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
    <div className="surface overflow-hidden">
      <div className="foil" />
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" style={{ color: "var(--brass)" }} />
          <span className="smallcaps">Meal planner</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="btn-ghost h-8 rounded-sm px-3 text-xs">
          <Plus className="mr-1 h-3.5 w-3.5" />
          New plan
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="rounded-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-[-0.02em]">Create meal plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="planName" className="smallcaps">Plan name</Label>
                <Input
                  id="planName"
                  placeholder="e.g., Week of Jan 20"
                  value={newPlan.name}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, name: e.target.value })
                  }
                  className="rounded-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="smallcaps">Start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newPlan.startDate}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, startDate: e.target.value })
                    }
                    className="num rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="smallcaps">End date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newPlan.endDate}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, endDate: e.target.value })
                    }
                    className="num rounded-sm"
                  />
                </div>
              </div>
              <Button
                onClick={createPlan}
                disabled={creating || !newPlan.name || !newPlan.startDate || !newPlan.endDate}
                className="btn-primary w-full rounded-sm"
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : todayPlans.length > 0 ? (
          <div>
            <p className="smallcaps mb-1">Today&apos;s planned meals</p>
            {todayPlans.map((item) => (
              <div
                key={item.id}
                className="ledger-row"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-foreground">
                      {item.name}
                    </span>
                    <span className="smallcaps">
                      {item.mealType.toLowerCase()}
                    </span>
                  </div>
                  <div className="num mt-1 text-xs text-muted-foreground">
                    {item.calories} cal · P: {item.proteinG}g · C: {item.carbsG}g
                    · F: {item.fatG}g
                  </div>
                </div>
                {item.isLogged ? (
                  <div className="flex items-center gap-1 text-sm" style={{ color: "var(--ledger-green)" }}>
                    <Check className="h-4 w-4" />
                    <span className="smallcaps">Logged</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => logMeal(item.id)}
                    disabled={loggingId === item.id}
                    className="btn-ghost h-7 rounded-sm px-2 text-xs"
                  >
                    {loggingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1">Log</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : plans.length > 0 ? (
          <div>
            <p className="smallcaps mb-1">No meals planned for today</p>
            <div>
              {plans.slice(0, 3).map((plan) => (
                <div
                  key={plan.id}
                  className="ledger-row"
                >
                  <div>
                    <div className="text-sm text-foreground">{plan.name}</div>
                    <div className="num text-xs text-muted-foreground">
                      {formatDate(plan.startDate)} – {formatDate(plan.endDate)} ·{" "}
                      {plan.items.length} meals
                    </div>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No meal plans yet.</p>
            <p className="mt-1 text-xs">Create a plan to start scheduling meals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
