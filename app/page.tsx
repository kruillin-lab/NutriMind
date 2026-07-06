import Link from "next/link";
import { ArrowRight, Banknote, ChartNoAxesCombined, ScanLine, Sparkles } from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "Plain-language logging",
      copy: "Type dinner once. AI structures calories, macros, and micronutrients.",
      Icon: Sparkles,
    },
    {
      title: "Fast scan flow",
      copy: "Scan a label or barcode and keep moving.",
      Icon: ScanLine,
    },
    {
      title: "Flexible adherence",
      copy: "Under target days build reserves for real life.",
      Icon: Banknote,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
          <section className="max-w-2xl">
            <span className="pill mb-6">
              <Sparkles className="h-3 w-3 text-primary" />
              AI-powered nutrition
            </span>
            <h1 className="font-serif text-5xl leading-[1.02] text-foreground sm:text-7xl">
              NutriMind
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              A nutrition command center that turns plain-language meals into useful daily decisions, with a Calorie Bank that makes consistency more flexible.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" data-testid="get-started-button" className="btn-primary gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sign-in" data-testid="sign-in-button" className="btn-ghost">
                Sign In
              </Link>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 divide-x divide-border border-y border-border">
              {[
                ["2,340", "kcal banked"],
                ["14", "day streak"],
                ["-3.2", "kg this month"],
              ].map(([value, label]) => (
                <div key={label} className="py-5 pl-5 pr-5 first:pl-0">
                  <p className="num text-2xl font-semibold text-foreground">{value}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface grid gap-4 p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center justify-between">
                  <Banknote className="h-5 w-5 text-primary" />
                  <span className="chip-green">+18%</span>
                </div>
                <p className="mt-10 text-xs uppercase tracking-wide text-muted-foreground">Calorie Bank</p>
                <p className="num-display mt-2 text-5xl text-primary">+840</p>
                <p className="mt-2 text-sm text-muted-foreground">available kcal</p>
              </div>
              <div className="surface-raised p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
                  <ChartNoAxesCombined className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="num-display text-5xl text-foreground">1,460</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">consumed</p>
                  </div>
                  <div className="text-right">
                    <p className="num text-3xl font-semibold text-chart-2">540</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">remaining</p>
                  </div>
                </div>
                <div className="track-lg mt-7">
                  <div className="fill-green w-[73%]" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {features.map(({ title, copy, Icon }) => (
            <div key={title} className="surface p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
