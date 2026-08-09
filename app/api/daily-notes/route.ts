import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";
import {
  ApiError,
  dayRange,
  handleRoute,
  requireUserId,
} from "@/src/lib/api-helpers";

export async function GET(req: NextRequest) {
  return handleRoute("Failed to fetch daily notes", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const { start: date, end: nextDay } = dayRange(dateParam);

    const dailyLog = await prisma.dailyLog.findFirst({
      where: {
        userId,
        date: { gte: date, lt: nextDay },
      },
      select: { id: true, notes: true },
    });

    return {
      notes: dailyLog?.notes || "",
      logId: dailyLog?.id || null,
    };
  });
}

export async function PUT(req: NextRequest) {
  return handleRoute("Failed to save daily notes", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { notes, date } = body;

    if (typeof notes !== "string" || notes.length > 10000) {
      throw new ApiError(400, "Notes must be a string of at most 10000 characters");
    }

    const { start: noteDate, end: nextDay } = dayRange(date);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let dailyLog = await tx.dailyLog.findFirst({
        where: {
          userId,
          date: { gte: noteDate, lt: nextDay },
        },
      });

      if (!dailyLog) {
        const calorieBank = await tx.calorieBank.findUnique({
          where: { userId },
        });

        dailyLog = await tx.dailyLog.create({
          data: {
            userId,
            date: noteDate,
            calorieTarget: calorieBank?.dailyTarget || 2000,
            notes,
          },
        });
      } else {
        dailyLog = await tx.dailyLog.update({
          where: { id: dailyLog.id },
          data: { notes },
        });
      }

      return dailyLog;
    });

    return { success: true, notes: result.notes };
  });
}
