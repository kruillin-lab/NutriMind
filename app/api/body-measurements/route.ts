import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

// GET /api/body-measurements - Get body measurements (with optional date range)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    return NextResponse.json({
      success: true,
      measurements,
      count: measurements.length,
    });
  } catch (error) {
    console.error("Error fetching body measurements:", error);
    return NextResponse.json(
      { error: "Failed to fetch body measurements" },
      { status: 500 }
    );
  }
}

// POST /api/body-measurements - Create a new body measurement entry
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    // Validate that at least one measurement is provided
    const hasMeasurement = [
      waistCm, hipsCm, chestCm, thighCm, bicepCm, shoulderCm, neckCm,
      bodyFatPct, muscleMassKg,
    ].some((v) => v !== undefined && v !== null);

    if (!hasMeasurement) {
      return NextResponse.json(
        { error: "At least one measurement value is required" },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      measurement,
      message: "Body measurement logged successfully",
    });
  } catch (error) {
    console.error("Error creating body measurement:", error);
    return NextResponse.json(
      { error: "Failed to create body measurement" },
      { status: 500 }
    );
  }
}

// PUT /api/body-measurements/[id] - Update a body measurement entry
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json(
        { error: "Measurement ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.bodyMeasurement.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: "Measurement not found" },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      measurement,
      message: "Body measurement updated successfully",
    });
  } catch (error) {
    console.error("Error updating body measurement:", error);
    return NextResponse.json(
      { error: "Failed to update body measurement" },
      { status: 500 }
    );
  }
}

// DELETE /api/body-measurements/[id] - Delete a body measurement entry
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return NextResponse.json(
        { error: "Measurement ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.bodyMeasurement.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: "Measurement not found" },
        { status: 404 }
      );
    }

    await prisma.bodyMeasurement.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Body measurement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting body measurement:", error);
    return NextResponse.json(
      { error: "Failed to delete body measurement" },
      { status: 500 }
    );
  }
}
