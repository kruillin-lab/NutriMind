export default function DashboardLoading() {
  return (
    <div className="app-field min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-7 border-b border-[#FFF8E7]/15 pb-6">
          <div className="mb-2 h-3 w-40 animate-pulse rounded bg-[#FFF8E7]/15" />
          <div className="h-10 w-64 animate-pulse rounded bg-[#FFF8E7]/15" />
        </div>
        <div className="mb-4 h-10 w-full max-w-md animate-pulse rounded-lg bg-[#FFF8E7]/10" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="h-72 animate-pulse rounded-lg bg-[#FFF8E7]/10 lg:col-span-3" />
          <div className="h-72 animate-pulse rounded-lg bg-[#FFF8E7]/10 lg:col-span-5" />
          <div className="h-72 animate-pulse rounded-lg bg-[#FFF8E7]/10 lg:col-span-4" />
        </div>
      </div>
    </div>
  );
}
