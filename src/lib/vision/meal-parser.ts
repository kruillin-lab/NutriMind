import { OllamaVisionClient } from "./ollama-client";
import { parsePhotoMealEstimate, PhotoMealEstimate } from "../photo-meal";

const MEAL_PROMPT = `Estimate the food and nutrition visible in this meal photo. Return only valid JSON in this exact shape:
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

export async function parseMealPhotoLocal(
  imageDataUrl: string,
  client?: OllamaVisionClient
): Promise<PhotoMealEstimate> {
  const visionClient = client || new OllamaVisionClient();
  const rawData = await visionClient.generateJson<unknown>(MEAL_PROMPT, imageDataUrl);

  const estimate = parsePhotoMealEstimate(rawData);
  if (!estimate) {
    throw new Error("Local vision model returned invalid meal estimate schema");
  }

  return estimate;
}
