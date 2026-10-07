# On-Device Meal & Label Vision Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a zero-cost, private on-device vision parser for NutriMind using local Ollama Qwen3-VL to extract nutrition facts from food photos and product labels without cloud API keys or data leakage.

**Architecture:** A TypeScript vision service layer under `src/lib/vision/` featuring an Ollama multimodal client, dedicated prompt extractors for meal photos and nutrition labels, an automatic local-first provider router, and integration with Next.js App Router API routes (`/api/parse-label` and `/api/parse-meal-photo`).

**Tech Stack:** Next.js 16 (App Router), TypeScript 5.9, Ollama (`qwen3-vl:4b-instruct` / `qwen3-vl:8b` on local AMD Radeon RX 7800 XT at `http://127.0.0.1:11434`), Vitest 4.

**Spec:** On-Device Meal & Label Vision Parser for NutriMind Vault.

## Global Constraints
- Target workspace: `/home/kruillin/Projects/NutriMind/my-app`
- Test command: `npx vitest run`
- Default local endpoint: `http://127.0.0.1:11434` (configurable via `OLLAMA_BASE_URL` or `LOCAL_VISION_URL`)
- Default local vision model: `qwen3-vl:4b-instruct` (configurable via `LOCAL_VISION_MODEL`, optional `qwen3-vl:8b`)
- Zero external cloud API calls when local Ollama is available; no private photo data leaves the local machine
- Backward compatibility: If local Ollama is offline and OpenAI key is configured, gracefully fall back to existing OpenAI flow; if neither is configured, return clean actionable error
- All unit and route tests must run offline with mocked fetch/responses without requiring a running Ollama daemon

---

### Task 1: Local Ollama Multimodal Client

**Files:**
- Create: `src/lib/vision/ollama-client.ts`
- Test: `src/lib/vision/__tests__/ollama-client.test.ts`

**Interfaces:**
- Consumes: None (uses standard `fetch`)
- Produces: `OllamaVisionClient`, `stripBase64Prefix`, `stripMarkdownFences`, `checkLocalVisionHealth`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/vision/__tests__/ollama-client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  OllamaVisionClient,
  stripBase64Prefix,
  stripMarkdownFences,
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/vision/__tests__/ollama-client.test.ts`
Expected: FAIL with `Cannot find module '../ollama-client'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/vision/ollama-client.ts
export function stripBase64Prefix(imageData: string): string {
  const commaIndex = imageData.indexOf(",");
  if (imageData.startsWith("data:image/") && commaIndex !== -1) {
    return imageData.slice(commaIndex + 1);
  }
  return imageData;
}

export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export interface OllamaChatResponse {
  model?: string;
  message?: {
    role?: string;
    content?: string;
  };
}

export class OllamaVisionClient {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(
    baseUrl: string = process.env.LOCAL_VISION_URL || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    model: string = process.env.LOCAL_VISION_MODEL || "qwen3-vl:4b-instruct",
    timeoutMs: number = 30_000
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateJson<T>(prompt: string, imageDataUrl: string): Promise<T> {
    const rawBase64 = stripBase64Prefix(imageDataUrl);
    const payload = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: prompt,
          images: [rawBase64],
        },
      ],
      stream: false,
      format: "json",
      options: {
        temperature: 0.1,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Ollama vision request failed HTTP ${res.status}: ${errText}`);
      }

      const data = (await res.json()) as OllamaChatResponse;
      const content = data.message?.content || "";
      const cleaned = stripMarkdownFences(content);

      return JSON.parse(cleaned) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/vision/__tests__/ollama-client.test.ts`
Expected: PASS 5/5 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/vision/
git commit -m "feat(vision): add local Ollama multimodal client for Qwen3-VL"
```

---

### Task 2: On-Device Nutrition Label Extractor

**Files:**
- Create: `src/lib/vision/label-parser.ts`
- Test: `src/lib/vision/__tests__/label-parser.test.ts`

**Interfaces:**
- Consumes: `OllamaVisionClient`
- Produces: `ScannedLabelItem`, `parseNutritionLabelLocal(image: string, client?: OllamaVisionClient) -> Promise<ScannedLabelItem>`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/vision/__tests__/label-parser.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/vision/__tests__/label-parser.test.ts`
Expected: FAIL with `Cannot find module '../label-parser'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/vision/label-parser.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/vision/__tests__/label-parser.test.ts`
Expected: PASS 2/2 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/vision/label-parser.ts src/lib/vision/__tests__/label-parser.test.ts
git commit -m "feat(vision): add on-device nutrition label extractor with sanitization"
```

---

### Task 3: On-Device Meal Photo & Portion Estimator

**Files:**
- Create: `src/lib/vision/meal-parser.ts`
- Test: `src/lib/vision/__tests__/meal-parser.test.ts`

**Interfaces:**
- Consumes: `OllamaVisionClient`, `src/lib/photo-meal.ts` (`PhotoMealEstimate`, `parsePhotoMealEstimate`)
- Produces: `parseMealPhotoLocal(image: string, client?: OllamaVisionClient) -> Promise<PhotoMealEstimate>`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/vision/__tests__/meal-parser.test.ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/vision/__tests__/meal-parser.test.ts`
Expected: FAIL with `Cannot find module '../meal-parser'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/vision/meal-parser.ts
import { OllamaVisionClient } from "./ollama-client";
import { parsePhotoMealEstimate, PhotoMealEstimate } from "../photo-meal";

const MEAL_PROMPT = `Estimate the food and nutrition visible in this meal photo. Return only valid JSON in this exact shape:
{
  "foods": [{
    "name": "food name",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sugar": number,
    "sodium": number,
    "vitaminC": number,
    "calcium": number,
    "iron": number,
    "potassium": number,
    "servingSize": number,
    "confidence": number
  }],
  "confidence": number,
  "uncertaintyNote": "short portion or ingredient uncertainty"
}
Use grams for protein, carbs, fat, fiber, sugar, and servingSize; use milligrams for sodium, vitaminC, calcium, iron, and potassium. All numbers must be non-negative. Confidence must be between 0 and 1. Do not identify people or include personal details.`;

export async function parseMealPhotoLocal(
  imageDataUrl: string,
  client?: OllamaVisionClient
): Promise<PhotoMealEstimate> {
  const visionClient = client || new OllamaVisionClient();
  const rawData = await visionClient.generateJson<unknown>(MEAL_PROMPT, imageDataUrl);
  
  const estimate = parsePhotoMealEstimate(rawData);
  if (!estimate) {
    throw new Error("Local vision model returned invalid meal estimate schema");
  }

  return estimate;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/vision/__tests__/meal-parser.test.ts`
Expected: PASS 1/1 test

- [ ] **Step 5: Commit**

```bash
git add src/lib/vision/meal-parser.ts src/lib/vision/__tests__/meal-parser.test.ts
git commit -m "feat(vision): add on-device meal photo parser and macro estimator"
```

---

### Task 4: Vision Provider Router

**Files:**
- Create: `src/lib/vision/router.ts`
- Test: `src/lib/vision/__tests__/router.test.ts`

**Interfaces:**
- Consumes: `label-parser.ts`, `meal-parser.ts`, `ollama-client.ts`, `OpenAI`
- Produces: `dispatchLabelParse`, `dispatchMealPhotoParse`, `getActiveVisionProvider`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/vision/__tests__/router.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  dispatchLabelParse,
  dispatchMealPhotoParse,
  getActiveVisionProvider,
} from "../router";
import * as labelParser from "../label-parser";
import * as mealParser from "../meal-parser";
import { OllamaVisionClient } from "../ollama-client";

describe("getActiveVisionProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.NUTRIMIND_VISION_PROVIDER;
  });

  it("selects local when Ollama is reachable", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(true);
    const provider = await getActiveVisionProvider();
    expect(provider).toBe("local");
  });

  it("falls back to openai when Ollama is offline and key exists", async () => {
    vi.spyOn(OllamaVisionClient.prototype, "isAvailable").mockResolvedValue(false);
    process.env.NUTRIMIND_OPENAI_API_KEY = "sk-test";
    const provider = await getActiveVisionProvider();
    expect(provider).toBe("openai");
  });
});

describe("router dispatches", () => {
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/vision/__tests__/router.test.ts`
Expected: FAIL with `Cannot find module '../router'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/vision/router.ts
import { OllamaVisionClient } from "./ollama-client";
import { parseNutritionLabelLocal, ScannedLabelItem } from "./label-parser";
import { parseMealPhotoLocal } from "./meal-parser";
import { PhotoMealEstimate } from "../photo-meal";

export type VisionProvider = "local" | "openai" | "none";

function getOpenAiKey(): string {
  return process.env.NUTRIMIND_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
}

export async function getActiveVisionProvider(): Promise<VisionProvider> {
  const forced = process.env.NUTRIMIND_VISION_PROVIDER?.toLowerCase();
  if (forced === "local") return "local";
  if (forced === "openai") return "openai";

  const client = new OllamaVisionClient();
  const isLocalAvailable = await client.isAvailable();
  if (isLocalAvailable) {
    return "local";
  }

  const openAiKey = getOpenAiKey();
  if (openAiKey.startsWith("sk-")) {
    return "openai";
  }

  return "none";
}

export async function dispatchLabelParse(
  imageDataUrl: string
): Promise<{ provider: VisionProvider; data: ScannedLabelItem }> {
  const provider = await getActiveVisionProvider();

  if (provider === "local") {
    const data = await parseNutritionLabelLocal(imageDataUrl);
    return { provider: "local", data };
  }

  if (provider === "openai") {
    // Dynamically call OpenAI fallback
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: getOpenAiKey() });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            {
              type: "text",
              text: `Extract nutrition facts from this label. Return valid JSON with name, servingSize, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, vitaminCMg, calciumMg, ironMg, potassiumMg.`,
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0].message?.content || "{}");
    const { sanitizeLabelItem } = await import("./label-parser");
    return { provider: "openai", data: sanitizeLabelItem(parsed) };
  }

  throw new Error("No vision provider available (local Ollama is offline and OpenAI key is not configured)");
}

export async function dispatchMealPhotoParse(
  imageDataUrl: string
): Promise<{ provider: VisionProvider; data: PhotoMealEstimate }> {
  const provider = await getActiveVisionProvider();

  if (provider === "local") {
    const data = await parseMealPhotoLocal(imageDataUrl);
    return { provider: "local", data };
  }

  if (provider === "openai") {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: getOpenAiKey() });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            {
              type: "text",
              text: `Estimate the food and nutrition in this meal photo. Return valid JSON with foods array (name, calories, protein, carbs, fat, fiber, sugar, sodium, vitaminC, calcium, iron, potassium, servingSize, confidence), confidence, uncertaintyNote.`,
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0].message?.content || "{}");
    const { parsePhotoMealEstimate } = await import("../photo-meal");
    const estimate = parsePhotoMealEstimate(parsed);
    if (!estimate) {
      throw new Error("OpenAI returned invalid meal estimate format");
    }
    return { provider: "openai", data: estimate };
  }

  throw new Error("No vision provider available (local Ollama is offline and OpenAI key is not configured)");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/vision/__tests__/router.test.ts`
Expected: PASS 3/3 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/vision/router.ts src/lib/vision/__tests__/router.test.ts
git commit -m "feat(vision): implement local-first vision provider router"
```

---

### Task 5: API Routes Integration & Route Tests

**Files:**
- Modify: `app/api/parse-label/route.ts`
- Modify: `app/api/parse-meal-photo/route.ts`
- Test: `app/api/parse-meal-photo/route.test.ts`
- Create: `app/api/parse-label/route.test.ts`

**Interfaces:**
- Consumes: `src/lib/vision/router.ts`
- Produces: Updated `/api/parse-label` and `/api/parse-meal-photo` routes operating locally with zero cloud API keys

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/parse-label/route.test.ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/parse-label/route.test.ts`
Expected: FAIL (current `parse-label/route.ts` rejects missing OpenAI API key with 500)

- [ ] **Step 3: Write minimal implementation**

Update `app/api/parse-label/route.ts` to use `dispatchLabelParse`.
Update `app/api/parse-meal-photo/route.ts` to use `dispatchMealPhotoParse`.

```typescript
// app/api/parse-label/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { jsonError } from "@/src/lib/api-helpers";
import { dispatchLabelParse } from "@/src/lib/vision/router";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return jsonError(401, "Unauthorized");
  }

  if (!checkRateLimit(`parse-label:${userId}`, 10, 60_000)) {
    return jsonError(429, "Too many requests");
  }

  const body = await req.json().catch(() => null);
  const image = body?.image;

  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return jsonError(400, "Missing or invalid image");
  }

  if (image.length > 8_000_000) {
    return jsonError(413, "Image too large");
  }

  try {
    const { provider, data } = await dispatchLabelParse(image);
    return NextResponse.json({
      success: true,
      provider,
      item: data,
    });
  } catch (error) {
    console.error("Label parsing error:", error);
    return jsonError(500, error instanceof Error ? error.message : "Failed to parse nutrition label");
  }
}
```

```typescript
// app/api/parse-meal-photo/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/src/lib/api-helpers";
import {
  PHOTO_ESTIMATE_LIMIT,
  PHOTO_ESTIMATE_WINDOW_MS,
  validateImageDataUrl,
} from "@/src/lib/photo-meal";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { dispatchMealPhotoParse } from "@/src/lib/vision/router";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return jsonError(401, "Unauthorized");
  }

  if (!checkRateLimit(`parse-meal-photo:${userId}`, PHOTO_ESTIMATE_LIMIT, PHOTO_ESTIMATE_WINDOW_MS)) {
    return jsonError(429, "Too many meal photo estimates. Please try again later.");
  }

  const body = await req.json().catch(() => null);
  const image = body && typeof body === "object" ? (body as { image?: unknown }).image : undefined;
  if (!validateImageDataUrl(image)) {
    return jsonError(400, "Missing or invalid image");
  }

  try {
    const { provider, data } = await dispatchMealPhotoParse(image as string);
    return NextResponse.json({
      success: true,
      provider,
      estimate: data,
    });
  } catch (error) {
    console.error("Meal photo estimation error:", error);
    return jsonError(502, "Unable to estimate this meal photo");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/parse-label/route.test.ts app/api/parse-meal-photo/route.test.ts`
Expected: PASS all route tests!

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: PASS on 100% of tests.

- [ ] **Step 6: Commit**

```bash
git add app/api/parse-label/ app/api/parse-meal-photo/
git commit -m "feat(vision): wire on-device Qwen3-VL vision into parse-label and parse-meal-photo routes"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-06-on-device-meal-vision-parser.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Fresh subagent dispatched per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
