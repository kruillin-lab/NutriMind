"use client";

interface CalorieBankData {
  balance: number;
  dailyTarget: number;
  consumedCalories: number;
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
    consumedCalories,
    totalBanked,
    totalSpent,
    currentStreak = 0,
  } = data;
  const isPositive = balance >= 0;
  const dailyRemaining = dailyTarget - consumedCalories;
  const isDailyOver = dailyRemaining < 0;

  return (
    <section aria-labelledby="reserve-account-heading" className="surface overflow-hidden">
      <div className="foil" />
      <div className="px-5 pb-5 pt-5 sm:px-7 sm:pb-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="page-kicker">Reserve account</p>
            <h2 id="reserve-account-heading" className="mt-1 text-lg font-semibold text-foreground">
              Banked calorie balance
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Calories saved on earlier days, available when you need flexibility.
            </p>
          </div>
          <span className="seal ml-4 h-11 w-11 shrink-0 text-[9px] font-bold" aria-hidden="true">
            kcal
          </span>
        </div>

        {/* Hero numeral — the screen's one display moment */}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4">
          <p
            className={`num-display text-[clamp(3.25rem,7vw,5.5rem)] leading-[1.02] ${
              isPositive ? "text-foreground" : "text-destructive"
            }`}
          >
            {isPositive ? "+" : "−"}
            {Math.abs(balance).toLocaleString()}
          </p>
          <p className="smallcaps pb-2">
            kcal {isPositive ? "in reserve" : "overdrawn"}
          </p>
        </div>

        {/* Double rule — statement total */}
        <p className="mt-4 max-w-xl text-[15px] leading-[1.6] text-muted-foreground">
          {isPositive
            ? "Your reserve grows when a completed day lands below its calorie target."
            : `Your reserve is overdrawn. Finishing below ${dailyTarget.toLocaleString()} kcal helps rebuild it.`}
        </p>
      </div>

      <dl className="metric-strip grid-cols-2 border-x-0 border-b-0 sm:grid-cols-4">
        <div className="metric-cell">
          <dt className="smallcaps">Daily allocation</dt>
          <dd className="num-display mt-1 text-lg text-foreground">
            {dailyTarget.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">kcal</span>
          </dd>
        </div>
        <div className="metric-cell">
          <dt className="smallcaps">Logged today</dt>
          <dd className="num-display mt-1 text-lg text-foreground">
            {consumedCalories.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">kcal</span>
          </dd>
        </div>
        <div className="metric-cell">
          <dt className="smallcaps">{isDailyOver ? "Over today" : "Left today"}</dt>
          <dd className={`num-display mt-1 text-lg ${isDailyOver ? "text-destructive" : "text-foreground"}`}>
            {isDailyOver ? "−" : "+"}{Math.abs(dailyRemaining).toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">kcal</span>
          </dd>
        </div>
        <div className="metric-cell">
          <dt className="smallcaps">Logging streak</dt>
          <dd className="num-display mt-1 text-lg text-foreground">
            {currentStreak} <span className="text-xs font-normal text-muted-foreground">days</span>
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3 sm:px-7">
        <span className="chip-green">Banked +{totalBanked.toLocaleString()}</span>
        <span className="chip-rose">Used −{totalSpent.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">Lifetime reserve activity</span>
      </div>
    </section>
  );
}
