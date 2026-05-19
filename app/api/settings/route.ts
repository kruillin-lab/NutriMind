import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (body.profile) {
      const { heightCm, birthDate, gender, activityLevel, timezone, emailDigest } = body.profile;

      await prisma.userProfile.update({
        where: { userId },
        data: {
          heightCm,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          gender,
          activityLevel,
          timezone,
          ...(emailDigest !== undefined && { emailDigest }),
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
      const { dailyTarget, allowNegative, expireAfterDays, autoAdjustTarget, proteinTargetG, carbsTargetG, fatTargetG } = body.calorieBank;

      await prisma.calorieBank.update({
        where: { userId },
        data: {
          dailyTarget,
          allowNegative,
          expireAfterDays,
          autoAdjustTarget,
          proteinTargetG: proteinTargetG ?? undefined,
          carbsTargetG: carbsTargetG ?? undefined,
          fatTargetG: fatTargetG ?? undefined,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
