import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { checkAndAwardAchievements, BADGES } from "@/src/lib/achievements";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const unlocked = await prisma.achievement.findMany({
    where: { userId: user.id },
    orderBy: { unlockedAt: "desc" },
  });

  return NextResponse.json({ success: true, achievements: unlocked, allBadges: BADGES });
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newlyEarned = await checkAndAwardAchievements(user.id);
  return NextResponse.json({ success: true, newlyEarned });
}
