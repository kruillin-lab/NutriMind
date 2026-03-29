/**
 * Test-only endpoint for E2E testing
 * Creates a mock authenticated session for testing
 * ONLY available in development/test environments
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: NextRequest) {
  // Safety check - only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const { email = "test@example.com", externalId = "test-user-123" } = await req.json();

    // Create or update test user
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
      },
    });

    // Create UserProfile if not exists (for onboarding data)
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        heightCm: 175,
        gender: "MALE",
        activityLevel: "MODERATE",
        goalWeightKg: 70,
      },
    });

    // Create MetabolicProfile if not exists (for BMR/TDEE)
    await prisma.metabolicProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bmrEstimate: 1700,
        trueMetabolicRate: 2200,
        adaptiveFactor: 0,
      },
    });

    // Initialize Calorie Bank if not exists
    await prisma.calorieBank.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        currentBalance: 0,
        totalBanked: 0,
        totalSpent: 0,
        dailyTarget: 2000,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Test auth error:", error);
    return NextResponse.json(
      { error: "Failed to create test user", details: String(error) },
      { status: 500 }
    );
  }
}
