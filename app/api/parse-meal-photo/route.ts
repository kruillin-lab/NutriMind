import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/src/lib/api-helpers";
import {
  PHOTO_ESTIMATE_LIMIT,
  PHOTO_ESTIMATE_WINDOW_MS,
  validateImageDataUrl,
} from "@/src/lib/photo-meal";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { dispatchMealPhotoParse } from "@/src/lib/vision/router";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return jsonError(401, "Unauthorized");
  }

  if (!checkRateLimit(`parse-meal-photo:${userId}`, PHOTO_ESTIMATE_LIMIT, PHOTO_ESTIMATE_WINDOW_MS)) {
    return jsonError(429, "Too many meal photo estimates. Please try again later.");
  }

  const body = await req.json().catch(() => null);
  const image = body && typeof body === "object" ? (body as { image?: unknown }).image : undefined;
  if (!validateImageDataUrl(image)) {
    return jsonError(400, "Missing or invalid image");
  }

  try {
    const { provider, data } = await dispatchMealPhotoParse(image as string);
    return NextResponse.json({
      success: true,
      provider,
      estimate: data,
    });
  } catch (error) {
    console.error("Meal photo estimation error:", error);
    return jsonError(502, "Unable to estimate this meal photo");
  }
}
