import { NextResponse } from "next/server";
import { validateHostedRuntime } from "@/src/lib/runtime-env";

// GET /api/health - Unauthenticated liveness and hosted-runtime readiness check
export async function GET() {
  const runtime = validateHostedRuntime();

  if (!runtime.ready) {
    console.error("Hosted runtime is misconfigured", {
      missing: runtime.missing,
      invalid: runtime.invalid,
    });
    return NextResponse.json(
      { status: "misconfigured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: "ok" });
}
