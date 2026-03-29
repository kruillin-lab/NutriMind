import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

// Helper to normalize text for cache key
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Collapse multiple spaces to single space
    .replace(/[.,!?;:]$/, ""); // Remove trailing punctuation
}

// GET /api/cached-foods - Get popular cached foods
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const query = searchParams.get("query") || "";

    let foods;

    if (query) {
      // Search by normalized key (for autocomplete)
      const normalizedQuery = normalizeText(query);
      foods = await prisma.cachedFood.findMany({
        where: {
          normalizedKey: {
            contains: normalizedQuery,
          },
        },
        orderBy: {
          hitCount: "desc",
        },
        take: limit,
      });
    } else {
      // Get most popular foods
      foods = await prisma.cachedFood.findMany({
        orderBy: {
          hitCount: "desc",
        },
        take: limit,
      });
    }

    return NextResponse.json({
      success: true,
      foods,
    });
  } catch (error) {
    console.error("[cached-foods] Error fetching cached foods:", error);
    return NextResponse.json(
      { error: "Failed to fetch cached foods", details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/cached-foods - Manually add or update a cached food
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      originalText,
      name,
      calories,
      proteinG = 0,
      carbsG = 0,
      fatG = 0,
      aiConfidence,
      source = "manual",
    } = body;

    if (!originalText || typeof originalText !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'originalText' field" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'name' field" },
        { status: 400 }
      );
    }

    if (calories === undefined || typeof calories !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid 'calories' field" },
        { status: 400 }
      );
    }

    const normalizedKey = normalizeText(originalText);

    // Upsert the cached food
    const cachedFood = await prisma.cachedFood.upsert({
      where: {
        normalizedKey,
      },
      update: {
        name,
        calories,
        proteinG,
        carbsG,
        fatG,
        aiConfidence: aiConfidence ?? 1.0,
        source,
        hitCount: { increment: 1 },
      },
      create: {
        normalizedKey,
        originalText,
        name,
        calories,
        proteinG,
        carbsG,
        fatG,
        aiConfidence: aiConfidence ?? 1.0,
        source,
      },
    });

    return NextResponse.json({
      success: true,
      food: cachedFood,
    });
  } catch (error) {
    console.error("Error creating cached food:", error);
    return NextResponse.json(
      { error: "Failed to create cached food" },
      { status: 500 }
    );
  }
}

// PATCH /api/cached-foods - Update cache hit count
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { normalizedKey, increment = 1 } = body;

    if (!normalizedKey || typeof normalizedKey !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'normalizedKey' field" },
        { status: 400 }
      );
    }

    const updated = await prisma.cachedFood.update({
      where: {
        normalizedKey,
      },
      data: {
        hitCount: { increment },
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      food: updated,
    });
  } catch (error) {
    console.error("Error updating cache hit count:", error);
    return NextResponse.json(
      { error: "Failed to update cache" },
      { status: 500 }
    );
  }
}
