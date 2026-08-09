import type { BankTransaction, CalorieBank, Prisma } from "@/src/generated/prisma/client";
import { getLocalMidnight } from "@/lib/date-utils";
import { prisma } from "@/src/lib/prisma";

type OverageAdjustmentType = "spend" | "refund" | "none";

export interface OverageAdjustmentInput {
  previousConsumed: number;
  nextConsumed: number;
  calorieTarget: number;
}

export interface OverageAdjustment {
  type: OverageAdjustmentType;
  amount: number;
}

export interface CompletedDayLog {
  date: Date;
  caloriesConsumed: number;
  calorieTarget: number;
  bankedAmount: number;
}

export function createCalorieBankResetData() {
  return {
    currentBalance: 0,
    totalBanked: 0,
    totalSpent: 0,
    expiredAmount: 0,
    recommendedSpend: null,
    spendByDate: null,
  };
}

interface ApplyOverageAdjustmentInput extends OverageAdjustmentInput {
  bank: CalorieBank | null;
  tx: Prisma.TransactionClient;
  sourceId: string;
  spendReason: string;
  refundReason: string;
}

export interface AppliedOverageAdjustment {
  adjustment: OverageAdjustment;
  bankUpdate: CalorieBank | null;
  bankTransaction: BankTransaction | null;
}

export function calculateOverageAdjustment({
  previousConsumed,
  nextConsumed,
  calorieTarget,
}: OverageAdjustmentInput): OverageAdjustment {
  const previousOverage = Math.max(0, previousConsumed - calorieTarget);
  const nextOverage = Math.max(0, nextConsumed - calorieTarget);
  const delta = nextOverage - previousOverage;

  if (delta > 0) {
    return { type: "spend", amount: delta };
  }

  if (delta < 0) {
    return { type: "refund", amount: Math.abs(delta) };
  }

  return { type: "none", amount: 0 };
}

export function calculateCompletedDaySurplus(
  log: CompletedDayLog,
  today: Date = getLocalMidnight()
): number | null {
  if (
    log.bankedAmount !== 0 ||
    log.date.getTime() >= today.getTime() ||
    log.caloriesConsumed <= 0
  ) {
    return null;
  }

  const surplus = log.calorieTarget - log.caloriesConsumed;
  return surplus > 0 ? surplus : null;
}

export async function applyCalorieBankOverageAdjustment({
  bank,
  tx,
  previousConsumed,
  nextConsumed,
  calorieTarget,
  sourceId,
  spendReason,
  refundReason,
}: ApplyOverageAdjustmentInput): Promise<AppliedOverageAdjustment> {
  const adjustment = calculateOverageAdjustment({
    previousConsumed,
    nextConsumed,
    calorieTarget,
  });

  if (!bank || adjustment.type === "none") {
    return { adjustment, bankUpdate: null, bankTransaction: null };
  }

  const freshBank = await tx.calorieBank.findUnique({
    where: { id: bank.id },
  });

  if (!freshBank) {
    return { adjustment, bankUpdate: null, bankTransaction: null };
  }

  if (adjustment.type === "spend") {
    const newBalance = freshBank.currentBalance - adjustment.amount;

    if (newBalance < 0 && !freshBank.allowNegative) {
      return { adjustment, bankUpdate: null, bankTransaction: null };
    }

    const bankUpdate = await tx.calorieBank.update({
      where: { id: freshBank.id },
      data: {
        currentBalance: { decrement: adjustment.amount },
        totalSpent: { increment: adjustment.amount },
      },
    });

    const bankTransaction = await tx.bankTransaction.create({
      data: {
        bankId: freshBank.id,
        type: "SPEND",
        amount: adjustment.amount,
        reason: spendReason,
        caloriesConsumed: nextConsumed,
        caloriesTarget: calorieTarget,
        sourceId,
        sourceType: "daily_log",
      },
    });

    return { adjustment, bankUpdate, bankTransaction };
  }

  const transactions = await tx.bankTransaction.findMany({
    where: {
      bankId: freshBank.id,
      sourceId,
      sourceType: "daily_log",
      type: { in: ["SPEND", "ADJUST"] },
    },
    select: {
      type: true,
      amount: true,
    },
  });
  const netAppliedSpend = transactions.reduce((total, transaction) => {
    if (transaction.type === "SPEND") {
      return total + transaction.amount;
    }

    return total - transaction.amount;
  }, 0);
  const refundAmount = Math.min(
    adjustment.amount,
    Math.max(0, netAppliedSpend),
    Math.max(0, freshBank.totalSpent)
  );

  if (refundAmount === 0) {
    return { adjustment, bankUpdate: null, bankTransaction: null };
  }

  const bankUpdate = await tx.calorieBank.update({
    where: { id: freshBank.id },
    data: {
      currentBalance: { increment: refundAmount },
      totalSpent: { decrement: refundAmount },
    },
  });

  const bankTransaction = await tx.bankTransaction.create({
    data: {
      bankId: freshBank.id,
      type: "ADJUST",
      amount: refundAmount,
      reason: refundReason,
      caloriesConsumed: nextConsumed,
      caloriesTarget: calorieTarget,
      sourceId,
      sourceType: "daily_log",
    },
  });

  return { adjustment, bankUpdate, bankTransaction };
}

export async function bankPendingCompletedDays(
  userId?: string,
  today: Date = getLocalMidnight()
): Promise<Array<{ userId: string; banked: number }>> {
  const candidateLogs = await prisma.dailyLog.findMany({
    where: {
      ...(userId ? { userId } : {}),
      date: { lt: today },
      bankedAmount: 0,
      caloriesConsumed: { gt: 0 },
    },
    include: {
      user: {
        include: { calorieBank: true },
      },
    },
  });

  const results: Array<{ userId: string; banked: number }> = [];

  for (const log of candidateLogs) {
    const bank = log.user.calorieBank;
    const surplus = calculateCompletedDaySurplus(log, today);

    if (!bank || surplus == null) {
      continue;
    }

    const dateLabel = log.date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const banked = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const claim = await tx.dailyLog.updateMany({
        where: { id: log.id, bankedAmount: 0 },
        data: { bankedAmount: surplus },
      });

      if (claim.count === 0) {
        return false;
      }

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

      return true;
    });

    if (banked) {
      results.push({ userId: log.userId, banked: surplus });
    }
  }

  return results;
}
