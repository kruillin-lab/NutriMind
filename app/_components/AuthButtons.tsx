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
      variant="outline"
      onClick={() => openSignIn({ forceRedirectUrl: "/dashboard" })}
    >
      Sign In
    </Button>
  );
}
