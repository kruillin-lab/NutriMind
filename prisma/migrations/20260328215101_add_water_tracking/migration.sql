-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_daily_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "caloriesConsumed" REAL NOT NULL DEFAULT 0,
    "proteinG" REAL NOT NULL DEFAULT 0,
    "carbsG" REAL NOT NULL DEFAULT 0,
    "fatG" REAL NOT NULL DEFAULT 0,
    "fiberG" REAL NOT NULL DEFAULT 0,
    "calorieTarget" REAL NOT NULL DEFAULT 2000,
    "caloriesBurned" REAL NOT NULL DEFAULT 0,
    "exerciseMinutes" INTEGER NOT NULL DEFAULT 0,
    "bankedAmount" REAL NOT NULL DEFAULT 0,
    "waterMl" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "daily_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_daily_logs" ("bankedAmount", "calorieTarget", "caloriesBurned", "caloriesConsumed", "carbsG", "date", "exerciseMinutes", "fatG", "fiberG", "id", "proteinG", "userId") SELECT "bankedAmount", "calorieTarget", "caloriesBurned", "caloriesConsumed", "carbsG", "date", "exerciseMinutes", "fatG", "fiberG", "id", "proteinG", "userId" FROM "daily_logs";
DROP TABLE "daily_logs";
ALTER TABLE "new_daily_logs" RENAME TO "daily_logs";
CREATE UNIQUE INDEX "daily_logs_userId_date_key" ON "daily_logs"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
