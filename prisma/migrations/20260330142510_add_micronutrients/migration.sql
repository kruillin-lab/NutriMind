-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_cached_foods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalizedKey" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calories" REAL NOT NULL,
    "proteinG" REAL NOT NULL DEFAULT 0,
    "carbsG" REAL NOT NULL DEFAULT 0,
    "fatG" REAL NOT NULL DEFAULT 0,
    "fiberG" REAL NOT NULL DEFAULT 0,
    "sugarG" REAL NOT NULL DEFAULT 0,
    "sodiumMg" REAL NOT NULL DEFAULT 0,
    "vitaminCMg" REAL NOT NULL DEFAULT 0,
    "calciumMg" REAL NOT NULL DEFAULT 0,
    "ironMg" REAL NOT NULL DEFAULT 0,
    "potassiumMg" REAL NOT NULL DEFAULT 0,
    "aiConfidence" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'openai',
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_cached_foods" ("aiConfidence", "calories", "carbsG", "createdAt", "fatG", "hitCount", "id", "lastUsedAt", "name", "normalizedKey", "originalText", "proteinG", "source") SELECT "aiConfidence", "calories", "carbsG", "createdAt", "fatG", "hitCount", "id", "lastUsedAt", "name", "normalizedKey", "originalText", "proteinG", "source" FROM "cached_foods";
DROP TABLE "cached_foods";
ALTER TABLE "new_cached_foods" RENAME TO "cached_foods";
CREATE UNIQUE INDEX "cached_foods_normalizedKey_key" ON "cached_foods"("normalizedKey");
CREATE INDEX "cached_foods_hitCount_idx" ON "cached_foods"("hitCount");
CREATE INDEX "cached_foods_lastUsedAt_idx" ON "cached_foods"("lastUsedAt");
CREATE TABLE "new_daily_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "caloriesConsumed" REAL NOT NULL DEFAULT 0,
    "proteinG" REAL NOT NULL DEFAULT 0,
    "carbsG" REAL NOT NULL DEFAULT 0,
    "fatG" REAL NOT NULL DEFAULT 0,
    "fiberG" REAL NOT NULL DEFAULT 0,
    "sugarG" REAL NOT NULL DEFAULT 0,
    "sodiumMg" REAL NOT NULL DEFAULT 0,
    "vitaminCMg" REAL NOT NULL DEFAULT 0,
    "calciumMg" REAL NOT NULL DEFAULT 0,
    "ironMg" REAL NOT NULL DEFAULT 0,
    "potassiumMg" REAL NOT NULL DEFAULT 0,
    "calorieTarget" REAL NOT NULL DEFAULT 2000,
    "caloriesBurned" REAL NOT NULL DEFAULT 0,
    "exerciseMinutes" INTEGER NOT NULL DEFAULT 0,
    "bankedAmount" REAL NOT NULL DEFAULT 0,
    "waterMl" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "daily_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_daily_logs" ("bankedAmount", "calorieTarget", "caloriesBurned", "caloriesConsumed", "carbsG", "date", "exerciseMinutes", "fatG", "fiberG", "id", "proteinG", "userId", "waterMl") SELECT "bankedAmount", "calorieTarget", "caloriesBurned", "caloriesConsumed", "carbsG", "date", "exerciseMinutes", "fatG", "fiberG", "id", "proteinG", "userId", "waterMl" FROM "daily_logs";
DROP TABLE "daily_logs";
ALTER TABLE "new_daily_logs" RENAME TO "daily_logs";
CREATE UNIQUE INDEX "daily_logs_userId_date_key" ON "daily_logs"("userId", "date");
CREATE TABLE "new_meals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyLogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealType" TEXT NOT NULL DEFAULT 'OTHER',
    "calories" REAL NOT NULL,
    "proteinG" REAL NOT NULL DEFAULT 0,
    "carbsG" REAL NOT NULL DEFAULT 0,
    "fatG" REAL NOT NULL DEFAULT 0,
    "fiberG" REAL NOT NULL DEFAULT 0,
    "sugarG" REAL NOT NULL DEFAULT 0,
    "sodiumMg" REAL NOT NULL DEFAULT 0,
    "vitaminCMg" REAL NOT NULL DEFAULT 0,
    "calciumMg" REAL NOT NULL DEFAULT 0,
    "ironMg" REAL NOT NULL DEFAULT 0,
    "potassiumMg" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "aiConfidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meals_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "daily_logs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_meals" ("aiConfidence", "calories", "carbsG", "createdAt", "dailyLogId", "fatG", "id", "mealType", "name", "proteinG", "source") SELECT "aiConfidence", "calories", "carbsG", "createdAt", "dailyLogId", "fatG", "id", "mealType", "name", "proteinG", "source" FROM "meals";
DROP TABLE "meals";
ALTER TABLE "new_meals" RENAME TO "meals";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
