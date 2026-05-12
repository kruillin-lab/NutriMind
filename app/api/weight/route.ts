import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { weightKg, date } = body;

    if (!weightKg || weightKg <= 0 || weightKg > 500) {
      return NextResponse.json(
        { error: "Invalid weight value" },
        { status: 400 }
      );
    }

    const entryDate = date ? new Date(date) : new Date();
    entryDate.setHours(0, 0, 0, 0);

    const existingEntry = await prisma.weightEntry.findUnique({
      where: {
        userId_date: {
          userId,
          date: entryDate,
        },
      },
    });

    let weightEntry;
    if (existingEntry) {
      weightEntry = await prisma.weightEntry.update({
        where: {
          userId_date: {
            userId,
            date: entryDate,
          },
        },
        data: {
          weightKg,
          source: "manual",
        },
      });
    } else {
      weightEntry = await prisma.weightEntry.create({
        data: {
          userId,
          date: entryDate,
          weightKg,
          source: "manual",
        },
      });
    }

    return NextResponse.json({
      success: true,
      weightEntry: {
        id: weightEntry.id,
        weightKg: weightEntry.weightKg,
        date: weightEntry.date,
      },
    });
  } catch (error) {
    console.error("Error logging weight:", error);
    return NextResponse.json(
      { error: "Failed to log weight" },
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
    const days = parseInt(searchParams.get("days") || "30", 10);
    const limit = Math.min(Math.max(days, 1), 365);

    const entries = await prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      take: limit,
    });

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        weightKg: e.weightKg,
        date: e.date,
      })),
    });
  } catch (error) {
    console.error("Error fetching weight data:", error);
    return NextResponse.json(
      { error: "Failed to fetch weight data" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing weight entry ID" },
        { status: 400 }
      );
    }

    const entry = await prisma.weightEntry.findUnique({
      where: { id },
    });

    if (!entry || entry.userId !== userId) {
      return NextResponse.json(
        { error: "Weight entry not found" },
        { status: 404 }
      );
    }

    await prisma.weightEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting weight entry:", error);
    return NextResponse.json(
      { error: "Failed to delete weight entry" },
      { status: 500 }
    );
  }
}
