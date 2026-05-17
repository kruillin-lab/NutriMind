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
    <div className="min-h-screen app-field">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 border-b border-[#FFF8E7]/15 pb-6">
          <div className="mb-3 h-2 w-32 rounded-full border border-[#FFF8E7]/20 bg-[linear-gradient(90deg,#DFFF35,#00C875,#00C8FF,#FF5A3D)] shadow-[0_14px_34px_rgba(223,255,53,0.18)]" />
          <h1 className="text-4xl font-semibold tracking-[-0.02em] text-[#FFF8E7]">Settings</h1>
          <p className="mt-2 text-[#FFF8E7]/72">
            Manage your profile, goals, and calorie bank settings.
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
