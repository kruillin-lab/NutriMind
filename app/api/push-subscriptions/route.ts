import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { ApiError, handleRoute, requireUserId } from "@/src/lib/api-helpers";

// GET /api/push-subscriptions - Check if user has push notifications enabled
export async function GET(req: NextRequest) {
  void req;
  return handleRoute("Failed to fetch push subscriptions", async () => {
    const userId = await requireUserId();

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, enabled: true },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true },
    });

    return {
      enabled: subscriptions.length > 0,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        endpoint: s.endpoint.substring(0, 50) + "...",
        userAgent: s.userAgent,
        createdAt: s.createdAt,
      })),
    };
  });
}

// POST /api/push-subscriptions - Subscribe to push notifications
export async function POST(req: NextRequest) {
  return handleRoute("Failed to subscribe", async () => {
    const userId = await requireUserId();

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      throw new ApiError(400, "Invalid subscription data");
    }

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      // Update if exists but belongs to different user or is disabled
      if (existing.userId !== userId || !existing.enabled) {
        await prisma.pushSubscription.update({
          where: { endpoint },
          data: {
            userId,
            enabled: true,
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        });
      }
      return { success: true, message: "Subscription updated" };
    }

    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers.get("user-agent") || undefined,
        enabled: true,
      },
    });

    return { success: true, message: "Subscribed successfully" };
  });
}

// DELETE /api/push-subscriptions - Unsubscribe from push notifications
export async function DELETE(req: NextRequest) {
  return handleRoute("Failed to unsubscribe", async () => {
    const userId = await requireUserId();

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    if (endpoint) {
      // Delete specific subscription
      await prisma.pushSubscription.deleteMany({
        where: { userId, endpoint },
      });
    } else {
      // Delete all subscriptions for user
      await prisma.pushSubscription.deleteMany({
        where: { userId },
      });
    }

    return { success: true, message: "Unsubscribed successfully" };
  });
}
