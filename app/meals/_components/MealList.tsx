'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Utensils,
  Clock,
  Edit,
  Trash2,
  Plus,
  Flame,
  Droplets,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Leaf,
  Candy,
  Droplet,
  Pill,
  Bone,
  Cross,
  Zap,
  Copy,
  Save,
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
}

const mealTypeColors: Record<string, string> = {
  BREAKFAST: 'bg-orange-100 text-orange-800 border-orange-200',
  LUNCH: 'bg-green-100 text-green-800 border-green-200',
  DINNER: 'bg-blue-100 text-blue-800 border-blue-200',
  SNACK: 'bg-purple-100 text-purple-800 border-purple-200',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
};

const mealTypeLabels: Record<string, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
  OTHER: 'Other',
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MicronutrientBadge({
  icon: Icon,
  label,
  value,
  unit,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  unit: string;
  colorClass: string;
}) {
  const displayValue = value ?? 0;
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
      <Icon className={`h-4 w-4 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">
          {displayValue.toFixed(1)}
          <span className="text-xs font-normal text-gray-500 ml-0.5">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function MealCard({
  meal,
  onEdit,
  onDelete,
  isDeleting,
}: {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
  isDeleting: string | null;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={mealTypeColors[meal.mealType]}
            >
              {mealTypeLabels[meal.mealType]}
            </Badge>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(meal.createdAt)}
            </span>
            {meal.source === 'AI_PARSED' && (
              <Badge variant="secondary" className="text-xs">
                AI
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{meal.name}</h3>
          {meal.servingSizeG != null && meal.servingSizeG > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Serving: {meal.servingSizeG.toFixed(1).replace(/\.0$/, '')}g
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">{meal.calories} cal</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>P: {meal.proteinG}g</span>
            <span>C: {meal.carbsG}g</span>
            <span>F: {meal.fatG}g</span>
          </div>
        </div>
      </div>

      {/* Expandable Micronutrient Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium text-gray-700 mb-3">Micronutrients</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <MicronutrientBadge
              icon={Leaf}
              label="Fiber"
              value={meal.fiberG}
              unit="g"
              colorClass="text-green-500"
            />
            <MicronutrientBadge
              icon={Candy}
              label="Sugar"
              value={meal.sugarG}
              unit="g"
              colorClass="text-pink-500"
            />
            <MicronutrientBadge
              icon={Droplet}
              label="Sodium"
              value={meal.sodiumMg}
              unit="mg"
              colorClass="text-gray-500"
            />
            <MicronutrientBadge
              icon={Pill}
              label="Vitamin C"
              value={meal.vitaminCMg}
              unit="mg"
              colorClass="text-orange-500"
            />
            <MicronutrientBadge
              icon={Bone}
              label="Calcium"
              value={meal.calciumMg}
              unit="mg"
              colorClass="text-blue-500"
            />
            <MicronutrientBadge
              icon={Cross}
              label="Iron"
              value={meal.ironMg}
              unit="mg"
              colorClass="text-red-500"
            />
            <MicronutrientBadge
              icon={Zap}
              label="Potassium"
              value={meal.potassiumMg}
              unit="mg"
              colorClass="text-yellow-500"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-600"
        >
          {showDetails ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show Details
            </>
          )}
        </Button>
        <div className="flex items-center gap-1">
          <CopyMealDialog meal={meal}>
            <Button variant="ghost" size="sm" title="Copy to another day">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </CopyMealDialog>
          <SaveAsTemplateDialog meal={meal}>
            <Button variant="ghost" size="sm" title="Save as template">
              <Save className="h-4 w-4 mr-1" />
              Template
            </Button>
          </SaveAsTemplateDialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(meal)}
            disabled={isDeleting === meal.id}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(meal.id)}
            disabled={isDeleting === meal.id}
          >
            {isDeleting === meal.id ? (
              <span className="text-xs">Deleting...</span>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MealList({ meals, isLoading, onMealUpdated, onMealDeleted }: MealListProps) {
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const totalProtein = meals.reduce((sum, meal) => sum + (meal.proteinG || 0), 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbsG || 0), 0);
  const totalFat = meals.reduce((sum, meal) => sum + (meal.fatG || 0), 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Meals
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {meals.length} meal{meals.length !== 1 ? 's' : ''} logged
              </p>
            </div>
            <a href="/dashboard">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Meal
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading meals...</div>
          ) : meals.length === 0 ? (
            <div className="text-center py-8">
              <Utensils className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No meals logged for this day</p>
              <a href="/dashboard">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Your First Meal
                </Button>
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Macro Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Protein</p>
                  <div className="flex items-center justify-center gap-1">
                    <Dumbbell className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-gray-900">{totalProtein.toFixed(1)}g</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Carbs</p>
                  <div className="flex items-center justify-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="font-semibold text-gray-900">{totalCarbs.toFixed(1)}g</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Fat</p>
                  <div className="flex items-center justify-center gap-1">
                    <Droplets className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold text-gray-900">{totalFat.toFixed(1)}g</span>
                  </div>
                </div>
              </div>

              {/* Meal Items */}
              <div className="space-y-3">
                {meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isDeleting={isDeleting}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingMeal(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
