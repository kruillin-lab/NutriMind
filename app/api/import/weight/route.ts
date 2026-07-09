import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

interface WeightRow {
  date: string;
  weightKg: number;
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  // ISO: 2024-01-15 or 2024-01-15T...
  let d = new Date(s);
  if (!isNaN(d.getTime())) {
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  // US: 1/15/2024 or 01/15/2024
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    d = new Date(Date.UTC(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2])));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json() as { rows: WeightRow[]; source?: string };
  const { rows, source = "import" } = body;

  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  if (rows.length > 3650)
    return NextResponse.json({ error: "Too many rows (max 3650)" }, { status: 400 });

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const date = parseDate(row.date);
    if (!date || row.weightKg <= 0 || row.weightKg > 700) { skipped++; continue; }

    await prisma.weightEntry.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date, weightKg: Math.round(row.weightKg * 100) / 100, source },
      update: { weightKg: Math.round(row.weightKg * 100) / 100, source },
    });
    imported++;
  }

  return NextResponse.json({ success: true, imported, skipped });
}
