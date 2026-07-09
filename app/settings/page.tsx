import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SettingsClient } from "./_components/SettingsClient";
import { getSystemTimezone } from "@/lib/date-utils";

async function getUserSettings(userId: string) {
  const [userProfile, metabolicProfile, calorieBank] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.metabolicProfile.findUnique({ where: { userId } }),
    prisma.calorieBank.findUnique({ where: { userId } }),
  ]);

  return {
    userProfile,
    metabolicProfile,
    calorieBank,
  };
}

export default async function SettingsPage() {
  const headersList = await headers();
  const headerTestUserId = headersList.get("X-Test-User-Id");

  let userId: string | null = null;

  if (headerTestUserId && process.env.NODE_ENV !== "production") {
    userId = headerTestUserId;
  } else {
    const authResult = await auth();
    userId = authResult.userId;
  }

  if (!userId) {
    redirect("/");
  }

  const data = await getUserSettings(userId);

  if (!data.userProfile?.heightCm) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        <header className="mb-10 grid gap-5 border-b border-border pb-8 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)] md:items-end">
          <div>
            <p className="smallcaps text-foreground">NutriMind Reserve · Account administration</p>
            <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.75rem)] font-bold tracking-[-0.03em] leading-[1] text-foreground">
              Account Controls
            </h1>
          </div>
          <p className="text-[15px] leading-6 text-muted-foreground md:text-right">
            Manage the assumptions, limits, alerts, and statements that govern your calorie reserve.
          </p>
        </header>

        <SettingsClient
          initialProfile={{
            heightCm: data.userProfile.heightCm,
            birthDate: data.userProfile.birthDate?.toISOString().split("T")[0] || "",
            gender: data.userProfile.gender || "OTHER",
            goalWeightKg: data.userProfile.goalWeightKg,
            targetDate: data.userProfile.targetDate?.toISOString().split("T")[0] || "",
            activityLevel: data.userProfile.activityLevel || "SEDENTARY",
            timezone: data.userProfile.timezone || getSystemTimezone(),
          }}
          initialCalorieBank={{
            dailyTarget: data.calorieBank?.dailyTarget || 2000,
            allowNegative: data.calorieBank?.allowNegative || false,
            expireAfterDays: data.calorieBank?.expireAfterDays || 30,
            proteinTargetG: data.calorieBank?.proteinTargetG || 0,
            carbsTargetG: data.calorieBank?.carbsTargetG || 0,
            fatTargetG: data.calorieBank?.fatTargetG || 0,
            currentBalance: data.calorieBank?.currentBalance || 0,
            totalBanked: data.calorieBank?.totalBanked || 0,
            totalSpent: data.calorieBank?.totalSpent || 0,
          }}
        />
      </div>
    </div>
  );
}
