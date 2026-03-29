-- CreateTable
CREATE TABLE "cached_foods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalizedKey" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calories" REAL NOT NULL,
    "proteinG" REAL NOT NULL DEFAULT 0,
    "carbsG" REAL NOT NULL DEFAULT 0,
    "fatG" REAL NOT NULL DEFAULT 0,
    "aiConfidence" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'openai',
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "cached_foods_normalizedKey_key" ON "cached_foods"("normalizedKey");

-- CreateIndex
CREATE INDEX "cached_foods_hitCount_idx" ON "cached_foods"("hitCount");

-- CreateIndex
CREATE INDEX "cached_foods_lastUsedAt_idx" ON "cached_foods"("lastUsedAt");
