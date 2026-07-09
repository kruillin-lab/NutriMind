import Link from "next/link";

const STATEMENT = [
  { date: "30 JUN", note: "Under target", ref: "DEP", amount: "+220", balance: "1,760" },
  { date: "01 JUL", note: "Under target", ref: "DEP", amount: "+140", balance: "1,900" },
  { date: "02 JUL", note: "Dinner out", ref: "WDL", amount: "−380", balance: "1,520" },
  { date: "03 JUL", note: "Under target", ref: "DEP", amount: "+180", balance: "1,700" },
  { date: "04 JUL", note: "Under target", ref: "DEP", amount: "+160", balance: "1,860" },
  { date: "05 JUL", note: "Birthday cake", ref: "WDL", amount: "−120", balance: "1,740" },
] as const;

const TERMS = [
  {
    n: "01",
    title: "Deposits in plain language",
    copy: "State a meal the way you'd say it aloud. The teller reads the sentence and posts calories, protein, carbs, and fat to the day's account.",
  },
  {
    n: "02",
    title: "Scan to draft an entry",
    copy: "Present a barcode or a nutrition label. The entry is drafted for your signature — confirm and it clears.",
  },
  {
    n: "03",
    title: "Interest on restraint",
    copy: "Every day under target is deposited to reserve. Draw it down deliberately — a dinner out, a slice of cake — and the ledger keeps the balance.",
  },
] as const;

export default function Home() {
  return (
    <div className="bg-hero flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8">
        {/* Hero — masthead left, statement right */}
        <section className="grid gap-14 pt-16 lg:grid-cols-12 lg:gap-12 lg:pt-24">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-3">
              <span className="seal h-9 w-9 text-[10px] font-bold tracking-tight">NM</span>
              <span className="page-kicker">
                Nutrition, accounted for
              </span>
            </div>

            <h1 className="mt-8 text-[clamp(2.5rem,5.6vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.03em] text-foreground">
              Your calorie account,
              <br />
              built for real life.
            </h1>

            <p className="mt-7 max-w-md text-[15px] leading-[1.65] text-muted-foreground">
              Allocate today&apos;s calories, log what you actually eat, and carry
              unused energy into a flexible reserve. NutriMind turns nutrition
              into a clear account—not another guilt-driven streak.
            </p>

            <div className="mt-10 flex items-center gap-7">
              <Link href="/sign-up" data-testid="get-started-button" className="btn-primary">
                Open an account
              </Link>
              <Link
                href="/sign-in"
                data-testid="sign-in-button"
                className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground underline decoration-[var(--brass)] underline-offset-[6px] transition-colors hover:text-[var(--brass-ink)]"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-12 grid max-w-md grid-cols-3 gap-px overflow-hidden border border-border bg-border">
              {[
                { k: "Available reserve", v: "1,740" },
                { k: "Net this month", v: "+680" },
                { k: "Consistent days", v: "14" },
              ].map((s) => (
                <div key={s.k} className="bg-card px-4 py-3">
                  <p className="num-display text-xl text-foreground">{s.v}</p>
                  <p className="smallcaps mt-1">{s.k}</p>
                </div>
              ))}
            </div>
          </div>

          {/* The statement */}
          <div className="lg:col-span-6">
            <div className="surface overflow-hidden">
              <div className="foil" />
              <div className="flex items-start justify-between px-6 pt-5">
                <div>
                  <p className="text-sm font-bold tracking-tight text-foreground">Calorie Reserve Account</p>
                  <p className="smallcaps mt-1">Statement &middot; No. 0007</p>
                </div>
                <span className="seal h-10 w-10 text-[9px] font-bold">kcal</span>
              </div>

              <div className="mt-5 flex items-baseline justify-between border-y border-border bg-secondary px-6 py-3">
                <span className="smallcaps">Balance forward</span>
                <span className="num text-sm text-foreground">1,540</span>
              </div>

              <div className="grid grid-cols-[3.5rem_1fr_3.5rem_4rem] gap-x-3 px-6 pt-3 pb-1">
                <span className="smallcaps">Date</span>
                <span className="smallcaps">Memo</span>
                <span className="smallcaps text-right">Amt</span>
                <span className="smallcaps text-right">Bal</span>
              </div>

              <div className="px-6">
                {STATEMENT.map((e) => (
                  <div
                    key={e.date + e.note}
                    className="grid grid-cols-[3.5rem_1fr_3.5rem_4rem] items-baseline gap-x-3 border-t border-border py-2.5"
                  >
                    <span className="num text-xs text-muted-foreground">{e.date}</span>
                    <span className="truncate text-sm text-foreground">
                      {e.note}
                      <span className="ml-2 text-[10px] tracking-wider text-muted-foreground">{e.ref}</span>
                    </span>
                    <span
                      className="num text-right text-sm"
                      style={{ color: e.ref === "DEP" ? "var(--ledger-green)" : "var(--ledger-red)" }}
                    >
                      {e.amount}
                    </span>
                    <span className="num text-right text-sm text-foreground">{e.balance}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-baseline justify-between border-t-2 border-foreground bg-secondary px-6 py-4">
                <span className="smallcaps">Balance carried</span>
                <span className="num-display text-2xl text-foreground">1,740</span>
              </div>
              <p className="px-6 py-3 text-[10px] tracking-wide text-muted-foreground">
                Authorized under the NutriMind Reserve. Balances denominated in kilocalories.
              </p>
            </div>
          </div>
        </section>

        {/* Terms — numbered statement clauses */}
        <section className="mt-24 lg:mt-32">
          <div className="foil w-full" />
          <p className="smallcaps mt-4">Terms of account</p>
          <div className="mt-6">
            {TERMS.map((t) => (
              <div key={t.n} className="grid gap-3 border-t border-border py-8 md:grid-cols-12 md:gap-10">
                <p className="num accent-text text-sm font-semibold md:col-span-1">
                  {t.n}
                </p>
                <h2 className="text-2xl font-bold tracking-[-0.02em] leading-snug text-foreground md:col-span-4">
                  {t.title}
                </h2>
                <p className="max-w-xl text-[15px] leading-[1.65] text-muted-foreground md:col-span-7">
                  {t.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface mt-20 overflow-hidden lg:mt-28" aria-labelledby="account-promise">
          <div className="foil" />
          <div className="grid gap-10 px-6 py-10 md:grid-cols-12 md:px-10 md:py-12">
            <div className="md:col-span-7">
              <p className="page-kicker">One account. No moral score.</p>
              <h2 id="account-promise" className="mt-4 max-w-xl text-3xl font-bold leading-tight tracking-[-0.025em] text-foreground sm:text-4xl">
                See the tradeoffs, then choose the meal.
              </h2>
              <p className="mt-5 max-w-xl text-[15px] leading-[1.7] text-muted-foreground">
                Your daily allocation, nutrition totals, exercise credits, and
                calorie reserve reconcile in one ledger. Nothing is hidden
                behind a score—and a single dinner never becomes a failed week.
              </p>
            </div>
            <div className="md:col-span-5">
              <div className="metric-strip grid-cols-2">
                <div className="metric-cell">
                  <p className="page-kicker">Daily allocation</p>
                  <p className="num-display mt-3 text-2xl text-foreground">2,000 kcal</p>
                </div>
                <div className="metric-cell">
                  <p className="page-kicker">Reserve policy</p>
                  <p className="mt-3 text-sm font-semibold text-foreground">You decide</p>
                </div>
              </div>
              <Link href="/sign-up" className="btn-primary mt-5 w-full">
                Create your reserve account
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="mt-16 flex flex-wrap items-baseline justify-between gap-4 border-t border-border py-6">
          <p className="smallcaps">NutriMind Reserve &middot; MMXXVI</p>
          <div className="flex gap-8">
            <Link href="/sign-in" className="smallcaps transition-colors hover:text-[var(--brass-ink)]">
              Sign in
            </Link>
            <Link href="/sign-up" className="smallcaps transition-colors hover:text-[var(--brass-ink)]">
              Open an account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
