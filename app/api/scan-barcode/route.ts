import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { jsonError } from "@/src/lib/api-helpers";

const BARCODE_PATTERN = /^[0-9]{6,14}$/;

function getNutrient(
  n: Record<string, number>,
  key: string,
  servingQty: number | null
): number {
  if (n[`${key}_serving`] != null) return n[`${key}_serving`];
  const per100 = n[`${key}_100g`] ?? n[key];
  if (per100 != null && servingQty) return (per100 * servingQty) / 100;
  return per100 ?? 0;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return jsonError(401, "Unauthorized");
  }

  // Best-effort per-instance rate limit: 30 requests per user per minute
  if (!checkRateLimit(`scan-barcode:${userId}`, 30, 60_000)) {
    return jsonError(429, "Too many requests");
  }

  const barcode = new URL(req.url).searchParams.get("barcode");
  if (!barcode) {
    return jsonError(400, "Missing barcode");
  }

  if (!BARCODE_PATTERN.test(barcode)) {
    return jsonError(400, "Invalid barcode");
  }

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    { headers: { "User-Agent": "NutriMind/1.0 (nutrition tracking app)" } }
  );

  if (!res.ok) {
    return jsonError(502, "Failed to reach Open Food Facts");
  }

  const data = await res.json();

  if (data.status !== 1 || !data.product) {
    return jsonError(404, "Product not found");
  }

  const { product } = data;
  const n = (product.nutriments ?? {}) as Record<string, number>;
  const servingQty: number | null = product.serving_quantity
    ? parseFloat(product.serving_quantity)
    : null;

  // Calories: prefer _serving, fall back to computed from per-100g
  const calories =
    n["energy-kcal_serving"] ??
    (n["energy-kcal_100g"] != null && servingQty
      ? (n["energy-kcal_100g"] * servingQty) / 100
      : (n["energy-kcal_100g"] ?? 0));

  // Sodium in Open Food Facts is stored in g, convert to mg
  const sodiumG = getNutrient(n, "sodium", servingQty);

  return NextResponse.json({
    success: true,
    product: {
      name: product.product_name || product.abbreviated_product_name || "Unknown Product",
      servingSize: product.serving_size || (servingQty ? `${servingQty}g` : "100g"),
      calories: Math.round(calories),
      proteinG: Math.round(getNutrient(n, "proteins", servingQty) * 10) / 10,
      carbsG: Math.round(getNutrient(n, "carbohydrates", servingQty) * 10) / 10,
      fatG: Math.round(getNutrient(n, "fat", servingQty) * 10) / 10,
      fiberG: Math.round(getNutrient(n, "fiber", servingQty) * 10) / 10,
      sugarG: Math.round(getNutrient(n, "sugars", servingQty) * 10) / 10,
      sodiumMg: Math.round(sodiumG * 1000),
      vitaminCMg: Math.round(getNutrient(n, "vitamin-c", servingQty) * 1000),
      calciumMg: Math.round(getNutrient(n, "calcium", servingQty) * 1000),
      ironMg: Math.round(getNutrient(n, "iron", servingQty) * 1000),
      potassiumMg: Math.round(getNutrient(n, "potassium", servingQty) * 1000),
    },
  });
}
