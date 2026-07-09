import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  ApiError,
  dayRange,
  handleRoute,
  requireUserId,
} from "@/src/lib/api-helpers";

export async function POST(req: NextRequest) {
  return handleRoute("Failed to log weight", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { weightKg, date } = body;

    if (
      typeof weightKg !== "number" ||
      !Number.isFinite(weightKg) ||
      weightKg < 20 ||
      weightKg > 500
    ) {
      throw new ApiError(400, "Invalid weight value");
    }

    const { start: entryDate } = dayRange(date);

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

    return {
      success: true,
      weightEntry: {
        id: weightEntry.id,
        weightKg: weightEntry.weightKg,
        date: weightEntry.date,
      },
    };
  });
}

export async function GET(req: NextRequest) {
  return handleRoute("Failed to fetch weight data", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const limit = Math.min(Math.max(days, 1), 365);

    const entries = await prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      take: limit,
    });

    return {
      entries: entries.map((e) => ({
        id: e.id,
        weightKg: e.weightKg,
        date: e.date,
      })),
    };
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute("Failed to delete weight entry", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new ApiError(400, "Missing weight entry ID");
    }

    const entry = await prisma.weightEntry.findUnique({
      where: { id },
    });

    if (!entry || entry.userId !== userId) {
      throw new ApiError(404, "Weight entry not found");
    }

    await prisma.weightEntry.delete({
      where: { id },
    });

    return { success: true };
  });
}
