import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";

// GET /api/progress-photos - List all progress photos for the user
export async function GET(req: NextRequest) {
  void req;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const photos = await prisma.progressPhoto.findMany({
      where: { userId },
      orderBy: { photoDate: "desc" },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Error fetching progress photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress photos" },
      { status: 500 }
    );
  }
}

// POST /api/progress-photos - Upload a new progress photo
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { imageData, mimeType, photoDate, caption, weightKg } = body;

    if (!imageData || !mimeType) {
      return NextResponse.json(
        { error: "Image data and mime type are required" },
        { status: 400 }
      );
    }

    // Validate base64 image data
    if (!imageData.startsWith("data:")) {
      return NextResponse.json(
        { error: "Invalid image data format" },
        { status: 400 }
      );
    }

    // Enforce 3MB limit (base64 is ~33% larger than binary, so 3MB base64 ≈ 2.25MB image)
    const MAX_BASE64_BYTES = 3 * 1024 * 1024;
    if (imageData.length > MAX_BASE64_BYTES) {
      return NextResponse.json(
        { error: "Image too large. Please use an image under 2MB." },
        { status: 413 }
      );
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
    console.error("Error uploading progress photo:", error);
    return NextResponse.json(
      { error: "Failed to upload progress photo" },
      { status: 500 }
    );
  }
}

// DELETE /api/progress-photos?id={id} - Delete a progress photo
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Photo ID is required" },
      { status: 400 }
    );
  }

  try {
    // Verify the photo belongs to the user
    const photo = await prisma.progressPhoto.findFirst({
      where: { id, userId },
    });

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    await prisma.progressPhoto.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting progress photo:", error);
    return NextResponse.json(
      { error: "Failed to delete progress photo" },
      { status: 500 }
    );
  }
}
