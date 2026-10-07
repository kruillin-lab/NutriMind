import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { POST } from "./route";
import * as visionRouter from "@/src/lib/vision/router";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/src/lib/rateLimit", () => ({ checkRateLimit: vi.fn() }));

function labelRequest(image: string) {
  return new NextRequest("http://localhost/api/parse-label", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image }),
  });
}

describe("POST /api/parse-label", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "user-1" } as never);
    vi.mocked(checkRateLimit).mockReturnValue(true);
  });

  it("parses label on-device without requiring an OpenAI API key", async () => {
    delete process.env.NUTRIMIND_OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    vi.spyOn(visionRouter, "dispatchLabelParse").mockResolvedValue({
      provider: "local",
      data: {
        name: "Oat Milk",
        servingSize: "1 cup",
        calories: 120,
        proteinG: 3,
        carbsG: 16,
        fatG: 5,
        fiberG: 2,
        sugarG: 7,
        sodiumMg: 100,
        vitaminCMg: 0,
        calciumMg: 350,
        ironMg: 0.5,
        potassiumMg: 300,
      },
    });

    const response = await POST(labelRequest("data:image/jpeg;base64,TEST"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.item.name).toBe("Oat Milk");
    expect(body.item.calories).toBe(120);
    expect(body.provider).toBe("local");
  });

  it("rejects unauthorized request with 401", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);
    const response = await POST(labelRequest("data:image/jpeg;base64,TEST"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects rate-limited requests with 429", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const response = await POST(labelRequest("data:image/jpeg;base64,TEST"));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "Too many requests" });
  });

  it("rejects missing or invalid image payload with 400", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/parse-label", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: "invalid-not-data-uri" }),
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing or invalid image" });
  });

  it("rejects overly large images with 413", async () => {
    const largeImage = "data:image/jpeg;base64," + "A".repeat(8_000_001);
    const response = await POST(labelRequest(largeImage));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Image too large" });
  });

  it("returns 500 when vision parsing throws an error", async () => {
    vi.spyOn(visionRouter, "dispatchLabelParse").mockRejectedValue(
      new Error("No vision provider available")
    );
    const response = await POST(labelRequest("data:image/jpeg;base64,TEST"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "No vision provider available" });
  });
});
