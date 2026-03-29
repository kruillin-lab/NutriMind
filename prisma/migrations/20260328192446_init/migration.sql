-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "heightCm" REAL,
    "birthDate" DATETIME,
    "gender" TEXT,
    "goalWeightKg" REAL,
    "targetDate" DATETIME,
    "activityLevel" TEXT NOT NULL DEFAULT 'SEDENTARY',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "metabolic_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trueMetabolicRate" REAL NOT NULL,
    "bmrEstimate" REAL NOT NULL,
    "adaptiveFactor" REAL NOT NULL DEFAULT 0,
    "weightChangeFactor" REAL NOT NULL DEFAULT 3500,
    "predictionAccuracy" REAL NOT NULL DEFAULT 0,
    "predictionsMade" INTEGER NOT NULL DEFAULT 0,
    "predictionsCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculationMethod" TEXT NOT NULL DEFAULT 'harris_benedict',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "metabolic_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calorie_banks" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "calorie_banks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bank_transactions" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_transactions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "calorie_banks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "daily_logs" (
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
    CONSTRAINT "daily_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyLogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealType" TEXT NOT NULL DEFAULT 'OTHER',
    "calories" REAL NOT NULL,
    "proteinG" REAL NOT NULL DEFAULT 0,
    "carbsG" REAL NOT NULL DEFAULT 0,
    "fatG" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "aiConfidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meals_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "daily_logs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weight_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weightKg" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    CONSTRAINT "weight_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "metabolic_profiles_userId_key" ON "metabolic_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calorie_banks_userId_key" ON "calorie_banks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_userId_date_key" ON "daily_logs"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "weight_entries_userId_date_key" ON "weight_entries"("userId", "date");
