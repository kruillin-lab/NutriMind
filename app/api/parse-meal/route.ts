import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ParsedFood {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
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
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'text' field" },
        { status: 400 }
      );
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

      console.log(`[CACHE HIT] "${text}" -> "${cachedFood.name}" (${cachedFood.hitCount + 1} hits)`);

      // Return cached result
      return NextResponse.json({
        success: true,
        foods: [
          {
            name: cachedFood.name,
            calories: cachedFood.calories,
            protein: cachedFood.proteinG,
            carbs: cachedFood.carbsG,
            fat: cachedFood.fatG,
            confidence: cachedFood.aiConfidence,
          },
        ],
        cached: true,
        cacheHits: cachedFood.hitCount + 1,
      });
    }

    console.log(`[CACHE MISS] "${text}" - calling OpenAI...`);

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
    "confidence": number (0.0 to 1.0 representing confidence in the estimate)
  }
]

Guidelines:
- Estimate calories based on typical portion sizes if not specified
- Include common preparation methods (fried, grilled, etc.) in the name
- Be precise: if "2 slices of pizza", calculate for 2 slices
- If "large coffee with oat milk", estimate accordingly
- Round calories to nearest 5, macros to nearest 0.1g
- Confidence should reflect certainty in the estimate (e.g., 0.95 for standard items, 0.70 for vague descriptions)`;

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
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 500 }
      );
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
      console.error("Failed to parse AI response:", responseContent);
      return NextResponse.json(
        { error: "AI returned invalid JSON format" },
        { status: 500 }
      );
    }

    // Validate the parsed results
    if (!Array.isArray(parsedFoods)) {
      return NextResponse.json(
        { error: "AI response is not an array" },
        { status: 500 }
      );
    }

    // Sanitize and validate each food item
    const validatedFoods = parsedFoods.map((food) => ({
      name: String(food.name || "Unknown item"),
      calories: Math.max(0, Math.round(Number(food.calories) || 0)),
      protein: food.protein !== undefined ? Math.max(0, Number(food.protein)) : undefined,
      carbs: food.carbs !== undefined ? Math.max(0, Number(food.carbs)) : undefined,
      fat: food.fat !== undefined ? Math.max(0, Number(food.fat)) : undefined,
      confidence: Math.max(0, Math.min(1, Number(food.confidence) || 0.5)),
    }));

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
            aiConfidence: firstFood.confidence,
            source: "openai",
          },
        });
        console.log(`[CACHE WRITE] "${text}" -> "${firstFood.name}" (${firstFood.calories} cal)`);
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
    console.error("Error parsing meal:", error);
    return NextResponse.json(
      { error: "Failed to parse meal description" },
      { status: 500 }
    );
  }
}
