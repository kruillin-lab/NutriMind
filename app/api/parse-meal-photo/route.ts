import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { jsonError } from "@/src/lib/api-helpers";
import {
  parsePhotoMealEstimate,
  PHOTO_ESTIMATE_LIMIT,
  PHOTO_ESTIMATE_WINDOW_MS,
  validateImageDataUrl,
} from "@/src/lib/photo-meal";
import { checkRateLimit } from "@/src/lib/rateLimit";

const PROMPT = `Estimate the food and nutrition visible in this meal photo. Return only valid JSON in this exact shape:
{
  "foods": [{
    "name": "food name",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sugar": number,
    "sodium": number,
    "vitaminC": number,
    "calcium": number,
    "iron": number,
    "potassium": number,
    "servingSize": number,
    "confidence": number
  }],
  "confidence": number,
  "uncertaintyNote": "short portion or ingredient uncertainty"
}
Use grams for protein, carbs, fat, fiber, sugar, and servingSize; use milligrams for sodium, vitaminC, calcium, iron, and potassium. All numbers must be non-negative. Confidence must be between 0 and 1. Do not identify people or include personal details.`;

function getOpenAiKey() {
  return process.env.NUTRIMIND_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
}

function stripJsonFence(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return jsonError(401, "Unauthorized");
  }

  if (!checkRateLimit(`parse-meal-photo:${userId}`, PHOTO_ESTIMATE_LIMIT, PHOTO_ESTIMATE_WINDOW_MS)) {
    return jsonError(429, "Too many meal photo estimates. Please try again later.");
  }

  const body = await req.json().catch(() => null);
  const image = body && typeof body === "object" ? (body as { image?: unknown }).image : undefined;
  if (!validateImageDataUrl(image)) {
    return jsonError(400, "Missing or invalid image");
  }

  const apiKey = getOpenAiKey();
  if (!apiKey.startsWith("sk-")) {
    return jsonError(500, "Meal photo estimation is not configured");
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: image, detail: "high" } },
          { type: "text", text: PROMPT },
        ],
      }],
      temperature: 0.2,
      max_tokens: 1_000,
    });

    const raw = completion.choices[0]?.message.content;
    const parsed = raw ? parsePhotoMealEstimate(JSON.parse(stripJsonFence(raw))) : null;
    if (!parsed) {
      return jsonError(502, "Unable to estimate this meal photo");
    }

    return NextResponse.json({ success: true, estimate: parsed });
  } catch {
    return jsonError(502, "Unable to estimate this meal photo");
  }
}
