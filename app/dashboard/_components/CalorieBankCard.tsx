"use client";

import { TrendingUp, TrendingDown, Flame } from "lucide-react";

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

function ArcGauge({ percent, positive }: { percent: number; positive: boolean }) {
  const r = 54;
  const cx = 64;
  const cy = 64;
  // Arc from 210deg to 330deg (240deg sweep)
  const startAngle = 210;
  const sweepAngle = 240;
  const endAngle = startAngle + sweepAngle * Math.min(percent / 100, 1);

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const f = (n: number) => Math.round(n * 1e4) / 1e4;
  const arcPath = (start: number, end: number) => {
    const s = { x: f(cx + r * Math.cos(toRad(start))), y: f(cy + r * Math.sin(toRad(start))) };
    const e = { x: f(cx + r * Math.cos(toRad(end))), y: f(cy + r * Math.sin(toRad(end))) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const trackPath = arcPath(startAngle, startAngle + sweepAngle);
  const fillPath = percent > 0 ? arcPath(startAngle, endAngle) : null;

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="mx-auto">
      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke="rgba(20,20,19,0.08)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Fill */}
      {fillPath && (
        <path
          d={fillPath}
          fill="none"
          stroke={positive ? "#7D8A63" : "#B3402F"}
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}
      {/* Center text */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={positive ? "#7D8A63" : "#B3402F"}
        fontSize="20"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="-0.5"
      >
        {positive ? "+" : ""}{Math.abs(Math.round(percent))}%
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#73726C"
        fontSize="9"
        fontWeight="500"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="1.5"
      >
        OF TARGET
      </text>
    </svg>
  );
}

export function CalorieBankCard({ data }: CalorieBankCardProps) {
  const { balance, dailyTarget, totalBanked, totalSpent, currentStreak, maxStreak } = data;

  const balancePercent = (balance / dailyTarget) * 100;
  const isPositive = balance >= 0;
  const streakProgress = maxStreak && maxStreak > 0 ? ((currentStreak || 0) / maxStreak) * 100 : 0;

  return (
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Calorie Bank</span>
        <span className={isPositive ? "chip-green" : "chip-rose"}>
          {isPositive ? "+" : ""}{balance} kcal
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Arc gauge */}
        <ArcGauge percent={Math.abs(balancePercent)} positive={isPositive} />

        {/* Balance hero */}
        <div className="text-center -mt-2">
          <p className={`num-display font-serif text-4xl ${isPositive ? "text-chart-2" : "text-destructive"}`}>
            {isPositive ? "+" : ""}{balance}
            <span className="ml-1 text-base font-normal text-muted-foreground">kcal</span>
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
            {isPositive ? "available" : "overdraft"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-secondary p-3">
            <div className="mb-1 flex items-center gap-1 text-chart-2">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">Banked</span>
            </div>
            <p className="num-display text-lg text-chart-2">+{totalBanked}<span className="ml-0.5 text-xs text-muted-foreground">kcal</span></p>
          </div>
          <div className="rounded-xl border border-border bg-secondary p-3">
            <div className="mb-1 flex items-center gap-1 text-destructive">
              <TrendingDown className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide">Spent</span>
            </div>
            <p className="num-display text-lg text-destructive">-{totalSpent}<span className="ml-0.5 text-xs text-muted-foreground">kcal</span></p>
          </div>
        </div>

        {/* Daily target */}
        <div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="uppercase tracking-wide text-muted-foreground">Daily target</span>
            <span className="tabular-nums text-muted-foreground">{dailyTarget} kcal</span>
          </div>
          <div className="track">
            <div
              className={isPositive ? "track-fill-green" : "track-fill-red"}
              style={{ width: `${Math.min(Math.abs(balancePercent), 100)}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        {currentStreak !== undefined && (
          <div className="rounded-xl border border-border bg-secondary p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Flame className="h-3 w-3" style={{ color: "#C7913B" }} />
                Streak
              </div>
              <span className="num-display text-sm text-foreground">
                {currentStreak}<span className="ml-0.5 text-[10px] text-muted-foreground">/ {maxStreak || 0} days</span>
              </span>
            </div>
            <div className="track">
              <div className="track-fill-amber" style={{ width: `${streakProgress}%` }} />
            </div>
          </div>
        )}

        {/* Tip */}
        <p className="border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">AI · </span>
          {isPositive
            ? `${balance} kcal saved. Consider a treat meal or keep building your reserve.`
            : `Drawing from bank. Aim to stay within target tomorrow to rebuild.`}
        </p>
      </div>
    </div>
  );
}
