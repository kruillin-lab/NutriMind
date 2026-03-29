import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CalorieBankCard } from "./_components/CalorieBankCard";
import { DailySummaryClient } from "./_components/DailySummaryClient";
import { QuickLogClient } from "./_components/QuickLogClient";

async function getDashboardData(userId: string) {
  // Use UTC dates to ensure consistency with API and across timezone boundaries
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  // Get bank ID first to fetch transactions
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
      where: {
        userId,
        date: { gte: today, lt: tomorrow },
      },
      include: {
        meals: true,
      },
    }),
    bankData
      ? prisma.bankTransaction.findMany({
          where: { bankId: bankData.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 7,
    }),
  ]);

  // Calculate consumed calories from meals
  const consumedCalories = todayLog?.meals.reduce(
    (sum, meal) => sum + meal.calories,
    0
  ) || 0;

  // Transform meals to the format expected by DailySummary
  const meals = todayLog?.meals.map((meal) => ({
    id: meal.id,
    name: meal.name,
    calories: meal.calories,
    protein: meal.proteinG,
    carbs: meal.carbsG,
    fat: meal.fatG,
    loggedAt: meal.createdAt,
  })) || [];

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
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Support test-auth bypass for E2E testing
  const headersList = await headers();
  const headerTestUserId = headersList.get("X-Test-User-Id");
  const params = await searchParams;
  const queryTestUserId = params["test-user-id"];
  
  let userId: string | null = null;
  
  if (headerTestUserId && process.env.NODE_ENV !== "production") {
    userId = headerTestUserId;
    console.log("[dashboard] Using test user ID from header:", userId);
  } else if (queryTestUserId && typeof queryTestUserId === "string" && process.env.NODE_ENV !== "production") {
    userId = queryTestUserId;
    console.log("[dashboard] Using test user ID from query param:", userId);
  } else {
    const authResult = await auth();
    userId = authResult.userId;
    console.log("[dashboard] Using Clerk auth user ID:", userId);
  }

  if (!userId) {
    redirect("/");
  }

  const data = await getDashboardData(userId);

  // Check if onboarding is complete (user profile exists with height set)
  if (!data.userProfile?.heightCm) {
    redirect("/onboarding");
  }

  const dailyTarget = data.calorieBank?.dailyTarget || 2000;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">
            Welcome back! Here&apos;s your Calorie Bank summary.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calorie Bank - Spans full width on mobile, 1 column on desktop */}
          <div className="lg:col-span-1">
            <CalorieBankCard
              data={{
                balance: data.calorieBank?.currentBalance || 0,
                dailyTarget,
                totalBanked: data.calorieBank?.totalBanked || 0,
                totalSpent: data.calorieBank?.totalSpent || 0,
                currentStreak: 0,
                maxStreak: 0,
              }}
            />
          </div>

          {/* Daily Summary */}
          <div className="lg:col-span-2">
            <DailySummaryClient
              targetCalories={dailyTarget}
              initialConsumedCalories={data.consumedCalories}
              initialMeals={data.meals}
              initialWaterIntake={data.waterIntake}
              waterTarget={2500}
              userId={userId}
            />
          </div>

          {/* Quick Log */}
          <div className="lg:col-span-3">
            <QuickLogClient userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
}