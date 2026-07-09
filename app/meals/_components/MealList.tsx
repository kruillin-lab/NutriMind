'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Edit3,
  Loader2,
  ReceiptText,
  Save,
  Trash2,
} from 'lucide-react';
import { EditMealModal } from './EditMealModal';
import { CopyMealDialog } from '@/app/dashboard/_components/CopyMealDialog';
import { SaveAsTemplateDialog } from '@/app/dashboard/_components/SaveAsTemplateDialog';

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

interface MealListProps {
  meals: Meal[];
  isLoading: boolean;
  onMealUpdated: () => void;
  onMealDeleted: () => void;
  userId: string;
}

const MEAL_TYPE_LABELS: Record<Meal['mealType'], string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
  OTHER: 'Other',
};

const MICRO_FIELDS: Array<{ key: keyof Meal; label: string; unit: string }> = [
  { key: 'fiberG', label: 'Fiber', unit: 'g' },
  { key: 'sugarG', label: 'Sugar', unit: 'g' },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
  { key: 'vitaminCMg', label: 'Vitamin C', unit: 'mg' },
  { key: 'calciumMg', label: 'Calcium', unit: 'mg' },
  { key: 'ironMg', label: 'Iron', unit: 'mg' },
  { key: 'potassiumMg', label: 'Potassium', unit: 'mg' },
];

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatNutrient(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

function MealRow({
  meal,
  entryNumber,
  onEdit,
  onDelete,
  isDeleting,
  userId,
}: {
  meal: Meal;
  entryNumber: number;
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
  isDeleting: string | null;
  userId: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const hasMicros = MICRO_FIELDS.some((field) => Number(meal[field.key] ?? 0) > 0);
  const detailsId = `meal-details-${meal.id}`;

  return (
    <article className="border-t border-border px-4 py-5 first:border-t-0 sm:px-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill min-h-6 py-0">{MEAL_TYPE_LABELS[meal.mealType]}</span>
            <span className="num text-[11px] text-muted-foreground">ENTRY {String(entryNumber).padStart(2, '0')}</span>
            {meal.source === 'AI_PARSED' && <span className="chip-indigo">AI parsed</span>}
          </div>
          <h3 className="mt-3 text-lg leading-snug text-foreground">{meal.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 aria-hidden="true" className="size-3.5" />
              Posted {formatTime(meal.createdAt)}
            </span>
            {meal.servingSizeG != null && meal.servingSizeG > 0 && (
              <span className="num">Serving {formatNutrient(meal.servingSizeG)} g</span>
            )}
          </div>
        </div>

        <div className="md:text-right">
          <p className="num-display text-2xl text-foreground">−{meal.calories.toLocaleString()} kcal</p>
          <p className="mt-1 text-xs text-muted-foreground">Applied to daily allocation</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 overflow-hidden border border-border bg-border [gap:1px]">
        <div className="bg-secondary/60 px-3 py-2.5">
          <dt className="smallcaps">Protein</dt>
          <dd className="num mt-1 text-sm font-semibold text-foreground">{formatNutrient(meal.proteinG)} g</dd>
        </div>
        <div className="bg-secondary/60 px-3 py-2.5">
          <dt className="smallcaps">Carbohydrates</dt>
          <dd className="num mt-1 text-sm font-semibold text-foreground">{formatNutrient(meal.carbsG)} g</dd>
        </div>
        <div className="bg-secondary/60 px-3 py-2.5">
          <dt className="smallcaps">Fat</dt>
          <dd className="num mt-1 text-sm font-semibold text-foreground">{formatNutrient(meal.fatG)} g</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {hasMicros && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails((visible) => !visible)}
              aria-expanded={showDetails}
              aria-controls={detailsId}
              aria-label={`${showDetails ? 'Hide' : 'Show'} nutrient details for ${meal.name}`}
            >
              {showDetails ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
              Nutrient details
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1" aria-label={`Actions for ${meal.name}`} role="group">
          <CopyMealDialog meal={meal} userId={userId}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Copy ${meal.name} to another day`}
              title="Copy to another day"
            >
              <Copy aria-hidden="true" />
            </Button>
          </CopyMealDialog>
          <SaveAsTemplateDialog meal={meal} userId={userId}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Save ${meal.name} as a template`}
              title="Save as template"
            >
              <Save aria-hidden="true" />
            </Button>
          </SaveAsTemplateDialog>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit ${meal.name}`}
            title="Edit meal"
            onClick={() => onEdit(meal)}
            disabled={isDeleting === meal.id}
          >
            <Edit3 aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label={isDeleting === meal.id ? `Deleting ${meal.name}` : `Delete ${meal.name}`}
            title="Delete meal"
            onClick={() => onDelete(meal.id)}
            disabled={isDeleting === meal.id}
          >
            {isDeleting === meal.id ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {showDetails && hasMicros && (
        <dl id={detailsId} className="mt-4 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {MICRO_FIELDS.map((field) => {
            const value = Number(meal[field.key] ?? 0);
            if (value <= 0) return null;

            return (
              <div className="bg-card px-3 py-3" key={field.key}>
                <dt className="smallcaps">{field.label}</dt>
                <dd className="num mt-1 text-sm font-semibold text-foreground">
                  {formatNutrient(value)}{field.unit}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </article>
  );
}

export function MealList({ meals, isLoading, onMealUpdated, onMealDeleted, userId }: MealListProps) {
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const jsonHeaders = () => {
    const headers: Record<string, string> = {};
    if (process.env.NODE_ENV !== 'production') {
      headers['X-Test-User-Id'] = userId;
    }
    return headers;
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (mealId: string) => {
    if (!confirm('Are you sure you want to delete this meal?')) {
      return;
    }

    setIsDeleting(mealId);
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: 'DELETE',
        headers: jsonHeaders(),
      });

      if (response.ok) {
        onMealDeleted();
      } else {
        const error = await response.json();
        alert(`Failed to delete meal: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete meal:', error);
      alert('Failed to delete meal. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingMeal(null);
    onMealUpdated();
  };

  const macros = [
    { label: 'Protein', value: meals.reduce((sum, meal) => sum + (meal.proteinG || 0), 0) },
    { label: 'Carbohydrates', value: meals.reduce((sum, meal) => sum + (meal.carbsG || 0), 0) },
    { label: 'Fat', value: meals.reduce((sum, meal) => sum + (meal.fatG || 0), 0) },
  ];

  return (
    <>
      <section className="surface overflow-hidden" aria-labelledby="meal-activity-heading" aria-busy={isLoading}>
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="page-kicker">Posted transactions</p>
            <h2 id="meal-activity-heading" className="mt-2 text-2xl text-foreground">Meal activity</h2>
          </div>
          <p className="smallcaps"><span className="num text-foreground">{meals.length}</span> entries posted</p>
        </div>

        {isLoading ? (
          <div className="space-y-0" aria-live="polite">
            <p className="sr-only">Loading meal activity</p>
            {[0, 1, 2].map((item) => (
              <div className="animate-pulse border-t border-border px-5 py-6 first:border-t-0" key={item}>
                <div className="h-3 w-28 bg-foreground/10" />
                <div className="mt-4 h-5 w-2/3 bg-foreground/10" />
                <div className="mt-5 h-12 w-full bg-foreground/5" />
              </div>
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="seal size-14" aria-hidden="true">
              <ReceiptText className="size-6" />
            </div>
            <h3 className="mt-5 text-xl text-foreground">No activity posted</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              This daily statement has no meal entries yet. Log a meal from the account overview to begin the ledger.
            </p>
            <a href="/dashboard" className="btn-primary mt-6">Log a meal</a>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-3 border-b border-border bg-border [gap:1px]">
              {macros.map((macro) => (
                <div className="bg-card px-3 py-3 sm:px-5" key={macro.label}>
                  <dt className="smallcaps break-words">{macro.label}</dt>
                  <dd className="num-display mt-1 text-base text-foreground sm:text-lg">{formatNutrient(macro.value)} g</dd>
                </div>
              ))}
            </dl>

            <div>
              {meals.map((meal, index) => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  entryNumber={meals.length - index}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={isDeleting}
                  userId={userId}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingMeal(null);
          }}
          onSuccess={handleEditSuccess}
          userId={userId}
        />
      )}
    </>
  );
}
