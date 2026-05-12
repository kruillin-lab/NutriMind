-- CreateTable
CREATE TABLE "body_measurements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "waistCm" REAL,
    "hipsCm" REAL,
    "chestCm" REAL,
    "thighCm" REAL,
    "bicepCm" REAL,
    "shoulderCm" REAL,
    "neckCm" REAL,
    "bodyFatPct" REAL,
    "muscleMassKg" REAL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "body_measurements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "body_measurements_userId_date_idx" ON "body_measurements"("userId", "date");
