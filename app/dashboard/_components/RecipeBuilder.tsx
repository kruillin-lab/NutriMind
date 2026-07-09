"use client";

import { useState, useEffect } from "react";
import {
  ChefHat, Plus, Trash2, Send, Loader2, X, Edit2, Check,
  Sparkles, UtensilsCrossed,
} from "lucide-react";

interface Ingredient {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  ingredients: string; // JSON
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  useCount: number;
}

const EMPTY_INGREDIENT: Ingredient = {
  name: "", calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0,
};

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"];

export function RecipeBuilder() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [recipeName, setRecipeName] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ ...EMPTY_INGREDIENT }]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // AI ingredient parsing
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Log state
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [logMealType, setLogMealType] = useState("OTHER");
  const [logServings, setLogServings] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/recipes");
      const data = await res.json();
      if (data.success) setRecipes(data.recipes);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setRecipeName(""); setDescription(""); setServings("1");
    setIngredients([{ ...EMPTY_INGREDIENT }]);
    setFormError(null); setAiInput("");
    setShowForm(true);
  }

  function openEdit(r: Recipe) {
    setEditingId(r.id);
    setRecipeName(r.name);
    setDescription(r.description ?? "");
    setServings(String(r.servings));
    setIngredients(JSON.parse(r.ingredients));
    setFormError(null); setAiInput("");
    setShowForm(true);
  }

  function updateIngredient(idx: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === "name" ? value : Number(value) || 0 };
      return next;
    });
  }

  async function parseWithAI() {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiInput.trim() }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.foods)) {
        const parsed: Ingredient[] = data.foods.map((f: {
          name: string; calories: number; protein?: number;
          carbs?: number; fat?: number; fiber?: number; sugar?: number; sodium?: number;
        }) => ({
          name: f.name, calories: f.calories, proteinG: f.protein ?? 0,
          carbsG: f.carbs ?? 0, fatG: f.fat ?? 0, fiberG: f.fiber ?? 0,
          sugarG: f.sugar ?? 0, sodiumMg: f.sodium ?? 0,
        }));
        setIngredients((prev) => {
          const withoutEmpty = prev.filter((i) => i.name.trim());
          return [...withoutEmpty, ...parsed];
        });
        setAiInput("");
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    if (!recipeName.trim()) { setFormError("Recipe name is required"); return; }
    const validIngredients = ingredients.filter((i) => i.name.trim());
    if (validIngredients.length === 0) { setFormError("Add at least one ingredient"); return; }
    setSaving(true); setFormError(null);
    try {
      const body = {
        name: recipeName.trim(), description: description.trim() || undefined,
        servings: Math.max(1, parseInt(servings) || 1),
        ingredients: validIngredients,
      };
      const url = editingId ? `/api/recipes/${editingId}` : "/api/recipes";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to save");
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecipe(id: string) {
    if (!confirm("Delete this recipe?")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    load();
  }

  async function logRecipe(id: string) {
    setLoggingId(id);
    try {
      const servingCount = parseFloat(logServings[id] || "1") || 1;
      const res = await fetch(`/api/recipes/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealType: logMealType, servings: servingCount }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed");
      window.location.reload();
    } finally {
      setLoggingId(null);
    }
  }

  const totalCals = ingredients.reduce((s, i) => s + i.calories, 0);
  const totalProt = ingredients.reduce((s, i) => s + i.proteinG, 0);
  const totalCarbs = ingredients.reduce((s, i) => s + i.carbsG, 0);
  const totalFat = ingredients.reduce((s, i) => s + i.fatG, 0);
  const srv = Math.max(1, parseInt(servings) || 1);

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/[0.08] px-5 py-4">
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-[#FF5A3D]" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B5738]">Recipe Builder</span>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg border border-[#18120E]/20 bg-[#FFF0B8] px-2.5 py-1.5 text-[11px] font-medium text-[#18120E] hover:bg-[#DFFF35] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Recipe
        </button>
      </div>

      {/* Form overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#18120E]/20 bg-[#FFF8E7] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#18120E]">{editingId ? "Edit Recipe" : "New Recipe"}</h3>
              <button onClick={() => setShowForm(false)} className="text-[#6B5738] hover:text-[#18120E]">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Name + servings */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#6B5738] mb-1">Recipe name *</label>
                <input
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g. Protein Oat Bowl"
                  className="w-full rounded-lg border border-[#18120E]/20 bg-[#FFF0B8] px-3 py-2 text-sm text-[#18120E] outline-none focus:border-[#18120E]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#6B5738] mb-1">Servings</label>
                <input
                  type="number" min="1" value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="w-full rounded-lg border border-[#18120E]/20 bg-[#FFF0B8] px-3 py-2 text-sm text-[#18120E] outline-none focus:border-[#18120E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#6B5738] mb-1">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description…"
                className="w-full rounded-lg border border-[#18120E]/20 bg-[#FFF0B8] px-3 py-2 text-sm text-[#18120E] outline-none focus:border-[#18120E]"
              />
            </div>

            {/* AI ingredient parser */}
            <div className="rounded-lg border border-[#DFFF35]/40 bg-[#DFFF35]/10 p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B5738]">Add ingredients with AI</p>
              <div className="flex gap-2">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && parseWithAI()}
                  placeholder="e.g. 100g oats, 2 eggs, 1 banana"
                  className="flex-1 rounded-lg border border-[#18120E]/20 bg-[#FFF0B8] px-3 py-2 text-sm text-[#18120E] outline-none focus:border-[#18120E]"
                />
                <button
                  onClick={parseWithAI}
                  disabled={!aiInput.trim() || aiLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-[#18120E] bg-[#DFFF35] px-3 py-2 text-xs font-semibold text-[#18120E] disabled:opacity-40"
                >
                  {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Parse
                </button>
              </div>
            </div>

            {/* Ingredients list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B5738]">Ingredients ({ingredients.length})</p>
                <button
                  onClick={() => setIngredients((p) => [...p, { ...EMPTY_INGREDIENT }])}
                  className="text-[11px] text-[#6B5738] hover:text-[#18120E] flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add row
                </button>
              </div>

              {ingredients.map((ing, idx) => (
                <div key={idx} className="rounded-lg border border-[#18120E]/10 bg-[#FFF0B8] p-2 space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      value={ing.name}
                      onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                      placeholder="Ingredient name"
                      className="flex-1 rounded border border-[#18120E]/15 bg-white/60 px-2 py-1 text-sm text-[#18120E] outline-none focus:border-[#18120E]"
                    />
                    <button onClick={() => setIngredients((p) => p.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(["calories", "proteinG", "carbsG", "fatG"] as const).map((field) => (
                      <label key={field} className="block">
                        <span className="block text-[9px] font-semibold uppercase tracking-wider text-[#8A7350] mb-0.5">
                          {field === "calories" ? "kcal" : field === "proteinG" ? "prot g" : field === "carbsG" ? "carbs g" : "fat g"}
                        </span>
                        <input
                          type="number" min="0" step="any"
                          value={ing[field] || ""}
                          onChange={(e) => updateIngredient(idx, field, e.target.value)}
                          className="w-full rounded border border-[#18120E]/15 bg-white/60 px-1.5 py-1 text-xs text-[#18120E] outline-none focus:border-[#18120E]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals preview */}
            {ingredients.some((i) => i.name.trim()) && (
              <div className="rounded-lg bg-[#18120E] p-3 text-[#FFF8E7]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FFF8E7]/60 mb-2">
                  Total · {totalCals} kcal {srv > 1 && <span>({Math.round(totalCals / srv)} per serving)</span>}
                </p>
                <div className="flex gap-4 text-xs">
                  <span>P <strong>{Math.round(totalProt)}g</strong></span>
                  <span>C <strong>{Math.round(totalCarbs)}g</strong></span>
                  <span>F <strong>{Math.round(totalFat)}g</strong></span>
                </div>
              </div>
            )}

            {formError && <p className="text-xs text-rose-400">{formError}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-[#18120E]/20 py-2.5 text-sm text-[#6B5738] hover:bg-[#FFE8A8]">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-[#18120E] bg-[#00C875] py-2.5 text-sm font-semibold text-[#18120E] shadow-[3px_3px_0_#18120E] hover:bg-[#DFFF35] disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? "Save Changes" : "Create Recipe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipes list */}
      <div className="p-5 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[#6B5738]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading recipes…
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <UtensilsCrossed className="h-8 w-8 text-[#6B5738]/40" />
            <p className="text-sm text-[#6B5738]">No recipes yet</p>
            <p className="text-xs text-[#8A7350]">Create a recipe with ingredients to reuse it for meal logging.</p>
          </div>
        ) : (
          <>
            {/* Meal type selector for logging */}
            <div className="flex gap-1 flex-wrap mb-1">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setLogMealType(t)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors ${
                    logMealType === t
                      ? "border-[#18120E] bg-[#DFFF35] text-[#18120E]"
                      : "border-black/10 text-[#6B5738] hover:bg-[#FFE8A8]"
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            {recipes.map((r) => {
              const ing = JSON.parse(r.ingredients) as Ingredient[];
              const perServ = r.servings > 1;
              return (
                <div key={r.id} className="rounded-xl border border-[#18120E]/10 bg-[#FFF0B8] p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-[#18120E]">{r.name}</p>
                      <p className="text-[11px] text-[#6B5738]">
                        {ing.length} ingredient{ing.length !== 1 ? "s" : ""} · {r.servings} serving{r.servings !== 1 ? "s" : ""}
                        {r.useCount > 0 && ` · logged ${r.useCount}×`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(r)} className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B5738] hover:bg-[#FFE8A8] hover:text-[#18120E]">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteRecipe(r.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B5738] hover:bg-rose-100 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#6B5738]">
                    <span className="font-semibold text-[#18120E]">{perServ ? Math.round(r.calories / r.servings) : r.calories} kcal</span>
                    <span>P {perServ ? Math.round(r.proteinG / r.servings * 10) / 10 : r.proteinG}g</span>
                    <span>C {perServ ? Math.round(r.carbsG / r.servings * 10) / 10 : r.carbsG}g</span>
                    <span>F {perServ ? Math.round(r.fatG / r.servings * 10) / 10 : r.fatG}g</span>
                    {perServ && <span className="text-[#8A7350]">per serving</span>}
                  </div>

                  <div className="flex gap-2">
                    {r.servings > 1 && (
                      <input
                        type="number" min="0.25" step="0.25"
                        value={logServings[r.id] ?? "1"}
                        onChange={(e) => setLogServings((p) => ({ ...p, [r.id]: e.target.value }))}
                        className="w-16 rounded border border-[#18120E]/20 bg-white/60 px-2 py-1 text-xs text-[#18120E] outline-none"
                        title="Servings to log"
                      />
                    )}
                    <button
                      onClick={() => logRecipe(r.id)}
                      disabled={loggingId === r.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#18120E] bg-[#00C875] py-1.5 text-xs font-semibold text-[#18120E] hover:bg-[#DFFF35] disabled:opacity-40 transition-colors"
                    >
                      {loggingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Log Meal
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
