import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthButtons } from "./_components/AuthButtons";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { Activity, BarChart3, Database, Settings, Utensils } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriMind - The Calorie Bank",
  description: "Modern nutrition tracking with AI-powered Calorie Bank",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/onboarding"
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <header className="sticky top-0 z-50 border-b border-[#DFFF35]/30 bg-[#18120E]/95 text-[#FFF8E7] backdrop-blur-xl">
              <div className="h-2 bg-[linear-gradient(90deg,#DFFF35,#00C875,#00C8FF,#FF5A3D,#FFB000)]" />
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
                <Link href="/" className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#FFF8E7] bg-[#DFFF35] text-[#18120E] shadow-[4px_4px_0_#00C8FF]">
                    <Activity className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold tracking-tight text-[#FFF8E7]">NutriMind</span>
                </Link>
                <nav className="flex items-center gap-1.5">
                  <Link href="/dashboard" className="hidden items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm text-[#FFF8E7]/70 transition-colors hover:border-[#DFFF35]/30 hover:bg-[#DFFF35]/12 hover:text-[#DFFF35] sm:flex">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                  <Link href="/meals" className="hidden items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm text-[#FFF8E7]/70 transition-colors hover:border-[#00C8FF]/30 hover:bg-[#00C8FF]/12 hover:text-[#00C8FF] sm:flex">
                    <Utensils className="h-3.5 w-3.5" />
                    Meals
                  </Link>
                  <Link href="/settings" className="hidden items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm text-[#FFF8E7]/70 transition-colors hover:border-[#FFB000]/30 hover:bg-[#FFB000]/12 hover:text-[#FFB000] md:flex">
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </Link>
                  {process.env.NODE_ENV !== "production" && (
                    <Link href="/database" className="hidden items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm text-[#FFF8E7]/70 transition-colors hover:border-[#DFFF35]/30 hover:bg-[#DFFF35]/12 hover:text-[#DFFF35] lg:flex">
                      <Database className="h-3.5 w-3.5" />
                      Database
                    </Link>
                  )}
                  <ThemeToggle />
                  <AuthButtons />
                </nav>
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
