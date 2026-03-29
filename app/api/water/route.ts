import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";

// POST /api/water - Add water intake
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amountMl } = body;

    if (!amountMl || amountMl <= 0) {
      return NextResponse.json(
        { error: "Invalid water amount" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update water intake in transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Find or create today's daily log
        let dailyLog = await tx.dailyLog.findFirst({
          where: {
            userId: user.id,
            date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
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
              increment: amountMl,
            },
          },
        });

        return { dailyLog: updatedLog };
      }
    );

    return NextResponse.json({
      success: true,
      waterMl: result.dailyLog.waterMl,
      amountAdded: amountMl,
      message: `Added ${amountMl}ml of water`,
    });
  } catch (error) {
    console.error("Error logging water:", error);
    return NextResponse.json(
      { error: "Failed to log water" },
      { status: 500 }
    );
  }
}

// GET /api/water - Get today's water intake
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dailyLog = await prisma.dailyLog.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: date,
          lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    return NextResponse.json({
      waterMl: dailyLog?.waterMl || 0,
      date: date.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching water:", error);
    return NextResponse.json(
      { error: "Failed to fetch water intake" },
      { status: 500 }
    );
  }
}
