import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { hasAuthorizedCronRequest } from "@/src/lib/cron-auth";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.DIGEST_FROM_EMAIL ?? "NutriMind <digest@nutrimind.app>";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  return res.ok ? { ok: true } : { error: await res.text() };
}

function digestHtml(data: {
  name: string;
  date: string;
  calories: number;
  target: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  balance: number;
  streak: number;
}) {
  const pct = data.target > 0 ? Math.round((data.calories / data.target) * 100) : 0;
  const diff = data.calories - data.target;
  const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
  const statusColor = Math.abs(diff) < 100 ? "#00C875" : diff > 0 ? "#FF5A3D" : "#00C8FF";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFF8E7;font-family:system-ui,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#FFF8E7;border:2px solid #18120E;border-radius:16px;overflow:hidden;box-shadow:5px 5px 0 #18120E">
    <div style="background:#18120E;padding:24px 28px">
      <div style="height:4px;width:80px;background:linear-gradient(90deg,#DFFF35,#00C875,#00C8FF,#FF5A3D);border-radius:4px;margin-bottom:12px"></div>
      <h1 style="margin:0;color:#FFF8E7;font-size:22px;font-weight:700">NutriMind Daily Digest</h1>
      <p style="margin:4px 0 0;color:#FFF8E7;opacity:.6;font-size:13px">${data.date}${data.name ? ` · ${data.name}` : ""}</p>
    </div>
    <div style="padding:24px 28px;space-y:16px">
      <!-- Calories -->
      <div style="background:#FFF0B8;border:1px solid rgba(24,18,14,.12);border-radius:12px;padding:16px 20px;margin-bottom:12px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#6B5738">Calories</p>
        <div style="display:flex;align-items:baseline;gap:8px">
          <span style="font-size:32px;font-weight:700;color:#18120E">${data.calories}</span>
          <span style="font-size:14px;color:#6B5738">/ ${data.target} target</span>
          <span style="margin-left:auto;font-size:13px;font-weight:700;color:${statusColor}">${diffStr} kcal</span>
        </div>
        <div style="margin-top:10px;height:6px;background:rgba(24,18,14,.1);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100, pct)}%;background:${statusColor};border-radius:99px"></div>
        </div>
      </div>
      <!-- Macros -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        ${[["Protein", data.proteinG, "#00C875"], ["Carbs", data.carbsG, "#00C8FF"], ["Fat", data.fatG, "#FF5A3D"]].map(([label, val, color]) => `
        <div style="background:#FFF0B8;border:1px solid rgba(24,18,14,.1);border-radius:10px;padding:12px;text-align:center">
          <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6B5738">${label}</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:${color}">${Math.round(val as number)}g</p>
        </div>`).join("")}
      </div>
      <!-- Bank + Streak -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">
        <div style="background:#18120E;border-radius:10px;padding:12px">
          <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#DFFF35">Bank Balance</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#FFF8E7">${Math.round(data.balance)}</p>
          <p style="margin:2px 0 0;font-size:11px;color:rgba(255,248,231,.5)">kcal available</p>
        </div>
        <div style="background:#FFF0B8;border:1px solid rgba(24,18,14,.1);border-radius:10px;padding:12px">
          <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6B5738">Streak</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#18120E">${data.streak} 🔥</p>
          <p style="margin:2px 0 0;font-size:11px;color:#8A7350">days logged</p>
        </div>
      </div>
      <p style="margin:0;font-size:12px;color:#8A7350;text-align:center">
        You're receiving this because you enabled daily digest in NutriMind settings.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  if (!hasAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usersWithDigest = await prisma.userProfile.findMany({
    where: { emailDigest: true },
    include: {
      user: {
        include: {
          calorieBank: true,
          dailyLogs: {
            orderBy: { date: "desc" },
            take: 2,
          },
        },
      },
    },
  });

  if (!RESEND_API_KEY) {
    return NextResponse.json({
      success: true,
      skipped: usersWithDigest.length,
      reason: "RESEND_API_KEY not set",
    });
  }

  let sent = 0;
  let failed = 0;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);

  for (const profile of usersWithDigest) {
    const email = profile.user.email;
    if (!email) continue;

    const yesterdayLog = profile.user.dailyLogs.find((l) => {
      const d = new Date(l.date);
      d.setUTCHours(0, 0, 0, 0);
      return d.getTime() === yesterday.getTime();
    });

    // Skip users who didn't log anything yesterday
    if (!yesterdayLog || yesterdayLog.caloriesConsumed === 0) continue;

    // Compute streak from recent logs
    const streak = computeStreak(profile.user.dailyLogs.map((l) => l.date));

    const dateStr = yesterday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const html = digestHtml({
      name: profile.user.name ?? "",
      date: dateStr,
      calories: Math.round(yesterdayLog.caloriesConsumed),
      target: Math.round(yesterdayLog.calorieTarget),
      proteinG: yesterdayLog.proteinG,
      carbsG: yesterdayLog.carbsG,
      fatG: yesterdayLog.fatG,
      balance: profile.user.calorieBank?.currentBalance ?? 0,
      streak,
    });

    const result = await sendEmail(email, `Your NutriMind Daily Digest — ${dateStr}`, html);
    if ("error" in result) { failed++; } else { sent++; }
  }

  return NextResponse.json({ success: true, sent, failed, total: usersWithDigest.length });
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates]
    .map((d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x.getTime(); })
    .sort((a, b) => b - a);
  const unique = [...new Set(sorted)];
  let streak = 0;
  const expected = new Date();
  expected.setUTCHours(0, 0, 0, 0);
  expected.setDate(expected.getDate() - 1); // start from yesterday
  for (const ts of unique) {
    if (ts === expected.getTime()) {
      streak++;
      expected.setDate(expected.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
