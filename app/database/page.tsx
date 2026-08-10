import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { DatabaseClient } from "./_components/DatabaseClient";

export default async function DatabasePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen app-field">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 border-b border-border pb-6">
          <p className="page-kicker">
            Development only
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
            Database
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-[1.65] text-muted-foreground">
            Inspect and edit NutriMind records directly. Changes save to the local Prisma database.
          </p>
        </header>

        <DatabaseClient />
      </div>
    </div>
  );
}
