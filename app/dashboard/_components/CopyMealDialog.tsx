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
import { Label } from "@/components/ui/label";
import { Loader2, Copy } from "lucide-react";

interface MealToCopy {
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

interface CopyMealDialogProps {
  meal: MealToCopy;
  children?: React.ReactElement;
  onCopied?: () => void;
  userId: string;
}

export function CopyMealDialog({ meal, children, onCopied, userId }: CopyMealDialogProps) {
  const [open, setOpen] = useState(false);
  const [targetDate, setTargetDate] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  const jsonHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.NODE_ENV !== "production") {
      headers["X-Test-User-Id"] = userId;
    }
    return headers;
  };

  const handleCopy = async () => {
    if (!targetDate) return;
    setIsCopying(true);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          name: meal.name,
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
          mealType: meal.mealType || "OTHER",
          date: targetDate,
        }),
      });

      if (response.ok) {
        setOpen(false);
        setTargetDate("");
        onCopied?.();
      } else {
        const error = await response.json();
        alert(`Failed to copy meal: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to copy meal:", error);
      alert("Failed to copy meal. Please try again.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (children || (
            <Button variant="ghost" size="sm" title="Copy to another day">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          )) as React.ReactElement}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Meal</DialogTitle>
          <DialogDescription>
            Copy &quot;{meal.name}&quot; ({meal.calories} kcal) to another day.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="copy-date" className="text-xs text-muted-foreground">
              Target Date
            </Label>
            <input
              id="copy-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCopying}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={!targetDate || isCopying}>
            {isCopying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Date
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
