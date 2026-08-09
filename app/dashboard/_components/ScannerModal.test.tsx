// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScannerModal } from "./ScannerModal";

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromVideoDevice = vi.fn().mockResolvedValue({ stop: vi.fn() });
  },
}));

describe("ScannerModal", () => {
  it("discloses transient AI processing before a meal photo is selected", async () => {
    const user = userEvent.setup();
    render(<ScannerModal onResult={vi.fn()} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Meal photo" }));

    expect(screen.getByText(/sent to NutriMind's AI provider solely for estimation/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /take photo or choose image/i })).toBeTruthy();
  });
});
