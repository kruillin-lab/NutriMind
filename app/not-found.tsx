import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-hero flex min-h-[calc(100vh-4rem)] items-center justify-center px-5 py-16">
      <section className="surface w-full max-w-xl overflow-hidden" aria-labelledby="not-found-title">
        <div className="foil" />
        <div className="p-8 sm:p-10">
          <p className="page-kicker">Statement exception · 404</p>
          <h1 id="not-found-title" className="mt-4 text-3xl font-bold tracking-[-0.025em] text-foreground">
            No account entry at this address
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            The page may have moved, but your calorie reserve and nutrition ledger are unchanged.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary">Return to overview</Link>
            <Link href="/" className="btn-ghost">Go home</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
