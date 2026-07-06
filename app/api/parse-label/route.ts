import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { jsonError } from "@/src/lib/api-helpers";
import OpenAI from "openai";

// NUTRIMIND_OPENAI_API_KEY avoids collision with any system-level OPENAI_API_KEY env var
const OPENAI_API_KEY = process.env.NUTRIMIND_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";

const PROMPT = `Extract the nutrition facts from this nutrition label image. Return ONLY valid JSON with these exact fields (use per-serving values):
{
  "name": "product name if visible, otherwise Scanned Item",
  "servingSize": "serving size string",
  "calories": number,
  "proteinG": number,
  "carbsG": number,
  "fatG": number,
  "fiberG": number,
  "sugarG": number,
  "sodiumMg": number,
  "vitaminCMg": number,
  "calciumMg": number,
  "ironMg": number,
  "potassiumMg": number
}
Use 0 for any nutrients not shown. All values must be numbers, not strings.`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return jsonError(401, "Unauthorized");
  }

  // Best-effort per-instance rate limit: 10 requests per user per minute
  if (!checkRateLimit(`parse-label:${userId}`, 10, 60_000)) {
    return jsonError(429, "Too many requests");
  }

  if (!OPENAI_API_KEY.startsWith("sk-")) {
    return jsonError(500, "Invalid or missing OpenAI API key");
  }

  const body = await req.json();
  const { image } = body;

  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return jsonError(400, "Missing or invalid image");
  }

  // Data-URL length cap (~6MB of image data once base64 overhead is included)
  if (image.length > 8_000_000) {
    return jsonError(413, "Image too large");
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image, detail: "high" } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const raw = completion.choices[0].message.content ?? "";
    const jsonString = raw.replace(/^```json\s*/, "").replace(/```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return jsonError(500, "AI returned invalid JSON");
    }

    return NextResponse.json({ success: true, nutrition: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonError(500, `OpenAI error: ${message}`);
  }
}
