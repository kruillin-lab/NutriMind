"use client";

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
  currentBalance: number;
}

const typeConfig: Record<string, { label: string; positive: boolean }> = {
  BANK:   { label: "Bank",   positive: true },
  SPEND:  { label: "Spend",  positive: false },
  ADJUST: { label: "Adjust", positive: true },
  EXPIRE: { label: "Expire", positive: false },
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

export function BankTransactionHistory({
  transactions,
  currentBalance,
}: BankTransactionHistoryProps) {
  // Transactions arrive newest-first. Start at the actual current account
  // balance and reverse each displayed entry to derive its historical balance.
  const runningBalances: number[] = [];
  {
    let running = currentBalance;
    for (const tx of transactions) {
      runningBalances.push(running);
      const config = typeConfig[tx.type] ?? typeConfig.ADJUST;
      running -= config.positive ? tx.amount : -tx.amount;
    }
  }

  return (
    <section aria-labelledby="reserve-ledger-heading" className="surface overflow-hidden">
      <div className="flex items-baseline justify-between gap-4 px-5 pt-5 sm:px-6">
        <div>
          <h3 id="reserve-ledger-heading" className="text-sm font-bold tracking-tight text-foreground">
            Reserve activity
          </h3>
          <p className="smallcaps mt-0.5">Calories banked and used</p>
        </div>
        {transactions.length > 0 && (
          <span className="smallcaps">
            {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="px-6 py-6">
          <p className="text-sm text-muted-foreground">
            No entries yet. Finish a day under target and the difference is banked here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-[4.25rem_minmax(0,1fr)_4.75rem] gap-x-3 px-5 pb-1 sm:grid-cols-[4.25rem_3rem_minmax(0,1fr)_5rem_5rem] sm:px-6">
            <span className="smallcaps">When</span>
            <span className="smallcaps hidden sm:block">Type</span>
            <span className="smallcaps">Nutrition note</span>
            <span className="smallcaps text-right">kcal</span>
            <span className="smallcaps hidden text-right sm:block">Balance</span>
          </div>

          <div className="px-5 pb-2 sm:px-6">
            {transactions.map((tx, i) => {
              const config = typeConfig[tx.type] ?? typeConfig.ADJUST;

              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-[4.25rem_minmax(0,1fr)_4.75rem] items-baseline gap-x-3 border-t border-border py-3 sm:grid-cols-[4.25rem_3rem_minmax(0,1fr)_5rem_5rem]"
                >
                  <time dateTime={tx.createdAt} className="num text-xs text-muted-foreground">
                    {formatRelativeTime(tx.createdAt)}
                  </time>
                  <span className="hidden text-[10px] tracking-wider text-muted-foreground sm:block">{config.label}</span>
                  <span className="min-w-0 truncate text-sm text-foreground" title={tx.reason}>{tx.reason}</span>
                  <span
                    className="num text-right text-sm"
                    style={{ color: config.positive ? "var(--ledger-green)" : "var(--ledger-red)" }}
                  >
                    {config.positive ? "+" : "−"}
                    {tx.amount.toLocaleString()}
                  </span>
                  <span className="num hidden text-right text-sm text-foreground sm:block">
                    {runningBalances[i].toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
