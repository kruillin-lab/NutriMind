import { describe, expect, it } from "vitest";
import { isValidLocalDateKey } from "@/lib/date-utils";

describe("isValidLocalDateKey", () => {
  it("accepts real calendar dates and leap days", () => {
    expect(isValidLocalDateKey("2026-07-09")).toBe(true);
    expect(isValidLocalDateKey("2024-02-29")).toBe(true);
  });

  it("rejects impossible dates instead of allowing rollover", () => {
    expect(isValidLocalDateKey("2026-02-31")).toBe(false);
    expect(isValidLocalDateKey("2025-02-29")).toBe(false);
  });

  it("rejects timestamps and non-padded keys", () => {
    expect(isValidLocalDateKey("2026-07-09T00:00:00Z")).toBe(false);
    expect(isValidLocalDateKey("2026-7-9")).toBe(false);
  });
});
