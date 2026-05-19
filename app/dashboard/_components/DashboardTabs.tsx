"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalorieBankCard } from "./CalorieBankCard";
import { DailySummaryClient } from "./DailySummaryClient";
import { QuickLogClient } from "./QuickLogClient";
import { ExerciseLog } from "./ExerciseLog";
import { WeightTracker } from "./WeightTracker";
import { BankTransactionHistory } from "./BankTransactionHistory";
import { WeeklyView } from "./WeeklyView";
import { MealTemplatesWrapper } from "./MealTemplatesWrapper";
import { DailyJournal } from "./DailyJournal";
import BodyMeasurements from "./BodyMeasurements";
import MicronutrientTrends from "./MicronutrientTrends";
import FoodDatabaseSearch from "./FoodDatabaseSearch";
import MealPlanner from "./MealPlanner";
import { ProgressPhotos } from "./ProgressPhotos";
import { QuickWeightLog } from "./QuickWeightLog";
import { AchievementBadges } from "./AchievementBadges";
import { GroceryList } from "./GroceryList";
import { RecipeBuilder } from "./RecipeBuilder";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  vitaminCMg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
  loggedAt: Date;
}

interface Transaction {
  id: string;
  type: "BANK" | "SPEND" | "ADJUST" | "EXPIRE";
  amount: number;
  reason: string;
  caloriesConsumed: number | null;
  caloriesTarget: number | null;
  sourceType: string | null;
  createdAt: string;
}

interface WeightEntry {
  id: string;
  weightKg: number;
  date: Date;
  source?: string;
}

interface DashboardTabsProps {
  userId: string;
  dailyTarget: number;
  consumedCalories: number;
  meals: Meal[];
  waterIntake: number;
  calorieBank: {
    currentBalance: number;
    totalBanked: number;
    totalSpent: number;
    proteinTargetG?: number;
    carbsTargetG?: number;
    fatTargetG?: number;
  } | null;
  recentTransactions: Transaction[];
  weightEntries: WeightEntry[];
  todayWeightEntry: WeightEntry | null;
  previousWeightEntry: WeightEntry | null;
  currentStreak: number;
  maxStreak: number;
  todayLog: {
    exerciseMinutes?: number;
    caloriesBurned?: number;
  } | null;
}

export function DashboardTabs({
  userId,
  dailyTarget,
  consumedCalories,
  meals,
  waterIntake,
  calorieBank,
  recentTransactions,
  weightEntries,
  todayWeightEntry,
  previousWeightEntry,
  currentStreak,
  maxStreak,
  todayLog,
}: DashboardTabsProps) {
  return (
    <Tabs defaultValue="today" className="w-full">
      <TabsList className="mb-6 flex h-auto w-full justify-start gap-1 rounded-lg border-2 border-[#18120E] bg-[#FFF8E7] p-1 shadow-[5px_5px_0_#18120E] backdrop-blur sm:w-auto">
        {[
          { value: "today", label: "Today" },
          { value: "trends", label: "Trends" },
          { value: "planning", label: "Planning" },
          { value: "body", label: "Body" },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="relative rounded-md border border-transparent bg-transparent px-4 py-2 text-sm font-semibold text-[#6B5738] transition-colors hover:bg-[#FFF0B8] hover:text-[#18120E] data-[state=active]:border-[#18120E] data-[state=active]:bg-[#DFFF35] data-[state=active]:text-[#18120E] data-[state=active]:shadow-[2px_2px_0_#18120E]"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* TODAY — all the important stuff */}
      <TabsContent value="today" className="mt-0">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <CalorieBankCard
              data={{
                balance: calorieBank?.currentBalance || 0,
                dailyTarget,
                totalBanked: calorieBank?.totalBanked || 0,
                totalSpent: calorieBank?.totalSpent || 0,
                currentStreak,
                maxStreak,
              }}
            />
          </div>

          <div className="lg:col-span-5">
            <DailySummaryClient
              targetCalories={dailyTarget}
              initialConsumedCalories={consumedCalories}
              initialMeals={meals}
              initialWaterIntake={waterIntake}
              waterTarget={2500}
              userId={userId}
              macroTargets={{
                proteinG: calorieBank?.proteinTargetG || 0,
                carbsG: calorieBank?.carbsTargetG || 0,
                fatG: calorieBank?.fatTargetG || 0,
              }}
              bankBalance={calorieBank?.currentBalance || 0}
            />
          </div>

          <div className="lg:col-span-4">
            <QuickLogClient userId={userId} />
          </div>
        </div>

        {/* Row 2: Bank history + Weight log */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BankTransactionHistory transactions={recentTransactions} />
          <QuickWeightLog
            todayEntry={todayWeightEntry}
            previousEntry={previousWeightEntry}
          />
        </div>

        {/* Row 3: Food database search */}
        <div className="mt-4">
          <FoodDatabaseSearch />
        </div>
      </TabsContent>

      {/* TRENDS */}
      <TabsContent value="trends" className="mt-0 space-y-4">
        <WeeklyView dailyTarget={dailyTarget} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WeightTracker initialEntries={weightEntries} />
          <ExerciseLog
            initialExerciseMinutes={todayLog?.exerciseMinutes || 0}
            initialCaloriesBurned={todayLog?.caloriesBurned || 0}
          />
        </div>
        <MicronutrientTrends />
      </TabsContent>

      {/* PLANNING */}
      <TabsContent value="planning" className="mt-0 space-y-4">
        <MealTemplatesWrapper />
        <RecipeBuilder />
        <GroceryList />
        <MealPlanner />
      </TabsContent>

      {/* BODY */}
      <TabsContent value="body" className="mt-0 space-y-4">
        <AchievementBadges />
        <DailyJournal />
        <BodyMeasurements />
        <ProgressPhotos />
      </TabsContent>
    </Tabs>
  );
}
