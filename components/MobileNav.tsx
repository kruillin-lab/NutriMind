"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Menu, Settings, Utensils, X } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/meals", label: "Activity", icon: Utensils },
  { href: "/settings", label: "Account", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-primary-navigation"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-sm border border-border text-foreground transition-colors hover:border-[var(--brass)] hover:bg-secondary"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      {open && (
        <div id="mobile-primary-navigation" className="absolute inset-x-0 top-full border-b border-border bg-card px-4 py-3 shadow-xl">
          <nav aria-label="Mobile primary" className="flex flex-col gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
                className={`smallcaps flex items-center gap-2.5 rounded-sm px-3 py-2.5 tracking-[0.08em] transition-colors ${
                  pathname.startsWith(href)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
