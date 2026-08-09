import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { POST } from "./route";

const openaiCreate = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/src/lib/rateLimit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create: openaiCreate } };
  },
}));

const validEstimate = {
  foods: [{
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
  }],
  confidence: 0.72,
  uncertaintyNote: "Portion sizes are estimated from the photo.",
};

function photoRequest(image: string) {
  return new NextRequest("http://localhost/api/parse-meal-photo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image }),
  });
}

describe("POST /api/parse-meal-photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NUTRIMIND_OPENAI_API_KEY = "sk-test-key";
    vi.mocked(auth).mockResolvedValue({ userId: "user-1" } as never);
    vi.mocked(checkRateLimit).mockReturnValue(true);
  });

  it("rejects a non-image payload before calling the AI provider", async () => {
    const response = await POST(photoRequest("data:text/plain;base64,YWJj"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing or invalid image" });
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  it("returns a validated estimate for an authenticated photo request", async () => {
    openaiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validEstimate) } }],
    });

    const response = await POST(photoRequest("data:image/jpeg;base64,YWJj"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, estimate: validEstimate });
  });

  it("does not expose a provider error message", async () => {
    openaiCreate.mockRejectedValue(new Error("photo payload leaked"));

    const response = await POST(photoRequest("data:image/jpeg;base64,YWJj"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Unable to estimate this meal photo" });
  });
});
