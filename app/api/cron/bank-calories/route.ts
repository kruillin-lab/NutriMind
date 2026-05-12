import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authHeader = req.headers.get("authorization");
  const hasValidSecret = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setDate(endOfYesterday.getDate() + 1);

    // Fetch unbanked logs from yesterday (bankedAmount === 0 means not yet processed)
    const candidateLogs = await prisma.dailyLog.findMany({
      where: {
        date: { gte: yesterday, lt: endOfYesterday },
        bankedAmount: 0,
      },
      include: {
        user: {
          include: { calorieBank: true },
        },
      },
    });

    // Only process logs where user ate under target and has an active bank
    const logsToBank = candidateLogs.filter(
      (log) => log.user.calorieBank && log.caloriesConsumed < log.calorieTarget
    );

    const results: { userId: string; banked: number }[] = [];

    for (const log of logsToBank) {
      const bank = log.user.calorieBank!;
      const surplus = log.calorieTarget - log.caloriesConsumed;
      const dateLabel = yesterday.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      await prisma.$transaction(async (tx) => {
        await tx.calorieBank.update({
          where: { id: bank.id },
          data: {
            currentBalance: { increment: surplus },
            totalBanked: { increment: surplus },
          },
        });

        await tx.bankTransaction.create({
          data: {
            bankId: bank.id,
            type: "BANK",
            amount: surplus,
            reason: `Banked ${Math.round(surplus)} calories from ${dateLabel}`,
            caloriesConsumed: log.caloriesConsumed,
            caloriesTarget: log.calorieTarget,
            sourceId: log.id,
            sourceType: "daily_log",
          },
        });

        await tx.dailyLog.update({
          where: { id: log.id },
          data: { bankedAmount: surplus },
        });
      });

      results.push({ userId: log.userId, banked: surplus });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error banking calories:", error);
    return NextResponse.json(
      { error: "Failed to bank calories" },
      { status: 500 }
    );
  }
}
