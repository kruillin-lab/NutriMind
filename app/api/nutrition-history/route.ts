import { NextRequest } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { DailyLog } from '@prisma/client';
import { formatLocalDateKey } from '@/lib/date-utils';
import { ApiError, handleRoute, requireUserId } from '@/src/lib/api-helpers';

const MICRONUTRIENTS = [
  { key: 'fiberG', label: 'Fiber', unit: 'g', target: 30 },
  { key: 'sugarG', label: 'Sugar', unit: 'g', target: 50 },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg', target: 2300 },
  { key: 'vitaminCMg', label: 'Vitamin C', unit: 'mg', target: 90 },
  { key: 'calciumMg', label: 'Calcium', unit: 'mg', target: 1300 },
  { key: 'ironMg', label: 'Iron', unit: 'mg', target: 18 },
  { key: 'potassiumMg', label: 'Potassium', unit: 'mg', target: 4700 },
];

export async function GET(request: NextRequest) {
  return handleRoute('Failed to fetch nutrition history', async () => {
    const userId = await requireUserId();

    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get('days') || '7';
    const days = parseInt(daysParam, 10);

    if (isNaN(days) || days < 1 || days > 365) {
      throw new ApiError(400, 'Invalid days parameter');
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Create a map of all dates in the range with default values
    const dateMap = new Map<string, { date: string; values: Record<string, number> }>();

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = formatLocalDateKey(date);

      const values: Record<string, number> = {};
      MICRONUTRIENTS.forEach(nutrient => {
        values[nutrient.key] = 0;
      });

      dateMap.set(dateStr, { date: dateStr, values });
    }

    // Fill in actual data from database
    dailyLogs.forEach((log: DailyLog) => {
      const dateStr = formatLocalDateKey(log.date);
      if (dateMap.has(dateStr)) {
        const entry = dateMap.get(dateStr)!;
        entry.values.fiberG = log.fiberG || 0;
        entry.values.sugarG = log.sugarG || 0;
        entry.values.sodiumMg = log.sodiumMg || 0;
        entry.values.vitaminCMg = log.vitaminCMg || 0;
        entry.values.calciumMg = log.calciumMg || 0;
        entry.values.ironMg = log.ironMg || 0;
        entry.values.potassiumMg = log.potassiumMg || 0;
      }
    });

    // Convert map to array
    const data = Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      days,
      nutrients: MICRONUTRIENTS,
      data,
    };
  });
}
