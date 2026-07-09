import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSystemTimezone } from "@/lib/date-utils";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Get headers
  const headerPayload = headers();
  const svix_id = (await headerPayload).get("svix-id");
  const svix_timestamp = (await headerPayload).get("svix-timestamp");
  const svix_signature = (await headerPayload).get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as { type: string; data: { id: string; email_addresses: { email_address: string }[]; first_name?: string; last_name?: string } };
  } catch {
    // Do not log the raw error: it can echo attacker-controlled payload details
    console.error("Clerk webhook signature verification failed");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const eventType = evt.type;

  // Handle user creation
  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ""} ${last_name || ""}`.trim() || null;

    if (!email) {
      return NextResponse.json(
        { error: "No email provided" },
        { status: 400 }
      );
    }

    try {
      // Create user and all related records in a transaction
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Create the user
        const user = await tx.user.create({
          data: {
            id,
            email,
            name,
          },
        });

        // Create UserProfile with default values
        await tx.userProfile.create({
          data: {
            userId: user.id,
            heightCm: null,
            birthDate: null,
            gender: null,
            goalWeightKg: null,
            targetDate: null,
            activityLevel: "SEDENTARY",
            timezone: getSystemTimezone(),
          },
        });

        // Create MetabolicProfile with initial estimates
        // BMR will be calculated properly once user provides stats
        await tx.metabolicProfile.create({
          data: {
            userId: user.id,
            trueMetabolicRate: 2000, // Placeholder, learned from data
            bmrEstimate: 1500, // Placeholder, calculated from user stats
            adaptiveFactor: 0,
            weightChangeFactor: 3500,
            predictionAccuracy: 0,
            predictionsMade: 0,
            predictionsCorrect: 0,
            calculationMethod: "harris_benedict",
          },
        });

        // Create CalorieBank
        await tx.calorieBank.create({
          data: {
            userId: user.id,
            currentBalance: 0,
            totalBanked: 0,
            totalSpent: 0,
            dailyTarget: 2000, // Default, should be personalized
            weeklyAverage: 0,
            recommendedSpend: null,
            spendByDate: null,
            allowNegative: false,
            expireAfterDays: 30,
          },
        });
      });

      return NextResponse.json(
        { message: "User created successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error creating user records:", error);
      return NextResponse.json(
        { error: "Failed to create user records" },
        { status: 500 }
      );
    }
  }

  // Handle user deletion
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      // Cascade delete handles related records
      await prisma.user.delete({
        where: { id },
      });

      return NextResponse.json(
        { message: "User deleted successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ message: "Webhook received" }, { status: 200 });
}
