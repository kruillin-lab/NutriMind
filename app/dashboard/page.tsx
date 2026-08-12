import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardTabsClient } from "./_components/DashboardTabsClient";
import { calculateStreaks } from "@/src/lib/streakUtils";
import { addZonedDays, DEFAULT_TIMEZONE, formatZonedDateKey, zonedMidnightUtc } from "@/lib/date-utils";

async function getDashboardData(userId: string) {
  // Fetch the profile first — every other "what day is it" computation below
  // depends on the user's own timezone, not the server's.
  const userProfile = await prisma.userProfile.findUnique({ where: { userId } });
  const timezone = userProfile?.timezone || DEFAULT_TIMEZONE;

  const today = zonedMidnightUtc(timezone);
  const tomorrow = addZonedDays(today, 1, timezone);

  const bankData = await prisma.calorieBank.findUnique({
    where: { userId },
    select: { id: true },
  });

  const [
    calorieBank,
    metabolicProfile,
    todayLog,
    recentTransactions,
    weightEntries,
  ] = await Promise.all([
    prisma.calorieBank.findUnique({ where: { userId } }),
    prisma.metabolicProfile.findUnique({ where: { userId } }),
    prisma.dailyLog.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
      include: { meals: true },
    }),
    bankData
      ? prisma.bankTransaction.findMany({
          where: { bankId: bankData.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
    prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 7,
    }),
  ]);

  const consumedCalories = todayLog?.meals.reduce((sum, meal) => sum + meal.calories, 0) || 0;

  const meals = todayLog?.meals.map((meal) => ({
    id: meal.id,
    name: meal.name,
    calories: meal.calories,
    protein: meal.proteinG,
    carbs: meal.carbsG,
    fat: meal.fatG,
    servingSizeG: meal.servingSizeG ?? undefined,
    fiberG: meal.fiberG,
    sugarG: meal.sugarG,
    sodiumMg: meal.sodiumMg,
    vitaminCMg: meal.vitaminCMg,
    calciumMg: meal.calciumMg,
    ironMg: meal.ironMg,
    potassiumMg: meal.potassiumMg,
    mealType: meal.mealType,
    loggedAt: meal.createdAt,
  })) || [];

  const todayKey = formatZonedDateKey(today, timezone);
  const todayWeightEntry = weightEntries.find((e) => formatZonedDateKey(new Date(e.date), timezone) === todayKey) ?? null;
  const previousWeightEntry = weightEntries.find((e) => formatZonedDateKey(new Date(e.date), timezone) !== todayKey) ?? null;

  const allDailyLogs = await prisma.dailyLog.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    take: 365,
    select: { date: true, caloriesConsumed: true, calorieTarget: true },
  });

  const effectiveTarget = calorieBank?.dailyTarget || 2000;
  const { currentStreak, maxStreak } = calculateStreaks(allDailyLogs, effectiveTarget, timezone);

  return {
    userProfile,
    timezone,
    calorieBank,
    metabolicProfile,
    todayLog,
    recentTransactions,
    weightEntries,
    consumedCalories,
    meals,
    waterIntake: todayLog?.waterMl || 0,
    currentStreak,
    maxStreak,
    todayWeightEntry,
    previousWeightEntry,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const headersList = await headers();
  const headerTestUserId = headersList.get("X-Test-User-Id");
  const params = await searchParams;
  const queryTestUserId = params["test-user-id"];

  let userId: string | null = null;

  if (headerTestUserId && process.env.NODE_ENV !== "production") {
    userId = headerTestUserId;
  } else if (queryTestUserId && typeof queryTestUserId === "string" && process.env.NODE_ENV !== "production") {
    userId = queryTestUserId;
  } else {
    const authResult = await auth();
    userId = authResult.userId;
  }

  if (!userId) redirect("/");

  const data = await getDashboardData(userId);

  if (!data.userProfile?.heightCm) redirect("/onboarding");

  const dailyTarget = data.calorieBank?.dailyTarget || 2000;

  return (
    <div className="min-h-screen bg-hero">
      <div className="finance-shell">
        <header className="mb-8 border-b border-border pb-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <p className="page-kicker">NutriMind private ledger</p>
            <div className="text-right">
              <p className="smallcaps">Statement date</p>
              <p className="num mt-1 text-sm text-foreground">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: data.timezone,
                })}
              </p>
            </div>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
            Reserve account
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-[1.65] text-muted-foreground">
            Your calorie budget, meals, and health records in one daily account view.
          </p>
        </header>

        <DashboardTabsClient
          userId={userId}
          userTimezone={data.timezone}
          dailyTarget={dailyTarget}
          consumedCalories={data.consumedCalories}
          meals={data.meals}
          waterIntake={data.waterIntake}
          calorieBank={data.calorieBank}
          recentTransactions={data.recentTransactions.map((tx) => ({
            id: tx.id,
            type: tx.type as "BANK" | "SPEND" | "ADJUST" | "EXPIRE",
            amount: tx.amount,
            reason: tx.reason,
            caloriesConsumed: tx.caloriesConsumed,
            caloriesTarget: tx.caloriesTarget,
            sourceType: tx.sourceType,
            createdAt: tx.createdAt.toISOString(),
          }))}
          weightEntries={data.weightEntries}
          todayWeightEntry={data.todayWeightEntry}
          previousWeightEntry={data.previousWeightEntry}
          currentStreak={data.currentStreak}
          maxStreak={data.maxStreak}
          todayLog={data.todayLog}
        />
      </div>
    </div>
  );
}
