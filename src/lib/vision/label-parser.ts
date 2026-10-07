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
    const directParsed = parseFloat(val);
    if (!isNaN(directParsed)) {
      return Math.max(0, directParsed);
    }
    const parsed = parseFloat(val.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }
  return 0;
}

export function sanitizeLabelItem(raw?: Record<string, unknown> | null): ScannedLabelItem {
  const safeRaw = (raw && typeof raw === "object") ? raw : {};
  return {
    name: typeof safeRaw.name === "string" && safeRaw.name.trim() ? safeRaw.name.trim() : "Scanned Item",
    servingSize: typeof safeRaw.servingSize === "string" && safeRaw.servingSize.trim() ? safeRaw.servingSize.trim() : "1 serving",
    calories: toNonNegativeNumber(safeRaw.calories),
    proteinG: toNonNegativeNumber(safeRaw.proteinG),
    carbsG: toNonNegativeNumber(safeRaw.carbsG),
    fatG: toNonNegativeNumber(safeRaw.fatG),
    fiberG: toNonNegativeNumber(safeRaw.fiberG),
    sugarG: toNonNegativeNumber(safeRaw.sugarG),
    sodiumMg: toNonNegativeNumber(safeRaw.sodiumMg),
    vitaminCMg: toNonNegativeNumber(safeRaw.vitaminCMg),
    calciumMg: toNonNegativeNumber(safeRaw.calciumMg),
    ironMg: toNonNegativeNumber(safeRaw.ironMg),
    potassiumMg: toNonNegativeNumber(safeRaw.potassiumMg),
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
