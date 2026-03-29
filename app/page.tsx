import { AuthButtons } from "./_components/AuthButtons";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            NutriMind
          </span>
        </div>
        <AuthButtons />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            Track Your Nutrition with the{" "}
            <span className="text-emerald-600">Calorie Bank</span>
          </h1>
          <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
            Log meals in natural language. Bank your daily underspend. Spend
            from reserves when you splurge. A smarter way to manage your
            nutrition.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/sign-up"
              data-testid="get-started-button"
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-600 px-8 text-base font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Get Started
            </a>
            <a
              href="/sign-in"
              data-testid="sign-in-button"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-8 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Sign In
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 text-2xl">🍽️</div>
            <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
              Natural Language
            </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Just type "grilled chicken with rice" and we'll handle the
              rest.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 text-2xl">🏦</div>
            <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
              Calorie Bank
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Underspend today? Bank it. Overspend tomorrow? Spend from your
              reserves.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 text-2xl">📊</div>
            <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
              Smart Tracking
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Track calories, protein, carbs, and fat with intelligent
              recommendations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
