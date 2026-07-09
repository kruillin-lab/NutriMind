"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

interface MealToSave {
  id: string;
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  vitaminCMg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
  servingSizeG?: number | null;
  mealType?: string;
}

interface SaveAsTemplateDialogProps {
  meal: MealToSave;
  children?: React.ReactElement;
  onSaved?: () => void;
  userId: string;
}

export function SaveAsTemplateDialog({ meal, children, onSaved, userId }: SaveAsTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(meal.name);
  const [mealType, setMealType] = useState(meal.mealType || "OTHER");
  const [isSaving, setIsSaving] = useState(false);

  const jsonHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.NODE_ENV !== "production") {
      headers["X-Test-User-Id"] = userId;
    }
    return headers;
  };

  const handleSave = async () => {
    if (!name) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/meal-templates", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          name,
          mealType,
          calories: meal.calories,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatG: meal.fatG,
          fiberG: meal.fiberG,
          sugarG: meal.sugarG,
          sodiumMg: meal.sodiumMg,
          vitaminCMg: meal.vitaminCMg,
          calciumMg: meal.calciumMg,
          ironMg: meal.ironMg,
          potassiumMg: meal.potassiumMg,
          servingSizeG: meal.servingSizeG,
        }),
      });

      if (response.ok) {
        setOpen(false);
        onSaved?.();
      } else {
        const error = await response.json();
        alert(`Failed to save template: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Failed to save template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (children || (
            <Button variant="ghost" size="sm" title="Save as template">
              <Save className="h-4 w-4 mr-1" />
              Save as Template
            </Button>
          )) as React.ReactElement}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this meal as a reusable template for quick logging.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="tmpl-name" className="text-xs text-muted-foreground">
              Template Name
            </Label>
            <Input
              id="tmpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My usual breakfast"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tmpl-type" className="text-xs text-muted-foreground">
              Meal Type
            </Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v || "OTHER")}>
              <SelectTrigger id="tmpl-type" className="mt-1">
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
