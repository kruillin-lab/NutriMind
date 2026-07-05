export default function MealsLoading() {
  return (
    <div className="app-field min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-7 border-b border-[#FFF8E7]/15 pb-6">
          <div className="mb-2 h-3 w-40 animate-pulse rounded bg-[#FFF8E7]/15" />
          <div className="h-10 w-56 animate-pulse rounded bg-[#FFF8E7]/15" />
        </div>
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-lg bg-[#FFF8E7]/10" />
          <div className="h-48 animate-pulse rounded-lg bg-[#FFF8E7]/10" />
          <div className="h-48 animate-pulse rounded-lg bg-[#FFF8E7]/10" />
        </div>
      </div>
    </div>
  );
}
