import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardTabs } from "./_components/DashboardTabs";
import { calculateStreaks } from "@/src/lib/streakUtils";
import { addLocalDays, formatLocalDateKey, getLocalMidnight } from "@/lib/date-utils";
import { bankPendingCompletedDays } from "@/src/lib/calorieBank";

async function getDashboardData(userId: string) {
  const today = getLocalMidnight();
  const tomorrow = addLocalDays(today, 1);

  await bankPendingCompletedDays(userId, today);

  const bankData = await prisma.calorieBank.findUnique({
    where: { userId },
    select: { id: true },
  });

  const [
    userProfile,
    calorieBank,
    metabolicProfile,
    todayLog,
    recentTransactions,
    weightEntries,
  ] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
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

  const todayKey = formatLocalDateKey(today);
  const todayWeightEntry = weightEntries.find((e) => formatLocalDateKey(new Date(e.date)) === todayKey) ?? null;
  const previousWeightEntry = weightEntries.find((e) => formatLocalDateKey(new Date(e.date)) !== todayKey) ?? null;

  const allDailyLogs = await prisma.dailyLog.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    take: 365,
    select: { date: true, caloriesConsumed: true, calorieTarget: true },
  });

  const effectiveTarget = calorieBank?.dailyTarget || 2000;
  const { currentStreak, maxStreak } = calculateStreaks(allDailyLogs, effectiveTarget);

  return {
    userProfile,
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
    <div className="min-h-screen app-field">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="font-serif text-4xl font-medium text-foreground sm:text-5xl">Dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.currentStreak > 0 && (
              <span className="chip-indigo">{data.currentStreak} day streak</span>
            )}
            <span className={data.calorieBank && data.calorieBank.currentBalance >= 0 ? "chip-green" : "chip-rose"}>
              {data.calorieBank && data.calorieBank.currentBalance >= 0 ? "+" : ""}
              {data.calorieBank?.currentBalance || 0} kcal banked
            </span>
          </div>
        </div>

        <DashboardTabs
          userId={userId}
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
