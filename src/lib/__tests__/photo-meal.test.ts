import { describe, expect, it } from "vitest";
import { parsePhotoMealEstimate, validateImageDataUrl } from "../photo-meal";

const validEstimate = {
  foods: [
    {
      name: "Chicken rice bowl",
      calories: 640,
      protein: 44,
      carbs: 72,
      fat: 18,
      fiber: 6,
      sugar: 4,
      sodium: 880,
      vitaminC: 18,
      calcium: 120,
      iron: 3.2,
      potassium: 720,
      servingSize: 480,
      confidence: 0.72,
    },
  ],
  confidence: 0.72,
  uncertaintyNote: "Portion sizes are estimated from the photo.",
};

describe("meal photo contract", () => {
  it("accepts an allowed, bounded image data URL", () => {
    expect(validateImageDataUrl("data:image/jpeg;base64,YWJj")).toBe(true);
  });

  it("rejects a non-image data URL before it reaches an AI provider", () => {
    expect(validateImageDataUrl("data:text/plain;base64,YWJj")).toBe(false);
  });

  it("normalizes a complete AI estimate into safe nutrition values", () => {
    expect(parsePhotoMealEstimate(validEstimate)).toEqual(validEstimate);
  });

  it("rejects an estimate with impossible nutrition values", () => {
    expect(parsePhotoMealEstimate({
      ...validEstimate,
      foods: [{ ...validEstimate.foods[0], calories: -1 }],
    })).toBeNull();
  });
});
