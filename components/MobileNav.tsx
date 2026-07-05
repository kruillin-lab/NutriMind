"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Menu, Settings, Utensils, X } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#FFF8E7]/20 text-[#FFF8E7] transition-colors hover:border-[#DFFF35]/40 hover:text-[#DFFF35]"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b-2 border-[#DFFF35]/30 bg-[#18120E] px-4 py-3 shadow-[0_20px_48px_rgba(0,0,0,0.5)]">
          <nav className="flex flex-col gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  pathname.startsWith(href)
                    ? "bg-[#DFFF35]/15 text-[#DFFF35]"
                    : "text-[#FFF8E7]/80 hover:bg-[#FFF8E7]/8 hover:text-[#FFF8E7]"
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
