export default function MealsLoading() {
  return (
    <div className="app-field min-h-screen px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="border-b border-border pb-8">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-foreground/10" />
          <div className="h-10 w-56 animate-pulse rounded bg-foreground/10" />
        </div>
        <div className="space-y-3 py-6">
          <div className="h-4 w-full animate-pulse rounded bg-foreground/5" />
          <div className="h-4 w-full animate-pulse rounded bg-foreground/5" />
          <div className="h-4 w-full animate-pulse rounded bg-foreground/5" />
        </div>
      </div>
    </div>
  );
}
