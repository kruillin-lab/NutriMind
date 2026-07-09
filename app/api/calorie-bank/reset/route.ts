import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { createCalorieBankResetData } from "@/src/lib/calorieBank";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

export async function POST() {
  return handleRoute("Failed to reset calorie bank", async () => {
    const userId = await requireUserId();

    const bank = await prisma.calorieBank.findUnique({
      where: { userId },
    });

    if (!bank) {
      throw new ApiError(404, "Calorie bank not initialized");
    }

    const resetBank = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedBank = await tx.calorieBank.update({
        where: { id: bank.id },
        data: createCalorieBankResetData(),
      });

      await tx.bankTransaction.create({
        data: {
          bankId: bank.id,
          type: "ADJUST",
          amount: 0,
          reason: `Manual calorie bank reset. Previous balance was ${Math.round(bank.currentBalance)} kcal.`,
          sourceType: "manual",
        },
      });

      return updatedBank;
    });

    return {
      success: true,
      calorieBank: resetBank,
    };
  });
}
