export const MAX_PHOTO_DATA_URL_CHARS = 8_000_000;
export const PHOTO_ESTIMATE_LIMIT = 10;
export const PHOTO_ESTIMATE_WINDOW_MS = 60 * 60 * 1_000;

const IMAGE_DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/]+={0,2}$/;
const MAX_FOODS = 8;
const MAX_NAME_LENGTH = 100;
const MAX_UNCERTAINTY_NOTE_LENGTH = 240;

export interface PhotoMealFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  vitaminC: number;
  calcium: number;
  iron: number;
  potassium: number;
  servingSize: number;
  confidence: number;
}

export interface PhotoMealEstimate {
  foods: PhotoMealFood[];
  confidence: number;
  uncertaintyNote: string;
}

export function validateImageDataUrl(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_PHOTO_DATA_URL_CHARS &&
    IMAGE_DATA_URL_PATTERN.test(value);
}

function boundedNumber(value: unknown, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
    return null;
  }

  return value;
}

function parseFood(value: unknown): PhotoMealFood | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const food = value as Record<string, unknown>;
  const name = typeof food.name === "string" ? food.name.trim() : "";
  const calories = boundedNumber(food.calories, 10_000);
  const protein = boundedNumber(food.protein, 1_000);
  const carbs = boundedNumber(food.carbs, 1_000);
  const fat = boundedNumber(food.fat, 1_000);
  const fiber = boundedNumber(food.fiber, 1_000);
  const sugar = boundedNumber(food.sugar, 1_000);
  const sodium = boundedNumber(food.sodium, 10_000);
  const vitaminC = boundedNumber(food.vitaminC, 10_000);
  const calcium = boundedNumber(food.calcium, 10_000);
  const iron = boundedNumber(food.iron, 10_000);
  const potassium = boundedNumber(food.potassium, 10_000);
  const servingSize = boundedNumber(food.servingSize, 10_000);
  const confidence = boundedNumber(food.confidence, 1);

  if (!name || name.length > MAX_NAME_LENGTH || [
    calories, protein, carbs, fat, fiber, sugar, sodium, vitaminC, calcium,
    iron, potassium, servingSize, confidence,
  ].some((field) => field === null)) {
    return null;
  }

  return {
    name,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    vitaminC,
    calcium,
    iron,
    potassium,
    servingSize,
    confidence,
  };
}

export function parsePhotoMealEstimate(value: unknown): PhotoMealEstimate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const estimate = value as Record<string, unknown>;
  if (!Array.isArray(estimate.foods) || estimate.foods.length === 0 || estimate.foods.length > MAX_FOODS) {
    return null;
  }

  const foods = estimate.foods.map(parseFood);
  const confidence = boundedNumber(estimate.confidence, 1);
  const uncertaintyNote = typeof estimate.uncertaintyNote === "string"
    ? estimate.uncertaintyNote.trim()
    : "";

  if (foods.some((food) => food === null) || confidence === null || !uncertaintyNote || uncertaintyNote.length > MAX_UNCERTAINTY_NOTE_LENGTH) {
    return null;
  }

  return { foods: foods as PhotoMealFood[], confidence, uncertaintyNote };
}
