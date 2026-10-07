import { describe, expect, it, vi } from "vitest";
import { parseNutritionLabelLocal, sanitizeLabelItem } from "../label-parser";
import { OllamaVisionClient } from "../ollama-client";

describe("sanitizeLabelItem", () => {
  it("normalizes missing, null, or string numbers to safe non-negative values", () => {
    const raw = {
      name: "Protein Shake",
      servingSize: "1 bottle",
      calories: "200",
      proteinG: 30,
      carbsG: null,
      fatG: -5,
      sodiumMg: "150",
    };

    const sanitized = sanitizeLabelItem(raw);
    expect(sanitized.name).toBe("Protein Shake");
    expect(sanitized.calories).toBe(200);
    expect(sanitized.proteinG).toBe(30);
    expect(sanitized.carbsG).toBe(0);
    expect(sanitized.fatG).toBe(0); // clamped from -5
    expect(sanitized.sodiumMg).toBe(150);
  });

  it("defaults empty or whitespace-only name and servingSize and handles non-numeric strings", () => {
    const raw = {
      name: "   ",
      servingSize: "",
      calories: "unknown",
      fiberG: "12.5g",
    };

    const sanitized = sanitizeLabelItem(raw);
    expect(sanitized.name).toBe("Scanned Item");
    expect(sanitized.servingSize).toBe("1 serving");
    expect(sanitized.calories).toBe(0);
    expect(sanitized.fiberG).toBe(12.5);
  });
});

describe("parseNutritionLabelLocal", () => {
  it("extracts and sanitizes nutrition label from image using Ollama client", async () => {
    const mockClient = {
      generateJson: vi.fn().mockResolvedValue({
        name: "Greek Yogurt",
        servingSize: "1 cup (170g)",
        calories: 130,
        proteinG: 18,
        carbsG: 6,
        fatG: 0,
        fiberG: 0,
        sugarG: 5,
        sodiumMg: 65,
        calciumMg: 200,
      }),
    } as unknown as OllamaVisionClient;

    const item = await parseNutritionLabelLocal("data:image/jpeg;base64,TEST", mockClient);

    expect(item.name).toBe("Greek Yogurt");
    expect(item.calories).toBe(130);
    expect(item.proteinG).toBe(18);
    expect(item.calciumMg).toBe(200);
    expect(item.ironMg).toBe(0);
  });
});
