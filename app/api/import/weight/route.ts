import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { isValidLocalDateKey, parseZonedDate } from "@/lib/date-utils";
import { requireUserTimezone } from "@/src/lib/api-helpers";

interface WeightRow {
  date: string;
  weightKg: number;
}

/** Parse a date string into a YYYY-MM-DD key, ignoring any embedded time-of-day. */
function parseDateKey(raw: string): string | null {
  const s = raw.trim();
  // ISO: 2024-01-15 or 2024-01-15T... — take just the leading date part.
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch && isValidLocalDateKey(isoMatch[1])) {
    return isoMatch[1];
  }
  // US: 1/15/2024 or 01/15/2024
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const key = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidLocalDateKey(key) ? key : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const timezone = await requireUserTimezone(user.id);

  const body = await req.json() as { rows: WeightRow[]; source?: string };
  const { rows, source = "import" } = body;

  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  if (rows.length > 3650)
    return NextResponse.json({ error: "Too many rows (max 3650)" }, { status: 400 });

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const dateKey = parseDateKey(row.date);
    if (!dateKey || row.weightKg <= 0 || row.weightKg > 700) { skipped++; continue; }
    const date = parseZonedDate(dateKey, timezone);

    await prisma.weightEntry.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date, weightKg: Math.round(row.weightKg * 100) / 100, source },
      update: { weightKg: Math.round(row.weightKg * 100) / 100, source },
    });
    imported++;
  }

  return NextResponse.json({ success: true, imported, skipped });
}
