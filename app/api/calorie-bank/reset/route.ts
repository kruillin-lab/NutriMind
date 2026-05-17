import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { createCalorieBankResetData } from "@/src/lib/calorieBank";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bank = await prisma.calorieBank.findUnique({
      where: { userId },
    });

    if (!bank) {
      return NextResponse.json(
        { error: "Calorie bank not initialized" },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      calorieBank: resetBank,
    });
  } catch (error) {
    console.error("Error resetting calorie bank:", error);
    return NextResponse.json(
      { error: "Failed to reset calorie bank" },
      { status: 500 }
    );
  }
}
