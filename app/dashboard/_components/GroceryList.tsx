"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, Plus, Trash2, Check, RefreshCw, Loader2, X } from "lucide-react";

interface MealPlanItem {
  id: string;
  name: string;
  plannedDate: string;
  mealType: string;
  calories: number;
}

interface GroceryItem {
  id: string;
  text: string;
  checked: boolean;
  source: "plan" | "manual";
  planItemId?: string;
}

const STORAGE_KEY = "nutrimind_grocery_list";

function loadStored(): GroceryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(items: GroceryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function GroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [planItems, setPlanItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setItems(loadStored());
    loadPlan();
  }, []);

  async function loadPlan() {
    setLoading(true);
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setDate(end.getDate() + 7);

      const res = await fetch("/api/meal-plans?includeItems=true");
      const data = await res.json();
      if (!data.success) return;

      const upcoming: MealPlanItem[] = [];
      for (const plan of data.plans) {
        for (const item of plan.items ?? []) {
          const d = new Date(item.plannedDate);
          if (d >= today && d <= end && !item.isLogged) {
            upcoming.push({
              id: item.id,
              name: item.name,
              plannedDate: item.plannedDate,
              mealType: item.mealType,
              calories: item.calories,
            });
          }
        }
      }
      upcoming.sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
      setPlanItems(upcoming);
    } finally {
      setLoading(false);
    }
  }

  const syncFromPlan = useCallback(() => {
    setSyncing(true);
    setItems((prev) => {
      const existingPlanIds = new Set(prev.filter((i) => i.source === "plan").map((i) => i.planItemId));
      const newPlanItems: GroceryItem[] = planItems
        .filter((pi) => !existingPlanIds.has(pi.id))
        .map((pi) => ({
          id: `plan-${pi.id}`,
          text: pi.name,
          checked: false,
          source: "plan",
          planItemId: pi.id,
        }));
      const updated = [...prev, ...newPlanItems];
      persist(updated);
      setSyncing(false);
      return updated;
    });
  }, [planItems]);

  function toggle(id: string) {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i));
      persist(next);
      return next;
    });
  }

  function remove(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      persist(next);
      return next;
    });
  }

  function addManual() {
    const text = newItem.trim();
    if (!text) return;
    setItems((prev) => {
      const next = [...prev, { id: `manual-${Date.now()}`, text, checked: false, source: "manual" as const }];
      persist(next);
      return next;
    });
    setNewItem("");
  }

  function clearChecked() {
    setItems((prev) => {
      const next = prev.filter((i) => !i.checked);
      persist(next);
      return next;
    });
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const newPlanCount = planItems.filter(
    (pi) => !items.some((i) => i.source === "plan" && i.planItemId === pi.id)
  ).length;

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/[0.08] px-5 py-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-[#00C875]" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B5738]">Grocery List</span>
          {items.length > 0 && (
            <span className="rounded-full bg-[#18120E] px-1.5 py-0.5 text-[10px] font-semibold text-[#DFFF35]">
              {unchecked.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {newPlanCount > 0 && (
            <button
              onClick={syncFromPlan}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg border border-[#18120E]/20 bg-[#00C875]/20 px-2.5 py-1.5 text-[11px] font-medium text-[#18120E] hover:bg-[#00C875]/40 transition-colors"
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              +{newPlanCount} from plan
            </button>
          )}
          {checked.length > 0 && (
            <button
              onClick={clearChecked}
              className="flex items-center gap-1.5 rounded-lg border border-[#18120E]/20 bg-[#FFF0B8] px-2.5 py-1.5 text-[11px] font-medium text-[#6B5738] hover:bg-rose-100 hover:text-rose-600 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear done
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Upcoming plan preview */}
        {!loading && planItems.length > 0 && (
          <div className="rounded-xl border border-[#18120E]/10 bg-[#FFF0B8] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B5738] mb-2">
              Planned meals (next 7 days)
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {planItems.map((pi) => (
                <div key={pi.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-[#18120E]">{pi.name}</span>
                  <span className="text-[#8A7350] shrink-0 ml-2">{fmt(pi.plannedDate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add manual item */}
        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addManual()}
            placeholder="Add item… (e.g. chicken breast, oats)"
            className="flex-1 rounded-lg border-2 border-[#18120E]/20 bg-[#FFF0B8] px-3 py-2 text-sm text-[#18120E] outline-none transition-colors placeholder:text-[#8A7350] focus:border-[#18120E]"
          />
          <button
            onClick={addManual}
            disabled={!newItem.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#18120E] bg-[#DFFF35] text-[#18120E] shadow-[2px_2px_0_#18120E] hover:bg-[#00C875] disabled:opacity-40 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[#6B5738]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-sm text-[#6B5738]">Your grocery list is empty</p>
            <p className="text-xs text-[#8A7350]">Add items manually or sync from your meal plan.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Unchecked */}
            {unchecked.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#FFF0B8] group transition-colors"
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-[#18120E]/30 hover:border-[#00C875] hover:bg-[#00C875]/10 transition-colors"
                >
                  <span />
                </button>
                <span className="flex-1 text-sm text-[#18120E]">
                  {item.text}
                  {item.source === "plan" && (
                    <span className="ml-1.5 text-[10px] text-[#8A7350]">(planned)</span>
                  )}
                </span>
                <button
                  onClick={() => remove(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#8A7350] hover:text-rose-500 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Checked items */}
            {checked.length > 0 && (
              <>
                <div className="pt-2 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A7350]">
                    Done ({checked.length})
                  </p>
                </div>
                {checked.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#FFF0B8] group transition-colors opacity-50"
                  >
                    <button
                      onClick={() => toggle(item.id)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-[#00C875] bg-[#00C875] text-white transition-colors"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <span className="flex-1 text-sm text-[#6B5738] line-through">{item.text}</span>
                    <button
                      onClick={() => remove(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#8A7350] hover:text-rose-500 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
