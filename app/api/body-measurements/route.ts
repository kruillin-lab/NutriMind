import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

// GET /api/body-measurements - Get body measurements (with optional date range)
export async function GET(req: NextRequest) {
  return handleRoute("Failed to fetch body measurements", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const measurements = await prisma.bodyMeasurement.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
    });

    return {
      success: true,
      measurements,
      count: measurements.length,
    };
  });
}

// POST /api/body-measurements - Create a new body measurement entry
export async function POST(req: NextRequest) {
  return handleRoute("Failed to create body measurement", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const {
      date,
      waistCm,
      hipsCm,
      chestCm,
      thighCm,
      bicepCm,
      shoulderCm,
      neckCm,
      bodyFatPct,
      muscleMassKg,
      source,
    } = body;

    if (!date) {
      throw new ApiError(400, "Date is required");
    }

    // Validate that at least one measurement is provided
    const hasMeasurement = [
      waistCm, hipsCm, chestCm, thighCm, bicepCm, shoulderCm, neckCm,
      bodyFatPct, muscleMassKg,
    ].some((v) => v !== undefined && v !== null);

    if (!hasMeasurement) {
      throw new ApiError(400, "At least one measurement value is required");
    }

    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId,
        date: new Date(date),
        waistCm: waistCm ?? null,
        hipsCm: hipsCm ?? null,
        chestCm: chestCm ?? null,
        thighCm: thighCm ?? null,
        bicepCm: bicepCm ?? null,
        shoulderCm: shoulderCm ?? null,
        neckCm: neckCm ?? null,
        bodyFatPct: bodyFatPct ?? null,
        muscleMassKg: muscleMassKg ?? null,
        source: source || "manual",
      },
    });

    return {
      success: true,
      measurement,
      message: "Body measurement logged successfully",
    };
  });
}

// PUT /api/body-measurements/[id] - Update a body measurement entry
export async function PUT(req: NextRequest) {
  return handleRoute("Failed to update body measurement", async () => {
    const userId = await requireUserId();

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      throw new ApiError(400, "Measurement ID is required");
    }

    // Verify ownership
    const existing = await prisma.bodyMeasurement.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, "Measurement not found");
    }

    const body = await req.json();

    const measurement = await prisma.bodyMeasurement.update({
      where: { id },
      data: {
        ...(body.date && { date: new Date(body.date) }),
        ...(body.waistCm !== undefined && { waistCm: body.waistCm }),
        ...(body.hipsCm !== undefined && { hipsCm: body.hipsCm }),
        ...(body.chestCm !== undefined && { chestCm: body.chestCm }),
        ...(body.thighCm !== undefined && { thighCm: body.thighCm }),
        ...(body.bicepCm !== undefined && { bicepCm: body.bicepCm }),
        ...(body.shoulderCm !== undefined && { shoulderCm: body.shoulderCm }),
        ...(body.neckCm !== undefined && { neckCm: body.neckCm }),
        ...(body.bodyFatPct !== undefined && { bodyFatPct: body.bodyFatPct }),
        ...(body.muscleMassKg !== undefined && { muscleMassKg: body.muscleMassKg }),
        ...(body.source && { source: body.source }),
      },
    });

    return {
      success: true,
      measurement,
      message: "Body measurement updated successfully",
    };
  });
}

// DELETE /api/body-measurements/[id] - Delete a body measurement entry
export async function DELETE(req: NextRequest) {
  return handleRoute("Failed to delete body measurement", async () => {
    const userId = await requireUserId();

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      throw new ApiError(400, "Measurement ID is required");
    }

    // Verify ownership
    const existing = await prisma.bodyMeasurement.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new ApiError(404, "Measurement not found");
    }

    await prisma.bodyMeasurement.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Body measurement deleted successfully",
    };
  });
}
