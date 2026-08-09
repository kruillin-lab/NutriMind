import { NextRequest, NextResponse } from "next/server";
import { bankPendingCompletedDays } from "@/src/lib/calorieBank";
import { hasAuthorizedCronRequest } from "@/src/lib/cron-auth";

export async function POST(req: NextRequest) {
  if (!hasAuthorizedCronRequest(req)) {
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
