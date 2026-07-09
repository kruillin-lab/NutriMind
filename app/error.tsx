"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-hero flex min-h-screen items-center justify-center px-4">
      <div className="surface w-full max-w-md p-8 pt-10 text-center">
        <p className="smallcaps" style={{ color: "var(--destructive)" }}>
          Account notice
        </p>
        <h2 className="mt-3 mb-2 text-2xl font-bold tracking-[-0.02em] text-foreground">
          We couldn&apos;t reconcile this view
        </h2>
        <p className="mb-6 text-[15px] text-muted-foreground">
          Your nutrition records are safe. Retry the request, or return to the overview if this account view remains unavailable{error.digest ? ` (ref: ${error.digest})` : ""}.
        </p>
        <button type="button" onClick={reset} className="btn-primary">
          Reconcile again
        </button>
      </div>
    </div>
  );
}
