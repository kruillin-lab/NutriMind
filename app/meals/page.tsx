import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/src/lib/prisma';
import { MealHistoryClient } from './_components/MealHistoryClient';
import { addLocalDays, formatLocalDateKey, parseLocalDate } from '@/lib/date-utils';

interface MealsPageData {
  targetCalories: number;
  consumedCalories: number;
  remainingCalories: number;
  meals: Array<{
    id: string;
    name: string;
    mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'OTHER';
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
    source: 'AI_PARSED' | 'MANUAL_ENTRY';
    aiConfidence: number | null;
    createdAt: string;
  }>;
  calorieBank: {
    borrowed: number;
    remaining: number;
  };
}

async function getMealsForDate(userId: string, dateParam: string): Promise<MealsPageData> {
  const date = parseLocalDate(dateParam);
  const nextDay = addLocalDays(date, 1);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      calorieBank: true,
      dailyLogs: {
        where: {
          date: {
            gte: date,
            lt: nextDay,
          },
        },
        include: {
          meals: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const dailyLog = user.dailyLogs[0] || {
    calorieTarget: user.calorieBank?.dailyTarget || 2000,
    caloriesConsumed: 0,
    bankedAmount: 0,
    waterMl: 0,
    meals: [],
  };

  const remainingCalories = dailyLog.calorieTarget - dailyLog.caloriesConsumed;
  const isOverBudget = remainingCalories < 0;

  // Transform meals to match client expectations
  const meals = dailyLog.meals.map((meal) => ({
    id: meal.id,
    name: meal.name,
    mealType: meal.mealType as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'OTHER',
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
    source: (meal.source?.toUpperCase() as 'AI_PARSED' | 'MANUAL_ENTRY') || 'MANUAL_ENTRY',
    aiConfidence: meal.aiConfidence,
    createdAt: meal.createdAt.toISOString(),
  }));

  // Transform calorieBank to match client expectations
  const currentBalance = user.calorieBank?.currentBalance || 0;
  const borrowed = isOverBudget ? Math.abs(remainingCalories) : 0;
  const remaining = isOverBudget
    ? Math.max(0, currentBalance - borrowed)
    : remainingCalories;

  return {
    targetCalories: dailyLog.calorieTarget,
    consumedCalories: dailyLog.caloriesConsumed,
    remainingCalories,
    meals,
    calorieBank: {
      borrowed,
      remaining,
    },
  };
}

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; 'test-user-id'?: string }>;
}) {
  // Support test-auth bypass for E2E testing
  const headersList = await headers();
  const headerTestUserId = headersList.get('X-Test-User-Id');
  const params = await searchParams;
  const queryTestUserId = params['test-user-id'];

  let userId: string | null = null;

  if (headerTestUserId && process.env.NODE_ENV !== 'production') {
    userId = headerTestUserId;
  } else if (queryTestUserId && typeof queryTestUserId === 'string' && process.env.NODE_ENV !== 'production') {
    userId = queryTestUserId;
  } else {
    const authResult = await auth();
    userId = authResult.userId;
  }

  if (!userId) {
    redirect('/sign-in');
  }

  // Default to today if no date provided
  const today = formatLocalDateKey(new Date());
  const dateParam = params.date || today;

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const date = dateRegex.test(dateParam) ? dateParam : today;

  const data = await getMealsForDate(userId, date);

  return (
    <MealHistoryClient
      initialData={data}
      initialDate={date}
    />
  );
}
