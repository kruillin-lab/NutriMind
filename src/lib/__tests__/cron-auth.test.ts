import { describe, expect, it } from "vitest";
import { hasAuthorizedCronRequest } from "../cron-auth";

describe("hasAuthorizedCronRequest", () => {
  const environment = { CRON_SECRET: "cron-secret" };

  it("accepts the exact bearer secret", () => {
    const request = new Request("https://nutrimind.example/api/cron/test", {
      headers: { authorization: "Bearer cron-secret" },
    });

    expect(hasAuthorizedCronRequest(request, environment)).toBe(true);
  });

  it("rejects host-specific cron headers without the bearer secret", () => {
    const request = new Request("https://nutrimind.example/api/cron/test", {
      headers: { "x-vercel-cron": "1" },
    });

    expect(hasAuthorizedCronRequest(request, environment)).toBe(false);
  });

  it("accepts Vercel's cron header only in a Vercel runtime", () => {
    const request = new Request("https://nutrimind.example/api/cron/test", {
      headers: { "x-vercel-cron": "1" },
    });

    expect(
      hasAuthorizedCronRequest(request, { VERCEL: "1" })
    ).toBe(true);
  });

  it("rejects requests when no secret is configured", () => {
    const request = new Request("https://nutrimind.example/api/cron/test", {
      headers: { authorization: "Bearer cron-secret" },
    });

    expect(hasAuthorizedCronRequest(request, {})).toBe(false);
  });
});
