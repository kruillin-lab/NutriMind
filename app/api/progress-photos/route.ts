import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  ApiError,
  handleRoute,
  jsonError,
  requireUserId,
} from "@/src/lib/api-helpers";

// GET /api/progress-photos - List all progress photos for the user
export async function GET(req: NextRequest) {
  void req;
  return handleRoute("Failed to fetch progress photos", async () => {
    const userId = await requireUserId();

    const photos = await prisma.progressPhoto.findMany({
      where: { userId },
      orderBy: { photoDate: "desc" },
    });

    return { photos };
  });
}

// POST /api/progress-photos - Upload a new progress photo
// Not wrapped in handleRoute: the success response uses a 201 status.
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();

    const body = await req.json();
    const { imageData, mimeType, photoDate, caption, weightKg } = body;

    if (!imageData || !mimeType) {
      throw new ApiError(400, "Image data and mime type are required");
    }

    // Validate base64 image data
    if (!imageData.startsWith("data:")) {
      throw new ApiError(400, "Invalid image data format");
    }

    // Enforce 3MB limit (base64 is ~33% larger than binary, so 3MB base64 ≈ 2.25MB image)
    const MAX_BASE64_BYTES = 3 * 1024 * 1024;
    if (imageData.length > MAX_BASE64_BYTES) {
      throw new ApiError(413, "Image too large. Please use an image under 2MB.");
    }

    const photo = await prisma.progressPhoto.create({
      data: {
        userId,
        imageData,
        mimeType,
        photoDate: photoDate ? new Date(photoDate) : new Date(),
        caption,
        weightKg: weightKg ? parseFloat(weightKg) : null,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.status, error.message);
    }
    console.error("Error uploading progress photo:", error);
    return jsonError(500, "Failed to upload progress photo");
  }
}

// DELETE /api/progress-photos?id={id} - Delete a progress photo
export async function DELETE(req: NextRequest) {
  return handleRoute("Failed to delete progress photo", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new ApiError(400, "Photo ID is required");
    }

    // Verify the photo belongs to the user
    const photo = await prisma.progressPhoto.findFirst({
      where: { id, userId },
    });

    if (!photo) {
      throw new ApiError(404, "Photo not found");
    }

    await prisma.progressPhoto.delete({
      where: { id },
    });

    return { success: true };
  });
}
