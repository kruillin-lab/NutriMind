import type { ReactNode } from "react";
import Link from "next/link";

interface AuthFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthFrame({ eyebrow, title, description, children }: AuthFrameProps) {
  return (
    <div className="bg-hero min-h-screen px-4 py-10 sm:px-8 lg:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-20">
        <section aria-labelledby="reserve-access-title" className="max-w-xl">
          <Link href="/" className="inline-flex items-center gap-3 text-foreground">
            <span className="seal h-10 w-10 text-[10px] font-bold tracking-tight">NM</span>
            <span className="text-base font-bold tracking-[-0.02em]">NutriMind</span>
          </Link>

          <p className="smallcaps mt-14 text-foreground">{eyebrow}</p>
          <h1
            id="reserve-access-title"
            className="mt-4 max-w-lg text-[clamp(2.5rem,6vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.035em] text-foreground"
          >
            {title}
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-muted-foreground">
            {description}
          </p>

          <dl className="mt-10 grid max-w-lg gap-px border border-border bg-border sm:grid-cols-3">
            {[
              ["01", "Private ledger"],
              ["02", "Daily reserve"],
              ["03", "Clear history"],
            ].map(([number, label]) => (
              <div key={number} className="bg-card px-4 py-4">
                <dt className="num text-sm font-semibold text-foreground">{number}</dt>
                <dd className="smallcaps mt-2">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Account form" className="w-full">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <span className="smallcaps">Secure account desk</span>
            <span className="num text-xs text-muted-foreground">NM / 2026</span>
          </div>
          {children}
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            Your nutrition records remain attached to your private NutriMind account.
          </p>
        </section>
      </div>
    </div>
  );
}
