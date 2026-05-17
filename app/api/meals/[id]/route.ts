import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { Prisma } from '@prisma/client';
import { applyCalorieBankOverageAdjustment } from '@/src/lib/calorieBank';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, vitaminCMg, calciumMg, ironMg, potassiumMg, servingSizeG, mealType } = body;

    if (!name || !calories || calories < 0) {
      return NextResponse.json(
        { error: 'Invalid meal data' },
        { status: 400 }
      );
    }

    // Find the meal and verify ownership
    const existingMeal = await prisma.meal.findUnique({
      where: { id },
      include: {
        dailyLog: {
          include: {
            user: {
              include: {
                calorieBank: true,
              },
            },
          },
        },
      },
    });

    if (!existingMeal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    if (existingMeal.dailyLog.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const calorieDifference = calories - existingMeal.calories;
    const user = existingMeal.dailyLog.user;

    // Update meal and daily log in transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Update the meal
        const updatedMeal = await tx.meal.update({
          where: { id },
          data: {
            name,
            calories,
            proteinG: proteinG ?? existingMeal.proteinG,
            carbsG: carbsG ?? existingMeal.carbsG,
            fatG: fatG ?? existingMeal.fatG,
            fiberG: fiberG ?? existingMeal.fiberG,
            sugarG: sugarG ?? existingMeal.sugarG,
            sodiumMg: sodiumMg ?? existingMeal.sodiumMg,
            vitaminCMg: vitaminCMg ?? existingMeal.vitaminCMg,
            calciumMg: calciumMg ?? existingMeal.calciumMg,
            ironMg: ironMg ?? existingMeal.ironMg,
            potassiumMg: potassiumMg ?? existingMeal.potassiumMg,
            servingSizeG: servingSizeG !== undefined ? servingSizeG : existingMeal.servingSizeG,
            mealType: mealType || existingMeal.mealType,
          },
        });

        // Update daily log consumed calories and all nutrients
        const newConsumed = existingMeal.dailyLog.caloriesConsumed + calorieDifference;
        const updatedLog = await tx.dailyLog.update({
          where: { id: existingMeal.dailyLog.id },
          data: {
            caloriesConsumed: newConsumed,
            proteinG: (existingMeal.dailyLog.proteinG || 0) + (updatedMeal.proteinG - existingMeal.proteinG),
            carbsG: (existingMeal.dailyLog.carbsG || 0) + (updatedMeal.carbsG - existingMeal.carbsG),
            fatG: (existingMeal.dailyLog.fatG || 0) + (updatedMeal.fatG - existingMeal.fatG),
            fiberG: (existingMeal.dailyLog.fiberG || 0) + (updatedMeal.fiberG - existingMeal.fiberG),
            sugarG: (existingMeal.dailyLog.sugarG || 0) + (updatedMeal.sugarG - existingMeal.sugarG),
            sodiumMg: (existingMeal.dailyLog.sodiumMg || 0) + (updatedMeal.sodiumMg - existingMeal.sodiumMg),
            vitaminCMg: (existingMeal.dailyLog.vitaminCMg || 0) + (updatedMeal.vitaminCMg - existingMeal.vitaminCMg),
            calciumMg: (existingMeal.dailyLog.calciumMg || 0) + (updatedMeal.calciumMg - existingMeal.calciumMg),
            ironMg: (existingMeal.dailyLog.ironMg || 0) + (updatedMeal.ironMg - existingMeal.ironMg),
            potassiumMg: (existingMeal.dailyLog.potassiumMg || 0) + (updatedMeal.potassiumMg - existingMeal.potassiumMg),
          },
        });

        const bankAdjustment = await applyCalorieBankOverageAdjustment({
          bank: user.calorieBank,
          tx,
          previousConsumed: existingMeal.dailyLog.caloriesConsumed,
          nextConsumed: newConsumed,
          calorieTarget: existingMeal.dailyLog.calorieTarget,
          sourceId: existingMeal.dailyLog.id,
          spendReason: `Overspend from edited meal: ${name}`,
          refundReason: `Refund from edited meal: ${name}`,
        });

        return { meal: updatedMeal, dailyLog: updatedLog, bankUpdate: bankAdjustment.bankUpdate };
      }
    );

    return NextResponse.json({
      success: true,
      meal: result.meal,
      remainingCalories: result.dailyLog.calorieTarget - result.dailyLog.caloriesConsumed,
      bankBalance: result.bankUpdate?.currentBalance ?? user.calorieBank?.currentBalance,
    });
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json(
      { error: 'Failed to update meal' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find the meal and verify ownership
    const existingMeal = await prisma.meal.findUnique({
      where: { id },
      include: {
        dailyLog: {
          include: {
            user: {
              include: {
                calorieBank: true,
              },
            },
          },
        },
      },
    });

    if (!existingMeal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    if (existingMeal.dailyLog.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = existingMeal.dailyLog.user;
    // Delete meal and update daily log in transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Delete the meal
        await tx.meal.delete({
          where: { id },
        });

        // Update daily log consumed calories and subtract all nutrients
        const newConsumed = existingMeal.dailyLog.caloriesConsumed - existingMeal.calories;
        const updatedLog = await tx.dailyLog.update({
          where: { id: existingMeal.dailyLog.id },
          data: {
            caloriesConsumed: newConsumed,
            proteinG: Math.max(0, (existingMeal.dailyLog.proteinG || 0) - (existingMeal.proteinG || 0)),
            carbsG: Math.max(0, (existingMeal.dailyLog.carbsG || 0) - (existingMeal.carbsG || 0)),
            fatG: Math.max(0, (existingMeal.dailyLog.fatG || 0) - (existingMeal.fatG || 0)),
            fiberG: Math.max(0, (existingMeal.dailyLog.fiberG || 0) - (existingMeal.fiberG || 0)),
            sugarG: Math.max(0, (existingMeal.dailyLog.sugarG || 0) - (existingMeal.sugarG || 0)),
            sodiumMg: Math.max(0, (existingMeal.dailyLog.sodiumMg || 0) - (existingMeal.sodiumMg || 0)),
            vitaminCMg: Math.max(0, (existingMeal.dailyLog.vitaminCMg || 0) - (existingMeal.vitaminCMg || 0)),
            calciumMg: Math.max(0, (existingMeal.dailyLog.calciumMg || 0) - (existingMeal.calciumMg || 0)),
            ironMg: Math.max(0, (existingMeal.dailyLog.ironMg || 0) - (existingMeal.ironMg || 0)),
            potassiumMg: Math.max(0, (existingMeal.dailyLog.potassiumMg || 0) - (existingMeal.potassiumMg || 0)),
          },
        });

        const bankAdjustment = await applyCalorieBankOverageAdjustment({
          bank: user.calorieBank,
          tx,
          previousConsumed: existingMeal.dailyLog.caloriesConsumed,
          nextConsumed: newConsumed,
          calorieTarget: existingMeal.dailyLog.calorieTarget,
          sourceId: existingMeal.dailyLog.id,
          spendReason: `Overspend after deleting meal: ${existingMeal.name}`,
          refundReason: `Refund from deleted meal: ${existingMeal.name}`,
        });

        return { dailyLog: updatedLog, bankUpdate: bankAdjustment.bankUpdate };
      }
    );

    return NextResponse.json({
      success: true,
      remainingCalories: result.dailyLog.calorieTarget - result.dailyLog.caloriesConsumed,
      bankBalance: result.bankUpdate?.currentBalance ?? user.calorieBank?.currentBalance,
    });
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal' },
      { status: 500 }
    );
  }
}
