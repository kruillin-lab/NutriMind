import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { handleRoute, requireUserId } from "@/src/lib/api-helpers";

export async function PUT(req: NextRequest) {
  return handleRoute("Failed to update settings", async () => {
    const userId = await requireUserId();

    const body = await req.json();

    if (body.profile) {
      const { heightCm, birthDate, gender, activityLevel, timezone } = body.profile;

      await prisma.userProfile.update({
        where: { userId },
        data: {
          heightCm,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          gender,
          activityLevel,
          timezone,
        },
      });
    }

    if (body.goals) {
      const { goalWeightKg, targetDate } = body.goals;

      await prisma.userProfile.update({
        where: { userId },
        data: {
          goalWeightKg: goalWeightKg ?? undefined,
          targetDate: targetDate ? new Date(targetDate) : undefined,
        },
      });
    }

    if (body.calorieBank) {
      const { dailyTarget, allowNegative, expireAfterDays, proteinTargetG, carbsTargetG, fatTargetG } = body.calorieBank;

      await prisma.calorieBank.update({
        where: { userId },
        data: {
          dailyTarget,
          allowNegative,
          expireAfterDays,
          proteinTargetG: proteinTargetG ?? undefined,
          carbsTargetG: carbsTargetG ?? undefined,
          fatTargetG: fatTargetG ?? undefined,
        },
      });
    }

    return { success: true };
  });
}
