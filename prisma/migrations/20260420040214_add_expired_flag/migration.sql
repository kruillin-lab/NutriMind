-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bank_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "caloriesConsumed" REAL,
    "caloriesTarget" REAL,
    "weightAtTime" REAL,
    "llmAdvice" TEXT,
    "userFollowed" BOOLEAN,
    "sourceId" TEXT,
    "sourceType" TEXT,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_transactions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "calorie_banks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bank_transactions" ("amount", "bankId", "caloriesConsumed", "caloriesTarget", "createdAt", "id", "llmAdvice", "reason", "sourceId", "sourceType", "type", "userFollowed", "weightAtTime") SELECT "amount", "bankId", "caloriesConsumed", "caloriesTarget", "createdAt", "id", "llmAdvice", "reason", "sourceId", "sourceType", "type", "userFollowed", "weightAtTime" FROM "bank_transactions";
DROP TABLE "bank_transactions";
ALTER TABLE "new_bank_transactions" RENAME TO "bank_transactions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
