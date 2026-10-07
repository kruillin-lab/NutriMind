// src/lib/vision/__tests__/ollama-client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  OllamaVisionClient,
  stripBase64Prefix,
  stripMarkdownFences,
  checkLocalVisionHealth,
} from "../ollama-client";

describe("ollama-client utilities", () => {
  it("strips data URL prefix from base64 string", () => {
    const dataUrl = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAA";
    expect(stripBase64Prefix(dataUrl)).toBe("iVBORw0KGgoAAAANSUhEUgAA");
  });

  it("leaves raw base64 string unchanged", () => {
    expect(stripBase64Prefix("iVBORw0KGgoAAAANSUhEUgAA")).toBe("iVBORw0KGgoAAAANSUhEUgAA");
  });

  it("strips json markdown code fences", () => {
    const raw = "```json\n{\"calories\": 500}\n```";
    expect(stripMarkdownFences(raw)).toBe("{\"calories\": 500}");
  });
});

describe("OllamaVisionClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("queries /api/chat with multimodal image payload and returns parsed JSON", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: "{\"calories\": 350, \"protein\": 30}" },
      }),
    });
    globalThis.fetch = mockFetch;

    const client = new OllamaVisionClient("http://127.0.0.1:11434", "qwen3-vl:4b-instruct");
    const result = await client.generateJson<{ calories: number; protein: number }>(
      "Extract macros",
      "data:image/png;base64,QUJD"
    );

    expect(result).toEqual({ calories: 350, protein: 30 });
    expect(mockFetch).toHaveBeenCalledWith("http://127.0.0.1:11434/api/chat", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3-vl:4b-instruct",
        messages: [{
          role: "user",
          content: "Extract macros",
          images: ["QUJD"],
        }],
        stream: false,
        format: "json",
        options: { temperature: 0.1 },
      }),
    }));
  });

  it("reports offline when healthcheck fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
    const client = new OllamaVisionClient("http://127.0.0.1:11434");
    const isOnline = await client.isAvailable();
    expect(isOnline).toBe(false);
  });

  it("checkLocalVisionHealth delegates to OllamaVisionClient", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    const isOnline = await checkLocalVisionHealth("http://127.0.0.1:11434");
    expect(isOnline).toBe(true);
  });
});
