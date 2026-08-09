import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";
import { clampInt } from "@/src/lib/validation";
import {
  ApiError,
  dayRange,
  handleRoute,
  requireUserId,
} from "@/src/lib/api-helpers";

export async function POST(req: NextRequest) {
  return handleRoute("Failed to log exercise", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { exerciseMinutes, caloriesBurned, description } = body;

    const safeMinutes = clampInt(exerciseMinutes, 0, 1440);
    if (safeMinutes === null || safeMinutes <= 0) {
      throw new ApiError(400, "Invalid exercise duration");
    }

    const safeBurned = caloriesBurned != null ? clampInt(caloriesBurned, 0, 10000) : 0;
    if (safeBurned === null) {
      throw new ApiError(400, "Invalid calories burned");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { calorieBank: true },
    });

    if (!user || !user.calorieBank) {
      throw new ApiError(404, "User or calorie bank not found");
    }

    const { start: today, end: tomorrow } = dayRange();

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let dailyLog = await tx.dailyLog.findFirst({
        where: {
          userId: user.id,
          date: { gte: today, lt: tomorrow },
        },
      });

      if (!dailyLog) {
        dailyLog = await tx.dailyLog.create({
          data: {
            userId: user.id,
            date: today,
            calorieTarget: user.calorieBank!.dailyTarget,
          },
        });
      }

      const updatedLog = await tx.dailyLog.update({
        where: { id: dailyLog.id },
        data: {
          exerciseMinutes: (dailyLog.exerciseMinutes || 0) + safeMinutes,
          caloriesBurned: (dailyLog.caloriesBurned || 0) + safeBurned,
        },
      });

      if (safeBurned > 0 && user.calorieBank) {
        await tx.calorieBank.update({
          where: { userId: user.id },
          data: {
            currentBalance: { increment: safeBurned },
            totalBanked: { increment: safeBurned },
          },
        });

        await tx.bankTransaction.create({
          data: {
            bankId: user.calorieBank.id,
            type: "BANK",
            amount: safeBurned,
            reason: description
              ? `Exercise: ${description} (+${safeBurned} kcal)`
              : `Exercise: +${safeBurned} kcal`,
            caloriesConsumed: updatedLog.caloriesConsumed,
            caloriesTarget: updatedLog.calorieTarget,
            sourceType: "exercise",
          },
        });
      }

      return updatedLog;
    });

    return {
      success: true,
      exerciseMinutes: result.exerciseMinutes,
      caloriesBurned: result.caloriesBurned,
    };
  });
}

export async function GET(req: NextRequest) {
  return handleRoute("Failed to fetch exercise data", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const { start: date, end: nextDay } = dayRange(dateParam);

    const dailyLog = await prisma.dailyLog.findFirst({
      where: {
        userId,
        date: { gte: date, lt: nextDay },
      },
    });

    return {
      exerciseMinutes: dailyLog?.exerciseMinutes || 0,
      caloriesBurned: dailyLog?.caloriesBurned || 0,
    };
  });
}
