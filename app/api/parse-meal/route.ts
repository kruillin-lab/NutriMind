import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { jsonError } from "@/src/lib/api-helpers";
import OpenAI from "openai";

// NUTRIMIND_OPENAI_API_KEY avoids collision with any system-level OPENAI_API_KEY env var
const OPENAI_API_KEY = process.env.NUTRIMIND_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || null;

interface ParsedFood {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  servingSize?: number; // in grams
  confidence: number;
}

// Helper to normalize text for cache key
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Collapse multiple spaces to single space
    .replace(/[.,!?;:]$/, ""); // Remove trailing punctuation
}

export async function POST(req: NextRequest) {
  try {
    const testUserId = req.headers.get("X-Test-User-Id");
    const { userId: clerkUserId } = testUserId && process.env.NODE_ENV !== "production"
      ? { userId: testUserId }
      : await auth();
    const userId = clerkUserId;
    if (!userId) {
      return jsonError(401, "Unauthorized");
    }

    // Best-effort per-instance rate limit: 20 requests per user per minute
    if (!checkRateLimit(`parse-meal:${userId}`, 20, 60_000)) {
      return jsonError(429, "Too many requests");
    }

    // Validate we have a proper OpenAI key
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
      return jsonError(500, "Invalid or missing OpenAI API key. Please check .env.local");
    }

    // Initialize OpenAI client with values from .env.local (bypassing system env vars)
    const openaiConfig: { apiKey: string; baseURL?: string } = {
      apiKey: OPENAI_API_KEY,
    };

    // Only set baseURL if it's provided and is a real OpenAI endpoint (not localhost/Ollama)
    if (OPENAI_API_BASE && !OPENAI_API_BASE.includes('localhost')) {
      openaiConfig.baseURL = OPENAI_API_BASE;
    }

    const openai = new OpenAI(openaiConfig);

    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return jsonError(400, "Missing or invalid 'text' field");
    }

    if (text.length > 500) {
      return jsonError(400, "Text too long (max 500 characters)");
    }

    const normalizedKey = normalizeText(text);

    // Check cache first
    const cachedFood = await prisma.cachedFood.findUnique({
      where: {
        normalizedKey,
      },
    });

    if (cachedFood) {
      // Update hit count and last used timestamp
      await prisma.cachedFood.update({
        where: {
          id: cachedFood.id,
        },
        data: {
          hitCount: {
            increment: 1,
          },
          lastUsedAt: new Date(),
        },
      });

      // Return cached result with all nutrients
      return NextResponse.json({
        success: true,
        foods: [
          {
            name: cachedFood.name,
            calories: cachedFood.calories,
            protein: cachedFood.proteinG,
            carbs: cachedFood.carbsG,
            fat: cachedFood.fatG,
            fiber: cachedFood.fiberG,
            sugar: cachedFood.sugarG,
            sodium: cachedFood.sodiumMg,
            vitaminC: cachedFood.vitaminCMg,
            calcium: cachedFood.calciumMg,
            iron: cachedFood.ironMg,
            potassium: cachedFood.potassiumMg,
            servingSize: cachedFood.servingSizeG ?? undefined,
            confidence: cachedFood.aiConfidence,
          },
        ],
        cached: true,
        cacheHits: cachedFood.hitCount + 1,
      });
    }

    // Cache miss - call OpenAI
    const prompt = `Parse the following meal description and return a JSON array of food items with their nutritional information.

Meal description: "${text}"

Return ONLY a JSON array in this exact format (no markdown, no explanation, just valid JSON):
[
  {
    "name": "Food item name",
    "calories": number,
    "protein": number (in grams),
    "carbs": number (in grams),
    "fat": number (in grams),
    "fiber": number (in grams),
    "sugar": number (in grams),
    "sodium": number (in milligrams),
    "vitaminC": number (in milligrams),
    "calcium": number (in milligrams),
    "iron": number (in milligrams),
    "potassium": number (in milligrams),
    "servingSize": number (in grams, estimated total weight of the described portion),
    "confidence": number (0.0 to 1.0 representing confidence in the estimate)
  }
]

Guidelines:
- Estimate calories based on typical portion sizes if not specified
- Include common preparation methods (fried, grilled, etc.) in the name
- Be precise: if "2 slices of pizza", calculate for 2 slices
- If "large coffee with oat milk", estimate accordingly
- Round calories to nearest 5, macros to nearest 0.1g
- Micronutrients should be estimated where possible (e.g., fruit has vitamin C, dairy has calcium)
- Use 0 if a nutrient is not applicable or negligible
- Confidence should reflect certainty in the estimate (e.g., 0.95 for standard items, 0.70 for vague descriptions)
- CRITICAL: If the input is NOT a food description (e.g., file paths, URLs, code, random text), return an empty array []`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a precise nutrition parser. Extract food items from text descriptions and estimate their nutritional values accurately. Always return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0].message.content;

    if (!responseContent) {
      return jsonError(500, "Empty response from AI");
    }

    // Clean up any markdown code blocks if present
    const jsonString = responseContent
      .replace(/^```json\s*/, "")
      .replace(/```$/, "")
      .trim();

    let parsedFoods: ParsedFood[];
    try {
      parsedFoods = JSON.parse(jsonString);
    } catch (parseError) {
      void parseError;
      console.error("Failed to parse AI response:", responseContent);
      return jsonError(500, "AI returned invalid JSON format");
    }

    // Validate the parsed results
    if (!Array.isArray(parsedFoods)) {
      return jsonError(500, "AI response is not an array");
    }

    // Sanitize and validate each food item
    const validatedFoods = parsedFoods.map((food) => {
      let name = String(food.name || "Unknown item");
      // Reject file-path-like strings (Windows, Unix, or UNC paths)
      if (/^[a-zA-Z]:\\|^[\\/]{2}|^\/(home|Users|usr|var|tmp|etc|root|Users)/i.test(name)) {
        name = "Unknown item";
      }
      // Truncate excessively long names
      if (name.length > 100) {
        name = name.slice(0, 100) + "...";
      }
      return {
        name,
        calories: Math.max(0, Math.round(Number(food.calories) || 0)),
        protein: food.protein !== undefined ? Math.max(0, Number(food.protein)) : undefined,
        carbs: food.carbs !== undefined ? Math.max(0, Number(food.carbs)) : undefined,
        fat: food.fat !== undefined ? Math.max(0, Number(food.fat)) : undefined,
        fiber: food.fiber !== undefined ? Math.max(0, Number(food.fiber)) : undefined,
        sugar: food.sugar !== undefined ? Math.max(0, Number(food.sugar)) : undefined,
        sodium: food.sodium !== undefined ? Math.max(0, Number(food.sodium)) : undefined,
        vitaminC: food.vitaminC !== undefined ? Math.max(0, Number(food.vitaminC)) : undefined,
        calcium: food.calcium !== undefined ? Math.max(0, Number(food.calcium)) : undefined,
        iron: food.iron !== undefined ? Math.max(0, Number(food.iron)) : undefined,
        potassium: food.potassium !== undefined ? Math.max(0, Number(food.potassium)) : undefined,
        servingSize: food.servingSize !== undefined ? Math.max(0, Number(food.servingSize)) : undefined,
        confidence: Math.max(0, Math.min(1, Number(food.confidence) || 0.5)),
      };
    });

    // Cache the result for the first food item (most common case)
    if (validatedFoods.length > 0) {
      const firstFood = validatedFoods[0];
      try {
        await prisma.cachedFood.create({
          data: {
            normalizedKey,
            originalText: text,
            name: firstFood.name,
            calories: firstFood.calories,
            proteinG: firstFood.protein ?? 0,
            carbsG: firstFood.carbs ?? 0,
            fatG: firstFood.fat ?? 0,
            fiberG: firstFood.fiber ?? 0,
            sugarG: firstFood.sugar ?? 0,
            sodiumMg: firstFood.sodium ?? 0,
            vitaminCMg: firstFood.vitaminC ?? 0,
            calciumMg: firstFood.calcium ?? 0,
            ironMg: firstFood.iron ?? 0,
            potassiumMg: firstFood.potassium ?? 0,
            servingSizeG: firstFood.servingSize ?? null,
            aiConfidence: firstFood.confidence,
            source: "openai",
          },
        });
      } catch (cacheError) {
        // Don't fail the request if caching fails
        console.error("Failed to cache food:", cacheError);
      }
    }

    return NextResponse.json({
      success: true,
      foods: validatedFoods,
      cached: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("[PARSE MEAL ERROR]", {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });
    return jsonError(500, `Failed to parse meal: ${errorMessage}`);
  }
}
