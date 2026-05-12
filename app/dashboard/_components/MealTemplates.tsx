"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const mealTypeColors: Record<string, string> = {
  BREAKFAST: "bg-orange-100 text-orange-800",
  LUNCH: "bg-green-100 text-green-800",
  DINNER: "bg-blue-100 text-blue-800",
  SNACK: "bg-purple-100 text-purple-800",
  OTHER: "bg-gray-100 text-gray-800",
};

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
      <div className="text-center py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
        Loading templates...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Star className="h-5 w-5 text-yellow-500" />
            My Templates
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(!isCreating)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {isCreating ? "Cancel" : "Add"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isCreating && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tmpl-name" className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="tmpl-name"
                  placeholder="My usual breakfast"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tmpl-type" className="text-xs text-muted-foreground">
                  Type
                </Label>
                <Select
                  value={newTemplate.mealType}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, mealType: v || "OTHER" })}
                >
                  <SelectTrigger id="tmpl-type">
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
                <Label htmlFor="tmpl-cal" className="text-xs text-muted-foreground">
                  Calories
                </Label>
                <Input
                  id="tmpl-cal"
                  type="number"
                  placeholder="350"
                  value={newTemplate.calories}
                  onChange={(e) => setNewTemplate({ ...newTemplate, calories: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tmpl-protein" className="text-xs text-muted-foreground">
                  Protein (g)
                </Label>
                <Input
                  id="tmpl-protein"
                  type="number"
                  placeholder="25"
                  value={newTemplate.proteinG}
                  onChange={(e) => setNewTemplate({ ...newTemplate, proteinG: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tmpl-carbs" className="text-xs text-muted-foreground">
                  Carbs (g)
                </Label>
                <Input
                  id="tmpl-carbs"
                  type="number"
                  placeholder="40"
                  value={newTemplate.carbsG}
                  onChange={(e) => setNewTemplate({ ...newTemplate, carbsG: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tmpl-fat" className="text-xs text-muted-foreground">
                  Fat (g)
                </Label>
                <Input
                  id="tmpl-fat"
                  type="number"
                  placeholder="10"
                  value={newTemplate.fatG}
                  onChange={(e) => setNewTemplate({ ...newTemplate, fatG: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={isSaving} size="sm" className="w-full">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Template
            </Button>
          </div>
        )}

        {templates.length === 0 && !isCreating ? (
          <div className="text-center py-6 text-muted-foreground">
            <Utensils className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No templates yet</p>
            <p className="text-xs mt-1">Save your go-to meals for quick logging</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((tmpl) => {
              const quantityInput = getQuantityInput(tmpl.id);
              const quantity = parseQuantity(quantityInput);
              const isMultiplied = quantity != null && quantity !== DEFAULT_TEMPLATE_QUANTITY;
              const totalCalories = quantity != null ? Math.round(tmpl.calories * quantity) : tmpl.calories;

              return (
              <div
                key={tmpl.id}
                className="flex flex-col gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${mealTypeColors[tmpl.mealType]}`}
                    >
                      {tmpl.mealType}
                    </Badge>
                    <p className="font-medium text-sm truncate">{tmpl.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tmpl.calories} cal · P: {tmpl.proteinG}g · C: {tmpl.carbsG}g · F: {tmpl.fatG}g
                    {isMultiplied && (
                      <span className="ml-2 font-medium text-foreground">
                        · Total {totalCalories} cal
                      </span>
                    )}
                    {tmpl.useCount > 0 && (
                      <span className="ml-2">· Used {tmpl.useCount}x</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1 sm:flex-nowrap">
                  <div className="flex h-8 items-center overflow-hidden rounded-md border-2 border-[#18120E]/25 bg-[#FFF8E7] shadow-[2px_2px_0_#18120E]">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-none text-[#6B5738] hover:bg-[#FFE8A8] hover:text-[#18120E] disabled:opacity-35"
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
                      className="h-7 w-14 rounded-none border-x-2 border-y-0 border-[#18120E]/15 bg-[#FFF0B8] px-1 text-center text-xs font-semibold text-[#18120E] shadow-none focus-visible:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-none text-[#6B5738] hover:bg-[#FFE8A8] hover:text-[#18120E] disabled:opacity-35"
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
                    className="text-xs"
                  >
                    Log
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
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
      </CardContent>
    </Card>
  );
}
