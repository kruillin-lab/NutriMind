import { OllamaVisionClient } from "./ollama-client";
import { parseNutritionLabelLocal, ScannedLabelItem } from "./label-parser";
import { parseMealPhotoLocal } from "./meal-parser";
import { PhotoMealEstimate } from "../photo-meal";

export type VisionProvider = "local" | "openai" | "none";

function getOpenAiKey(): string {
  return process.env.NUTRIMIND_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
}

export async function getActiveVisionProvider(): Promise<VisionProvider> {
  const forced = process.env.NUTRIMIND_VISION_PROVIDER?.toLowerCase();
  if (forced === "local") return "local";
  if (forced === "openai") return "openai";

  const client = new OllamaVisionClient();
  const isLocalAvailable = await client.isAvailable();
  if (isLocalAvailable) {
    return "local";
  }

  const openAiKey = getOpenAiKey();
  if (openAiKey.startsWith("sk-")) {
    return "openai";
  }

  return "none";
}

export async function dispatchLabelParse(
  imageDataUrl: string
): Promise<{ provider: VisionProvider; data: ScannedLabelItem }> {
  const provider = await getActiveVisionProvider();

  if (provider === "local") {
    const data = await parseNutritionLabelLocal(imageDataUrl);
    return { provider: "local", data };
  }

  if (provider === "openai") {
    // Dynamically call OpenAI fallback
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: getOpenAiKey() });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            {
              type: "text",
              text: `Extract nutrition facts from this label. Return valid JSON with name, servingSize, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, vitaminCMg, calciumMg, ironMg, potassiumMg.`,
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0].message?.content || "{}");
    const { sanitizeLabelItem } = await import("./label-parser");
    return { provider: "openai", data: sanitizeLabelItem(parsed) };
  }

  throw new Error("No vision provider available (local Ollama is offline and OpenAI key is not configured)");
}

export async function dispatchMealPhotoParse(
  imageDataUrl: string
): Promise<{ provider: VisionProvider; data: PhotoMealEstimate }> {
  const provider = await getActiveVisionProvider();

  if (provider === "local") {
    const data = await parseMealPhotoLocal(imageDataUrl);
    return { provider: "local", data };
  }

  if (provider === "openai") {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: getOpenAiKey() });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            {
              type: "text",
              text: `Estimate the food and nutrition in this meal photo. Return valid JSON with foods array (name, calories, protein, carbs, fat, fiber, sugar, sodium, vitaminC, calcium, iron, potassium, servingSize, confidence), confidence, uncertaintyNote.`,
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0].message?.content || "{}");
    const { parsePhotoMealEstimate } = await import("../photo-meal");
    const estimate = parsePhotoMealEstimate(parsed);
    if (!estimate) {
      throw new Error("OpenAI returned invalid meal estimate format");
    }
    return { provider: "openai", data: estimate };
  }

  throw new Error("No vision provider available (local Ollama is offline and OpenAI key is not configured)");
}
