"use client";

import { PiggyBank, TrendingUp, TrendingDown, RefreshCw, Clock, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BankTransaction {
  id: string;
  type: "BANK" | "SPEND" | "ADJUST" | "EXPIRE";
  amount: number;
  reason: string;
  caloriesConsumed: number | null;
  caloriesTarget: number | null;
  sourceType: string | null;
  createdAt: string;
}

interface BankTransactionHistoryProps {
  transactions: BankTransaction[];
}

const typeConfig: Record<string, { icon: LucideIcon; label: string; positive: boolean }> = {
  BANK:   { icon: TrendingUp,   label: "Banked",   positive: true },
  SPEND:  { icon: TrendingDown, label: "Spent",    positive: false },
  ADJUST: { icon: RefreshCw,    label: "Adjusted", positive: true },
  EXPIRE: { icon: Clock,        label: "Expired",  positive: false },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function BankTransactionHistory({ transactions }: BankTransactionHistoryProps) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/[0.08] px-5 py-4">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-[#00C875]" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B5738]">Bank History</span>
        </div>
        {transactions.length > 0 && (
          <span className="text-[11px] text-[#6B5738]">{transactions.length} transactions</span>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
          <ArrowUpRight className="mb-3 h-8 w-8 text-[#B9C1BA]" />
          <p className="text-sm text-[#6B5738]">No transactions yet</p>
          <p className="mt-1 text-xs text-[#8A7350]">Stay under target to bank calories</p>
        </div>
      ) : (
        <div className="max-h-[300px] divide-y divide-black/[0.06] overflow-y-auto">
          {transactions.map((tx) => {
            const config = typeConfig[tx.type] ?? typeConfig.ADJUST;
            const Icon = config.icon;

            return (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#FFE8A8]">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-black/[0.16] bg-[#FFF0B8]">
                  <Icon className="h-3.5 w-3.5 text-[#6B5738]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-[#2A2017]">{tx.reason}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#6B5738]">
                    <span>{formatRelativeTime(tx.createdAt)}</span>
                    {tx.caloriesConsumed != null && tx.caloriesTarget != null && (
                      <>
                        <span>·</span>
                        <span>{tx.caloriesConsumed}/{tx.caloriesTarget} kcal</span>
                      </>
                    )}
                  </div>
                </div>

                <span className={`num shrink-0 text-xs font-semibold tabular-nums ${config.positive ? "text-[#00895A]" : "text-[#FF5A3D]"}`}>
                  {config.positive ? "+" : "-"}{tx.amount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
