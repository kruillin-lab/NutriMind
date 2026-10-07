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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
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

export async function checkLocalVisionHealth(baseUrl?: string): Promise<boolean> {
  const client = new OllamaVisionClient(baseUrl);
  return client.isAvailable();
}
