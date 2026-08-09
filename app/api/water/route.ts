import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";
import { clampInt } from "@/src/lib/validation";
import {
  ApiError,
  dayRange,
  handleRoute,
  requireUser,
  requireUserId,
} from "@/src/lib/api-helpers";

// POST /api/water - Add water intake
export async function POST(req: NextRequest) {
  return handleRoute("Failed to log water", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { amountMl } = body;

    const safeAmountMl = clampInt(amountMl, 0, 10000);
    if (safeAmountMl === null || safeAmountMl <= 0) {
      throw new ApiError(400, "Invalid water amount");
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const { start: today, end: tomorrow } = dayRange();

    // Update water intake in transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Find or create today's daily log
        let dailyLog = await tx.dailyLog.findFirst({
          where: {
            userId: user.id,
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        if (!dailyLog) {
          // Get user's calorie bank for default target
          const calorieBank = await tx.calorieBank.findUnique({
            where: { userId: user.id },
          });

          dailyLog = await tx.dailyLog.create({
            data: {
              userId: user.id,
              date: today,
              calorieTarget: calorieBank?.dailyTarget || 2000,
            },
          });
        }

        // Update water amount
        const updatedLog = await tx.dailyLog.update({
          where: { id: dailyLog.id },
          data: {
            waterMl: {
              increment: safeAmountMl,
            },
          },
        });

        return { dailyLog: updatedLog };
      }
    );

    return {
      success: true,
      waterMl: result.dailyLog.waterMl,
      amountAdded: safeAmountMl,
      message: `Added ${safeAmountMl}ml of water`,
    };
  });
}

// GET /api/water - Get today's water intake
export async function GET(req: NextRequest) {
  return handleRoute("Failed to fetch water intake", async () => {
    const user = await requireUser();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const { start: date, end: nextDay } = dayRange(dateParam);

    const dailyLog = await prisma.dailyLog.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: date,
          lt: nextDay,
        },
      },
    });

    return {
      waterMl: dailyLog?.waterMl || 0,
      date: date.toISOString(),
    };
  });
}
