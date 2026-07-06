'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar,
  Flame,
  Utensils,
  TrendingUp,
  TrendingDown,
  Leaf,
  Candy,
  Droplet,
  Pill,
  Bone,
  Cross,
  Zap,
} from 'lucide-react';
import { MealList } from './MealList';
import { formatLocalDateKey, parseLocalDate } from '@/lib/date-utils';

interface Meal {
  id: string;
  name: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'OTHER';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  // Micronutrients
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

interface CalorieBank {
  borrowed: number;
  remaining: number;
}

interface MealsResponse {
  targetCalories: number;
  consumedCalories: number;
  remainingCalories: number;
  meals: Meal[];
  calorieBank: CalorieBank;
}

interface MealHistoryClientProps {
  initialData: MealsResponse;
  initialDate: string;
}

function formatDate(date: Date): string {
  return formatLocalDateKey(date);
}

function formatDisplayDate(date: Date): string {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return 'Today';
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function MealHistoryClient({
  initialData,
  initialDate,
}: MealHistoryClientProps) {
  const [selectedDate, setSelectedDate] = useState(() => parseLocalDate(initialDate));
  const [data, setData] = useState<MealsResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMeals = useCallback(async (date: Date) => {
    setIsLoading(true);
    try {
      const dateStr = formatDate(date);
      const response = await fetch(`/api/meals?date=${dateStr}`);
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
      }
    } catch (error) {
      console.error('Failed to fetch meals:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeals(selectedDate);
  }, [selectedDate, fetchMeals]);

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    setSelectedDate(newDate);
  };

  const handleMealUpdated = () => {
    fetchMeals(selectedDate);
  };

  const handleMealDeleted = () => {
    fetchMeals(selectedDate);
  };

  const caloriePercentage = Math.min(
    (data.consumedCalories / data.targetCalories) * 100,
    100
  );
  const isOverBudget = data.consumedCalories > data.targetCalories;
  const remainingDisplay = isOverBudget
    ? (data.calorieBank?.remaining ?? 0)
    : (data.remainingCalories ?? 0);

  // Calculate daily micronutrient totals
  const totalFiber = data.meals.reduce((sum, m) => sum + (m.fiberG || 0), 0);
  const totalSugar = data.meals.reduce((sum, m) => sum + (m.sugarG || 0), 0);
  const totalSodium = data.meals.reduce((sum, m) => sum + (m.sodiumMg || 0), 0);
  const totalVitaminC = data.meals.reduce((sum, m) => sum + (m.vitaminCMg || 0), 0);
  const totalCalcium = data.meals.reduce((sum, m) => sum + (m.calciumMg || 0), 0);
  const totalIron = data.meals.reduce((sum, m) => sum + (m.ironMg || 0), 0);
  const totalPotassium = data.meals.reduce((sum, m) => sum + (m.potassiumMg || 0), 0);

  // Check if any micronutrients are tracked
  const hasMicronutrients =
    totalFiber > 0 ||
    totalSugar > 0 ||
    totalSodium > 0 ||
    totalVitaminC > 0 ||
    totalCalcium > 0 ||
    totalIron > 0 ||
    totalPotassium > 0;

  const [showMicronutrients, setShowMicronutrients] = useState(false);

  return (
    <div className="min-h-screen app-field px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl text-foreground">Meal History</h1>
            <p className="mt-2 text-muted-foreground">
              Track and manage your meals over time
            </p>
          </div>
          <a href="/dashboard" className="btn-ghost">
            Back to Dashboard
          </a>
        </div>

        <Card className="surface border-0 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousDay}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3 flex-1 justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">
                    {formatDisplayDate(selectedDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatFullDate(selectedDate)}
                  </p>
                </div>
                <div className="relative">
                  <Input
                    type="date"
                    value={formatDate(selectedDate)}
                    onChange={handleDateChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="ghost" size="sm" className="pointer-events-none">
                    Change
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                disabled={isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="surface border-0 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-chart-1" />
                <span className="num font-serif text-2xl font-semibold text-foreground">
                  {data.targetCalories.toLocaleString()}
                </span>
                <span className="text-muted-foreground">cal</span>
              </div>
            </CardContent>
          </Card>

          <Card className="surface border-0 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Consumed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-chart-2" />
                <span className="num font-serif text-2xl font-semibold text-foreground">
                  {data.consumedCalories.toLocaleString()}
                </span>
                <span className="text-muted-foreground">cal</span>
              </div>
              <Progress value={caloriePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="surface border-0 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Remaining
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {isOverBudget ? (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-chart-2" />
                )}
                <span
                  className={`num font-serif text-2xl font-semibold ${
                    isOverBudget ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {remainingDisplay.toLocaleString()}
                </span>
                <span className="text-muted-foreground">cal</span>
              </div>
              {isOverBudget && (
                <p className="mt-1 text-xs text-destructive">
                  Over budget by {data.calorieBank?.borrowed?.toLocaleString() ?? 0} cal
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Micronutrients Summary */}
        {hasMicronutrients && (
          <Card className="surface border-0 shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Leaf className="h-4 w-4 text-chart-2" />
                  Micronutrients
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMicronutrients(!showMicronutrients)}
                  className="h-8 px-2"
                >
                  {showMicronutrients ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="ml-1 text-xs">
                    {showMicronutrients ? 'Hide' : 'Show'}
                  </span>
                </Button>
              </div>
            </CardHeader>
            {showMicronutrients && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-chart-2" />
                    <div>
                      <p className="num text-lg font-semibold text-foreground">
                        {Math.round(totalFiber)}g
                      </p>
                      <p className="text-xs text-muted-foreground">Fiber</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Candy className="h-4 w-4 text-chart-5" />
                    <div>
                      <p className="num text-lg font-semibold text-foreground">
                        {Math.round(totalSugar)}g
                      </p>
                      <p className="text-xs text-muted-foreground">Sugar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-chart-3" />
                    <div>
                      <p className="num text-lg font-semibold text-foreground">
                        {Math.round(totalSodium)}mg
                      </p>
                      <p className="text-xs text-muted-foreground">Sodium</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-chart-4" />
                    <div>
                      <p className="num text-lg font-semibold text-foreground">
                        {Math.round(totalVitaminC)}mg
                      </p>
                      <p className="text-xs text-muted-foreground">Vitamin C</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="num text-lg font-semibold text-foreground">
                        {Math.round(totalCalcium)}mg
                      </p>
                      <p className="text-xs text-muted-foreground">Calcium</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cross className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="num text-lg font-semibold text-foreground">
                        {Math.round(totalIron)}mg
                      </p>
                      <p className="text-xs text-muted-foreground">Iron</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-chart-1" />
                    <div>
                      <p className="num text-lg font-semibold text-foreground">
                        {Math.round(totalPotassium)}mg
                      </p>
                      <p className="text-xs text-muted-foreground">Potassium</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Meals List */}
        <MealList
          meals={data.meals}
          isLoading={isLoading}
          onMealUpdated={handleMealUpdated}
          onMealDeleted={handleMealDeleted}
        />
      </div>
    </div>
  );
}
