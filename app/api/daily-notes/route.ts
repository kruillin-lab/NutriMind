import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";

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
      select: { id: true, notes: true },
    });

    return NextResponse.json({
      notes: dailyLog?.notes || "",
      logId: dailyLog?.id || null,
    });
  } catch (error) {
    console.error("Error fetching daily notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily notes" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notes, date } = body;

    if (typeof notes !== "string" || notes.length > 10000) {
      return NextResponse.json(
        { error: "Notes must be a string of at most 10000 characters" },
        { status: 400 }
      );
    }

    const noteDate = date ? new Date(date) : new Date();
    noteDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(noteDate);
    nextDay.setDate(nextDay.getDate() + 1);

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

    return NextResponse.json({ success: true, notes: result.notes });
  } catch (error) {
    console.error("Error saving daily notes:", error);
    return NextResponse.json(
      { error: "Failed to save daily notes" },
      { status: 500 }
    );
  }
}
