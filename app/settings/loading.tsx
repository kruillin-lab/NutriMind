export default function SettingsLoading() {
  return (
    <div className="bg-hero min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <div className="mb-2 border-b border-border pb-8">
          <div className="mb-3 h-3 w-24 animate-pulse rounded-sm bg-foreground/10" />
          <div className="h-10 w-48 animate-pulse rounded-sm bg-foreground/10" />
        </div>
        <div className="space-y-3 py-6">
          <div className="h-4 w-full animate-pulse rounded-sm bg-foreground/5" />
          <div className="h-4 w-full animate-pulse rounded-sm bg-foreground/5" />
          <div className="h-4 w-2/3 animate-pulse rounded-sm bg-foreground/5" />
        </div>
      </div>
    </div>
  );
}
