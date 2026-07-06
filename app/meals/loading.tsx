export default function MealsLoading() {
  return (
    <div className="app-field min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-7 border-b border-border pb-6">
          <div className="mb-2 h-3 w-40 animate-pulse rounded bg-foreground/10" />
          <div className="h-10 w-56 animate-pulse rounded bg-foreground/10" />
        </div>
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-2xl bg-secondary" />
          <div className="h-48 animate-pulse rounded-2xl bg-secondary" />
          <div className="h-48 animate-pulse rounded-2xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}
