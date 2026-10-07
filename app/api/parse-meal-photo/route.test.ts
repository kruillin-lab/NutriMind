import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { POST } from "./route";
import * as visionRouter from "@/src/lib/vision/router";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/src/lib/rateLimit", () => ({ checkRateLimit: vi.fn() }));

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
    delete process.env.NUTRIMIND_OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    vi.mocked(auth).mockResolvedValue({ userId: "user-1" } as never);
    vi.mocked(checkRateLimit).mockReturnValue(true);
  });

  it("rejects unauthorized request with 401", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const response = await POST(photoRequest("data:image/jpeg;base64,YWJj"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects rate-limited requests with 429", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const response = await POST(photoRequest("data:image/jpeg;base64,YWJj"));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "Too many meal photo estimates. Please try again later." });
  });

  it("rejects a non-image payload before calling the AI provider", async () => {
    const dispatchSpy = vi.spyOn(visionRouter, "dispatchMealPhotoParse");
    const response = await POST(photoRequest("data:text/plain;base64,YWJj"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing or invalid image" });
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("returns a validated estimate using local vision provider without OpenAI API key", async () => {
    const dispatchSpy = vi.spyOn(visionRouter, "dispatchMealPhotoParse").mockResolvedValue({
      provider: "local",
      data: validEstimate,
    });

    const response = await POST(photoRequest("data:image/jpeg;base64,YWJj"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      provider: "local",
      estimate: validEstimate,
    });
    expect(dispatchSpy).toHaveBeenCalledWith("data:image/jpeg;base64,YWJj");
  });

  it("does not expose a provider error message on failure", async () => {
    vi.spyOn(visionRouter, "dispatchMealPhotoParse").mockRejectedValue(
      new Error("photo payload leaked sensitive provider info")
    );

    const response = await POST(photoRequest("data:image/jpeg;base64,YWJj"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Unable to estimate this meal photo" });
  });
});
