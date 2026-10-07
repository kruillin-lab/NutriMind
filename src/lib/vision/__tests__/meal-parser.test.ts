import { describe, expect, it, vi } from "vitest";
import { parseMealPhotoLocal } from "../meal-parser";
import { OllamaVisionClient } from "../ollama-client";

describe("parseMealPhotoLocal", () => {
  it("estimates plated foods and normalizes macros through parsePhotoMealEstimate", async () => {
    const mockClient = {
      generateJson: vi.fn().mockResolvedValue({
        foods: [
          {
            name: "Grilled Salmon",
            calories: 340,
            protein: 34,
            carbs: 0,
            fat: 22,
            fiber: 0,
            sugar: 0,
            sodium: 180,
            vitaminC: 0,
            calcium: 20,
            iron: 1.1,
            potassium: 500,
            servingSize: 200,
            confidence: 0.85,
          },
          {
            name: "Steamed Asparagus",
            calories: 40,
            protein: 4,
            carbs: 7,
            fat: 0.4,
            fiber: 4,
            sugar: 2,
            sodium: 10,
            vitaminC: 15,
            calcium: 30,
            iron: 2.0,
            potassium: 200,
            servingSize: 150,
            confidence: 0.8,
          },
        ],
        confidence: 0.82,
        uncertaintyNote: "Visual estimate of fillet weight and spear count.",
      }),
    } as unknown as OllamaVisionClient;

    const result = await parseMealPhotoLocal("data:image/jpeg;base64,TEST", mockClient);

    expect(result.foods).toHaveLength(2);
    expect(result.foods[0].name).toBe("Grilled Salmon");
    expect(result.foods[0].calories).toBe(340);
    expect(result.foods[1].name).toBe("Steamed Asparagus");
    expect(result.confidence).toBe(0.82);
  });

  it("throws when local vision model returns invalid meal estimate schema", async () => {
    const mockClient = {
      generateJson: vi.fn().mockResolvedValue({ invalid: "data" }),
    } as unknown as OllamaVisionClient;

    await expect(
      parseMealPhotoLocal("data:image/jpeg;base64,TEST", mockClient)
    ).rejects.toThrow("Local vision model returned invalid meal estimate schema");
  });
});
