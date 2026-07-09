import { NextRequest, NextResponse } from "next/server";
import { bankPendingCompletedDays } from "@/src/lib/calorieBank";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const isVercelCron = process.env.VERCEL === "1" && req.headers.get("x-vercel-cron") === "1";
  const authHeader = req.headers.get("authorization");
  const hasValidSecret = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await bankPendingCompletedDays();

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error banking calories:", error);
    return NextResponse.json(
      { error: "Failed to bank calories" },
      { status: 500 }
    );
  }
}
