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
        <header className="mb-8 border-b border-[#FFF8E7]/15 pb-6">
          <div className="mb-3 h-2 w-32 rounded-full border border-[#FFF8E7]/20 bg-[linear-gradient(90deg,#DFFF35,#00C875,#00C8FF,#FF5A3D)] shadow-[0_14px_34px_rgba(223,255,53,0.18)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#DFFF35]">
            Development only
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.02em] text-[#FFF8E7]">
            Database
          </h1>
          <p className="mt-2 max-w-2xl text-[#FFF8E7]/72">
            Inspect and edit NutriMind records directly. Changes save to the local Prisma database.
          </p>
        </header>

        <DatabaseClient />
      </div>
    </div>
  );
}
