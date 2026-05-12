-- CreateTable
CREATE TABLE "meal_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
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
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "meal_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "meal_templates_userId_idx" ON "meal_templates"("userId");

-- CreateIndex
CREATE INDEX "meal_templates_useCount_idx" ON "meal_templates"("useCount");
