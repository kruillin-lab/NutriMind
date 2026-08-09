"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CirclePlus, Settings, Utensils } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/dashboard#quick-log", label: "Log", icon: CirclePlus },
  { href: "/meals", label: "Activity", icon: Utensils },
  { href: "/settings", label: "Account", icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-border bg-card/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-10px_30px_rgba(23,20,13,0.12)] backdrop-blur-xl sm:hidden"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = label === "Overview"
          ? pathname === "/dashboard"
          : label === "Log"
            ? false
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-sm px-1 text-[10px] font-semibold tracking-[0.04em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
