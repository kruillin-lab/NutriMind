import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

export const dynamic = "force-dynamic";

type FieldType = "string" | "float" | "int" | "boolean" | "date" | "enum";

interface DbField {
  name: string;
  label: string;
  type: FieldType;
  nullable?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  options?: string[];
}

interface DbRecord {
  id: string;
  [key: string]: unknown;
}

interface DbDelegate {
  findMany(args: {
    take: number;
    skip: number;
    orderBy: { id: "asc" | "desc" };
  }): Promise<DbRecord[]>;
  count(): Promise<number>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<DbRecord>;
  delete(args: { where: { id: string } }): Promise<DbRecord>;
}

interface TableConfig {
  key: string;
  label: string;
  delegate: () => DbDelegate;
  fields: DbField[];
}

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"];
const GENDERS = ["MALE", "FEMALE", "OTHER"];
const ACTIVITY_LEVELS = ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"];
const TRANSACTION_TYPES = ["BANK", "SPEND", "ADJUST", "EXPIRE"];

const idField: DbField = { name: "id", label: "ID", type: "string", readOnly: true };
const userIdField: DbField = { name: "userId", label: "User ID", type: "string" };
const createdAtField: DbField = { name: "createdAt", label: "Created", type: "date", readOnly: true };
const updatedAtField: DbField = { name: "updatedAt", label: "Updated", type: "date", readOnly: true };

const TABLES: TableConfig[] = [
  {
    key: "users",
    label: "Users",
    delegate: () => prisma.user as unknown as DbDelegate,
    fields: [
      idField,
      { name: "email", label: "Email", type: "string" },
      { name: "name", label: "Name", type: "string", nullable: true },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "user_profiles",
    label: "User Profiles",
    delegate: () => prisma.userProfile as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "heightCm", label: "Height (cm)", type: "float", nullable: true },
      { name: "birthDate", label: "Birth Date", type: "date", nullable: true },
      { name: "gender", label: "Gender", type: "enum", nullable: true, options: GENDERS },
      { name: "goalWeightKg", label: "Goal Weight (kg)", type: "float", nullable: true },
      { name: "targetDate", label: "Target Date", type: "date", nullable: true },
      { name: "activityLevel", label: "Activity", type: "enum", options: ACTIVITY_LEVELS },
      { name: "timezone", label: "Timezone", type: "string" },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "metabolic_profiles",
    label: "Metabolic Profiles",
    delegate: () => prisma.metabolicProfile as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "trueMetabolicRate", label: "True Metabolic Rate", type: "float" },
      { name: "bmrEstimate", label: "BMR Estimate", type: "float" },
      { name: "adaptiveFactor", label: "Adaptive Factor", type: "float" },
      { name: "weightChangeFactor", label: "Weight Change Factor", type: "float" },
      { name: "predictionAccuracy", label: "Prediction Accuracy", type: "float" },
      { name: "predictionsMade", label: "Predictions Made", type: "int" },
      { name: "predictionsCorrect", label: "Predictions Correct", type: "int" },
      { name: "lastCalculatedAt", label: "Last Calculated", type: "date" },
      { name: "calculationMethod", label: "Calculation Method", type: "string" },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "calorie_banks",
    label: "Calorie Banks",
    delegate: () => prisma.calorieBank as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "currentBalance", label: "Current Balance", type: "float" },
      { name: "totalBanked", label: "Total Banked", type: "float" },
      { name: "totalSpent", label: "Total Spent", type: "float" },
      { name: "dailyTarget", label: "Daily Target", type: "float" },
      { name: "weeklyAverage", label: "Weekly Average", type: "float" },
      { name: "recommendedSpend", label: "Recommended Spend", type: "float", nullable: true },
      { name: "spendByDate", label: "Spend By Date", type: "date", nullable: true },
      { name: "allowNegative", label: "Allow Negative", type: "boolean" },
      { name: "expireAfterDays", label: "Expire After Days", type: "int" },
      { name: "expiredAmount", label: "Expired Amount", type: "float" },
      { name: "proteinTargetG", label: "Protein Target", type: "float" },
      { name: "carbsTargetG", label: "Carbs Target", type: "float" },
      { name: "fatTargetG", label: "Fat Target", type: "float" },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "bank_transactions",
    label: "Bank Transactions",
    delegate: () => prisma.bankTransaction as unknown as DbDelegate,
    fields: [
      idField,
      { name: "bankId", label: "Bank ID", type: "string" },
      { name: "type", label: "Type", type: "enum", options: TRANSACTION_TYPES },
      { name: "amount", label: "Amount", type: "float" },
      { name: "reason", label: "Reason", type: "string" },
      { name: "caloriesConsumed", label: "Calories Consumed", type: "float", nullable: true },
      { name: "caloriesTarget", label: "Calories Target", type: "float", nullable: true },
      { name: "weightAtTime", label: "Weight At Time", type: "float", nullable: true },
      { name: "llmAdvice", label: "LLM Advice", type: "string", nullable: true },
      { name: "userFollowed", label: "User Followed", type: "boolean", nullable: true },
      { name: "sourceId", label: "Source ID", type: "string", nullable: true },
      { name: "sourceType", label: "Source Type", type: "string", nullable: true },
      { name: "expired", label: "Expired", type: "boolean" },
      createdAtField,
    ],
  },
  {
    key: "daily_logs",
    label: "Daily Logs",
    delegate: () => prisma.dailyLog as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "date", label: "Date", type: "date" },
      { name: "caloriesConsumed", label: "Calories Consumed", type: "float" },
      { name: "proteinG", label: "Protein", type: "float" },
      { name: "carbsG", label: "Carbs", type: "float" },
      { name: "fatG", label: "Fat", type: "float" },
      { name: "fiberG", label: "Fiber", type: "float" },
      { name: "sugarG", label: "Sugar", type: "float" },
      { name: "sodiumMg", label: "Sodium", type: "float" },
      { name: "vitaminCMg", label: "Vitamin C", type: "float" },
      { name: "calciumMg", label: "Calcium", type: "float" },
      { name: "ironMg", label: "Iron", type: "float" },
      { name: "potassiumMg", label: "Potassium", type: "float" },
      { name: "calorieTarget", label: "Calorie Target", type: "float" },
      { name: "caloriesBurned", label: "Calories Burned", type: "float" },
      { name: "exerciseMinutes", label: "Exercise Minutes", type: "int" },
      { name: "bankedAmount", label: "Banked Amount", type: "float" },
      { name: "waterMl", label: "Water", type: "float" },
      { name: "notes", label: "Notes", type: "string", nullable: true },
    ],
  },
  {
    key: "meals",
    label: "Meals",
    delegate: () => prisma.meal as unknown as DbDelegate,
    fields: [
      idField,
      { name: "dailyLogId", label: "Daily Log ID", type: "string" },
      { name: "name", label: "Name", type: "string" },
      { name: "mealType", label: "Meal Type", type: "enum", options: MEAL_TYPES },
      { name: "calories", label: "Calories", type: "float" },
      { name: "proteinG", label: "Protein", type: "float" },
      { name: "carbsG", label: "Carbs", type: "float" },
      { name: "fatG", label: "Fat", type: "float" },
      { name: "fiberG", label: "Fiber", type: "float" },
      { name: "sugarG", label: "Sugar", type: "float" },
      { name: "sodiumMg", label: "Sodium", type: "float" },
      { name: "vitaminCMg", label: "Vitamin C", type: "float" },
      { name: "calciumMg", label: "Calcium", type: "float" },
      { name: "ironMg", label: "Iron", type: "float" },
      { name: "potassiumMg", label: "Potassium", type: "float" },
      { name: "servingSizeG", label: "Serving Size", type: "float", nullable: true },
      { name: "source", label: "Source", type: "string" },
      { name: "aiConfidence", label: "AI Confidence", type: "float", nullable: true },
      createdAtField,
    ],
  },
  {
    key: "weight_entries",
    label: "Weight Entries",
    delegate: () => prisma.weightEntry as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "weightKg", label: "Weight", type: "float" },
      { name: "date", label: "Date", type: "date" },
      { name: "source", label: "Source", type: "string" },
    ],
  },
  {
    key: "body_measurements",
    label: "Body Measurements",
    delegate: () => prisma.bodyMeasurement as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "date", label: "Date", type: "date" },
      { name: "waistCm", label: "Waist", type: "float", nullable: true },
      { name: "hipsCm", label: "Hips", type: "float", nullable: true },
      { name: "chestCm", label: "Chest", type: "float", nullable: true },
      { name: "thighCm", label: "Thigh", type: "float", nullable: true },
      { name: "bicepCm", label: "Bicep", type: "float", nullable: true },
      { name: "shoulderCm", label: "Shoulder", type: "float", nullable: true },
      { name: "neckCm", label: "Neck", type: "float", nullable: true },
      { name: "bodyFatPct", label: "Body Fat", type: "float", nullable: true },
      { name: "muscleMassKg", label: "Muscle Mass", type: "float", nullable: true },
      { name: "source", label: "Source", type: "string" },
      createdAtField,
    ],
  },
  {
    key: "cached_foods",
    label: "Cached Foods",
    delegate: () => prisma.cachedFood as unknown as DbDelegate,
    fields: [
      idField,
      { name: "normalizedKey", label: "Normalized Key", type: "string" },
      { name: "originalText", label: "Original Text", type: "string" },
      { name: "name", label: "Name", type: "string" },
      { name: "calories", label: "Calories", type: "float" },
      { name: "proteinG", label: "Protein", type: "float" },
      { name: "carbsG", label: "Carbs", type: "float" },
      { name: "fatG", label: "Fat", type: "float" },
      { name: "fiberG", label: "Fiber", type: "float" },
      { name: "sugarG", label: "Sugar", type: "float" },
      { name: "sodiumMg", label: "Sodium", type: "float" },
      { name: "vitaminCMg", label: "Vitamin C", type: "float" },
      { name: "calciumMg", label: "Calcium", type: "float" },
      { name: "ironMg", label: "Iron", type: "float" },
      { name: "potassiumMg", label: "Potassium", type: "float" },
      { name: "servingSizeG", label: "Serving Size", type: "float", nullable: true },
      { name: "aiConfidence", label: "AI Confidence", type: "float" },
      { name: "source", label: "Source", type: "string" },
      { name: "hitCount", label: "Hit Count", type: "int" },
      { name: "lastUsedAt", label: "Last Used", type: "date", readOnly: true },
      createdAtField,
    ],
  },
  {
    key: "meal_templates",
    label: "Meal Templates",
    delegate: () => prisma.mealTemplate as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "name", label: "Name", type: "string" },
      { name: "mealType", label: "Meal Type", type: "enum", options: MEAL_TYPES },
      { name: "calories", label: "Calories", type: "float" },
      { name: "proteinG", label: "Protein", type: "float" },
      { name: "carbsG", label: "Carbs", type: "float" },
      { name: "fatG", label: "Fat", type: "float" },
      { name: "fiberG", label: "Fiber", type: "float" },
      { name: "sugarG", label: "Sugar", type: "float" },
      { name: "sodiumMg", label: "Sodium", type: "float" },
      { name: "vitaminCMg", label: "Vitamin C", type: "float" },
      { name: "calciumMg", label: "Calcium", type: "float" },
      { name: "ironMg", label: "Iron", type: "float" },
      { name: "potassiumMg", label: "Potassium", type: "float" },
      { name: "servingSizeG", label: "Serving Size", type: "float", nullable: true },
      { name: "useCount", label: "Use Count", type: "int" },
      { name: "lastUsedAt", label: "Last Used", type: "date", nullable: true },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "meal_plans",
    label: "Meal Plans",
    delegate: () => prisma.mealPlan as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "name", label: "Name", type: "string" },
      { name: "description", label: "Description", type: "string", nullable: true },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "isActive", label: "Active", type: "boolean" },
      { name: "isTemplate", label: "Template", type: "boolean" },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "meal_plan_items",
    label: "Meal Plan Items",
    delegate: () => prisma.mealPlanItem as unknown as DbDelegate,
    fields: [
      idField,
      { name: "mealPlanId", label: "Meal Plan ID", type: "string" },
      { name: "plannedDate", label: "Planned Date", type: "date" },
      { name: "mealType", label: "Meal Type", type: "enum", options: MEAL_TYPES },
      { name: "name", label: "Name", type: "string" },
      { name: "description", label: "Description", type: "string", nullable: true },
      { name: "calories", label: "Calories", type: "float" },
      { name: "proteinG", label: "Protein", type: "float" },
      { name: "carbsG", label: "Carbs", type: "float" },
      { name: "fatG", label: "Fat", type: "float" },
      { name: "fiberG", label: "Fiber", type: "float" },
      { name: "sugarG", label: "Sugar", type: "float" },
      { name: "sodiumMg", label: "Sodium", type: "float" },
      { name: "mealTemplateId", label: "Meal Template ID", type: "string", nullable: true },
      { name: "isLogged", label: "Logged", type: "boolean" },
      { name: "loggedMealId", label: "Logged Meal ID", type: "string", nullable: true },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "progress_photos",
    label: "Progress Photos",
    delegate: () => prisma.progressPhoto as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "imageData", label: "Image Data", type: "string", hidden: true },
      { name: "mimeType", label: "MIME Type", type: "string" },
      { name: "photoDate", label: "Photo Date", type: "date" },
      { name: "caption", label: "Caption", type: "string", nullable: true },
      { name: "weightKg", label: "Weight", type: "float", nullable: true },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "push_subscriptions",
    label: "Push Subscriptions",
    delegate: () => prisma.pushSubscription as unknown as DbDelegate,
    fields: [
      idField,
      userIdField,
      { name: "endpoint", label: "Endpoint", type: "string" },
      { name: "p256dh", label: "P256DH", type: "string" },
      { name: "auth", label: "Auth", type: "string" },
      { name: "userAgent", label: "User Agent", type: "string", nullable: true },
      { name: "enabled", label: "Enabled", type: "boolean" },
      createdAtField,
      updatedAtField,
    ],
  },
];

const TABLE_MAP = new Map(TABLES.map((table) => [table.key, table]));
const DEFAULT_TABLE = TABLES[0].key;

function publicTables(counts: Record<string, number>) {
  return TABLES.map((table) => ({
    key: table.key,
    label: table.label,
    count: counts[table.key] ?? 0,
  }));
}

async function getCounts() {
  const entries = await Promise.all(
    TABLES.map(async (table) => {
      try {
        return [table.key, await table.delegate().count()] as const;
      } catch {
        return [table.key, 0] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}

async function assertAccess() {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(404, "Database editor is disabled in production");
  }

  await requireUserId();
}

function getTable(key: string | null) {
  return TABLE_MAP.get(key || DEFAULT_TABLE) ?? TABLE_MAP.get(DEFAULT_TABLE)!;
}

function coerceFieldValue(field: DbField, value: unknown) {
  if (value === null || value === "") {
    if (field.nullable) return null;
    if (field.type === "string") return "";
    throw new Error(`${field.label} cannot be empty`);
  }

  switch (field.type) {
    case "string":
      return String(value);
    case "float": {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) throw new Error(`${field.label} must be a number`);
      return numberValue;
    }
    case "int": {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) throw new Error(`${field.label} must be a number`);
      return Math.trunc(numberValue);
    }
    case "boolean": {
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new Error(`${field.label} must be true or false`);
    }
    case "date": {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) throw new Error(`${field.label} must be a valid date`);
      return date;
    }
    case "enum": {
      const enumValue = String(value);
      if (field.options && !field.options.includes(enumValue)) {
        throw new Error(`${field.label} must be one of: ${field.options.join(", ")}`);
      }
      return enumValue;
    }
    default:
      return value;
  }
}

function sanitizeUpdate(table: TableConfig, data: Record<string, unknown>) {
  const fields = new Map(table.fields.map((field) => [field.name, field]));
  const update: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const field = fields.get(key);
    if (!field || field.readOnly) continue;
    update[key] = coerceFieldValue(field, value);
  }

  return update;
}

export async function GET(req: NextRequest) {
  return handleRoute("Failed to read database", async () => {
    await assertAccess();

    const { searchParams } = new URL(req.url);
    const table = getTable(searchParams.get("table"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const [counts, rows] = await Promise.all([
      getCounts(),
      table.delegate().findMany({
        take: limit,
        skip: offset,
        orderBy: { id: "asc" },
      }),
    ]);

    return {
      tables: publicTables(counts),
      activeTable: table.key,
      fields: table.fields,
      rows,
      total: counts[table.key] ?? rows.length,
      limit,
      offset,
    };
  });
}

export async function PATCH(req: NextRequest) {
  return handleRoute("Failed to update record", async () => {
    await assertAccess();

    try {
      const body = await req.json();
      const table = getTable(typeof body.table === "string" ? body.table : null);
      const id = typeof body.id === "string" ? body.id : "";
      const data =
        body.data && typeof body.data === "object" && !Array.isArray(body.data)
          ? body.data as Record<string, unknown>
          : null;

      if (!id || !data) {
        throw new ApiError(400, "Missing table, id, or data");
      }

      const updated = await table.delegate().update({
        where: { id },
        data: sanitizeUpdate(table, data),
      });

      return { success: true, record: updated };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // Surface validation/update failures in the 500 body, as before.
      console.error("Error updating database record:", error);
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Failed to update record"
      );
    }
  });
}

export async function DELETE(req: NextRequest) {
  return handleRoute("Failed to delete record", async () => {
    await assertAccess();

    const { searchParams } = new URL(req.url);
    const table = getTable(searchParams.get("table"));
    const id = searchParams.get("id");

    if (!id) {
      throw new ApiError(400, "Missing record id");
    }

    await table.delegate().delete({ where: { id } });

    return { success: true };
  });
}
