import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthButtons } from "./_components/AuthButtons";
import { ThemeProvider } from "@wrksz/themes/next";
import { MobileNav } from "@/components/MobileNav";
import Link from "next/link";
import { Activity, BarChart3, Database, Settings, Utensils } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriMind - The Calorie Bank",
  description: "Modern nutrition tracking with AI-powered Calorie Bank",
};

export default async function RootLayout({
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
            <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
                <Link href="/" className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Activity className="h-4 w-4" />
                  </span>
                  <span className="font-serif text-base font-semibold tracking-tight text-foreground">NutriMind</span>
                </Link>
                <nav className="flex items-center gap-1.5">
                  <Link href="/dashboard" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                  <Link href="/meals" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex">
                    <Utensils className="h-3.5 w-3.5" />
                    Meals
                  </Link>
                  <Link href="/settings" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:flex">
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </Link>
                  {process.env.NODE_ENV !== "production" && (
                    <Link href="/database" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex">
                      <Database className="h-3.5 w-3.5" />
                      Database
                    </Link>
                  )}
                  <AuthButtons />
                  <MobileNav />
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
