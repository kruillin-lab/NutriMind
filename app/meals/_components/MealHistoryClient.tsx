'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Landmark,
} from 'lucide-react';
import { MealList } from './MealList';
import { addLocalDays, formatLocalDateKey, isValidLocalDateKey, parseLocalDate } from '@/lib/date-utils';

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
  userId: string;
}

function formatDisplayDate(date: Date): string {
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
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
  userId,
}: MealHistoryClientProps) {
  const searchParams = useSearchParams();
  const queryDate = searchParams.get('date');
  const dateKey = isValidLocalDateKey(queryDate) ? queryDate : initialDate;
  const selectedDate = useMemo(() => parseLocalDate(dateKey), [dateKey]);
  const [data, setData] = useState<MealsResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showMicronutrients, setShowMicronutrients] = useState(false);
  const loadedDateRef = useRef(initialDate);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!queryDate || isValidLocalDateKey(queryDate)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('date', initialDate);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [initialDate, queryDate, searchParams]);

  const jsonHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    if (process.env.NODE_ENV !== 'production') {
      headers['X-Test-User-Id'] = userId;
    }
    return headers;
  }, [userId]);

  const fetchMeals = useCallback(async (date: Date) => {
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    const requestedDate = formatLocalDateKey(date);

    setIsLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/meals?date=${requestedDate}`, {
        headers: jsonHeaders(),
        signal: request.signal,
      });
      if (!response.ok) {
        throw new Error('The daily statement could not be loaded.');
      }

      const newData: MealsResponse = await response.json();
      setData(newData);
      loadedDateRef.current = requestedDate;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch meals:', error);
      setLoadError('We could not load this day. Please try again.');
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  }, [jsonHeaders]);

  useEffect(() => {
    if (dateKey !== loadedDateRef.current) {
      void fetchMeals(selectedDate);
    }
  }, [dateKey, fetchMeals, selectedDate]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const selectDate = (date: Date) => {
    const nextDate = formatLocalDateKey(date);
    if (nextDate === dateKey) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('date', nextDate);
    window.history.pushState(null, '', `?${params.toString()}`);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isValidLocalDateKey(event.target.value)) return;
    selectDate(parseLocalDate(event.target.value));
  };

  const refreshCurrentDay = () => {
    void fetchMeals(selectedDate);
  };

  const isOverBudget = data.consumedCalories > data.targetCalories;
  const allocationDelta = Math.abs(data.remainingCalories ?? 0);
  const allocationPercent = data.targetCalories > 0
    ? Math.min(100, (data.consumedCalories / data.targetCalories) * 100)
    : 0;

  const micronutrients = [
    { label: 'Fiber', value: data.meals.reduce((sum, meal) => sum + (meal.fiberG || 0), 0), unit: 'g' },
    { label: 'Sugar', value: data.meals.reduce((sum, meal) => sum + (meal.sugarG || 0), 0), unit: 'g' },
    { label: 'Sodium', value: data.meals.reduce((sum, meal) => sum + (meal.sodiumMg || 0), 0), unit: 'mg' },
    { label: 'Vitamin C', value: data.meals.reduce((sum, meal) => sum + (meal.vitaminCMg || 0), 0), unit: 'mg' },
    { label: 'Calcium', value: data.meals.reduce((sum, meal) => sum + (meal.calciumMg || 0), 0), unit: 'mg' },
    { label: 'Iron', value: data.meals.reduce((sum, meal) => sum + (meal.ironMg || 0), 0), unit: 'mg' },
    { label: 'Potassium', value: data.meals.reduce((sum, meal) => sum + (meal.potassiumMg || 0), 0), unit: 'mg' },
  ];
  const hasMicronutrients = micronutrients.some((item) => item.value > 0);

  return (
    <div className="app-field min-h-screen">
      <div className="finance-shell">
        <header className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="page-kicker">Nutrition account activity</p>
            <h1 className="mt-3 text-[clamp(2.25rem,6vw,4rem)] leading-[0.98] tracking-[-0.045em] text-foreground">
              Activity ledger
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Review every meal posted against your daily calorie allocation and inspect the nutrients behind each entry.
            </p>
          </div>
          <a className="btn-ghost w-fit" href="/dashboard">
            <Landmark aria-hidden="true" className="mr-2 size-4" />
            Account overview
          </a>
        </header>

        <section aria-labelledby="statement-date" className="surface mt-6 overflow-hidden">
          <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => selectDate(addLocalDays(selectedDate, -1))}
              disabled={isLoading}
              aria-label="View previous day"
              className="hidden lg:inline-flex"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>

            <div className="min-w-0 text-center">
              <p id="statement-date" className="page-kicker">Daily statement</p>
              <h2 className="mt-1 text-2xl tracking-[-0.025em] text-foreground">
                {formatDisplayDate(selectedDate)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{formatFullDate(selectedDate)}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => selectDate(addLocalDays(selectedDate, 1))}
              disabled={isLoading}
              aria-label="View next day"
              className="hidden lg:inline-flex"
            >
              <ChevronRight aria-hidden="true" />
            </Button>

            <div className="flex items-center justify-center gap-2 lg:col-span-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => selectDate(addLocalDays(selectedDate, -1))}
                disabled={isLoading}
                aria-label="View previous day"
                className="lg:hidden"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <div className="relative w-full max-w-48">
                <CalendarDays aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateKey}
                  onChange={handleDateChange}
                  aria-label="Select statement date"
                  className="num h-10 pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => selectDate(addLocalDays(selectedDate, 1))}
                disabled={isLoading}
                aria-label="View next day"
                className="lg:hidden"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="metric-strip grid-cols-2 border-x-0 border-b-0 lg:grid-cols-4" aria-busy={isLoading}>
            <div className="metric-cell">
              <p className="smallcaps">Daily allocation</p>
              <p className="num-display mt-2 text-xl text-foreground">{data.targetCalories.toLocaleString()} kcal</p>
            </div>
            <div className="metric-cell">
              <p className="smallcaps">Consumption posted</p>
              <p className="num-display mt-2 text-xl text-foreground">{data.consumedCalories.toLocaleString()} kcal</p>
            </div>
            <div className="metric-cell">
              <p className="smallcaps">{isOverBudget ? 'Reserve withdrawal' : 'Allocation available'}</p>
              <p className={`num-display mt-2 text-xl ${isOverBudget ? 'text-destructive' : 'text-[var(--ledger-green)]'}`}>
                {allocationDelta.toLocaleString()} kcal
              </p>
            </div>
            <div className="metric-cell">
              <p className="smallcaps">Meal entries</p>
              <p className="num-display mt-2 text-xl text-foreground">{data.meals.length.toLocaleString()}</p>
            </div>
          </div>

          <div className="border-t border-border px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground">Daily allocation used</span>
              <span className="num font-semibold text-foreground">{Math.round(allocationPercent)}%</span>
            </div>
            <div className="track-lg mt-2" aria-hidden="true">
              <div
                className={isOverBudget ? 'track-fill-red' : 'track-fill-green'}
                style={{ width: `${allocationPercent}%` }}
              />
            </div>
            {isOverBudget && (
              <p className="mt-2 text-xs text-muted-foreground">
                Reserve balance after this withdrawal: <span className="num font-semibold text-foreground">{data.calorieBank.remaining.toLocaleString()} kcal</span>
              </p>
            )}
          </div>
        </section>

        {loadError && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-destructive/30 bg-destructive/10 px-4 py-3" role="alert">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={refreshCurrentDay}>
              Try again
            </Button>
          </div>
        )}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <MealList
            meals={data.meals}
            isLoading={isLoading}
            onMealUpdated={refreshCurrentDay}
            onMealDeleted={refreshCurrentDay}
            userId={userId}
          />

          <aside className="surface overflow-hidden" aria-labelledby="nutrient-statement-heading">
            <div className="border-b border-border p-5">
              <p className="page-kicker">Statement detail</p>
              <h2 id="nutrient-statement-heading" className="mt-2 text-xl text-foreground">Nutrient totals</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Daily micronutrients across all posted meals.</p>
            </div>

            {!hasMicronutrients ? (
              <p className="p-5 text-sm leading-6 text-muted-foreground">No micronutrient values were recorded for this day.</p>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowMicronutrients((visible) => !visible)}
                  aria-expanded={showMicronutrients}
                  aria-controls="daily-micronutrient-totals"
                  className="h-11 w-full justify-between rounded-none px-5 lg:hidden"
                >
                  {showMicronutrients ? 'Hide nutrient totals' : 'Show nutrient totals'}
                  {showMicronutrients ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                </Button>
                <dl
                  id="daily-micronutrient-totals"
                  className={`${showMicronutrients ? 'block' : 'hidden'} divide-y divide-border border-t border-border lg:block lg:border-t-0`}
                >
                  {micronutrients.map((item) => (
                    <div className="flex items-baseline justify-between gap-4 px-5 py-3" key={item.label}>
                      <dt className="smallcaps">{item.label}</dt>
                      <dd className="num text-sm font-semibold text-foreground">
                        {item.value.toFixed(1).replace(/\.0$/, '')}{item.unit}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
