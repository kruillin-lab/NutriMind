import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import { getSystemTimezone } from "@/lib/date-utils";

export async function POST(req: Request) {
  let userId: string | null = null;

  // Check for test mode bypass header (E2E testing)
  const testUserId = req.headers.get("X-Test-User-Id");

  if (testUserId && process.env.NODE_ENV !== "production") {
    userId = testUserId;
  } else {
    // Normal Clerk auth
    const authResult = await auth();
    userId = authResult.userId;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      profile,
      metabolicProfile,
      calorieBank,
      weightEntry
    } = body;

    // Destructure from nested objects to match API structure
    const {
      heightCm,
      birthDate,
      gender,
      goalWeightKg,
      targetDate,
      activityLevel,
      timezone = getSystemTimezone(),
    } = profile || {};

    const { trueMetabolicRate, bmrEstimate } = metabolicProfile || {};
    const { dailyTarget, allowNegative = false } = calorieBank || {};
    const { weightKg, bodyFatPercent } = weightEntry || {};
    void bodyFatPercent;

    // Map frontend ActivityLevel values to Prisma enum values
    const activityLevelMap: Record<string, "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE"> = {
      "SEDENTARY": "SEDENTARY",
      "LIGHTLY_ACTIVE": "LIGHT",
      "MODERATELY_ACTIVE": "MODERATE",
      "VERY_ACTIVE": "ACTIVE",
      "EXTRA_ACTIVE": "VERY_ACTIVE",
    };
    const prismaActivityLevel = activityLevelMap[activityLevel] ?? "SEDENTARY";

    // Ensure user exists first - create if not (handles webhook failures)
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      // Try to get user info from Clerk or use defaults
      let email = "unknown@example.com";
      let name: string | null = null;

      // Only try Clerk if not in test mode
      if (!testUserId) {
        try {
          const { clerkClient } = await import("@clerk/nextjs/server");
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(userId);
          email = clerkUser.emailAddresses[0]?.emailAddress || email;
          name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null;
        } catch (clerkError) {
          console.warn("[initialize] Could not fetch user from Clerk:", clerkError);
        }
      }

      await prisma.user.create({
        data: {
          id: userId,
          email,
          name,
        },
      });
    }

    // Create or update UserProfile
    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        heightCm,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender,
        goalWeightKg,
        targetDate: targetDate ? new Date(targetDate) : null,
        activityLevel: prismaActivityLevel,
        timezone,
      },
      update: {
        heightCm,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender,
        goalWeightKg,
        targetDate: targetDate ? new Date(targetDate) : null,
        activityLevel: prismaActivityLevel,
        timezone,
      },
    });

    // Create or update MetabolicProfile
    await prisma.metabolicProfile.upsert({
      where: { userId },
      create: {
        userId,
        trueMetabolicRate: trueMetabolicRate || bmrEstimate || 2000,
        bmrEstimate: bmrEstimate || 2000,
      },
      update: {
        trueMetabolicRate: trueMetabolicRate || bmrEstimate || 2000,
        bmrEstimate: bmrEstimate || 2000,
        lastCalculatedAt: new Date(),
      },
    });

    // Create or update CalorieBank
    await prisma.calorieBank.upsert({
      where: { userId },
      create: {
        userId,
        dailyTarget: dailyTarget || 2000,
        allowNegative,
      },
      update: {
        dailyTarget: dailyTarget || 2000,
        allowNegative,
      },
    });

    // Create weight entry if provided
    if (weightKg) {
      await prisma.weightEntry.create({
        data: {
          userId,
          weightKg,
          date: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error initializing user:", error);
    return NextResponse.json(
      { error: "Failed to initialize user" },
      { status: 500 }
    );
  }
}
