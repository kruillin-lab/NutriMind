"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Minus, Plus, Save, Trash2, Star, Utensils } from "lucide-react";

interface MealTemplate {
  id: string;
  name: string;
  mealType: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  vitaminCMg: number;
  calciumMg: number;
  ironMg: number;
  potassiumMg: number;
  servingSizeG: number | null;
  useCount: number;
  lastUsedAt: string | null;
}

interface MealTemplatesProps {
  onUseTemplate: (template: MealTemplate, quantity: number) => void;
}

const DEFAULT_TEMPLATE_QUANTITY = 1;
const MIN_TEMPLATE_QUANTITY = 0.25;
const MAX_TEMPLATE_QUANTITY = 99;

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TEMPLATE_QUANTITY;
  }

  return Math.min(MAX_TEMPLATE_QUANTITY, Math.max(MIN_TEMPLATE_QUANTITY, value));
}

function parseQuantity(value: string | undefined) {
  const parsed = Number(value ?? DEFAULT_TEMPLATE_QUANTITY);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return normalizeQuantity(parsed);
}

export function MealTemplates({ onUseTemplate }: MealTemplatesProps) {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templateQuantities, setTemplateQuantities] = useState<Record<string, string>>({});
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    mealType: "OTHER",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/meal-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.calories) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/meal-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplate.name,
          mealType: newTemplate.mealType,
          calories: parseInt(newTemplate.calories, 10),
          proteinG: parseInt(newTemplate.proteinG, 10) || 0,
          carbsG: parseInt(newTemplate.carbsG, 10) || 0,
          fatG: parseInt(newTemplate.fatG, 10) || 0,
        }),
      });

      if (response.ok) {
        setNewTemplate({ name: "", mealType: "OTHER", calories: "", proteinG: "", carbsG: "", fatG: "" });
        setIsCreating(false);
        await fetchTemplates();
      }
    } catch (error) {
      console.error("Error creating template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/meal-templates?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const getQuantityInput = (templateId: string) =>
    templateQuantities[templateId] ?? String(DEFAULT_TEMPLATE_QUANTITY);

  const handleQuantityChange = (templateId: string, value: string) => {
    setTemplateQuantities((prev) => ({
      ...prev,
      [templateId]: value,
    }));
  };

  const handleQuantityStep = (templateId: string, delta: number) => {
    const current = parseQuantity(getQuantityInput(templateId)) ?? DEFAULT_TEMPLATE_QUANTITY;
    const next = normalizeQuantity(current + delta);

    setTemplateQuantities((prev) => ({
      ...prev,
      [templateId]: formatQuantity(next),
    }));
  };

  const handleLogTemplate = (template: MealTemplate) => {
    const quantity = parseQuantity(getQuantityInput(template.id));
    if (!quantity) return;

    const normalizedQuantity = normalizeQuantity(quantity);
    setTemplateQuantities((prev) => ({
      ...prev,
      [template.id]: formatQuantity(normalizedQuantity),
    }));
    onUseTemplate(template, normalizedQuantity);
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
        Loading templates…
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden">
      <div className="foil" />
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4" style={{ color: "var(--brass)" }} />
          <span className="smallcaps">My templates</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(!isCreating)}
          className="btn-ghost h-8 rounded-sm px-3 text-xs"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          {isCreating ? "Cancel" : "Add"}
        </Button>
      </div>

      <div className="px-5 py-4">
        {isCreating && (
          <div className="surface-raised mb-4 space-y-3 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tmpl-name" className="smallcaps">
                  Name
                </Label>
                <Input
                  id="tmpl-name"
                  placeholder="My usual breakfast"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="rounded-sm"
                />
              </div>
              <div>
                <Label htmlFor="tmpl-type" className="smallcaps">
                  Type
                </Label>
                <Select
                  value={newTemplate.mealType}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, mealType: v || "OTHER" })}
                >
                  <SelectTrigger id="tmpl-type" className="w-full rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                    <SelectItem value="LUNCH">Lunch</SelectItem>
                    <SelectItem value="DINNER">Dinner</SelectItem>
                    <SelectItem value="SNACK">Snack</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label htmlFor="tmpl-cal" className="smallcaps">
                  Calories
                </Label>
                <Input
                  id="tmpl-cal"
                  type="number"
                  placeholder="350"
                  value={newTemplate.calories}
                  onChange={(e) => setNewTemplate({ ...newTemplate, calories: e.target.value })}
                  className="num rounded-sm"
                />
              </div>
              <div>
                <Label htmlFor="tmpl-protein" className="smallcaps">
                  Protein (g)
                </Label>
                <Input
                  id="tmpl-protein"
                  type="number"
                  placeholder="25"
                  value={newTemplate.proteinG}
                  onChange={(e) => setNewTemplate({ ...newTemplate, proteinG: e.target.value })}
                  className="num rounded-sm"
                />
              </div>
              <div>
                <Label htmlFor="tmpl-carbs" className="smallcaps">
                  Carbs (g)
                </Label>
                <Input
                  id="tmpl-carbs"
                  type="number"
                  placeholder="40"
                  value={newTemplate.carbsG}
                  onChange={(e) => setNewTemplate({ ...newTemplate, carbsG: e.target.value })}
                  className="num rounded-sm"
                />
              </div>
              <div>
                <Label htmlFor="tmpl-fat" className="smallcaps">
                  Fat (g)
                </Label>
                <Input
                  id="tmpl-fat"
                  type="number"
                  placeholder="10"
                  value={newTemplate.fatG}
                  onChange={(e) => setNewTemplate({ ...newTemplate, fatG: e.target.value })}
                  className="num rounded-sm"
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={isSaving} size="sm" className="btn-primary w-full rounded-sm">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save template
            </Button>
          </div>
        )}

        {templates.length === 0 && !isCreating ? (
          <div className="py-6 text-center text-muted-foreground">
            <Utensils className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">No templates yet</p>
            <p className="mt-1 text-xs">Save your go-to meals for quick logging</p>
          </div>
        ) : (
          <div>
            {templates.map((tmpl) => {
              const quantityInput = getQuantityInput(tmpl.id);
              const quantity = parseQuantity(quantityInput);
              const isMultiplied = quantity != null && quantity !== DEFAULT_TEMPLATE_QUANTITY;
              const totalCalories = quantity != null ? Math.round(tmpl.calories * quantity) : tmpl.calories;

              return (
              <div
                key={tmpl.id}
                className="ledger-row flex-col items-stretch gap-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="pill">{tmpl.mealType}</span>
                    <p className="truncate text-sm text-foreground">{tmpl.name}</p>
                  </div>
                  <p className="num mt-1 text-xs text-muted-foreground">
                    {tmpl.calories} cal · P: {tmpl.proteinG}g · C: {tmpl.carbsG}g · F: {tmpl.fatG}g
                    {isMultiplied && (
                      <span className="ml-2 text-foreground">
                        · Total {totalCalories} cal
                      </span>
                    )}
                    {tmpl.useCount > 0 && (
                      <span className="ml-2">· Used {tmpl.useCount}x</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1 sm:flex-nowrap">
                  <div className="flex h-8 items-center overflow-hidden rounded-sm border border-input bg-card">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-none text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-35"
                      onClick={() => handleQuantityStep(tmpl.id, -1)}
                      disabled={quantity != null && quantity <= MIN_TEMPLATE_QUANTITY}
                    >
                      <Minus className="h-3.5 w-3.5" />
                      <span className="sr-only">Decrease quantity</span>
                    </Button>
                    <Input
                      aria-label={`Quantity for ${tmpl.name}`}
                      type="number"
                      min={MIN_TEMPLATE_QUANTITY}
                      max={MAX_TEMPLATE_QUANTITY}
                      step="0.25"
                      inputMode="decimal"
                      value={quantityInput}
                      onChange={(e) => handleQuantityChange(tmpl.id, e.target.value)}
                      onBlur={() => {
                        const nextQuantity = parseQuantity(getQuantityInput(tmpl.id)) ?? DEFAULT_TEMPLATE_QUANTITY;
                        handleQuantityChange(tmpl.id, formatQuantity(nextQuantity));
                      }}
                      className="num h-7 w-14 rounded-none border-x border-y-0 border-border bg-secondary px-1 text-center text-xs font-semibold text-foreground shadow-none focus-visible:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-none text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-35"
                      onClick={() => handleQuantityStep(tmpl.id, 1)}
                      disabled={quantity != null && quantity >= MAX_TEMPLATE_QUANTITY}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="sr-only">Increase quantity</span>
                    </Button>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleLogTemplate(tmpl)}
                    disabled={!quantity}
                    className="btn-primary h-8 rounded-sm px-3 text-xs"
                  >
                    Log
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-sm text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(tmpl.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
