import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { getSystemTimezone } from "@/lib/date-utils";
import { ApiError, handleRoute } from "@/src/lib/api-helpers";

export async function POST(req: Request) {
  return handleRoute("Failed to initialize user", async () => {
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
      throw new ApiError(401, "Unauthorized");
    }

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
    let email = `user_${userId}@placeholder.invalid`;
    let name: string | null = null;
    if (!existingUser) {
      // Try to get user info from Clerk or use defaults
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
    }

    // Create/update the user record (if needed), UserProfile,
    // MetabolicProfile, CalorieBank, and optional WeightEntry atomically.
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (!existingUser) {
        await tx.user.create({
          data: {
            id: userId,
            email,
            name,
          },
        });
      }

      // Create or update UserProfile
      await tx.userProfile.upsert({
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
      await tx.metabolicProfile.upsert({
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
      await tx.calorieBank.upsert({
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
        await tx.weightEntry.create({
          data: {
            userId,
            weightKg,
            date: new Date(),
          },
        });
      }
    });

    return { success: true };
  });
}
