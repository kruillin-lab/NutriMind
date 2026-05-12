import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { exerciseMinutes, caloriesBurned, description } = body;

    if (!exerciseMinutes || exerciseMinutes <= 0) {
      return NextResponse.json(
        { error: "Invalid exercise duration" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { calorieBank: true },
    });

    if (!user || !user.calorieBank) {
      return NextResponse.json(
        { error: "User or calorie bank not found" },
        { status: 404 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

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
          exerciseMinutes: (dailyLog.exerciseMinutes || 0) + exerciseMinutes,
          caloriesBurned: (dailyLog.caloriesBurned || 0) + (caloriesBurned || 0),
        },
      });

      if (caloriesBurned > 0 && user.calorieBank) {
        await tx.calorieBank.update({
          where: { userId: user.id },
          data: {
            currentBalance: { increment: caloriesBurned },
            totalBanked: { increment: caloriesBurned },
          },
        });

        await tx.bankTransaction.create({
          data: {
            bankId: user.calorieBank.id,
            type: "BANK",
            amount: caloriesBurned,
            reason: description
              ? `Exercise: ${description} (+${caloriesBurned} kcal)`
              : `Exercise: +${caloriesBurned} kcal`,
            caloriesConsumed: updatedLog.caloriesConsumed,
            caloriesTarget: updatedLog.calorieTarget,
            sourceType: "exercise",
          },
        });
      }

      return updatedLog;
    });

    return NextResponse.json({
      success: true,
      exerciseMinutes: result.exerciseMinutes,
      caloriesBurned: result.caloriesBurned,
    });
  } catch (error) {
    console.error("Error logging exercise:", error);
    return NextResponse.json(
      { error: "Failed to log exercise" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dailyLog = await prisma.dailyLog.findFirst({
      where: {
        userId,
        date: { gte: date, lt: nextDay },
      },
    });

    return NextResponse.json({
      exerciseMinutes: dailyLog?.exerciseMinutes || 0,
      caloriesBurned: dailyLog?.caloriesBurned || 0,
    });
  } catch (error) {
    console.error("Error fetching exercise data:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercise data" },
      { status: 500 }
    );
  }
}
