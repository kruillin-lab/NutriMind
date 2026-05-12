"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, Loader2, Check, Utensils } from "lucide-react";

interface CachedFood {
  id: string;
  name: string;
  originalText: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  hitCount: number;
}

interface FoodDatabaseSearchProps {
  onMealAdded?: () => void;
}

export default function FoodDatabaseSearch({ onMealAdded }: FoodDatabaseSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CachedFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchFoods = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/cached-foods?query=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await res.json();
      if (data.success) setResults(data.foods);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setAddedId(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchFoods(value), 300);
  };

  const handleAddFood = async (food: CachedFood) => {
    setAddingId(food.id);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: food.name,
          calories: food.calories,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
          fiberG: food.fiberG || 0,
          sugarG: food.sugarG || 0,
          sodiumMg: food.sodiumMg || 0,
          mealType: "OTHER",
        }),
      });
      if (res.ok) {
        setAddedId(food.id);
        onMealAdded?.();
        setTimeout(() => setAddedId(null), 2000);
      }
    } catch {
      // silent
    } finally {
      setAddingId(null);
    }
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center gap-2 border-b border-black/[0.08] px-5 py-4">
        <Utensils className="h-4 w-4 text-[#FFB000]" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B5738]">Food Database Search</span>
      </div>

      <div className="p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B5738]" />
          <input
            type="text"
            placeholder="Search foods (e.g. chicken, rice, banana)…"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full rounded-lg border-2 border-[#18120E]/20 bg-[#FFF0B8] py-2 pl-9 pr-4 text-sm text-[#18120E] outline-none transition-colors placeholder:text-[#8A7350] focus:border-[#18120E] focus:ring-2 focus:ring-[#DFFF35]/70"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#6B5738]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching…
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <p className="py-6 text-center text-xs text-[#6B5738]">
            No foods found. Log meals with AI to build your database.
          </p>
        )}

        {!searched && !loading && (
          <p className="py-4 text-center text-xs text-[#8A7350]">Type to search your food database.</p>
        )}

        {!loading && results.length > 0 && (
          <div className="-mx-5 max-h-72 divide-y divide-black/[0.06] overflow-y-auto">
            {results.map((food) => (
              <div key={food.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[#FFE8A8]">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-[#2A2017]">{food.name}</p>
                  <p className="mt-0.5 text-[11px] text-[#6B5738]">
                    <span className="text-[#2A2017]">{food.calories} kcal</span>
                    {" · "}P:{food.proteinG}g · C:{food.carbsG}g · F:{food.fatG}g
                    {food.fiberG ? ` · Fiber:${food.fiberG}g` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleAddFood(food)}
                  disabled={!!addingId}
                  className={`ml-4 shrink-0 flex items-center justify-center h-7 w-7 rounded-lg border transition-colors ${
                    addedId === food.id
                      ? "border-[#18120E] bg-[#DFFF35] text-[#18120E]"
                      : "border-black/[0.16] bg-[#FFF8E7] text-[#6B5738] hover:border-black/[0.24] hover:bg-[#FFE8A8] hover:text-[#18120E]"
                  } disabled:opacity-40`}
                >
                  {addingId === food.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : addedId === food.id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
