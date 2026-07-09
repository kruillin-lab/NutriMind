import { NextResponse } from "next/server";

// GET /api/health - Unauthenticated liveness check
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
