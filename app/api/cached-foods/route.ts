import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

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
  return handleRoute("Failed to fetch cached foods", async () => {
    await requireUserId();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const query = searchParams.get("query") || "";

    let foods;

    if (query) {
      const normalizedQuery = normalizeText(query);
      foods = await prisma.cachedFood.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { originalText: { contains: query } },
            { normalizedKey: { contains: normalizedQuery } },
          ],
        },
        orderBy: [
          { hitCount: "desc" },
        ],
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

    return {
      success: true,
      foods,
    };
  });
}

// POST /api/cached-foods - Manually add or update a cached food
export async function POST(req: NextRequest) {
  return handleRoute("Failed to create cached food", async () => {
    await requireUserId();

    const body = await req.json();
    const {
      originalText,
      name,
      calories,
      proteinG = 0,
      carbsG = 0,
      fatG = 0,
      servingSizeG,
      aiConfidence,
      source = "manual",
    } = body;

    if (!originalText || typeof originalText !== "string") {
      throw new ApiError(400, "Missing or invalid 'originalText' field");
    }

    if (!name || typeof name !== "string") {
      throw new ApiError(400, "Missing or invalid 'name' field");
    }

    if (calories === undefined || typeof calories !== "number") {
      throw new ApiError(400, "Missing or invalid 'calories' field");
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
        servingSizeG: servingSizeG != null ? servingSizeG : null,
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
        servingSizeG: servingSizeG != null ? servingSizeG : null,
        aiConfidence: aiConfidence ?? 1.0,
        source,
      },
    });

    return {
      success: true,
      food: cachedFood,
    };
  });
}

// PATCH /api/cached-foods - Update cache hit count
export async function PATCH(req: NextRequest) {
  return handleRoute("Failed to update cache", async () => {
    await requireUserId();

    const body = await req.json();
    const { normalizedKey, increment = 1 } = body;

    if (!normalizedKey || typeof normalizedKey !== "string") {
      throw new ApiError(400, "Missing or invalid 'normalizedKey' field");
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

    return {
      success: true,
      food: updated,
    };
  });
}
