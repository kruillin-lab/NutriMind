"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-field flex min-h-screen items-center justify-center px-4">
      <div className="surface w-full max-w-md p-8 pt-10 text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <h2 className="mb-2 font-serif text-2xl text-foreground">Something went wrong</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          An unexpected error occurred{error.digest ? ` (ref: ${error.digest})` : ""}. Your data is safe.
        </p>
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
