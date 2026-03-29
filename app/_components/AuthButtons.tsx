"use client";

import { useClerk, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const { user, openSignIn } = useClerk();

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => openSignIn()}>
        Sign In
      </Button>
    );
  }

  return <UserButton />;
}
