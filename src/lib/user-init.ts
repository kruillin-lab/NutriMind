import { prisma } from "./prisma";

interface InitializeUserParams {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * Initialize a new user with all required records.
 * Called automatically via webhook, or manually as fallback.
 */
export async function initializeUser({ id, email, name }: InitializeUserParams) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (existingUser) {
    throw new Error("User already initialized");
  }

  // Create user and all related records in a transaction
  return await prisma.$transaction(async (tx) => {
    // Create the user
    const user = await tx.user.create({
      data: {
        id,
        email,
        name,
      },
    });

    // Create UserProfile with default values
    await tx.userProfile.create({
      data: {
        userId: user.id,
        heightCm: null,
        birthDate: null,
        gender: null,
        goalWeightKg: null,
        targetDate: null,
        activityLevel: "SEDENTARY",
        timezone: "America/New_York",
      },
    });

    // Create MetabolicProfile with initial estimates
    await tx.metabolicProfile.create({
      data: {
        userId: user.id,
        trueMetabolicRate: 2000,
        bmrEstimate: 1500,
        adaptiveFactor: 0,
        weightChangeFactor: 3500,
        predictionAccuracy: 0,
        predictionsMade: 0,
        predictionsCorrect: 0,
        calculationMethod: "harris_benedict",
      },
    });

    // Create CalorieBank
    await tx.calorieBank.create({
      data: {
        userId: user.id,
        currentBalance: 0,
        totalBanked: 0,
        totalSpent: 0,
        dailyTarget: 2000,
        weeklyAverage: 0,
        recommendedSpend: null,
        spendByDate: null,
        allowNegative: false,
        expireAfterDays: 30,
      },
    });

    return user;
  });
}

/**
 * Check if a user is fully initialized
 */
export async function isUserInitialized(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      metabolicProfile: true,
      calorieBank: true,
    },
  });

  return !!(
    user &&
    user.profile &&
    user.metabolicProfile &&
    user.calorieBank
  );
}
