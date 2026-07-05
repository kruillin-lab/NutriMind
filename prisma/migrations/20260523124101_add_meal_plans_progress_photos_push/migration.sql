-- AlterTable
ALTER TABLE "cached_foods" ADD COLUMN "servingSizeG" REAL;

-- AlterTable
ALTER TABLE "meal_templates" ADD COLUMN "servingSizeG" REAL;

-- AlterTable
ALTER TABLE "meals" ADD COLUMN "servingSizeG" REAL;

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "meal_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meal_plan_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealPlanId" TEXT NOT NULL,
    "plannedDate" DATETIME NOT NULL,
    "mealType" TEXT NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "calories" REAL NOT NULL,
    "proteinG" REAL NOT NULL DEFAULT 0,
    "carbsG" REAL NOT NULL DEFAULT 0,
    "fatG" REAL NOT NULL DEFAULT 0,
    "fiberG" REAL NOT NULL DEFAULT 0,
    "sugarG" REAL NOT NULL DEFAULT 0,
    "sodiumMg" REAL NOT NULL DEFAULT 0,
    "mealTemplateId" TEXT,
    "isLogged" BOOLEAN NOT NULL DEFAULT false,
    "loggedMealId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "meal_plan_items_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "progress_photos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "photoDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caption" TEXT,
    "weightKg" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "progress_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "meal_plans_userId_idx" ON "meal_plans"("userId");

-- CreateIndex
CREATE INDEX "meal_plans_startDate_idx" ON "meal_plans"("startDate");

-- CreateIndex
CREATE INDEX "meal_plans_isTemplate_idx" ON "meal_plans"("isTemplate");

-- CreateIndex
CREATE INDEX "meal_plan_items_mealPlanId_idx" ON "meal_plan_items"("mealPlanId");

-- CreateIndex
CREATE INDEX "meal_plan_items_plannedDate_idx" ON "meal_plan_items"("plannedDate");

-- CreateIndex
CREATE INDEX "meal_plan_items_mealType_idx" ON "meal_plan_items"("mealType");

-- CreateIndex
CREATE INDEX "progress_photos_userId_idx" ON "progress_photos"("userId");

-- CreateIndex
CREATE INDEX "progress_photos_photoDate_idx" ON "progress_photos"("photoDate");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions"("endpoint");
