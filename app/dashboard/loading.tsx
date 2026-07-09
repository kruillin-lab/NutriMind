export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-hero" aria-label="Loading reserve account">
      <div className="finance-shell">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between border-b border-border pb-6">
          <div className="space-y-2">
            <div className="h-3 w-36 animate-pulse rounded-sm bg-secondary" />
            <div className="h-9 w-52 animate-pulse rounded-sm bg-secondary" />
            <div className="h-3 w-72 max-w-full animate-pulse rounded-sm bg-secondary" />
          </div>
          <div className="hidden h-4 w-40 animate-pulse rounded-sm bg-secondary sm:block" />
        </div>

        {/* Tabs rule */}
        <div className="mb-10 flex gap-8 border-b border-border pb-3">
          <div className="h-3 w-12 animate-pulse rounded-sm bg-secondary" />
          <div className="h-3 w-12 animate-pulse rounded-sm bg-secondary" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-secondary" />
          <div className="h-3 w-10 animate-pulse rounded-sm bg-secondary" />
        </div>

        <div className="mb-8 space-y-2">
          <div className="h-3 w-16 animate-pulse rounded-sm bg-secondary" />
          <div className="h-8 w-72 max-w-full animate-pulse rounded-sm bg-secondary" />
        </div>

        {/* Reserve overview */}
        <div className="surface p-6">
          <div className="foil -mx-6 -mt-6 mb-5" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-secondary" />
          <div className="mt-3 h-16 w-72 animate-pulse rounded-sm bg-secondary" />
          <div className="mt-5 border-t-2 border-foreground/20" />
          <div className="mt-5 grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-secondary" />
            ))}
          </div>
        </div>

        {/* Task-first on mobile, statement-first on desktop */}
        <div className="mt-10 grid grid-cols-1 gap-x-14 gap-y-8 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-7">
            <div className="h-6 w-28 animate-pulse rounded-sm bg-secondary" />
            <div className="mt-6 space-y-0">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-border py-3">
                  <div className="h-4 w-full animate-pulse rounded-sm bg-secondary" />
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 lg:col-span-5">
            <div className="surface h-72 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
