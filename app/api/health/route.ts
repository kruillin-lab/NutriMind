import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { validateHostedRuntime } from "@/src/lib/runtime-env";

// GET /api/health - Unauthenticated liveness, configuration, and database readiness check
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

  try {
    console.info("NutriMind health probe: database query started");
    await prisma.$queryRaw`SELECT 1`;
    console.info("NutriMind health probe: database query succeeded");
  } catch {
    console.error("NutriMind health probe failed", { stage: "database-query" });
    return NextResponse.json({ status: "database-unavailable" }, { status: 503 });
  }

  return NextResponse.json({ status: "ok", database: "ready" });
}
