import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareLibsqlFetch } from "../libsql-fetch";

describe("cloudflareLibsqlFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts a Node-compatible request into a Worker-native fetch call", async () => {
    const response = new Response("ok");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
    const requestBody = new TextEncoder().encode('{"sql":"SELECT 1"}').buffer;

    const result = await cloudflareLibsqlFetch({
      arrayBuffer: async () => requestBody,
      headers: new Headers({ authorization: "Bearer test-token" }),
      method: "POST",
      url: "https://example.turso.io/v3/pipeline",
    } as unknown as RequestInfo);

    expect(result).toBe(response);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.turso.io/v3/pipeline",
      expect.objectContaining({
        body: requestBody,
        method: "POST",
      })
    );

    const headers = fetchSpy.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer test-token");
  });
});
