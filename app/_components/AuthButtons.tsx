"use client";

import { useClerk, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const { openSignIn, user } = useClerk();

  if (user) {
    return <UserButton />;
  }

  return (
    <Button
      type="button"
      size="sm"
      className="border-[#FFF8E7]/20 bg-transparent text-[#FFF8E7]/80 hover:border-[#DFFF35]/40 hover:bg-[#DFFF35]/12 hover:text-[#DFFF35]"
      onClick={() => openSignIn({ forceRedirectUrl: "/dashboard" })}
    >
      Sign In
    </Button>
  );
}
