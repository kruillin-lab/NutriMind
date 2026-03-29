"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown } from "lucide-react";

interface CalorieBankData {
  balance: number;
  dailyTarget: number;
  totalBanked: number;
  totalSpent: number;
  currentStreak?: number;
  maxStreak?: number;
}

interface CalorieBankCardProps {
  data: CalorieBankData;
}

export function CalorieBankCard({ data }: CalorieBankCardProps) {
  const {
    balance,
    dailyTarget,
    totalBanked,
    totalSpent,
    currentStreak,
    maxStreak,
  } = data;

  const balancePercent = Math.min(
    Math.max((balance / dailyTarget) * 100, 0),
    100
  );

  const isPositive = balance >= 0;
  const streakProgress = (maxStreak && maxStreak > 0) ? ((currentStreak || 0) / maxStreak) * 100 : 0;

  return (
    <Card className="relative overflow-hidden">
      {/* Background gradient based on balance */}
      <div
        className={`absolute inset-0 opacity-5 ${
          isPositive ? "bg-gradient-to-br from-green-500" : "bg-gradient-to-br from-red-500"
        }`}
      />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5 text-primary" />
            Calorie Bank
          </CardTitle>
          <Badge
            variant={isPositive ? "default" : "destructive"}
            className="font-mono"
          >
            {isPositive ? "+" : ""}
            {balance} kcal
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Balance Display */}
        <div className="text-center">
          <div className="text-4xl font-bold tracking-tight">
            <span className={isPositive ? "text-green-600" : "text-red-600"}>
              {isPositive ? "+" : ""}
              {balance}
            </span>
            <span className="text-lg text-muted-foreground ml-1">kcal</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Available to spend
          </p>
        </div>

        {/* Balance Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Daily Target</span>
            <span className="font-medium">{dailyTarget} kcal</span>
          </div>
          <Progress
            value={balancePercent}
            className={`h-2 ${isPositive ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"}`}
          />
          <p className="text-xs text-muted-foreground text-center">
            {isPositive
              ? `${Math.round((balance / dailyTarget) * 100)}% of daily target banked`
              : `Using ${Math.abs(Math.round((balance / dailyTarget) * 100))}% from bank`}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              Total Banked
            </div>
            <p className="text-lg font-semibold text-green-600">
              +{totalBanked} kcal
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              Total Spent
            </div>
            <p className="text-lg font-semibold text-red-600">
              -{totalSpent} kcal
            </p>
          </div>
        </div>

        {/* Streak Indicator */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Streak</span>
            <span className="font-medium">{currentStreak || 0} days</span>
          </div>
          <Progress value={streakProgress} className="h-1 mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Best: {maxStreak || 0} days
          </p>
        </div>

        {/* AI Recommendation */}
        <div className="bg-primary/5 rounded-lg p-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-primary">AI Tip:</span>{" "}
            {isPositive
              ? `You have ${balance} calories saved. Consider using them for a treat meal or save for the weekend!`
              : `You're using banked calories. Try to stay within tomorrow's target to rebuild your balance.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
