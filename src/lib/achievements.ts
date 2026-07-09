import { prisma } from "@/src/lib/prisma";

interface BadgeDef {
  type: string;
  title: string;
  description: string;
  icon: string;
}

const BADGES: BadgeDef[] = [
  { type: "first_meal", icon: "🍽️", title: "First Bite", description: "Logged your first meal" },
  { type: "streak_3", icon: "🔥", title: "On a Roll", description: "3-day logging streak" },
  { type: "streak_7", icon: "🔥", title: "Week Warrior", description: "7-day logging streak" },
  { type: "streak_14", icon: "🔥", title: "Fortnight Force", description: "14-day logging streak" },
  { type: "streak_30", icon: "🏅", title: "Habit Hero", description: "30-day logging streak" },
  { type: "banked_100", icon: "💰", title: "Saver", description: "Banked 100+ total calories" },
  { type: "banked_1000", icon: "💰", title: "Big Saver", description: "Banked 1,000+ total calories" },
  { type: "banked_10000", icon: "🏦", title: "Calorie Millionaire", description: "Banked 10,000+ total calories" },
  { type: "first_weight", icon: "⚖️", title: "Weighed In", description: "Logged your first weight entry" },
  { type: "weight_loss_1kg", icon: "📉", title: "1 kg Down", description: "Lost 1 kg from starting weight" },
  { type: "weight_loss_5kg", icon: "📉", title: "5 kg Down", description: "Lost 5 kg from starting weight" },
  { type: "weight_loss_10kg", icon: "🏆", title: "10 kg Down", description: "Lost 10 kg from starting weight" },
  { type: "meals_50", icon: "🍱", title: "Dedicated Logger", description: "Logged 50 meals total" },
  { type: "meals_200", icon: "🍱", title: "Meal Master", description: "Logged 200 meals total" },
  { type: "water_goal", icon: "💧", title: "Hydration Hero", description: "Hit 2L water in a single day" },
];

const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.type, b]));

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      calorieBank: true,
      weightEntries: { orderBy: { date: "asc" } },
      dailyLogs: {
        orderBy: { date: "desc" },
        include: { meals: { select: { id: true } } },
      },
      achievements: { select: { type: true } },
    },
  });

  if (!user) return [];

  const already = new Set(user.achievements.map((a) => a.type));
  const earned: string[] = [];

  function candidate(type: string) {
    return !already.has(type) && BADGE_MAP[type];
  }

  // first_meal
  const totalMeals = user.dailyLogs.reduce((s, l) => s + l.meals.length, 0);
  if (candidate("first_meal") && totalMeals >= 1) earned.push("first_meal");

  // meals_50, meals_200
  if (candidate("meals_50") && totalMeals >= 50) earned.push("meals_50");
  if (candidate("meals_200") && totalMeals >= 200) earned.push("meals_200");

  // streaks
  const streak = computeStreak(user.dailyLogs.map((l) => l.date));
  for (const [type, threshold] of [["streak_3", 3], ["streak_7", 7], ["streak_14", 14], ["streak_30", 30]] as const) {
    if (candidate(type) && streak >= threshold) earned.push(type);
  }

  // bank milestones
  const totalBanked = user.calorieBank?.totalBanked ?? 0;
  if (candidate("banked_100") && totalBanked >= 100) earned.push("banked_100");
  if (candidate("banked_1000") && totalBanked >= 1000) earned.push("banked_1000");
  if (candidate("banked_10000") && totalBanked >= 10000) earned.push("banked_10000");

  // weight milestones
  const weights = user.weightEntries;
  if (candidate("first_weight") && weights.length >= 1) earned.push("first_weight");

  if (weights.length >= 2) {
    const first = weights[0].weightKg;
    const latest = weights[weights.length - 1].weightKg;
    const lost = first - latest;
    if (candidate("weight_loss_1kg") && lost >= 1) earned.push("weight_loss_1kg");
    if (candidate("weight_loss_5kg") && lost >= 5) earned.push("weight_loss_5kg");
    if (candidate("weight_loss_10kg") && lost >= 10) earned.push("weight_loss_10kg");
  }

  // water goal
  const hitWater = user.dailyLogs.some((l) => l.waterMl >= 2000);
  if (candidate("water_goal") && hitWater) earned.push("water_goal");

  // Award all at once
  if (earned.length > 0) {
    for (const type of earned) {
      await prisma.achievement.upsert({
        where: { userId_type: { userId, type } },
        create: {
          userId, type,
          title: BADGE_MAP[type].title,
          description: BADGE_MAP[type].description,
          icon: BADGE_MAP[type].icon,
        },
        update: {},
      });
    }
  }

  return earned;
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(
    dates.map((d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x.getTime(); })
  )].sort((a, b) => b - a);

  let streak = 0;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  let expected = today.getTime();

  for (const ts of unique) {
    if (ts === expected) {
      streak++;
      expected -= 86400000;
    } else if (ts < expected) {
      break;
    }
  }
  return streak;
}

export { BADGES };
