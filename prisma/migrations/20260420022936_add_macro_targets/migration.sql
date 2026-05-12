-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_calorie_banks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currentBalance" REAL NOT NULL DEFAULT 0,
    "totalBanked" REAL NOT NULL DEFAULT 0,
    "totalSpent" REAL NOT NULL DEFAULT 0,
    "dailyTarget" REAL NOT NULL DEFAULT 2000,
    "weeklyAverage" REAL NOT NULL DEFAULT 0,
    "recommendedSpend" REAL,
    "spendByDate" DATETIME,
    "allowNegative" BOOLEAN NOT NULL DEFAULT false,
    "expireAfterDays" INTEGER NOT NULL DEFAULT 30,
    "proteinTargetG" REAL NOT NULL DEFAULT 0,
    "carbsTargetG" REAL NOT NULL DEFAULT 0,
    "fatTargetG" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "calorie_banks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_calorie_banks" ("allowNegative", "createdAt", "currentBalance", "dailyTarget", "expireAfterDays", "id", "recommendedSpend", "spendByDate", "totalBanked", "totalSpent", "updatedAt", "userId", "weeklyAverage") SELECT "allowNegative", "createdAt", "currentBalance", "dailyTarget", "expireAfterDays", "id", "recommendedSpend", "spendByDate", "totalBanked", "totalSpent", "updatedAt", "userId", "weeklyAverage" FROM "calorie_banks";
DROP TABLE "calorie_banks";
ALTER TABLE "new_calorie_banks" RENAME TO "calorie_banks";
CREATE UNIQUE INDEX "calorie_banks_userId_key" ON "calorie_banks"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
