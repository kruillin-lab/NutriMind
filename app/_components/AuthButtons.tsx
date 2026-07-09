"use client";

import { useClerk, UserButton } from "@clerk/nextjs";

export function AuthButtons() {
  const { openSignIn, user } = useClerk();

  if (user) {
    return <UserButton />;
  }

  return (
    <button
      type="button"
      onClick={() => openSignIn({ forceRedirectUrl: "/dashboard" })}
      className="btn-ghost h-10 px-4 text-[11px] uppercase tracking-[0.08em]"
    >
      Sign in
    </button>
  );
}
