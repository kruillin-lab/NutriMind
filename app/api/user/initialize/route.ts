import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let userId: string | null = null;
  
  // Check for test mode bypass header (E2E testing)
  const testUserId = req.headers.get("X-Test-User-Id");
  console.log("[initialize] Headers received:", {
    "X-Test-User-Id": testUserId,
    "Content-Type": req.headers.get("Content-Type"),
  });
  console.log("[initialize] NODE_ENV:", process.env.NODE_ENV);
  
  if (testUserId && process.env.NODE_ENV !== "production") {
    userId = testUserId;
    console.log("[initialize] Using test user ID:", userId);
  } else {
    // Normal Clerk auth
    const authResult = await auth();
    userId = authResult.userId;
    console.log("[initialize] Using Clerk auth user ID:", userId);
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
      timezone = "America/New_York",
    } = profile || {};

    const { trueMetabolicRate, bmrEstimate } = metabolicProfile || {};
    const { dailyTarget, allowNegative = false } = calorieBank || {};
    const { weightKg, bodyFatPercent } = weightEntry || {};

    // Map frontend ActivityLevel values to Prisma enum values
    const activityLevelMap: Record<string, "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE"> = {
      "SEDENTARY": "SEDENTARY",
      "LIGHTLY_ACTIVE": "LIGHT",
      "MODERATELY_ACTIVE": "MODERATE",
      "VERY_ACTIVE": "ACTIVE",
      "EXTRA_ACTIVE": "VERY_ACTIVE",
    };
    const prismaActivityLevel = activityLevelMap[activityLevel] ?? "SEDENTARY";
    console.log("[initialize] Activity level mapping:", activityLevel, "->", prismaActivityLevel);

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    return NextResponse.json(
      { error: "Failed to initialize user", details: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}
