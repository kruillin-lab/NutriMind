"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Database, Settings, Utensils } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/meals", label: "Activity", icon: Utensils },
  { href: "/settings", label: "Account", icon: Settings },
] as const;

export function DesktopNav({ showDatabase }: { showDatabase: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`nav-link ${active ? "nav-link-active" : ""}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
      {showDatabase && (
        <Link
          href="/database"
          aria-current={pathname.startsWith("/database") ? "page" : undefined}
          className={`nav-link hidden lg:flex ${pathname.startsWith("/database") ? "nav-link-active" : ""}`}
        >
          <Database className="h-3.5 w-3.5" />
          Data
        </Link>
      )}
    </nav>
  );
}
