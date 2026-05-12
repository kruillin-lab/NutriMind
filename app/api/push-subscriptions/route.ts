import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";

// GET /api/push-subscriptions - Check if user has push notifications enabled
export async function GET(req: NextRequest) {
  void req;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, enabled: true },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true },
    });

    return NextResponse.json({
      enabled: subscriptions.length > 0,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        endpoint: s.endpoint.substring(0, 50) + "...",
        userAgent: s.userAgent,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching push subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch push subscriptions" },
      { status: 500 }
    );
  }
}

// POST /api/push-subscriptions - Subscribe to push notifications
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      );
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
      return NextResponse.json({ success: true, message: "Subscription updated" });
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

    return NextResponse.json({ success: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

// DELETE /api/push-subscriptions - Unsubscribe from push notifications
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    return NextResponse.json({ success: true, message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}