import { describe, expect, it } from "vitest";
import { validateHostedRuntime } from "../runtime-env";

const hostedEnvironment = {
  NUTRIMIND_HOSTED_RUNTIME: "1",
  DATABASE_URL: "libsql://nutrimind.turso.io",
  TURSO_AUTH_TOKEN: "token",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
  CLERK_SECRET_KEY: "sk_live_example",
  CLERK_WEBHOOK_SECRET: "whsec_example",
  NUTRIMIND_OPENAI_API_KEY: "sk-proj-example",
  CRON_SECRET: "cron-secret",
};

describe("validateHostedRuntime", () => {
  it("does not require hosted infrastructure for local development", () => {
    expect(
      validateHostedRuntime({ DATABASE_URL: "file:./prisma/dev.db" })
    ).toEqual({ ready: true, missing: [], invalid: [] });
  });

  it("accepts a fully configured remote libSQL runtime", () => {
    expect(validateHostedRuntime(hostedEnvironment)).toEqual({
      ready: true,
      missing: [],
      invalid: [],
    });
  });

  it("rejects a file-backed database in the hosted runtime", () => {
    const result = validateHostedRuntime({
      ...hostedEnvironment,
      DATABASE_URL: "file:./prisma/dev.db",
    });

    expect(result.ready).toBe(false);
    expect(result.invalid).toContain("DATABASE_URL");
  });

  it("reports every required hosted secret by name without exposing values", () => {
    const result = validateHostedRuntime({
      NUTRIMIND_HOSTED_RUNTIME: "1",
      DATABASE_URL: "libsql://nutrimind.turso.io",
    });

    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "CLERK_WEBHOOK_SECRET",
        "NUTRIMIND_OPENAI_API_KEY or OPENAI_API_KEY",
        "TURSO_AUTH_TOKEN",
        "CRON_SECRET",
      ])
    );
  });
});
