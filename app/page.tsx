import Link from "next/link";
import { ArrowRight, Banknote, ChartNoAxesCombined, ScanLine, Sparkles } from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "Plain-language logging",
      copy: "Type dinner once. AI structures calories, macros, and micronutrients.",
      Icon: Sparkles,
      color: "#00C875",
    },
    {
      title: "Fast scan flow",
      copy: "Scan a label or barcode and keep moving.",
      Icon: ScanLine,
      color: "#00C8FF",
    },
    {
      title: "Flexible adherence",
      copy: "Under target days build reserves for real life.",
      Icon: Banknote,
      color: "#FF5A3D",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:py-16">
        <section className="max-w-2xl">
          <div className="mb-6 h-2 w-32 rounded-full border border-[#FFF8E7]/20 bg-[linear-gradient(90deg,#DFFF35,#00C875,#00C8FF,#FF5A3D)] shadow-[0_14px_34px_rgba(223,255,53,0.18)]" />
          <h1 className="text-5xl font-semibold leading-[0.96] tracking-[-0.02em] text-[#FFF8E7] sm:text-7xl">
            NutriMind
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#FFF8E7]/78 sm:text-xl">
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

          <div className="mt-12 grid max-w-xl grid-cols-3 divide-x divide-[#FFF8E7]/14 border-y border-[#FFF8E7]/14">
            {[
              ["2,340", "kcal banked"],
              ["14", "day streak"],
              ["-3.2", "kg this month"],
            ].map(([value, label]) => (
              <div key={label} className="py-5 pr-5 first:pl-0 pl-5">
                <p className="num text-2xl font-semibold text-[#FFF8E7]">{value}</p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#DFFF35]/80">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface grid gap-4 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border-2 border-[#18120E] bg-[#18120E] p-5 text-white shadow-[6px_6px_0_#00C8FF]">
              <div className="flex items-center justify-between">
                <Banknote className="h-5 w-5 text-[#DFFF35]" />
                <span className="rounded-full bg-[#DFFF35] px-2 py-0.5 text-xs font-semibold text-[#18120E]">+18%</span>
              </div>
              <p className="mt-10 text-xs uppercase tracking-[0.18em] text-white/45">Calorie Bank</p>
              <p className="num mt-2 text-5xl font-semibold tracking-[-0.05em]">+840</p>
              <p className="mt-2 text-sm text-white/55">available kcal</p>
            </div>
            <div className="rounded-lg border-2 border-[#18120E] bg-[#FFF0B8] p-5 shadow-[4px_4px_0_#18120E]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B5738]">Today</p>
                <ChartNoAxesCombined className="h-4 w-4 text-[#00C875]" />
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="num text-5xl font-semibold tracking-[-0.03em] text-[#18120E]">1,460</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#6B5738]">consumed</p>
                </div>
                <div className="text-right">
                  <p className="num text-3xl font-semibold text-[#00C875]">540</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#6B5738]">remaining</p>
                </div>
              </div>
              <div className="mt-7 h-2 rounded-full bg-black/[0.08]">
                <div className="h-full w-[73%] rounded-full bg-[linear-gradient(90deg,#DFFF35,#00C875)]" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map(({ title, copy, Icon, color }) => (
              <div key={title} className="rounded-lg border-2 border-[#18120E] bg-[#FFF8E7] p-4 shadow-[3px_3px_0_#18120E]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1F`, color }}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-sm font-semibold text-[#18120E]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[#6B5738]">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
