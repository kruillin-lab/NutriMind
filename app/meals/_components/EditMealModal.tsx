'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilePenLine, Loader2 } from 'lucide-react';
interface Meal {
  id: string;
  name: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'OTHER';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  vitaminCMg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
  servingSizeG?: number | null;
  source: 'AI_PARSED' | 'MANUAL_ENTRY';
  aiConfidence: number | null;
  createdAt: string;
}

interface EditMealModalProps {
  meal: Meal;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function EditMealModal({ meal, isOpen, onClose, onSuccess, userId }: EditMealModalProps) {
  const [formData, setFormData] = useState({
    name: meal.name,
    mealType: meal.mealType,
    calories: meal.calories,
    proteinG: meal.proteinG,
    carbsG: meal.carbsG,
    fatG: meal.fatG,
    fiberG: meal.fiberG || 0,
    sugarG: meal.sugarG || 0,
    sodiumMg: meal.sodiumMg || 0,
    vitaminCMg: meal.vitaminCMg || 0,
    calciumMg: meal.calciumMg || 0,
    ironMg: meal.ironMg || 0,
    potassiumMg: meal.potassiumMg || 0,
    servingSizeG: meal.servingSizeG?.toString() ?? '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const servingSizeG = formData.servingSizeG.trim()
        ? Number(formData.servingSizeG)
        : null;

      if (servingSizeG !== null && (!Number.isFinite(servingSizeG) || servingSizeG < 0)) {
        setError('Serving size must be zero or higher.');
        setIsSubmitting(false);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (process.env.NODE_ENV !== 'production') {
        headers['X-Test-User-Id'] = userId;
      }

      const response = await fetch(`/api/meals/${meal.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...formData,
          servingSizeG,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update meal');
      }
    } catch (err) {
      void err;
      setError('An error occurred while updating the meal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number | null) => {
    if (value === null) return;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isSubmitting) onClose();
    }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border p-5 pr-14 sm:p-6 sm:pr-14">
          <p className="page-kicker inline-flex items-center gap-2">
            <FilePenLine aria-hidden="true" className="size-4" />
            Ledger amendment
          </p>
          <DialogTitle className="mt-1 text-2xl tracking-[-0.025em]">Edit meal entry</DialogTitle>
          <DialogDescription className="max-w-lg leading-6">
            Update the posted meal details. Saving recalculates the calorie allocation and nutrient statement for this day.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <fieldset className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6" disabled={isSubmitting}>
            <legend className="sr-only">Core meal details</legend>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name" className="smallcaps">Meal description</Label>
              <Textarea
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Grilled chicken breast with rice"
                required
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mealType" className="smallcaps">Meal category</Label>
              <Select
                value={formData.mealType}
                onValueChange={(value) => handleChange('mealType', value)}
              >
                <SelectTrigger id="mealType" className="w-full">
                  <SelectValue placeholder="Select meal category" />
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

            <div className="space-y-2">
              <Label htmlFor="servingSizeG" className="smallcaps">Serving size <span className="normal-case tracking-normal">(optional, g)</span></Label>
              <Input
                id="servingSizeG"
                type="number"
                min="0"
                step="0.1"
                value={formData.servingSizeG}
                onChange={(e) => handleChange('servingSizeG', e.target.value)}
                placeholder="Optional"
                className="num"
              />
            </div>
          </fieldset>

          <fieldset className="border-t border-border bg-secondary/35 p-5 sm:p-6" disabled={isSubmitting}>
            <legend className="page-kicker px-1">Calorie and macro posting</legend>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="calories" className="smallcaps">Calories <span className="normal-case tracking-normal">(kcal)</span></Label>
                <Input
                  id="calories"
                  type="number"
                  min="0"
                  value={formData.calories}
                  onChange={(e) => handleChange('calories', parseInt(e.target.value) || 0)}
                  required
                  className="num"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proteinG" className="smallcaps">Protein <span className="normal-case tracking-normal">(g)</span></Label>
              <Input
                id="proteinG"
                type="number"
                min="0"
                step="0.1"
                value={formData.proteinG}
                onChange={(e) => handleChange('proteinG', parseFloat(e.target.value) || 0)}
                  className="num"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbsG" className="smallcaps">Carbs <span className="normal-case tracking-normal">(g)</span></Label>
              <Input
                id="carbsG"
                type="number"
                min="0"
                step="0.1"
                value={formData.carbsG}
                onChange={(e) => handleChange('carbsG', parseFloat(e.target.value) || 0)}
                className="num"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatG" className="smallcaps">Fat <span className="normal-case tracking-normal">(g)</span></Label>
              <Input
                id="fatG"
                type="number"
                min="0"
                step="0.1"
                value={formData.fatG}
                onChange={(e) => handleChange('fatG', parseFloat(e.target.value) || 0)}
                className="num"
              />
            </div>
          </div>
          </fieldset>

          <fieldset className="border-t border-border p-5 sm:p-6" disabled={isSubmitting}>
            <legend className="page-kicker px-1">Optional micronutrients</legend>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="fiberG" className="smallcaps">Fiber (g)</Label>
                <Input
                  id="fiberG"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.fiberG}
                  onChange={(e) => handleChange('fiberG', parseFloat(e.target.value) || 0)}
                  className="num"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sugarG" className="smallcaps">Sugar (g)</Label>
                <Input
                  id="sugarG"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.sugarG}
                  onChange={(e) => handleChange('sugarG', parseFloat(e.target.value) || 0)}
                  className="num"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sodiumMg" className="smallcaps">Sodium (mg)</Label>
                <Input
                  id="sodiumMg"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.sodiumMg}
                  onChange={(e) => handleChange('sodiumMg', parseInt(e.target.value) || 0)}
                  className="num"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vitaminCMg" className="smallcaps">Vitamin C (mg)</Label>
                <Input
                  id="vitaminCMg"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.vitaminCMg}
                  onChange={(e) => handleChange('vitaminCMg', parseFloat(e.target.value) || 0)}
                  className="num"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="calciumMg" className="smallcaps">Calcium (mg)</Label>
                <Input
                  id="calciumMg"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.calciumMg}
                  onChange={(e) => handleChange('calciumMg', parseInt(e.target.value) || 0)}
                  className="num"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ironMg" className="smallcaps">Iron (mg)</Label>
                <Input
                  id="ironMg"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.ironMg}
                  onChange={(e) => handleChange('ironMg', parseFloat(e.target.value) || 0)}
                  className="num"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="potassiumMg" className="smallcaps">Potassium (mg)</Label>
                <Input
                  id="potassiumMg"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.potassiumMg}
                  onChange={(e) => handleChange('potassiumMg', parseInt(e.target.value) || 0)}
                  className="num"
                />
              </div>
            </div>
          </fieldset>

          {error && (
            <p className="mx-5 mb-5 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-6" role="alert">{error}</p>
          )}

          <DialogFooter className="m-0 rounded-none px-5 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
              {isSubmitting ? 'Posting amendment…' : 'Post amendment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
