import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  dispatchLabelParse,
  dispatchMealPhotoParse,
  getActiveVisionProvider,
} from "../router";
import * as labelParser from "../label-parser";
import * as mealParser from "../meal-parser";
import { OllamaVisionClient } from "../ollama-client";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe("getActiveVisionProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.NUTRIMIND_VISION_PROVIDER;
    delete process.env.NUTRIMIND_OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("selects local when Ollama is reachable", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(true);
    const provider = await getActiveVisionProvider();
    expect(provider).toBe("local");
  });

  it("falls back to openai when Ollama is offline and NUTRIMIND_OPENAI_API_KEY exists", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(false);
    process.env.NUTRIMIND_OPENAI_API_KEY = "sk-test";
    const provider = await getActiveVisionProvider();
    expect(provider).toBe("openai");
  });

  it("falls back to openai when Ollama is offline and OPENAI_API_KEY exists", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(false);
    process.env.OPENAI_API_KEY = "sk-fallback";
    const provider = await getActiveVisionProvider();
    expect(provider).toBe("openai");
  });

  it("returns none when Ollama is offline and no openai key exists", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(false);
    const provider = await getActiveVisionProvider();
    expect(provider).toBe("none");
  });

  it("respects forced local provider environment variable", async () => {
    process.env.NUTRIMIND_VISION_PROVIDER = "local";
    const isAvailSpy = vi.spyOn(OllamaVisionClient.prototype, "isAvailable");
    const provider = await getActiveVisionProvider();
    expect(provider).toBe("local");
    expect(isAvailSpy).not.toHaveBeenCalled();
  });

  it("respects forced openai provider environment variable", async () => {
    process.env.NUTRIMIND_VISION_PROVIDER = "openai";
    const isAvailSpy = vi.spyOn(OllamaVisionClient.prototype, "isAvailable");
    const provider = await getActiveVisionProvider();
    expect(provider).toBe("openai");
    expect(isAvailSpy).not.toHaveBeenCalled();
  });
});

describe("router dispatches", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreate.mockReset();
    delete process.env.NUTRIMIND_VISION_PROVIDER;
    delete process.env.NUTRIMIND_OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("routes label parse to local extractor when provider is local", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(true);
    const mockItem = {
      name: "Tofu",
      servingSize: "100g",
      calories: 80,
      proteinG: 8,
      carbsG: 2,
      fatG: 4,
      fiberG: 1,
      sugarG: 0,
      sodiumMg: 10,
      vitaminCMg: 0,
      calciumMg: 150,
      ironMg: 1.5,
      potassiumMg: 120,
    };
    vi.spyOn(labelParser, "parseNutritionLabelLocal").mockResolvedValue(mockItem);

    const result = await dispatchLabelParse("data:image/jpeg;base64,TEST");
    expect(result.provider).toBe("local");
    expect(result.data).toEqual(mockItem);
  });

  it("routes label parse to openai when provider is openai", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(false);
    process.env.NUTRIMIND_OPENAI_API_KEY = "sk-test";

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: "Oatmeal",
              servingSize: "40g",
              calories: 150,
              proteinG: 5,
              carbsG: 27,
              fatG: 3,
            }),
          },
        },
      ],
    });

    const result = await dispatchLabelParse("data:image/jpeg;base64,TEST");
    expect(result.provider).toBe("openai");
    expect(result.data.name).toBe("Oatmeal");
    expect(result.data.calories).toBe(150);
    expect(result.data.proteinG).toBe(5);
    expect(result.data.carbsG).toBe(27);
    expect(result.data.fatG).toBe(3);
  });

  it("routes meal photo parse to local extractor when provider is local", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(true);
    const mockMeal = {
      foods: [
        {
          name: "Boiled Egg",
          calories: 78,
          protein: 6.3,
          carbs: 0.6,
          fat: 5.3,
          fiber: 0,
          sugar: 0.6,
          sodium: 62,
          vitaminC: 0,
          calcium: 25,
          iron: 0.6,
          potassium: 63,
          servingSize: 50,
          confidence: 0.95,
        },
      ],
      confidence: 0.95,
      uncertaintyNote: "Single egg",
    };
    vi.spyOn(mealParser, "parseMealPhotoLocal").mockResolvedValue(mockMeal);

    const result = await dispatchMealPhotoParse("data:image/jpeg;base64,TEST");
    expect(result.provider).toBe("local");
    expect(result.data).toEqual(mockMeal);
  });

  it("routes meal photo parse to openai when provider is openai", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(false);
    process.env.NUTRIMIND_OPENAI_API_KEY = "sk-test";

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              foods: [
                {
                  name: "Apple",
                  calories: 95,
                  protein: 0.5,
                  carbs: 25,
                  fat: 0.3,
                  fiber: 4.4,
                  sugar: 19,
                  sodium: 2,
                  vitaminC: 8.4,
                  calcium: 11,
                  iron: 0.2,
                  potassium: 195,
                  servingSize: 182,
                  confidence: 0.9,
                },
              ],
              confidence: 0.9,
              uncertaintyNote: "Medium apple",
            }),
          },
        },
      ],
    });

    const result = await dispatchMealPhotoParse("data:image/jpeg;base64,TEST");
    expect(result.provider).toBe("openai");
    expect(result.data.foods[0].name).toBe("Apple");
    expect(result.data.foods[0].calories).toBe(95);
  });

  it("throws when openai returns invalid meal estimate schema", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(false);
    process.env.NUTRIMIND_OPENAI_API_KEY = "sk-test";

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ invalid: true }),
          },
        },
      ],
    });

    await expect(dispatchMealPhotoParse("data:image/jpeg;base64,TEST")).rejects.toThrow(
      "OpenAI returned invalid meal estimate format"
    );
  });

  it("throws when no vision provider is available", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(false);
    await expect(dispatchLabelParse("data:image/jpeg;base64,TEST")).rejects.toThrow(
      "No vision provider available"
    );
    await expect(dispatchMealPhotoParse("data:image/jpeg;base64,TEST")).rejects.toThrow(
      "No vision provider available"
    );
  });
});
