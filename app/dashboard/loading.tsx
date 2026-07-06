export default function DashboardLoading() {
  return (
    <div className="app-field min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-8 border-b border-border pb-6">
          <div className="mb-2 h-3 w-40 animate-pulse rounded-full bg-secondary" />
          <div className="h-10 w-64 animate-pulse rounded-lg bg-secondary" />
        </div>
        <div className="mb-6 h-10 w-full max-w-md animate-pulse rounded-full bg-secondary" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="h-72 animate-pulse rounded-2xl bg-secondary lg:col-span-3" />
          <div className="h-72 animate-pulse rounded-2xl bg-secondary lg:col-span-5" />
          <div className="h-72 animate-pulse rounded-2xl bg-secondary lg:col-span-4" />
        </div>
      </div>
    </div>
  );
}
