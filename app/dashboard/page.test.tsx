import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  bankPendingCompletedDays: vi.fn(),
  bankTransactionFindMany: vi.fn(),
  calorieBankFindUnique: vi.fn(),
  dailyLogFindFirst: vi.fn(),
  dailyLogFindMany: vi.fn(),
  headers: vi.fn(),
  metabolicProfileFindUnique: vi.fn(),
  userProfileFindUnique: vi.fn(),
  weightEntryFindMany: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/src/lib/calorieBank", () => ({
  bankPendingCompletedDays: mocks.bankPendingCompletedDays,
}));
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    bankTransaction: { findMany: mocks.bankTransactionFindMany },
    calorieBank: { findUnique: mocks.calorieBankFindUnique },
    dailyLog: {
      findFirst: mocks.dailyLogFindFirst,
      findMany: mocks.dailyLogFindMany,
    },
    metabolicProfile: { findUnique: mocks.metabolicProfileFindUnique },
    userProfile: { findUnique: mocks.userProfileFindUnique },
    weightEntry: { findMany: mocks.weightEntryFindMany },
  },
}));
vi.mock("@/src/lib/streakUtils", () => ({
  calculateStreaks: () => ({ currentStreak: 0, maxStreak: 0 }),
}));
vi.mock("./_components/DashboardTabsClient", () => ({
  DashboardTabsClient: () => null,
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.headers.mockResolvedValue(new Headers());
    mocks.bankPendingCompletedDays.mockReset();
    mocks.calorieBankFindUnique.mockResolvedValue({ id: "bank-1", dailyTarget: 2000 });
    mocks.userProfileFindUnique.mockResolvedValue({ heightCm: 180 });
    mocks.metabolicProfileFindUnique.mockResolvedValue(null);
    mocks.dailyLogFindFirst.mockResolvedValue(null);
    mocks.dailyLogFindMany.mockResolvedValue([]);
    mocks.bankTransactionFindMany.mockResolvedValue([]);
    mocks.weightEntryFindMany.mockResolvedValue([]);
  });

  it("does not run completed-day banking while rendering the account view", async () => {
    await DashboardPage({ searchParams: Promise.resolve({}) });

    expect(mocks.bankPendingCompletedDays).not.toHaveBeenCalled();
  });
});
