import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { jsonError } from "@/src/lib/api-helpers";
import { dispatchLabelParse } from "@/src/lib/vision/router";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return jsonError(401, "Unauthorized");
  }

  if (!checkRateLimit(`parse-label:${userId}`, 10, 60_000)) {
    return jsonError(429, "Too many requests");
  }

  const body = await req.json().catch(() => null);
  const image = body?.image;

  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return jsonError(400, "Missing or invalid image");
  }

  if (image.length > 8_000_000) {
    return jsonError(413, "Image too large");
  }

  try {
    const { provider, data } = await dispatchLabelParse(image);
    return NextResponse.json({
      success: true,
      provider,
      item: data,
      nutrition: data,
    });
  } catch (error) {
    console.error("Label parsing error:", error);
    return jsonError(500, error instanceof Error ? error.message : "Failed to parse nutrition label");
  }
}
