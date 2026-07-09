import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  recalcMetabolism,
  recommendDailyTarget,
  IntakeSample,
  WeightSample,
} from "@/src/lib/metabolic";

const CRON_SECRET = process.env.CRON_SECRET;
const LOOKBACK_DAYS = 21;

export async function POST(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authHeader = req.headers.get("authorization");
  const hasValidSecret = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lookbackStart = new Date();
  lookbackStart.setUTCHours(0, 0, 0, 0);
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - LOOKBACK_DAYS);

  type ResultRow = {
    userId: string;
    recalc: ReturnType<typeof recalcMetabolism>;
    targetChange?: { from: number; to: number };
  };
  const results: ResultRow[] = [];

  try {
    const users = await prisma.user.findMany({
      where: { metabolicProfile: { isNot: null } },
      include: {
        metabolicProfile: true,
        calorieBank: true,
        profile: true,
        weightEntries: {
          where: { date: { gte: lookbackStart } },
          orderBy: { date: "asc" },
        },
        dailyLogs: {
          where: { date: { gte: lookbackStart } },
          select: { date: true, caloriesConsumed: true },
        },
      },
    });

    for (const user of users) {
      const metabolic = user.metabolicProfile;
      if (!metabolic) continue;

      const weights: WeightSample[] = user.weightEntries.map((e) => ({
        date: e.date,
        weightKg: e.weightKg,
      }));
      const intake: IntakeSample[] = user.dailyLogs.map((l) => ({
        date: l.date,
        caloriesConsumed: l.caloriesConsumed,
      }));

      const recalc = recalcMetabolism({
        weights,
        intake,
        currentTMR: metabolic.trueMetabolicRate,
        bmrEstimate: metabolic.bmrEstimate,
        predictionsMade: metabolic.predictionsMade,
        predictionsCorrect: metabolic.predictionsCorrect,
      });

      if (!recalc.applied) {
        results.push({ userId: user.id, recalc });
        continue;
      }

      await prisma.metabolicProfile.update({
        where: { userId: user.id },
        data: {
          trueMetabolicRate: recalc.newTMR!,
          adaptiveFactor: recalc.adaptiveFactor!,
          predictionsMade: recalc.predictionsMade!,
          predictionsCorrect: recalc.predictionsCorrect!,
          predictionAccuracy: recalc.predictionAccuracy!,
          lastCalculatedAt: new Date(),
          calculationMethod: "adaptive_v1",
        },
      });

      let targetChange: ResultRow["targetChange"] | undefined;
      const bank = user.calorieBank;
      if (bank && bank.autoAdjustTarget) {
        const currentWeight = weights[weights.length - 1]?.weightKg;
        if (currentWeight != null) {
          const recommendation = recommendDailyTarget({
            trueMetabolicRate: recalc.newTMR!,
            currentDailyTarget: bank.dailyTarget,
            currentWeightKg: currentWeight,
            goalWeightKg: user.profile?.goalWeightKg ?? null,
            predictionAccuracy: recalc.predictionAccuracy!,
            predictionsMade: recalc.predictionsMade!,
          });

          if (recommendation.applied) {
            await prisma.calorieBank.update({
              where: { id: bank.id },
              data: { dailyTarget: recommendation.newDailyTarget! },
            });
            targetChange = {
              from: bank.dailyTarget,
              to: recommendation.newDailyTarget!,
            };
          }
        }
      }

      results.push({ userId: user.id, recalc, targetChange });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      adjusted: results.filter((r) => r.targetChange).length,
      results,
    });
  } catch (error) {
    console.error("Error recalculating metabolism:", error);
    return NextResponse.json(
      { error: "Failed to recalculate metabolism" },
      { status: 500 }
    );
  }
}
