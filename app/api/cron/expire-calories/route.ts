import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { hasAuthorizedCronRequest } from "@/src/lib/cron-auth";

export async function POST(req: NextRequest) {
  if (!hasAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { userId: string; expired: number; bankId: string }[] = [];

  try {
    const calorieBanks = await prisma.calorieBank.findMany({
      where: {
        expireAfterDays: { gt: 0 },
      },
      include: {
        user: {
          select: {
            dailyLogs: {
              include: {
                meals: true,
              },
            },
          },
        },
      },
    });

    for (const bank of calorieBanks) {
      const expireDate = new Date();
      expireDate.setHours(0, 0, 0, 0);
      expireDate.setDate(expireDate.getDate() - bank.expireAfterDays);

      const unexpiredBankTransactions = await prisma.bankTransaction.findMany({
        where: {
          bankId: bank.id,
          type: "BANK",
          expired: false,
          createdAt: { lt: expireDate },
        },
        orderBy: { createdAt: "asc" },
      });

      if (unexpiredBankTransactions.length === 0) continue;

      let totalToExpire = 0;
      for (const tx of unexpiredBankTransactions) {
        totalToExpire += tx.amount;
      }

      if (totalToExpire <= 0) continue;

      const actualExpire = Math.min(totalToExpire, bank.currentBalance);
      if (actualExpire <= 0) continue;

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.calorieBank.update({
          where: { id: bank.id },
          data: {
            currentBalance: { decrement: actualExpire },
            expiredAmount: { increment: actualExpire },
          },
        });

        let remainingToExpire = actualExpire;
        for (const bankTx of unexpiredBankTransactions) {
          if (remainingToExpire <= 0) break;

          const expireFromThis = Math.min(remainingToExpire, bankTx.amount);
          const fullyExpired = expireFromThis >= bankTx.amount;

          // Only mark expired=true when the full tx amount is consumed.
          // Partial tx stays expired=false so next cron run picks up the remainder.
          if (fullyExpired) {
            await tx.bankTransaction.update({
              where: { id: bankTx.id },
              data: { expired: true },
            });
          }

          await tx.bankTransaction.create({
            data: {
              bankId: bank.id,
              type: "EXPIRE",
              amount: expireFromThis,
              reason: `Expired banked calories from ${new Date(bankTx.createdAt).toLocaleDateString()}`,
              caloriesConsumed: bankTx.caloriesConsumed,
              caloriesTarget: bankTx.caloriesTarget,
              sourceType: "expiration",
            },
          });

          remainingToExpire -= expireFromThis;
        }
      });

      results.push({
        userId: bank.userId,
        expired: actualExpire,
        bankId: bank.id,
      });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error expiring calories:", error);
    return NextResponse.json(
      { error: "Failed to expire calories" },
      { status: 500 }
    );
  }
}
