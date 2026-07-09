"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
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

const DASHBOARD_VIEWS = ["today", "trends", "planning", "body"] as const;
type DashboardView = (typeof DASHBOARD_VIEWS)[number];

function isDashboardView(value: string | null): value is DashboardView {
  return DASHBOARD_VIEWS.includes(value as DashboardView);
}

function ViewIntroduction({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 max-w-2xl">
      <p className="page-kicker">{kicker}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[15px]">{description}</p>
    </header>
  );
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
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const activeView: DashboardView = isDashboardView(requestedView) ? requestedView : "today";

  const handleViewChange = (view: string) => {
    if (!isDashboardView(view)) return;

    const params = new URLSearchParams(searchParams.toString());
    if (view === "today") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    const query = params.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
  };

  return (
    <Tabs value={activeView} onValueChange={handleViewChange} className="w-full gap-0">
      <TabsList aria-label="Account overview sections" className="mb-10 flex h-auto w-full items-end justify-start gap-7 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 sm:gap-9">
        {[
          { value: "today", label: "Today" },
          { value: "trends", label: "Trends" },
          { value: "planning", label: "Planning" },
          { value: "body", label: "Body" },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="smallcaps -mb-px flex-none rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-1 transition-colors hover:text-foreground data-[state=active]:border-[var(--brass)] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="today" className="mt-0" aria-label="Today account overview">
        <ViewIntroduction
          kicker="Today"
          title="Your daily nutrition position"
          description="See your saved calorie reserve, record what you ate, then review the numbers behind today."
        />
        <CalorieBankCard
          data={{
            balance: calorieBank?.currentBalance || 0,
            dailyTarget,
            consumedCalories,
            totalBanked: calorieBank?.totalBanked || 0,
            totalSpent: calorieBank?.totalSpent || 0,
            currentStreak,
            maxStreak,
          }}
        />

        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-12 lg:items-start xl:gap-x-14">
          <div className="contents lg:col-span-7 lg:block lg:space-y-10">
            <div className="order-2 lg:order-none">
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
              currentStreak={currentStreak}
              maxStreak={maxStreak}
            />
            </div>
            <div className="order-4 lg:order-none">
              <BankTransactionHistory
                transactions={recentTransactions}
                currentBalance={calorieBank?.currentBalance || 0}
              />
            </div>
          </div>

          <div className="contents lg:col-span-5 lg:block lg:space-y-8">
            <div className="order-1 lg:order-none">
            <QuickLogClient userId={userId} />
            </div>
            <div className="order-3 lg:order-none">
            <QuickWeightLog
              todayEntry={todayWeightEntry}
              previousEntry={previousWeightEntry}
            />
            </div>
          </div>
        </div>

        <div className="mt-14">
          <FoodDatabaseSearch />
        </div>
      </TabsContent>

      {/* TRENDS */}
      <TabsContent value="trends" className="mt-0" aria-label="Nutrition trends">
        <ViewIntroduction
          kicker="Trends"
          title="Nutrition performance"
          description="Compare calorie intake, weight, movement, and micronutrients over time. These are health trends—not financial returns."
        />
        <WeeklyView dailyTarget={dailyTarget} />
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
          <WeightTracker initialEntries={weightEntries} />
          </div>
          <div className="lg:col-span-5">
          <ExerciseLog
            initialExerciseMinutes={todayLog?.exerciseMinutes || 0}
            initialCaloriesBurned={todayLog?.caloriesBurned || 0}
          />
          </div>
        </div>
        <div className="mt-8"><MicronutrientTrends /></div>
      </TabsContent>

      {/* PLANNING */}
      <TabsContent value="planning" className="mt-0" aria-label="Meal planning">
        <ViewIntroduction
          kicker="Planning"
          title="Plan your allocation"
          description="Set up reusable meals and future food plans so your calorie target supports real life."
        />
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-start">
          <div className="xl:col-span-5"><MealTemplatesWrapper /></div>
          <div className="xl:col-span-7"><RecipeBuilder /></div>
          <div className="xl:col-span-5"><GroceryList /></div>
          <div className="xl:col-span-7"><MealPlanner /></div>
        </div>
      </TabsContent>

      {/* BODY */}
      <TabsContent value="body" className="mt-0" aria-label="Body and health records">
        <ViewIntroduction
          kicker="Body"
          title="Health records"
          description="Keep private notes, measurements, and progress photos alongside your nutrition history."
        />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-12"><AchievementBadges /></div>
          <div className="lg:col-span-5"><DailyJournal /></div>
          <div className="lg:col-span-7"><BodyMeasurements /></div>
          <div className="lg:col-span-12"><ProgressPhotos /></div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
