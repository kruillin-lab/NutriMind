"use client";

import dynamic from "next/dynamic";
import type { DashboardTabsProps } from "./DashboardTabs";

function DashboardTabsLoading() {
  return (
    <section aria-busy="true" aria-label="Loading your nutrition dashboard" className="space-y-8">
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-sm bg-muted" />
        <div className="h-8 w-64 max-w-full animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-sm bg-muted" />
        <div className="h-80 animate-pulse rounded-sm bg-muted" />
      </div>
      <span className="sr-only">Loading your dashboard</span>
    </section>
  );
}

const DashboardTabs = dynamic<DashboardTabsProps>(
  () => import("./DashboardTabs").then((module) => module.DashboardTabs),
  {
    loading: DashboardTabsLoading,
    ssr: false,
  }
);

export function DashboardTabsClient(props: DashboardTabsProps) {
  return <DashboardTabs {...props} />;
}
