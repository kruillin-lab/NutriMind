import { OllamaVisionClient } from "./ollama-client";

export interface ScannedLabelItem {
  name: string;
  servingSize: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  vitaminCMg: number;
  calciumMg: number;
  ironMg: number;
  potassiumMg: number;
}

const LABEL_PROMPT = `Extract the nutrition facts from this nutrition label image. Return ONLY valid JSON with these exact fields (use per-serving values):
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

function toNonNegativeNumber(val: unknown): number {
  if (typeof val === "number" && !isNaN(val)) {
    return Math.max(0, val);
  }
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/[^0-9.]/g, ""));
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }
  return 0;
}

export function sanitizeLabelItem(raw: Record<string, unknown>): ScannedLabelItem {
  return {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Scanned Item",
    servingSize: typeof raw.servingSize === "string" && raw.servingSize.trim() ? raw.servingSize.trim() : "1 serving",
    calories: toNonNegativeNumber(raw.calories),
    proteinG: toNonNegativeNumber(raw.proteinG),
    carbsG: toNonNegativeNumber(raw.carbsG),
    fatG: toNonNegativeNumber(raw.fatG),
    fiberG: toNonNegativeNumber(raw.fiberG),
    sugarG: toNonNegativeNumber(raw.sugarG),
    sodiumMg: toNonNegativeNumber(raw.sodiumMg),
    vitaminCMg: toNonNegativeNumber(raw.vitaminCMg),
    calciumMg: toNonNegativeNumber(raw.calciumMg),
    ironMg: toNonNegativeNumber(raw.ironMg),
    potassiumMg: toNonNegativeNumber(raw.potassiumMg),
  };
}

export async function parseNutritionLabelLocal(
  imageDataUrl: string,
  client?: OllamaVisionClient
): Promise<ScannedLabelItem> {
  const visionClient = client || new OllamaVisionClient();
  const rawData = await visionClient.generateJson<Record<string, unknown>>(LABEL_PROMPT, imageDataUrl);
  return sanitizeLabelItem(rawData);
}
